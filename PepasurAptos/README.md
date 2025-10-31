# Pepasur 🐸

**An on-chain Mafia game powered by Aptos Blockchain**\

Pepasur is a multiplayer Mafia-style social deduction game built
entirely on the Aptos blockchain. Players take on mythological roles,
**ASUR (Mafia)**, **DEV (Doctor)**, **MANAV (Villager)**, and **RISHI
(Detective)** --- and compete through staking, commit-reveal mechanics,
and strategic gameplay.

Each game requires players to stake APT tokens, creating real economic
incentives for fair play. Winners receive rewards distributed
automatically through smart contracts, while losers get partial refunds.
The game features pixel-art styling, real-time multiplayer gameplay, and
transparent on-chain mechanics.

------------------------------------------------------------------------

## 🚀 Features

-   **On-chain Mafia Gameplay**: Fair play with staking + commit-reveal
    actions\
-   **Real Economic Incentives**: Stake APT tokens, win rewards
-   **Real-time Multiplayer**: Socket.io powered live gameplay
-   **Transparent Rewards**: Automatic distribution through smart
    contracts
-   **Pixel Art UI**: Retro gaming aesthetic with modern Web3
    functionality
-   **Cross-platform**: Works on desktop and mobile devices

------------------------------------------------------------------------

## 🛠️ Tech Stack

-   **Blockchain**: Aptos Devnet
-   **Smart Contracts**: Move + Aptos CLI
-   **Backend**: Node.js + Express + Socket.io
-   **Frontend**: Next.js + React + TypeScript
-   **Wallet Integration**: Aptos Wallet Adapter
-   **Game Logic**: Commit-reveal cryptography + real-time
    synchronization

------------------------------------------------------------------------

## 📜 Smart Contracts

### Core Game Contract: `pepasur.move`

-   **Game Creation**: Players create rooms with customizable stake
    amounts
-   **Player Joining**: Stake APT tokens to join games
-   **Role Assignment**: Cryptographic commit-reveal for fair role
    distribution
-   **Settlement System**: Server-signed settlements for reward
    distribution
-   **Withdrawal Mechanism**: Players can withdraw rewards anytime

------------------------------------------------------------------------

## 🎮 How to Play

### 1. **Get APT Tokens**

-   **Devnet**: The game is currently running on the Aptos Devnet. Use an Aptos faucet to get devnet tokens.

### 2. **Create or Join a Game**

-   **Create Room**: Stake APT to create a game.
-   **Join Room**: Enter room code and stake APT to join.

### 3. **Play the Game**

-   **Night Phase**: ASUR eliminate targets, DEV protects, RISHI
    investigates
-   **Day Phase**: Vote to eliminate suspected ASUR
-   **Task Phase**: Complete mini-games for additional rewards

### 4. **Win Rewards**

-   **Mafia Wins**: Mafia takes entire remaining pool.
-   **Non-Mafia Wins**: The reward pool is divided among all non-Mafia players.
-   **House Cut**: 2% goes to platform maintenance.

------------------------------------------------------------------------

## 🌐 Network Configuration

### Aptos Devnet

-   **Chain ID**: 2
-   **RPC URL**: `https://fullnode.devnet.aptoslabs.com`
-   **Block Explorer**: `https://explorer.aptoslabs.com/?network=devnet`

------------------------------------------------------------------------
## ⚡ Quick Start

### Prerequisites

-   Node.js v18+
-   Aptos wallet (Petra, Martian, etc.)
-   APT tokens for staking
