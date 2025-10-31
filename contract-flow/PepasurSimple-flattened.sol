// Sources flattened with hardhat v2.26.4 https://hardhat.org

// SPDX-License-Identifier: MIT

// File contracts/PepasurSimple.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PepasurSimple
 * @notice Simplified on-chain Mafia game with staking and rewards
 * @dev Minimal implementation focusing on core game mechanics
 */
contract PepasurSimple {

    // ============================================
    // STATE VARIABLES
    // ============================================

    address public owner;
    uint64 public nextGameId = 1;
    uint16 public houseCutBps = 200; // 2% house fee

    enum GameStatus { LOBBY, IN_PROGRESS, SETTLED }

    struct Game {
        uint64 id;
        address creator;
        uint256 stakeAmount;
        uint8 minPlayers;
        address[] players;
        GameStatus status;
        uint256 totalPool;
    }

    mapping(uint64 => Game) public games;
    mapping(address => uint256) public pendingWithdrawals;

    // ============================================
    // EVENTS
    // ============================================

    event GameCreated(uint64 indexed gameId, address indexed creator, uint256 stakeAmount);
    event PlayerJoined(uint64 indexed gameId, address indexed player);
    event GameStarted(uint64 indexed gameId, uint256 playerCount);
    event GameSettled(uint64 indexed gameId, address[] winners, uint256 reward);
    event Withdrawn(address indexed player, uint256 amount);

    // ============================================
    // MODIFIERS
    // ============================================

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
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
     */
    function createGame(uint256 stakeAmount, uint8 minPlayers) external payable returns (uint64) {
        require(stakeAmount > 0, "Invalid stake");
        require(minPlayers >= 2 && minPlayers <= 10, "Invalid min players");
        require(msg.value == stakeAmount, "Incorrect value");

        uint64 gameId = nextGameId++;
        Game storage game = games[gameId];

        game.id = gameId;
        game.creator = msg.sender;
        game.stakeAmount = stakeAmount;
        game.minPlayers = minPlayers;
        game.status = GameStatus.LOBBY;
        game.totalPool = stakeAmount;

        game.players.push(msg.sender);

        emit GameCreated(gameId, msg.sender, stakeAmount);
        emit PlayerJoined(gameId, msg.sender);

        return gameId;
    }

    /**
     * @notice Join an existing game
     * @param gameId ID of game to join
     */
    function joinGame(uint64 gameId) external payable {
        Game storage game = games[gameId];

        require(game.id == gameId, "Game not found");
        require(game.status == GameStatus.LOBBY, "Game not in lobby");
        require(msg.value == game.stakeAmount, "Incorrect stake");
        require(game.players.length < 10, "Game full");

        // Check if player already joined
        for (uint i = 0; i < game.players.length; i++) {
            require(game.players[i] != msg.sender, "Already joined");
        }

        game.players.push(msg.sender);
        game.totalPool += msg.value;

        emit PlayerJoined(gameId, msg.sender);

        // Auto-start if min players reached
        if (game.players.length >= game.minPlayers) {
            game.status = GameStatus.IN_PROGRESS;
            emit GameStarted(gameId, game.players.length);
        }
    }

    /**
     * @notice Settle game and distribute rewards (owner only)
     * @param gameId ID of game to settle
     * @param winners Array of winner addresses
     */
    function settleGame(uint64 gameId, address[] calldata winners) external onlyOwner {
        Game storage game = games[gameId];

        require(game.id == gameId, "Game not found");
        require(game.status == GameStatus.IN_PROGRESS, "Game not in progress");
        require(winners.length > 0, "No winners");

        // Calculate rewards
        uint256 houseFee = (game.totalPool * houseCutBps) / 10000;
        uint256 rewardPool = game.totalPool - houseFee;
        uint256 rewardPerWinner = rewardPool / winners.length;

        // Distribute rewards to winners
        for (uint i = 0; i < winners.length; i++) {
            pendingWithdrawals[winners[i]] += rewardPerWinner;
        }

        // Transfer house fee
        if (houseFee > 0) {
            payable(owner).transfer(houseFee);
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

        payable(msg.sender).transfer(amount);

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
        address[] memory players,
        GameStatus status,
        uint256 totalPool
    ) {
        Game storage game = games[gameId];
        return (
            game.id,
            game.creator,
            game.stakeAmount,
            game.minPlayers,
            game.players,
            game.status,
            game.totalPool
        );
    }

    /**
     * @notice Get pending withdrawal for an address
     */
    function getPendingWithdrawal(address player) external view returns (uint256) {
        return pendingWithdrawals[player];
    }

    /**
     * @notice Get all players in a game
     */
    function getPlayers(uint64 gameId) external view returns (address[] memory) {
        return games[gameId].players;
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
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /**
     * @notice Emergency: Refund all players and cancel game (owner only)
     */
    function emergencyRefund(uint64 gameId) external onlyOwner {
        Game storage game = games[gameId];
        require(game.status != GameStatus.SETTLED, "Already settled");

        // Refund all players
        for (uint i = 0; i < game.players.length; i++) {
            pendingWithdrawals[game.players[i]] += game.stakeAmount;
        }

        game.status = GameStatus.SETTLED;
    }
}
