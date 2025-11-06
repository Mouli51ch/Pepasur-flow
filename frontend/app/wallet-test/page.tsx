'use client';

import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGameContract, useGameInfo, usePendingWithdrawal, formatFlow } from '@/hooks/useGameContract';
import { useState } from 'react';

export default function WalletTestPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { createGame, joinGame, withdraw, isPending, isSuccess, hash } = useGameContract();
  const { data: pendingWithdrawal } = usePendingWithdrawal(address);

  const [testGameId, setTestGameId] = useState<number | null>(null);
  const { data: gameInfo } = useGameInfo(testGameId);

  const handleCreateGame = async () => {
    try {
      const txHash = await createGame('0.001', 2); // 0.001 FLOW, 2 players for testing
      console.log('✅ Game created! Transaction:', txHash);
      alert(`Game created! TX: ${txHash}`);
    } catch (error: any) {
      console.error('❌ Error creating game:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleJoinGame = async () => {
    if (!testGameId) {
      alert('Enter a game ID first');
      return;
    }
    if (!gameInfo) {
      alert('Game info not loaded. Please wait.');
      return;
    }
    try {
      // Use the game's actual stake amount
      const stakeAmount = formatFlow(gameInfo.stakeAmount.toString());
      console.log('💰 Joining game with stake:', stakeAmount, 'FLOW');

      const txHash = await joinGame(testGameId, stakeAmount);
      console.log('✅ Joined game! Transaction:', txHash);
      alert(`Joined game! TX: ${txHash}`);
    } catch (error: any) {
      console.error('❌ Error joining game:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleWithdraw = async () => {
    try {
      const txHash = await withdraw();
      console.log('✅ Withdrawal initiated! Transaction:', txHash);
      alert(`Withdrawal initiated! TX: ${txHash}`);
    } catch (error: any) {
      console.error('❌ Error withdrawing:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen p-8 gaming-bg scanlines">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-press-start pixel-text-3d-green text-center mb-8">
          WALLET TEST PAGE
        </h1>

        {/* Wallet Connection */}
        <Card className="p-6 bg-[#111111]/90 backdrop-blur-sm border border-[#2a2a2a]">
          <h2 className="text-2xl font-press-start pixel-text-3d-green mb-4">
            1. WALLET CONNECTION
          </h2>

          <div className="space-y-4">
            <ConnectButton />

            {isConnected && address && (
              <div className="space-y-2 text-sm font-mono">
                <p className="text-green-400">✅ Connected!</p>
                <p>Address: <span className="text-blue-400">{address}</span></p>
                <p>Balance: <span className="text-yellow-400">
                  {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : 'Loading...'}
                </span></p>
                <p>Network: <span className="text-purple-400">Flow EVM Testnet (545)</span></p>
                {pendingWithdrawal && BigInt(pendingWithdrawal.toString()) > 0n && (
                  <p>Pending Withdrawal: <span className="text-green-400">
                    {formatFlow(pendingWithdrawal.toString())} FLOW
                  </span></p>
                )}
              </div>
            )}

            {!isConnected && (
              <p className="text-yellow-400 text-sm">
                ⚠️ Connect your wallet to test contract interactions
              </p>
            )}
          </div>
        </Card>

        {/* Contract Interactions */}
        <Card className="p-6 bg-[#111111]/90 backdrop-blur-sm border border-[#2a2a2a]">
          <h2 className="text-2xl font-press-start pixel-text-3d-green mb-4">
            2. CONTRACT INTERACTIONS
          </h2>

          <div className="space-y-4">
            {/* Create Game */}
            <div className="p-4 border border-green-500/30 rounded">
              <h3 className="text-lg font-press-start text-green-400 mb-2">Create Game</h3>
              <p className="text-sm text-gray-400 mb-3">
                Creates a game with 0.001 FLOW stake and 2 min players
              </p>
              <Button
                onClick={handleCreateGame}
                disabled={!isConnected || isPending}
                variant="pixel"
                size="pixelLarge"
              >
                {isPending ? 'CREATING...' : 'CREATE TEST GAME'}
              </Button>
            </div>

            {/* Join Game */}
            <div className="p-4 border border-blue-500/30 rounded">
              <h3 className="text-lg font-press-start text-blue-400 mb-2">Join Game</h3>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Enter Game ID (e.g., 1)"
                  value={testGameId || ''}
                  onChange={(e) => setTestGameId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full p-2 bg-black/50 border border-blue-500/30 rounded text-white"
                />
                {gameInfo && (
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>Game ID: {testGameId}</p>
                    <p>Creator: {gameInfo.creator}</p>
                    <p className="text-yellow-400 font-bold">⚠️ Stake Required: {formatFlow(gameInfo.stakeAmount.toString())} FLOW</p>
                    <p>Players: {gameInfo.players.length}/{gameInfo.minPlayers}</p>
                    <p>Status: {['LOBBY', 'IN_PROGRESS', 'SETTLED'][gameInfo.status]}</p>
                  </div>
                )}
                <Button
                  onClick={handleJoinGame}
                  disabled={!isConnected || !testGameId || isPending || !gameInfo}
                  variant="pixel"
                  size="pixelLarge"
                >
                  {isPending ? 'JOINING...' : gameInfo ? `JOIN WITH ${formatFlow(gameInfo.stakeAmount.toString())} FLOW` : 'ENTER GAME ID FIRST'}
                </Button>
              </div>
            </div>

            {/* Withdraw */}
            <div className="p-4 border border-yellow-500/30 rounded">
              <h3 className="text-lg font-press-start text-yellow-400 mb-2">Withdraw Rewards</h3>
              <p className="text-sm text-gray-400 mb-3">
                {pendingWithdrawal && BigInt(pendingWithdrawal.toString()) > 0n
                  ? `You have ${formatFlow(pendingWithdrawal.toString())} FLOW to withdraw`
                  : 'No pending withdrawals'}
              </p>
              <Button
                onClick={handleWithdraw}
                disabled={!isConnected || isPending || !pendingWithdrawal || BigInt(pendingWithdrawal.toString()) === 0n}
                variant="pixel"
                size="pixelLarge"
              >
                {isPending ? 'WITHDRAWING...' : 'WITHDRAW REWARDS'}
              </Button>
            </div>

            {/* Transaction Status */}
            {isSuccess && hash && (
              <div className="p-4 bg-green-500/10 border border-green-500 rounded">
                <p className="text-green-400 font-bold mb-2">✅ Transaction Successful!</p>
                <p className="text-sm text-gray-400 break-all">
                  TX Hash: {hash}
                </p>
                <a
                  href={`https://evm-testnet.flowscan.io/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  View on FlowScan →
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* Contract Info */}
        <Card className="p-6 bg-[#111111]/90 backdrop-blur-sm border border-[#2a2a2a]">
          <h2 className="text-2xl font-press-start pixel-text-3d-green mb-4">
            3. CONTRACT INFO
          </h2>
          <div className="space-y-2 text-sm font-mono">
            <p>Contract: <span className="text-blue-400">0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c</span></p>
            <p>Network: <span className="text-purple-400">Flow EVM Testnet</span></p>
            <p>Chain ID: <span className="text-yellow-400">545</span></p>
            <p>RPC: <span className="text-gray-400">https://testnet.evm.nodes.onflow.org</span></p>
            <a
              href="https://evm-testnet.flowscan.io/address/0x54Fb33115B4b39A40A7267aEB69d2aBBA103Be1c"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 underline block mt-2"
            >
              View Contract on FlowScan →
            </a>
            <a
              href="https://testnet-faucet.onflow.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline block"
            >
              Get Testnet FLOW →
            </a>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6 bg-[#111111]/90 backdrop-blur-sm border border-[#2a2a2a]">
          <h2 className="text-2xl font-press-start pixel-text-3d-green mb-4">
            4. TEST INSTRUCTIONS
          </h2>
          <div className="space-y-3 text-sm text-gray-300">
            <p className="font-bold text-green-400">📋 Testing Steps:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Connect your MetaMask wallet (click button above)</li>
              <li>Add Flow EVM Testnet if not already added (Chain ID: 545)</li>
              <li>Get testnet FLOW from faucet (link above)</li>
              <li>Test "Create Game" - creates a game with 0.001 FLOW</li>
              <li>Note the game ID from transaction</li>
              <li>Test "Join Game" - enter game ID and join</li>
              <li>If you have rewards, test "Withdraw"</li>
            </ol>

            <p className="font-bold text-yellow-400 mt-4">⚠️ Note:</p>
            <p className="ml-4">
              This is a test page. The main application components (wallet-connect.tsx, staking-screen.tsx)
              still use Aptos and need to be updated. This page demonstrates that the infrastructure works!
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
