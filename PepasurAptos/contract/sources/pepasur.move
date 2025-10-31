module pepasur::pepasur {
    use std::signer;
    use std::vector;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_std::simple_map::{Self, SimpleMap};
    use aptos_std::ed25519;
    use aptos_std::bcs;

    // Error codes
    /// Game not found
    const EGAME_NOT_FOUND: u64 = 1;
    /// Game not in lobby state
    const EGAME_NOT_IN_LOBBY: u64 = 2;
    /// Invalid stake amount
    const EINVALID_STAKE: u64 = 3;
    /// Game already settled
    const EALREADY_SETTLED: u64 = 4;
    /// Not authorized - only admin can call
    const ENOT_AUTHORIZED: u64 = 5;
    /// Invalid signature from server
    const EINVALID_SIGNATURE: u64 = 6;
    /// Game not in progress
    const EGAME_NOT_IN_PROGRESS: u64 = 7;
    /// No pending withdrawal
    const ENO_PENDING_WITHDRAWAL: u64 = 8;
    /// Game has already started, cannot cancel
    const EGAME_ALREADY_STARTED: u64 = 9;
    /// Minimum players not met
    const EMIN_PLAYERS_NOT_MET: u64 = 10;

    // Game status constants
    const STATUS_LOBBY: u8 = 0;
    const STATUS_IN_PROGRESS: u8 = 1;
    const STATUS_SETTLED: u8 = 2;
    const STATUS_CANCELLED: u8 = 3;

    // Structs
    struct Game has store, drop {
        id: u64,
        creator: address,
        stake_amount: u64,
        min_players: u8,
        players: vector<address>,
        deposits: vector<u64>,
        status: u8,
        total_pool: u64,
        created_at: u64,
    }

    struct GameStore has key {
        games: vector<Game>,
        next_game_id: u64,
        vault: Coin<AptosCoin>,
    }

    struct Config has key {
        admin: address,
        server_signer: vector<u8>, // ED25519 public key
        fee_recipient: address,
        house_cut_bps: u16, // basis points (100 = 1%)
        initialized: bool, // Track if post-deployment init is complete
    }

    struct PendingWithdrawals has key {
        balances: SimpleMap<address, u64>,
    }

    // Events
    #[event]
    struct GameCreated has store, drop {
        game_id: u64,
        creator: address,
        stake: u64,
        min_players: u8,
    }

    #[event]
    struct PlayerJoined has store, drop {
        game_id: u64,
        player: address,
    }

    #[event]
    struct GameStarted has store, drop {
        game_id: u64,
        player_count: u64,
    }

    #[event]
    struct GameSettled has store, drop {
        game_id: u64,
        winners: vector<address>,
        payouts: vector<u64>,
        house_fee: u64,
    }

    #[event]
    struct Withdrawn has store, drop {
        player: address,
        amount: u64,
    }

    #[event]
    struct GameCancelled has store, drop {
        game_id: u64,
        refunded_players: vector<address>,
    }

    // Initialize module - called automatically on deployment
    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);

        move_to(admin, GameStore {
            games: vector::empty(),
            next_game_id: 1,
            vault: coin::zero<AptosCoin>(),
        });

        move_to(admin, Config {
            admin: admin_addr,
            server_signer: vector::empty(), // Must be set by admin after deployment
            fee_recipient: admin_addr,
            house_cut_bps: 200, // 2%
            initialized: false, // Will be set to true after post-deployment init
        });

        move_to(admin, PendingWithdrawals {
            balances: simple_map::create(),
        });
    }

    // Test-only initialization function
    #[test_only]
    public fun init_for_test(admin: &signer) {
        init_module(admin);
    }

    // One-time post-deployment initialization
    // Call this immediately after deployment to set the proper admin
    // Can only be called once when initialized == false
    public entry fun initialize(
        new_admin: &signer,
        server_signer_pubkey: vector<u8>,
        fee_recipient: address,
    ) acquires Config {
        let config = borrow_global_mut<Config>(@pepasur);
        assert!(!config.initialized, EALREADY_SETTLED); // Using existing error code for "already done"

        config.admin = signer::address_of(new_admin);
        config.server_signer = server_signer_pubkey;
        config.fee_recipient = fee_recipient;
        config.initialized = true;
    }

    // Admin Functions

    // Update server signer public key
    public entry fun update_server_signer(admin: &signer, new_signer_pubkey: vector<u8>) acquires Config {
        let config = borrow_global_mut<Config>(@pepasur);
        assert!(signer::address_of(admin) == config.admin, ENOT_AUTHORIZED);
        config.server_signer = new_signer_pubkey;
    }

    // Update fee recipient
    public entry fun update_fee_recipient(admin: &signer, new_recipient: address) acquires Config {
        let config = borrow_global_mut<Config>(@pepasur);
        assert!(signer::address_of(admin) == config.admin, ENOT_AUTHORIZED);
        config.fee_recipient = new_recipient;
    }

    // Update house cut (max 2000 = 20%)
    public entry fun update_house_cut(admin: &signer, new_cut_bps: u16) acquires Config {
        let config = borrow_global_mut<Config>(@pepasur);
        assert!(signer::address_of(admin) == config.admin, ENOT_AUTHORIZED);
        assert!(new_cut_bps <= 2000, EINVALID_STAKE);
        config.house_cut_bps = new_cut_bps;
    }

    // Game Functions

    // Create a new game
    public entry fun create_game(creator: &signer, stake_amount: u64, min_players: u8) acquires GameStore {
        assert!(stake_amount > 0, EINVALID_STAKE);
        assert!(min_players >= 2, EMIN_PLAYERS_NOT_MET);

        let creator_addr = signer::address_of(creator);
        let game_store = borrow_global_mut<GameStore>(@pepasur);
        let game_id = game_store.next_game_id;
        game_store.next_game_id = game_id + 1;

        let new_game = Game {
            id: game_id,
            creator: creator_addr,
            stake_amount,
            min_players,
            players: vector::empty(),
            deposits: vector::empty(),
            status: STATUS_LOBBY,
            total_pool: 0,
            created_at: timestamp::now_seconds(),
        };

        vector::push_back(&mut game_store.games, new_game);

        event::emit(GameCreated {
            game_id,
            creator: creator_addr,
            stake: stake_amount,
            min_players,
        });
    }

    // Join a game
    public entry fun join_game(player: &signer, game_id: u64) acquires GameStore {
        let player_addr = signer::address_of(player);
        let game_store = borrow_global_mut<GameStore>(@pepasur);

        assert!(game_id > 0 && game_id < game_store.next_game_id, EGAME_NOT_FOUND);
        let game = vector::borrow_mut(&mut game_store.games, game_id - 1);

        assert!(game.status == STATUS_LOBBY, EGAME_NOT_IN_LOBBY);

        // Transfer stake to vault
        let coins = coin::withdraw<AptosCoin>(player, game.stake_amount);
        coin::merge(&mut game_store.vault, coins);

        // Add player to game
        vector::push_back(&mut game.players, player_addr);
        vector::push_back(&mut game.deposits, game.stake_amount);
        game.total_pool = game.total_pool + game.stake_amount;

        event::emit(PlayerJoined {
            game_id,
            player: player_addr,
        });

        // Start game if minimum players reached
        if (vector::length(&game.players) >= (game.min_players as u64)) {
            game.status = STATUS_IN_PROGRESS;
            event::emit(GameStarted {
                game_id,
                player_count: vector::length(&game.players),
            });
        };
    }

    // Settle game with server signature
    // Message format: game_id || winners || payouts
    public entry fun settle_game(
        _submitter: &signer,
        game_id: u64,
        winners: vector<address>,
        payouts: vector<u64>,
        signature: vector<u8>,
    ) acquires GameStore, Config, PendingWithdrawals {
        let game_store = borrow_global_mut<GameStore>(@pepasur);
        let config = borrow_global<Config>(@pepasur);

        assert!(game_id > 0 && game_id < game_store.next_game_id, EGAME_NOT_FOUND);
        let game = vector::borrow_mut(&mut game_store.games, game_id - 1);

        assert!(game.status == STATUS_IN_PROGRESS, EGAME_NOT_IN_PROGRESS);
        assert!(vector::length(&winners) == vector::length(&payouts), EINVALID_STAKE);

        // Verify server signature
        let message = construct_settlement_message(game_id, &winners, &payouts);
        verify_signature(&message, &signature, &config.server_signer);

        // Calculate house fee
        let house_fee = (game.total_pool * (config.house_cut_bps as u64)) / 10000;
        let remaining_pool = game.total_pool - house_fee;

        // Verify payouts sum correctly
        let total_payouts = 0u64;
        let i = 0;
        while (i < vector::length(&payouts)) {
            total_payouts = total_payouts + *vector::borrow(&payouts, i);
            i = i + 1;
        };
        assert!(total_payouts <= remaining_pool, EINVALID_STAKE);

        // Queue withdrawals for winners
        let withdrawals = borrow_global_mut<PendingWithdrawals>(@pepasur);
        let i = 0;
        while (i < vector::length(&winners)) {
            let winner = *vector::borrow(&winners, i);
            let payout = *vector::borrow(&payouts, i);

            if (simple_map::contains_key(&withdrawals.balances, &winner)) {
                let current = simple_map::borrow_mut(&mut withdrawals.balances, &winner);
                *current = *current + payout;
            } else {
                simple_map::add(&mut withdrawals.balances, winner, payout);
            };

            i = i + 1;
        };

        // Transfer house fee to recipient
        if (house_fee > 0) {
            let fee_coins = coin::extract(&mut game_store.vault, house_fee);
            coin::deposit(config.fee_recipient, fee_coins);
        };

        // Mark game as settled
        game.status = STATUS_SETTLED;

        event::emit(GameSettled {
            game_id,
            winners,
            payouts,
            house_fee,
        });
    }

    // Withdraw pending winnings
    public entry fun withdraw(player: &signer) acquires PendingWithdrawals, GameStore {
        let player_addr = signer::address_of(player);
        let withdrawals = borrow_global_mut<PendingWithdrawals>(@pepasur);

        assert!(simple_map::contains_key(&withdrawals.balances, &player_addr), ENO_PENDING_WITHDRAWAL);

        let (_key, amount) = simple_map::remove(&mut withdrawals.balances, &player_addr);
        assert!(amount > 0, ENO_PENDING_WITHDRAWAL);

        let game_store = borrow_global_mut<GameStore>(@pepasur);
        let coins = coin::extract(&mut game_store.vault, amount);
        coin::deposit(player_addr, coins);

        event::emit(Withdrawn {
            player: player_addr,
            amount,
        });
    }

    // Cancel game (only if still in lobby)
    public entry fun cancel_game(creator: &signer, game_id: u64) acquires GameStore, PendingWithdrawals {
        let creator_addr = signer::address_of(creator);
        let game_store = borrow_global_mut<GameStore>(@pepasur);

        assert!(game_id > 0 && game_id < game_store.next_game_id, EGAME_NOT_FOUND);
        let game = vector::borrow_mut(&mut game_store.games, game_id - 1);

        assert!(game.creator == creator_addr, ENOT_AUTHORIZED);
        assert!(game.status == STATUS_LOBBY || game.status == STATUS_IN_PROGRESS, EGAME_ALREADY_STARTED);

        // Refund all players
        let withdrawals = borrow_global_mut<PendingWithdrawals>(@pepasur);
        let i = 0;
        while (i < vector::length(&game.players)) {
            let player = *vector::borrow(&game.players, i);
            let deposit = *vector::borrow(&game.deposits, i);

            if (simple_map::contains_key(&withdrawals.balances, &player)) {
                let current = simple_map::borrow_mut(&mut withdrawals.balances, &player);
                *current = *current + deposit;
            } else {
                simple_map::add(&mut withdrawals.balances, player, deposit);
            };

            i = i + 1;
        };

        game.status = STATUS_CANCELLED;

        event::emit(GameCancelled {
            game_id,
            refunded_players: game.players,
        });
    }

    // View Functions

    #[view]
    public fun get_game(game_id: u64): (u64, address, u64, u8, vector<address>, u8, u64) acquires GameStore {
        let game_store = borrow_global<GameStore>(@pepasur);
        assert!(game_id > 0 && game_id < game_store.next_game_id, EGAME_NOT_FOUND);

        let game = vector::borrow(&game_store.games, game_id - 1);
        (game.id, game.creator, game.stake_amount, game.min_players, game.players, game.status, game.total_pool)
    }

    #[view]
    public fun get_pending_withdrawal(player: address): u64 acquires PendingWithdrawals {
        let withdrawals = borrow_global<PendingWithdrawals>(@pepasur);
        if (simple_map::contains_key(&withdrawals.balances, &player)) {
            *simple_map::borrow(&withdrawals.balances, &player)
        } else {
            0
        }
    }

    #[view]
    public fun get_config(): (address, address, u16, bool) acquires Config {
        let config = borrow_global<Config>(@pepasur);
        (config.admin, config.fee_recipient, config.house_cut_bps, config.initialized)
    }

    #[view]
    public fun get_next_game_id(): u64 acquires GameStore {
        let game_store = borrow_global<GameStore>(@pepasur);
        game_store.next_game_id
    }

    // Helper Functions

    // Construct message for server signature verification
    fun construct_settlement_message(
        game_id: u64,
        winners: &vector<address>,
        payouts: &vector<u64>,
    ): vector<u8> {
        let message = vector::empty<u8>();

        // Add game_id (8 bytes)
        let id_bytes = bcs::to_bytes(&game_id);
        vector::append(&mut message, id_bytes);

        // Add winners
        vector::append(&mut message, bcs::to_bytes(winners));

        // Add payouts
        vector::append(&mut message, bcs::to_bytes(payouts));

        message
    }

    // Verify ED25519 signature from server
    fun verify_signature(message: &vector<u8>, signature: &vector<u8>, public_key: &vector<u8>) {
        assert!(vector::length(public_key) == 32, EINVALID_SIGNATURE);
        assert!(vector::length(signature) == 64, EINVALID_SIGNATURE);

        let pk = ed25519::new_unvalidated_public_key_from_bytes(*public_key);
        let sig = ed25519::new_signature_from_bytes(*signature);

        assert!(
            ed25519::signature_verify_strict(&sig, &pk, *message),
            EINVALID_SIGNATURE
        );
    }
}
