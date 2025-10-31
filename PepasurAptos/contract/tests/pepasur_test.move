#[test_only]
module pepasur::pepasur_tests {
    use std::signer;
    use std::vector;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::coin;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use pepasur::pepasur;

    // Test helper to initialize test environment
    fun setup_test(
        aptos_framework: &signer,
        admin: &signer,
        players: vector<address>,
    ) {
        // Initialize timestamp for testing
        timestamp::set_time_has_started_for_testing(aptos_framework);

        // Initialize AptosCoin
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);

        // Create admin account and initialize module
        account::create_account_for_test(signer::address_of(admin));
        pepasur::init_for_test(admin);

        // Fund players with APT
        let i = 0;
        while (i < vector::length(&players)) {
            let player_addr = *vector::borrow(&players, i);
            account::create_account_for_test(player_addr);
            let coins = coin::mint(1000000000, &mint_cap); // 10 APT
            coin::deposit(player_addr, coins);
            i = i + 1;
        };

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @pepasur, creator = @0x100)]
    // Test creating a game
    fun test_create_game(
        aptos_framework: &signer,
        admin: &signer,
        creator: &signer,
    ) {
        let players = vector[@0x100];
        setup_test(aptos_framework, admin, players);

        pepasur::create_game(creator, 100000000, 3);

        let (game_id, game_creator, stake, min_players, game_players, status, pool) = pepasur::get_game(1);
        assert!(game_id == 1, 0);
        assert!(game_creator == @0x100, 1);
        assert!(stake == 100000000, 2);
        assert!(min_players == 3, 3);
        assert!(vector::length(&game_players) == 0, 4);
        assert!(status == 0, 5); // Lobby
        assert!(pool == 0, 6);
    }

    #[test(aptos_framework = @0x1, admin = @pepasur, creator = @0x100, player1 = @0x200, player2 = @0x300)]
    // Test joining a game
    fun test_join_game(
        aptos_framework: &signer,
        admin: &signer,
        creator: &signer,
        player1: &signer,
        player2: &signer,
    ) {
        let players = vector[@0x100, @0x200, @0x300];
        setup_test(aptos_framework, admin, players);

        pepasur::create_game(creator, 100000000, 2);

        // Player 1 joins
        pepasur::join_game(player1, 1);
        let (_, _, _, _, game_players, status, pool) = pepasur::get_game(1);
        assert!(vector::length(&game_players) == 1, 0);
        assert!(status == 0, 1); // Still in lobby
        assert!(pool == 100000000, 2);

        // Player 2 joins - game should start
        pepasur::join_game(player2, 1);
        let (_, _, _, _, game_players, status, pool) = pepasur::get_game(1);
        assert!(vector::length(&game_players) == 2, 3);
        assert!(status == 1, 4); // In progress
        assert!(pool == 200000000, 5);
    }

    #[test(aptos_framework = @0x1, admin = @pepasur, creator = @0x100)]
    // Test cancel game in lobby
    fun test_cancel_game_lobby(
        aptos_framework: &signer,
        admin: &signer,
        creator: &signer,
    ) {
        let players = vector[@0x100];
        setup_test(aptos_framework, admin, players);

        pepasur::create_game(creator, 100000000, 3);
        pepasur::cancel_game(creator, 1);

        let (_, _, _, _, _, status, _) = pepasur::get_game(1);
        assert!(status == 3, 0); // Cancelled
    }

    #[test(aptos_framework = @0x1, admin = @pepasur)]
    // Test admin config updates
    fun test_admin_config(
        aptos_framework: &signer,
        admin: &signer,
    ) {
        let players = vector::empty();
        setup_test(aptos_framework, admin, players);

        // Update house cut
        pepasur::update_house_cut(admin, 500);
        let (_, _, house_cut, _) = pepasur::get_config();
        assert!(house_cut == 500, 0);

        // Update fee recipient
        pepasur::update_fee_recipient(admin, @0x999);
        let (_, fee_recipient, _, _) = pepasur::get_config();
        assert!(fee_recipient == @0x999, 1);
    }

    #[test(aptos_framework = @0x1, admin = @pepasur, creator = @0x100, player1 = @0x200)]
    // Test withdrawal flow
    fun test_withdrawal(
        aptos_framework: &signer,
        admin: &signer,
        creator: &signer,
        player1: &signer,
    ) {
        let players = vector[@0x100, @0x200];
        setup_test(aptos_framework, admin, players);

        // Create and cancel game to queue withdrawal
        pepasur::create_game(creator, 100000000, 2);
        pepasur::join_game(player1, 1);
        pepasur::cancel_game(creator, 1);

        // Check pending withdrawal
        let pending = pepasur::get_pending_withdrawal(@0x200);
        assert!(pending == 100000000, 0);

        // Withdraw
        let balance_before = coin::balance<AptosCoin>(@0x200);
        pepasur::withdraw(player1);
        let balance_after = coin::balance<AptosCoin>(@0x200);

        assert!(balance_after == balance_before + 100000000, 1);
        assert!(pepasur::get_pending_withdrawal(@0x200) == 0, 2);
    }

    #[test(aptos_framework = @0x1, admin = @pepasur, creator = @0x100)]
    #[expected_failure(abort_code = 10, location = pepasur::pepasur)]
    // Test creating game with invalid min_players
    fun test_create_game_invalid_min_players(
        aptos_framework: &signer,
        admin: &signer,
        creator: &signer,
    ) {
        let players = vector[@0x100];
        setup_test(aptos_framework, admin, players);

        pepasur::create_game(creator, 100000000, 1); // Should fail - min 2 players
    }

    #[test(aptos_framework = @0x1, admin = @pepasur, creator = @0x100, player1 = @0x200)]
    #[expected_failure(abort_code = 2, location = pepasur::pepasur)]
    // Test joining game that's not in lobby
    fun test_join_game_not_in_lobby(
        aptos_framework: &signer,
        admin: &signer,
        creator: &signer,
        player1: &signer,
    ) {
        let players = vector[@0x100, @0x200];
        setup_test(aptos_framework, admin, players);

        pepasur::create_game(creator, 100000000, 2);
        pepasur::cancel_game(creator, 1); // Game now cancelled

        pepasur::join_game(player1, 1); // Should fail
    }

    #[test(aptos_framework = @0x1, admin = @pepasur, creator = @0x100, non_creator = @0x200)]
    #[expected_failure(abort_code = 5, location = pepasur::pepasur)]
    // Test cancel game by non-creator
    fun test_cancel_game_not_authorized(
        aptos_framework: &signer,
        admin: &signer,
        creator: &signer,
        non_creator: &signer,
    ) {
        let players = vector[@0x100, @0x200];
        setup_test(aptos_framework, admin, players);

        pepasur::create_game(creator, 100000000, 3);
        pepasur::cancel_game(non_creator, 1); // Should fail
    }

    #[test(aptos_framework = @0x1, admin = @pepasur, player1 = @0x200)]
    #[expected_failure(abort_code = 8, location = pepasur::pepasur)]
    // Test withdrawing with no pending balance
    fun test_withdraw_no_balance(
        aptos_framework: &signer,
        admin: &signer,
        player1: &signer,
    ) {
        let players = vector[@0x200];
        setup_test(aptos_framework, admin, players);

        pepasur::withdraw(player1); // Should fail - no pending withdrawal
    }
}
