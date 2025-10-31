# PepAsur Aptos Smart Contract

This contract implements the on-chain logic for the Pepasur game on the Aptos blockchain.

## Architecture

The contract manages the game lifecycle, including game creation, player joining, staking, and settlement. It uses a server-signed settlement mechanism to ensure the integrity of the game results.

## Features

- Create games with configurable stake and minimum players
- Join games and automatic game start when minimum players reached
- Server-signed settlement with winner payouts
- House fee collection
- Withdrawal pattern for winnings
- Emergency game cancellation with refunds
- View functions for game state and balances

## Prerequisites

- Aptos CLI installed

## Network

This contract is deployed on the Aptos Devnet.

## Installation

1. Install Aptos CLI:
```bash
# Check if already installed
aptos --version

# If not, install from https://aptos.dev/tools/aptos-cli/install-cli
```

2. Clone and navigate to contract directory:
```bash
cd contract
```

## Contract Functions

### Entry Functions (Transactions)

#### `create_game(creator: &signer, stake_amount: u64, min_players: u8)`
Create a new game lobby.

#### `join_game(player: &signer, game_id: u64)`
Join an existing game in lobby state.

#### `settle_game(submitter: &signer, game_id: u64, winners: vector<address>, payouts: vector<u64>, signature: vector<u8>)`
Settle a completed game with server signature.

#### `withdraw(player: &signer)`
Withdraw pending winnings to player account.

#### `cancel_game(creator: &signer, game_id: u64)`
Cancel a game.

### View Functions (Read-Only)

#### `get_game(game_id: u64): (u64, address, u64, u8, vector<address>, u8, u64)`
Returns game information.

#### `get_pending_withdrawal(player: address): u64`
Returns pending withdrawal balance for a player.

#### `get_config(): (address, address, u16, bool)`
Returns contract configuration.

#### `get_next_game_id(): u64`
Returns the next game ID to be created.

## Security Considerations

1. **Server Key Management**: The server's private key must be kept secure, as a compromise would allow for the submission of fraudulent game results.
2. **Signature Verification**: The contract verifies all settlements with ED25519 signatures to ensure that only the authorized server can submit results.
3. **Withdrawal Pattern**: The two-step withdrawal pattern (queueing and then withdrawing) helps to prevent reentrancy attacks.
4. **Role Secrecy**: Player roles are never stored on the blockchain, which preserves the secrecy of the game.
