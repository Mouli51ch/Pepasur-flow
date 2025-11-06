/**
 * Calculate win probabilities for a game based on stake amount and player count
 */
export interface WinProbabilities {
  mafiaWinPercent: number;
  nonMafiaWinPercent: number;
  totalPot: number;
  totalPotInAPT: string;
  netPot: number;
  netPotInAPT: string;
}

export function calculateWinProbabilities(
  stakeAmount: number, // in Octas
  playerCount: number,
  minPlayers: number = 4
): WinProbabilities {
  const totalPot = stakeAmount * playerCount;
  const netPot = totalPot * 0.98; // After 2% house cut

  // Assuming 1 mafia, rest are non-mafia
  const mafiaCount = 1;
  const nonMafiaCount = playerCount - mafiaCount;

  const mafiaWinPercent = playerCount > 0 && nonMafiaCount > 0
    ? Math.round(((netPot / mafiaCount) / stakeAmount - 1) * 100)
    : 0;

  const nonMafiaWinPercent = playerCount > 0 && nonMafiaCount > 0
    ? Math.round(((netPot / nonMafiaCount) / stakeAmount - 1) * 100)
    : 0;

  return {
    mafiaWinPercent,
    nonMafiaWinPercent,
    totalPot,
    totalPotInAPT: (totalPot / 100000000).toFixed(4),
    netPot,
    netPotInAPT: (netPot / 100000000).toFixed(4)
  };
}

/**
 * Format APT amount from Octas
 */
export function formatAPT(octas: number): string {
  return (octas / 100000000).toFixed(4);
}

/**
 * Convert APT to Octas
 */
export function aptToOctas(apt: number): number {
  return Math.floor(apt * 100000000);
}

/**
 * Truncate wallet address for display
 */
export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
