import type React from "react"
import type { Metadata } from "next"
import { Orbitron, Share_Tech_Mono } from "next/font/google"
// Added pixel fonts for retro styling
import { Press_Start_2P, VT323, Silkscreen } from 'next/font/google'
import "./globals.css"
import { Suspense } from "react"
import { Toaster } from 'react-hot-toast'

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
})

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-share-tech-mono",
  display: "swap",
})

// Pixel fonts for retro styling
const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start-2p',
  display: 'swap',
})

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-vt323',
  display: 'swap',
})

const silkscreen = Silkscreen({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-silkscreen',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Pepasur Marketplace - NFT Character Upgrades",
  description: "Upgrade your Pepasur characters with rare NFT collectibles. Store metadata on Filecoin via Synapse SDK.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${orbitron.variable} ${shareTechMono.variable} ${pressStart2P.variable} ${vt323.variable} ${silkscreen.variable} antialiased gaming-bg min-h-screen ${pressStart2P.className} overflow-x-hidden`}>
        <Suspense>
          {children}
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#111111',
              color: '#FFFFFF',
              border: '2px solid #4A8C4A',
              borderRadius: '0px',
              fontFamily: 'var(--font-press-start-2p)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              boxShadow: '0 0 10px rgba(74, 140, 74, 0.3)',
            },
            success: {
              iconTheme: {
                primary: '#4A8C4A',
                secondary: '#FFFFFF',
              },
            },
            error: {
              iconTheme: {
                primary: '#8B0000',
                secondary: '#FFFFFF',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
