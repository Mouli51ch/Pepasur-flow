// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Pepasur
 * @notice On-chain Mafia-style social deduction game with staking and rewards
 * @dev Migrated from Aptos Move to Flow EVM Testnet
 *
 * Game Flow:
 * 1. Creator creates game with stake amount and min players
 * 2. Players join by sending exact stake amount
 * 3. Game auto-starts when min players reached
 * 4. Backend orchestrates gameplay (roles, actions, phases)
 * 5. Server signs settlement with winners and payouts
 * 6. Winners withdraw their rewards
 */
contract Pepasur is EIP712, ReentrancyGuard {
    using ECDSA for bytes32;

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Game status enum
    enum GameStatus {
        LOBBY,          // 0: Waiting for players
        IN_PROGRESS,    // 1: Game is active
        SETTLED,        // 2: Game completed, rewards distributed
        CANCELLED       // 3: Game cancelled, refunds available
    }

    /// @notice Game data structure
    struct Game {
        uint64 id;
        address creator;
        uint256 stakeAmount;
        uint8 minPlayers;
        address[] players;
        uint256[] deposits;
        GameStatus status;
        uint256 totalPool;
        uint256 createdAt;
    }

    /// @notice Contract configuration
    struct Config {
        address admin;
        address serverSigner;   // Address authorized to sign settlements
        address feeRecipient;   // Receives house cut
        uint16 houseCutBps;     // Basis points (200 = 2%)
        bool initialized;       // Post-deployment initialization flag
    }

    /// @notice All games storage
    Game[] public games;

    /// @notice Next game ID to be assigned
    uint64 public nextGameId = 1;

    /// @notice Contract configuration
    Config public config;

    /// @notice Pending withdrawals for each player
    mapping(address => uint256) public pendingWithdrawals;

    /// @notice EIP-712 typehash for settlement signature verification
    bytes32 private constant SETTLEMENT_TYPEHASH = keccak256(
        "Settlement(uint64 gameId,address[] winners,uint256[] payouts)"
    );

    // ============================================
    // EVENTS
    // ============================================

    event GameCreated(
        uint64 indexed gameId,
        address indexed creator,
        uint256 stake,
        uint8 minPlayers
    );

    event PlayerJoined(
        uint64 indexed gameId,
        address indexed player,
        uint256 playerCount
    );

    event GameStarted(
        uint64 indexed gameId,
        uint256 playerCount
    );

    event GameSettled(
        uint64 indexed gameId,
        address[] winners,
        uint256[] payouts,
        uint256 houseFee
    );

    event Withdrawn(
        address indexed player,
        uint256 amount
    );

    event GameCancelled(
        uint64 indexed gameId,
        address[] refundedPlayers
    );

    event ConfigUpdated(
        string parameter,
        address newValue
    );

    // ============================================
    // ERRORS
    // ============================================

    error GameNotFound(uint64 gameId);
    error GameNotInLobby(uint64 gameId);
    error InvalidStakeAmount();
    error GameAlreadySettled(uint64 gameId);
    error NotAuthorized();
    error InvalidSignature();
    error GameNotInProgress(uint64 gameId);
    error NoPendingWithdrawal();
    error GameAlreadyStarted(uint64 gameId);
    error MinPlayersNotMet();
    error IncorrectStakeAmount(uint256 expected, uint256 received);
    error LengthMismatch();
    error InvalidPayouts();
    error AlreadyInitialized();
    error NotInitialized();
    error HouseCutTooHigh();
    error PlayerAlreadyInGame();

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor() EIP712("Pepasur", "1") {
        config.admin = msg.sender;
        config.feeRecipient = msg.sender;
        config.houseCutBps = 200; // 2%
        config.initialized = false;
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * @notice One-time post-deployment initialization
     * @dev Must be called immediately after deployment
     * @param _serverSigner Address authorized to sign game settlements
     * @param _feeRecipient Address to receive house fees
     */
    function initialize(
        address _serverSigner,
        address _feeRecipient
    ) external {
        if (config.initialized) revert AlreadyInitialized();
        if (msg.sender != config.admin) revert NotAuthorized();
        if (_serverSigner == address(0)) revert InvalidStakeAmount();
        if (_feeRecipient == address(0)) revert InvalidStakeAmount();

        config.serverSigner = _serverSigner;
        config.feeRecipient = _feeRecipient;
        config.initialized = true;

        emit ConfigUpdated("serverSigner", _serverSigner);
        emit ConfigUpdated("feeRecipient", _feeRecipient);
    }

    // ============================================
    // GAME FUNCTIONS
    // ============================================

    /**
     * @notice Create a new game lobby
     * @dev Creator automatically joins as first player
     * @param stakeAmount Amount each player must stake to join (in wei)
     * @param minPlayers Minimum players required to start (2-10)
     */
    function createGame(
        uint256 stakeAmount,
        uint8 minPlayers
    ) external payable returns (uint64) {
        if (!config.initialized) revert NotInitialized();
        if (stakeAmount == 0) revert InvalidStakeAmount();
        if (minPlayers < 2 || minPlayers > 10) revert MinPlayersNotMet();
        if (msg.value != stakeAmount) {
            revert IncorrectStakeAmount(stakeAmount, msg.value);
        }

        uint64 gameId = nextGameId++;

        // Create new game
        Game storage game = games.push();
        game.id = gameId;
        game.creator = msg.sender;
        game.stakeAmount = stakeAmount;
        game.minPlayers = minPlayers;
        game.status = GameStatus.LOBBY;
        game.createdAt = block.timestamp;

        // Creator automatically joins
        game.players.push(msg.sender);
        game.deposits.push(msg.value);
        game.totalPool = msg.value;

        emit GameCreated(gameId, msg.sender, stakeAmount, minPlayers);
        emit PlayerJoined(gameId, msg.sender, 1);

        return gameId;
    }

    /**
     * @notice Join an existing game in lobby
     * @dev Must send exact stake amount. Game auto-starts at min players
     * @param gameId ID of game to join
     */
    function joinGame(uint64 gameId) external payable {
        if (gameId == 0 || gameId >= nextGameId) {
            revert GameNotFound(gameId);
        }

        Game storage game = games[gameId - 1];

        if (game.status != GameStatus.LOBBY) {
            revert GameNotInLobby(gameId);
        }

        if (msg.value != game.stakeAmount) {
            revert IncorrectStakeAmount(game.stakeAmount, msg.value);
        }

        // Check if player already in game
        for (uint i = 0; i < game.players.length; i++) {
            if (game.players[i] == msg.sender) {
                revert PlayerAlreadyInGame();
            }
        }

        // Add player
        game.players.push(msg.sender);
        game.deposits.push(msg.value);
        game.totalPool += msg.value;

        uint256 playerCount = game.players.length;
        emit PlayerJoined(gameId, msg.sender, playerCount);

        // Auto-start game if minimum players reached
        if (playerCount >= game.minPlayers) {
            game.status = GameStatus.IN_PROGRESS;
            emit GameStarted(gameId, playerCount);
        }
    }

    /**
     * @notice Settle a completed game with server signature
     * @dev Only callable with valid signature from authorized server signer
     * @param gameId ID of game to settle
     * @param winners Array of winner addresses
     * @param payouts Array of payout amounts (must match winners length)
     * @param signature EIP-712 signature from server signer
     */
    function settleGame(
        uint64 gameId,
        address[] calldata winners,
        uint256[] calldata payouts,
        bytes calldata signature
    ) external nonReentrant {
        if (gameId == 0 || gameId >= nextGameId) {
            revert GameNotFound(gameId);
        }

        Game storage game = games[gameId - 1];

        if (game.status != GameStatus.IN_PROGRESS) {
            revert GameNotInProgress(gameId);
        }

        if (winners.length != payouts.length) {
            revert LengthMismatch();
        }

        // Verify server signature using EIP-712
        _verifySettlementSignature(gameId, winners, payouts, signature);

        // Calculate house fee
        uint256 houseFee = (game.totalPool * config.houseCutBps) / 10000;
        uint256 remainingPool = game.totalPool - houseFee;

        // Verify payouts don't exceed remaining pool
        uint256 totalPayouts = 0;
        for (uint i = 0; i < payouts.length; i++) {
            totalPayouts += payouts[i];
        }

        if (totalPayouts > remainingPool) {
            revert InvalidPayouts();
        }

        // Queue withdrawals for winners
        for (uint i = 0; i < winners.length; i++) {
            pendingWithdrawals[winners[i]] += payouts[i];
        }

        // Transfer house fee to recipient
        if (houseFee > 0) {
            (bool success, ) = config.feeRecipient.call{value: houseFee}("");
            require(success, "House fee transfer failed");
        }

        // Mark game as settled
        game.status = GameStatus.SETTLED;

        emit GameSettled(gameId, winners, payouts, houseFee);
    }

    /**
     * @notice Withdraw pending rewards
     * @dev Pulls pattern for security. Withdraws all pending balance
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];

        if (amount == 0) {
            revert NoPendingWithdrawal();
        }

        // Clear balance before transfer (checks-effects-interactions)
        pendingWithdrawals[msg.sender] = 0;

        // Transfer funds
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Cancel a game and refund all players
     * @dev Only callable by game creator. Works for LOBBY or IN_PROGRESS games
     * @param gameId ID of game to cancel
     */
    function cancelGame(uint64 gameId) external nonReentrant {
        if (gameId == 0 || gameId >= nextGameId) {
            revert GameNotFound(gameId);
        }

        Game storage game = games[gameId - 1];

        if (msg.sender != game.creator) {
            revert NotAuthorized();
        }

        if (
            game.status != GameStatus.LOBBY &&
            game.status != GameStatus.IN_PROGRESS
        ) {
            revert GameAlreadyStarted(gameId);
        }

        // Refund all players by queueing withdrawals
        for (uint i = 0; i < game.players.length; i++) {
            pendingWithdrawals[game.players[i]] += game.deposits[i];
        }

        game.status = GameStatus.CANCELLED;

        emit GameCancelled(gameId, game.players);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get complete game information
     * @param gameId ID of game to query
     * @return Game struct with all game data
     */
    function getGame(uint64 gameId) external view returns (Game memory) {
        if (gameId == 0 || gameId >= nextGameId) {
            revert GameNotFound(gameId);
        }
        return games[gameId - 1];
    }

    /**
     * @notice Get player's pending withdrawal balance
     * @param player Address to query
     * @return Amount available for withdrawal
     */
    function getPendingWithdrawal(address player) external view returns (uint256) {
        return pendingWithdrawals[player];
    }

    /**
     * @notice Get contract configuration
     * @return Current config struct
     */
    function getConfig() external view returns (Config memory) {
        return config;
    }

    /**
     * @notice Get next game ID that will be assigned
     * @return Next game ID
     */
    function getNextGameId() external view returns (uint64) {
        return nextGameId;
    }

    /**
     * @notice Get total number of games created
     * @return Total games count
     */
    function getTotalGames() external view returns (uint256) {
        return games.length;
    }

    /**
     * @notice Check if a player is in a specific game
     * @param gameId Game ID to check
     * @param player Player address to check
     * @return True if player is in the game
     */
    function isPlayerInGame(uint64 gameId, address player) external view returns (bool) {
        if (gameId == 0 || gameId >= nextGameId) {
            revert GameNotFound(gameId);
        }

        Game storage game = games[gameId - 1];

        for (uint i = 0; i < game.players.length; i++) {
            if (game.players[i] == player) {
                return true;
            }
        }

        return false;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Update server signer address
     * @dev Only callable by admin
     * @param newSigner New server signer address
     */
    function updateServerSigner(address newSigner) external {
        if (msg.sender != config.admin) revert NotAuthorized();
        if (newSigner == address(0)) revert InvalidStakeAmount();

        config.serverSigner = newSigner;
        emit ConfigUpdated("serverSigner", newSigner);
    }

    /**
     * @notice Update fee recipient address
     * @dev Only callable by admin
     * @param newRecipient New fee recipient address
     */
    function updateFeeRecipient(address newRecipient) external {
        if (msg.sender != config.admin) revert NotAuthorized();
        if (newRecipient == address(0)) revert InvalidStakeAmount();

        config.feeRecipient = newRecipient;
        emit ConfigUpdated("feeRecipient", newRecipient);
    }

    /**
     * @notice Update house cut percentage
     * @dev Only callable by admin. Max 20% (2000 bps)
     * @param newCutBps New house cut in basis points
     */
    function updateHouseCut(uint16 newCutBps) external {
        if (msg.sender != config.admin) revert NotAuthorized();
        if (newCutBps > 2000) revert HouseCutTooHigh();

        config.houseCutBps = newCutBps;
    }

    /**
     * @notice Transfer admin role
     * @dev Only callable by current admin
     * @param newAdmin New admin address
     */
    function transferAdmin(address newAdmin) external {
        if (msg.sender != config.admin) revert NotAuthorized();
        if (newAdmin == address(0)) revert InvalidStakeAmount();

        config.admin = newAdmin;
        emit ConfigUpdated("admin", newAdmin);
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    /**
     * @notice Verify EIP-712 signature for settlement
     * @dev Uses EIP-712 typed structured data signing
     * @param gameId Game ID being settled
     * @param winners Array of winner addresses
     * @param payouts Array of payout amounts
     * @param signature Signature to verify
     */
    function _verifySettlementSignature(
        uint64 gameId,
        address[] calldata winners,
        uint256[] calldata payouts,
        bytes calldata signature
    ) internal view {
        // Construct EIP-712 typed data hash
        bytes32 structHash = keccak256(
            abi.encode(
                SETTLEMENT_TYPEHASH,
                gameId,
                keccak256(abi.encodePacked(winners)),
                keccak256(abi.encodePacked(payouts))
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address recoveredSigner = digest.recover(signature);

        if (recoveredSigner != config.serverSigner) {
            revert InvalidSignature();
        }
    }

    // ============================================
    // FALLBACK
    // ============================================

    receive() external payable {
        revert("Direct transfers not allowed");
    }

    fallback() external payable {
        revert("Fallback not allowed");
    }
}
