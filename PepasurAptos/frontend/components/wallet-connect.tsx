'use client';

import { useEffect, useRef } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import GifLoader from "@/components/gif-loader"

interface WalletConnectProps {
  onAddressChange: (address: string | null) => void;
  onJoinGame?: () => void;
  onCreateLobby?: () => void;
  onPublicLobby?: () => void;
}

export default function WalletConnect({
  onAddressChange,
  onJoinGame,
  onCreateLobby,
  onPublicLobby
}: WalletConnectProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const previousAddressRef = useRef<string | null>(null);

  useEffect(() => {
    const currentAddress = isConnected && address ? address : null;

    // Only call onAddressChange if the address actually changed
    if (currentAddress !== previousAddressRef.current) {
      console.log('Wallet address changed:', currentAddress);
      previousAddressRef.current = currentAddress;
      onAddressChange(currentAddress);
    }
  }, [isConnected, address, onAddressChange]);

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 gaming-bg scanlines">
      <div className="relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
        <Card className="w-full p-4 sm:p-6 md:p-8 bg-[#111111]/90 backdrop-blur-sm border border-[#2a2a2a]">
          <div className="text-center space-y-4 sm:space-y-6 md:space-y-8">
            <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-press-start tracking-wider">
              <span className="pixel-text-3d-green pixel-text-3d-float">P</span>
              <span className="pixel-text-3d-green pixel-text-3d-float" style={{ animationDelay: '0.1s' }}>E</span>
              <span className="pixel-text-3d-green pixel-text-3d-float" style={{ animationDelay: '0.2s' }}>P</span>
              <span className="pixel-text-3d-green pixel-text-3d-float" style={{ animationDelay: '0.3s' }}>A</span>
              <span className="pixel-text-3d-green pixel-text-3d-float" style={{ animationDelay: '0.4s' }}>S</span>
              <span className="pixel-text-3d-green pixel-text-3d-float" style={{ animationDelay: '0.5s' }}>U</span>
              <span className="pixel-text-3d-green pixel-text-3d-float" style={{ animationDelay: '0.6s' }}>R</span>
            </div>

            {!isConnected ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-center">
                  <ConnectButton.Custom>
                    {({
                      account,
                      chain,
                      openAccountModal,
                      openChainModal,
                      openConnectModal,
                      mounted,
                    }) => {
                      const ready = mounted;
                      const connected = ready && account && chain;

                      return (
                        <div
                          {...(!ready && {
                            'aria-hidden': true,
                            style: {
                              opacity: 0,
                              pointerEvents: 'none',
                              userSelect: 'none',
                            },
                          })}
                        >
                          {(() => {
                            if (!connected) {
                              return (
                                <Button
                                  onClick={openConnectModal}
                                  variant="pixel"
                                  size="pixelLarge"
                                  className="text-base sm:text-lg"
                                >
                                  CONNECT WALLET
                                </Button>
                              );
                            }

                            if (chain.unsupported) {
                              return (
                                <Button
                                  onClick={openChainModal}
                                  variant="pixelRed"
                                  size="pixelLarge"
                                >
                                  WRONG NETWORK
                                </Button>
                              );
                            }
                          })()}
                        </div>
                      );
                    }}
                  </ConnectButton.Custom>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex justify-center">
                  <GifLoader size="xl" />
                </div>
                <div className="text-base sm:text-lg md:text-xl font-press-start pixel-text-3d-green pixel-text-3d-glow">
                  WALLET CONNECTED
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {onJoinGame && (
                    <Button
                      onClick={onJoinGame}
                      variant="pixel"
                      size="pixelLarge"
                      className="w-full text-sm sm:text-base"
                    >
                      JOIN GAME
                    </Button>
                  )}

                  {onPublicLobby && (
                    <Button
                      onClick={onPublicLobby}
                      variant="pixel"
                      size="pixelLarge"
                      className="w-full text-sm sm:text-base"
                    >
                      PUBLIC LOBBIES
                    </Button>
                  )}

                  {onCreateLobby && (
                    <Button
                      onClick={onCreateLobby}
                      variant="pixelRed"
                      size="pixelLarge"
                      className="w-full text-sm sm:text-base"
                    >
                      CREATE LOBBY
                    </Button>
                  )}

                  <Button
                    variant="pixelOutline"
                    size="pixelLarge"
                    className="w-full text-sm sm:text-base"
                    onClick={() => disconnect()}
                  >
                    DISCONNECT WALLET
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
