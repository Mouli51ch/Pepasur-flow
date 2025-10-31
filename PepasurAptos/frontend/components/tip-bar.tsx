"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface TipBarProps {
    tips: string[]
    phase: "night" | "voting"
    className?: string
}

export default function TipBar({ tips, phase, className = "" }: TipBarProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const phaseConfig = {
        night: {
            icon: "🌙",
            title: "NIGHT PHASE TIPS",
            color: "bg-purple-900/30 border-purple-500/50",
            textColor: "text-purple-300"
        },
        voting: {
            icon: "🗳️",
            title: "VOTING TIPS",
            color: "bg-orange-900/30 border-orange-500/50",
            textColor: "text-orange-300"
        }
    }

    const config = phaseConfig[phase]

    return (
        <div className={`w-full max-w-4xl mx-auto ${className}`}>
            <div className={`border-2 rounded-none ${config.color} backdrop-blur-sm`}>
                {/* Header - Always visible */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`w-full p-3 flex items-center justify-between ${config.textColor} hover:bg-black/20 transition-colors`}
                >
                    <div className="flex items-center space-x-2">
                        <span className="text-lg">{config.icon}</span>
                        <span className="font-press-start text-xs">{config.title}</span>
                    </div>
                    <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>

                {/* Expandable content */}
                {isExpanded && (
                    <div className="border-t border-current/30 p-3 space-y-2">
                        {tips.map((tip, index) => (
                            <div key={index} className={`text-xs ${config.textColor} flex items-start space-x-2`}>
                                <span className="text-yellow-400 font-bold">•</span>
                                <span>{tip}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}