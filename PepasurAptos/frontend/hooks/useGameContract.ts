import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { flowTestnet } from '@/lib/wagmi-config';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PEPASUR_CONTRACT_ADDRESS as `0x${string}`;

// PepasurSimpleFixed ABI
export const PEPASUR_SIMPLE_ABI = [
  // Write functions
  {
    inputs: [
      { name: 'stakeAmount', type: 'uint256' },
      { name: 'minPlayers', type: 'uint8' },
      { name: 'maxPlayers', type: 'uint8' }
    ],
    name: 'createGame',
    outputs: [{ name: 'gameId', type: 'uint64' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: 'gameId', type: 'uint64' }],
    name: 'joinGame',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: 'gameId', type: 'uint64' }],
    name: 'startGame',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Read functions
  {
    inputs: [{ name: 'gameId', type: 'uint64' }],
    name: 'getGame',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint64' },
          { name: 'creator', type: 'address' },
          { name: 'stakeAmount', type: 'uint256' },
          { name: 'minPlayers', type: 'uint8' },
          { name: 'maxPlayers', type: 'uint8' },
          { name: 'players', type: 'address[]' },
          { name: 'status', type: 'uint8' },
          { name: 'totalPool', type: 'uint256' },
          { name: 'startTime', type: 'uint256' }
        ],
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'gameId', type: 'uint64' }],
    name: 'canJoinGame',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'gameId', type: 'uint64' }],
    name: 'getGameStats',
    outputs: [
      { name: 'currentPlayers', type: 'uint256' },
      { name: 'totalStaked', type: 'uint256' },
      { name: 'canJoin', type: 'bool' },
      { name: 'canStart', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'getPendingWithdrawal',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'gameId', type: 'uint64' }],
    name: 'getPlayers',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'nextGameId',
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'houseCutBps',
    outputs: [{ name: '', type: 'uint16' }],
    stateMutability: 'view',
    type: 'function'
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint64' },
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: false, name: 'stakeAmount', type: 'uint256' }
    ],
    name: 'GameCreated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint64' },
      { indexed: true, name: 'player', type: 'address' }
    ],
    name: 'PlayerJoined',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint64' },
      { indexed: false, name: 'playerCount', type: 'uint256' }
    ],
    name: 'GameStarted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint64' },
      { indexed: false, name: 'winners', type: 'address[]' },
      { indexed: false, name: 'reward', type: 'uint256' }
    ],
    name: 'GameSettled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'player', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ],
    name: 'Withdrawn',
    type: 'event'
  }
] as const;

/**
 * Hook for writing to game contract (createGame, joinGame, withdraw)
 */
export function useGameContract() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Create game
  const createGame = async (stakeAmountInFlow: string, minPlayers: number, maxPlayers: number = 4) => {
    const stakeAmount = parseEther(stakeAmountInFlow);

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: PEPASUR_SIMPLE_ABI,
      functionName: 'createGame',
      args: [stakeAmount, minPlayers, maxPlayers],
      value: stakeAmount,
      chain: flowTestnet,
    });

    return hash;
  };

  // Join game
  const joinGame = async (gameId: number, stakeAmountInFlow: string) => {
    const stakeAmount = parseEther(stakeAmountInFlow);

    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: PEPASUR_SIMPLE_ABI,
      functionName: 'joinGame',
      args: [BigInt(gameId)],
      value: stakeAmount,
      chain: flowTestnet,
    });

    return hash;
  };

  // Start game manually
  const startGame = async (gameId: number) => {
    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: PEPASUR_SIMPLE_ABI,
      functionName: 'startGame',
      args: [BigInt(gameId)],
      chain: flowTestnet,
    });

    return hash;
  };

  // Withdraw rewards
  const withdraw = async () => {
    const hash = await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: PEPASUR_SIMPLE_ABI,
      functionName: 'withdraw',
      chain: flowTestnet,
    });

    return hash;
  };

  return {
    createGame,
    joinGame,
    startGame,
    withdraw,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Hook to read game info from contract
 */
export function useGameInfo(gameId: number | null) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PEPASUR_SIMPLE_ABI,
    functionName: 'getGame',
    args: gameId ? [BigInt(gameId)] : undefined,
    query: {
      enabled: gameId !== null,
    },
  });
}

/**
 * Hook to read pending withdrawal for a player
 */
export function usePendingWithdrawal(playerAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PEPASUR_SIMPLE_ABI,
    functionName: 'getPendingWithdrawal',
    args: playerAddress ? [playerAddress] : undefined,
    query: {
      enabled: !!playerAddress,
    },
  });
}

/**
 * Hook to read game players
 */
export function useGamePlayers(gameId: number | null) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PEPASUR_SIMPLE_ABI,
    functionName: 'getPlayers',
    args: gameId ? [BigInt(gameId)] : undefined,
    query: {
      enabled: gameId !== null,
    },
  });
}

// Utility functions
export const formatFlow = (wei: bigint | string): string => {
  return formatEther(BigInt(wei));
};

export const parseFlow = (flow: string): bigint => {
  return parseEther(flow);
};
