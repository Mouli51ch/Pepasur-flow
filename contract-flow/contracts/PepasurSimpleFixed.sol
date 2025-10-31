// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PepasurSimpleFixed
 * @notice Fixed version with proper 4-player game mechanics
 * @dev Addresses auto-start and reward distribution issues
 */
contract PepasurSimpleFixed {

    // ============================================
    // STATE VARIABLES
    // ============================================

    address public owner;
    uint64 public nextGameId = 1;
    uint16 public houseCutBps = 200; // 2% house fee

    enum GameStatus { LOBBY, READY, IN_PROGRESS, SETTLED }

    struct Game {
        uint64 id;
        address creator;
        uint256 stakeAmount;
        uint8 minPlayers;
        uint8 maxPlayers; // Add max players limit
        address[] players;
        GameStatus status;
        uint256 totalPool;
        uint256 startTime; // When game actually started
    }

    mapping(uint64 => Game) public games;
    mapping(address => uint256) public pendingWithdrawals;

    // ============================================
    // EVENTS
    // ============================================

    event GameCreated(uint64 indexed gameId, address indexed creator, uint256 stakeAmount, uint8 minPlayers, uint8 maxPlayers);
    event PlayerJoined(uint64 indexed gameId, address indexed player, uint256 currentPlayers);
    event GameReady(uint64 indexed gameId, uint256 playerCount); // Game can start but waiting for more players
    event GameStarted(uint64 indexed gameId, uint256 playerCount); // Game actually started
    event GameSettled(uint64 indexed gameId, address[] winners, uint256 rewardPerWinner);
    event Withdrawn(address indexed player, uint256 amount);

    // ============================================
    // MODIFIERS
    // ============================================

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier gameExists(uint64 gameId) {
        require(games[gameId].id == gameId, "Game not found");
        _;
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor() {
        owner = msg.sender;
    }

    // ============================================
    // GAME FUNCTIONS
    // ============================================

    /**
     * @notice Create a new game and join as first player
     * @param stakeAmount Amount each player must stake
     * @param minPlayers Minimum players to start (2-10)
     * @param maxPlayers Maximum players allowed (minPlayers to 10)
     */
    function createGame(uint256 stakeAmount, uint8 minPlayers, uint8 maxPlayers) external payable returns (uint64) {
        require(stakeAmount > 0, "Invalid stake");
        require(minPlayers >= 2 && minPlayers <= 10, "Invalid min players");
        require(maxPlayers >= minPlayers && maxPlayers <= 10, "Invalid max players");
        require(msg.value == stakeAmount, "Incorrect value");

        uint64 gameId = nextGameId++;
        Game storage game = games[gameId];

        game.id = gameId;
        game.creator = msg.sender;
        game.stakeAmount = stakeAmount;
        game.minPlayers = minPlayers;
        game.maxPlayers = maxPlayers;
        game.status = GameStatus.LOBBY;
        game.totalPool = stakeAmount;

        game.players.push(msg.sender);

        emit GameCreated(gameId, msg.sender, stakeAmount, minPlayers, maxPlayers);
        emit PlayerJoined(gameId, msg.sender, 1);

        return gameId;
    }

    /**
     * @notice Join an existing game
     * @param gameId ID of game to join
     */
    function joinGame(uint64 gameId) external payable gameExists(gameId) {
        Game storage game = games[gameId];

        require(game.status == GameStatus.LOBBY || game.status == GameStatus.READY, "Game not accepting players");
        require(msg.value == game.stakeAmount, "Incorrect stake");
        require(game.players.length < game.maxPlayers, "Game full");

        // Check if player already joined
        for (uint i = 0; i < game.players.length; i++) {
            require(game.players[i] != msg.sender, "Already joined");
        }

        game.players.push(msg.sender);
        game.totalPool += msg.value;

        emit PlayerJoined(gameId, msg.sender, game.players.length);

        // Update status based on player count
        if (game.players.length >= game.minPlayers && game.status == GameStatus.LOBBY) {
            game.status = GameStatus.READY;
            emit GameReady(gameId, game.players.length);
        }
    }

    /**
     * @notice Start the game manually (creator or owner only)
     * @param gameId ID of game to start
     */
    function startGame(uint64 gameId) external gameExists(gameId) {
        Game storage game = games[gameId];
        
        require(msg.sender == game.creator || msg.sender == owner, "Not authorized");
        require(game.status == GameStatus.READY, "Game not ready");
        require(game.players.length >= game.minPlayers, "Not enough players");

        game.status = GameStatus.IN_PROGRESS;
        game.startTime = block.timestamp;

        emit GameStarted(gameId, game.players.length);
    }

    /**
     * @notice Auto-start game when max players reached
     */
    function _autoStartIfFull(uint64 gameId) internal {
        Game storage game = games[gameId];
        
        if (game.players.length >= game.maxPlayers && game.status == GameStatus.READY) {
            game.status = GameStatus.IN_PROGRESS;
            game.startTime = block.timestamp;
            emit GameStarted(gameId, game.players.length);
        }
    }

    /**
     * @notice Settle game and distribute rewards (owner only)
     * @param gameId ID of game to settle
     * @param winners Array of winner addresses
     */
    function settleGame(uint64 gameId, address[] calldata winners) external onlyOwner gameExists(gameId) {
        Game storage game = games[gameId];

        require(game.status == GameStatus.IN_PROGRESS, "Game not in progress");
        require(winners.length > 0 && winners.length <= game.players.length, "Invalid winners");

        // Verify all winners are players in the game
        for (uint i = 0; i < winners.length; i++) {
            bool isPlayer = false;
            for (uint j = 0; j < game.players.length; j++) {
                if (game.players[j] == winners[i]) {
                    isPlayer = true;
                    break;
                }
            }
            require(isPlayer, "Winner not in game");
        }

        // Calculate rewards: 98% to winners, 2% house cut
        uint256 houseFee = (game.totalPool * houseCutBps) / 10000;
        uint256 rewardPool = game.totalPool - houseFee;
        uint256 rewardPerWinner = rewardPool / winners.length;

        // Distribute rewards to winners
        for (uint i = 0; i < winners.length; i++) {
            pendingWithdrawals[winners[i]] += rewardPerWinner;
        }

        // Transfer house fee to owner
        if (houseFee > 0) {
            pendingWithdrawals[owner] += houseFee;
        }

        game.status = GameStatus.SETTLED;

        emit GameSettled(gameId, winners, rewardPerWinner);
    }

    /**
     * @notice Withdraw pending rewards
     */
    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending withdrawal");

        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get game details
     */
    function getGame(uint64 gameId) external view returns (
        uint64 id,
        address creator,
        uint256 stakeAmount,
        uint8 minPlayers,
        uint8 maxPlayers,
        address[] memory players,
        GameStatus status,
        uint256 totalPool,
        uint256 startTime
    ) {
        Game storage game = games[gameId];
        return (
            game.id,
            game.creator,
            game.stakeAmount,
            game.minPlayers,
            game.maxPlayers,
            game.players,
            game.status,
            game.totalPool,
            game.startTime
        );
    }

    /**
     * @notice Get pending withdrawal for an address
     */
    function getPendingWithdrawal(address player) external view returns (uint256) {
        return pendingWithdrawals[player];
    }

    /**
     * @notice Check if game can accept more players
     */
    function canJoinGame(uint64 gameId) external view returns (bool) {
        Game storage game = games[gameId];
        return (game.status == GameStatus.LOBBY || game.status == GameStatus.READY) 
               && game.players.length < game.maxPlayers;
    }

    /**
     * @notice Get game statistics
     */
    function getGameStats(uint64 gameId) external view returns (
        uint256 currentPlayers,
        uint256 totalStaked,
        bool canJoin,
        bool canStart
    ) {
        Game storage game = games[gameId];
        return (
            game.players.length,
            game.totalPool,
            (game.status == GameStatus.LOBBY || game.status == GameStatus.READY) && game.players.length < game.maxPlayers,
            game.status == GameStatus.READY && game.players.length >= game.minPlayers
        );
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Update house fee percentage (max 10%)
     */
    function setHouseCut(uint16 newCutBps) external onlyOwner {
        require(newCutBps <= 1000, "Max 10%");
        houseCutBps = newCutBps;
    }

    /**
     * @notice Emergency: Refund all players and cancel game (owner only)
     */
    function emergencyRefund(uint64 gameId) external onlyOwner gameExists(gameId) {
        Game storage game = games[gameId];
        require(game.status != GameStatus.SETTLED, "Already settled");

        // Refund all players their stake
        for (uint i = 0; i < game.players.length; i++) {
            pendingWithdrawals[game.players[i]] += game.stakeAmount;
        }

        game.status = GameStatus.SETTLED;
        game.totalPool = 0; // Mark as refunded
    }

    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}