# Business Logic and Reward Analysis

This document provides a detailed analysis of the business logic, reward structure, and win probabilities of the Pepasur game.

## 1. Reward Logic and Flow of Funds (Current Implementation: Simple Logic)

The current reward logic is as follows:

1.  **Staking:** Each player stakes a predetermined amount of APT to join a game.
2.  **Total Pool:** The total pool is the sum of all players' stakes.
3.  **House Cut:** A 2% house cut is taken from the total pool.
4.  **Reward Pool:** The remaining 98% of the total pool becomes the reward pool.
5.  **Distribution:**
    *   If the **Mafia** faction wins, the reward pool is distributed equally among the winning Mafia players.
    *   If the **non-Mafia** faction wins, the reward pool is distributed equally among **all** non-Mafia players (both living and dead).
6.  **Losers:** Players in the losing faction do not get their stake back.

## 2. Minimum and Maximum Possible Losses and Profits (in Percentages)

*   **Losses:**
    *   **Minimum Loss:** 0% (This occurs if you are in the winning faction).
    *   **Maximum Loss:** 100% of your stake (This occurs if you are in the losing faction).

*   **Profits:**
    *   **Minimum Profit:** 0% (This occurs if you are in the losing faction).
    *   **Maximum Profit (4-Player Game Example):**
        *   **Mafia:** If the single Mafia player wins, their profit is the entire reward pool minus their own stake. In a 4-player game, this results in a **292% profit** on their initial stake (`(3.92 * S) - S = 2.92 * S`).
        *   **Non-Mafia:** If the non-Mafia faction wins, the reward pool is divided among all 3 non-Mafia players. Each player's profit is `((3.92 * S) / 3) - S ≈ 0.31 * S` (a **31% profit**).

## 3. Advanced Reward Logic (Proposed)

This is a proposed alternative to the current "Simple" reward logic. It is not currently implemented.

*   If the **non-Mafia** faction wins:
    *   The reward pool is distributed equally among all **surviving** non-Mafia players.
    *   All **dead** non-Mafia players receive their initial stake back (a "no win, no loss hedge").

**Example: Advanced Non-Mafia Profit (4-Player Game)**

*   **Reward Pool:** 3.92 * S
*   If **3 non-Mafia players survive:** Each player's profit is `((3.92 * S) / 3) - S ≈ 0.31 * S` (a **31% profit**).
*   If **2 non-Mafia players survive:** Each player's profit is `((3.92 * S) / 2) - S = 0.96 * S` (a **96% profit**). The dead non-Mafia player gets their stake back.
*   If **1 non-Mafia player survives:** That player's profit is `(3.92 * S) - S = 2.92 * S` (a **292% profit**). The dead non-Mafia players get their stake back.

## 4. Win Rate Analysis (A Note on Assumptions)

It is important to note that calculating precise win rates for a game like Mafia is impossible without making significant assumptions about player behavior. The game's outcome is heavily influenced by factors such as:

*   **Player Skill:** A skilled Mafia player can easily deceive the other players, while a skilled Detective can quickly identify the Mafia.
*   **Strategy:** The strategies employed by the players (e.g., voting blocs, information sharing) can have a major impact on the game's outcome.
*   **Social Dynamics:** The social dynamics of the group (e.g., trust, suspicion) can also play a role.

Therefore, the following analysis is based on a simplified model where all players act randomly. This model provides a baseline for understanding the game's balance, but it does not reflect the complexities of real-world gameplay.

## 5. Probabilistic Analysis (4-Player Game with Random Actions)

In a 4-player game, there is 1 Mafia player and 3 non-Mafia players (Doctor, Detective, Villager).

**Night 1:**

*   The Mafia has a 1/3 chance of killing any of the non-Mafia players.
*   The Doctor has a 1/3 chance of saving any of the other 3 players.
*   The Detective has a 1/3 chance of investigating any of the other 3 players.

**Day 1:**

*   If a player is eliminated during the night, the remaining 3 players will vote to eliminate a player.
*   If no player is eliminated during the night, the 4 players will vote to eliminate a player.

**Win Conditions:**

*   **Mafia Wins:** The Mafia faction wins if the number of Mafia players is equal to or greater than the number of non-Mafia players.
*   **Non-Mafia Wins:** The non-Mafia faction wins if all Mafia players are eliminated.

**Conclusion:**

Even with this simplified model, it is clear that the game is not inherently biased towards any particular faction. The win probabilities are close to 50/50, and the game's outcome is highly dependent on the players' actions.
