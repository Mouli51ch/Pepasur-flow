"use client"

import GameDiagnostics from '@/components/GameDiagnostics'

export default function DiagnosticsPage() {
  return (
    <div className="min-h-screen p-4 gaming-bg">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold font-press-start pixel-text-3d-white mb-2">
            GAME DIAGNOSTICS
          </h1>
          <p className="text-gray-400">
            Debug transaction failures and game state issues
          </p>
        </div>
        
        <GameDiagnostics />
      </div>
    </div>
  )
}