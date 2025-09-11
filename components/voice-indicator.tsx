"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface VoiceIndicatorProps {
  isActive: boolean
  isListening?: boolean
  isSpeaking?: boolean
  isProcessing?: boolean
  audioLevel?: number
  size?: "small" | "medium" | "large"
}

export default function VoiceIndicator({
  isActive,
  isListening = false,
  isSpeaking = false,
  isProcessing = false,
  audioLevel = 0,
  size = "medium",
}: VoiceIndicatorProps) {
  const [animationKey, setAnimationKey] = useState(0)
  const [waveHeights, setWaveHeights] = useState([0.3, 0.5, 0.4, 0.6, 0.3])

  useEffect(() => {
    if (isActive) {
      setAnimationKey((prev) => prev + 1)
    }
  }, [isActive])

  useEffect(() => {
    if (isListening && audioLevel > 0) {
      // Generate more dynamic wave heights based on actual audio input
      const baseHeights = [0.2, 0.4, 0.3, 0.5, 0.2]
      const newHeights = baseHeights.map((base, index) => {
        const variation = Math.sin(Date.now() * 0.01 + index) * 0.3 + 0.7
        return Math.min(0.9, base + audioLevel * variation)
      })
      setWaveHeights(newHeights)
    } else if (isSpeaking) {
      // Simulated speaking pattern
      const speakingPattern = [0.4, 0.7, 0.5, 0.8, 0.4]
      setWaveHeights(speakingPattern)
    }
  }, [audioLevel, isListening, isSpeaking])

  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-24 h-24",
    large: "w-48 h-48",
  }

  const getIndicatorState = () => {
    if (isProcessing) return "processing"
    if (isSpeaking) return "speaking"
    if (isListening) return "listening"
    return "idle"
  }

  const getColors = () => {
    const state = getIndicatorState()
    switch (state) {
      case "processing":
        return {
          main: "from-yellow-400 via-orange-400 to-red-400",
          glow: "shadow-yellow-400/50",
          ring: "border-yellow-400/30",
          particle: "bg-yellow-300",
        }
      case "speaking":
        return {
          main: "from-accent via-primary to-accent",
          glow: "shadow-accent/60",
          ring: "border-accent/40",
          particle: "bg-accent",
        }
      case "listening":
        return {
          main: "from-primary via-accent to-primary",
          glow: "shadow-primary/60",
          ring: "border-primary/40",
          particle: "bg-primary",
        }
      default:
        return {
          main: "from-muted via-muted-foreground/30 to-muted",
          glow: "shadow-muted/20",
          ring: "border-muted/20",
          particle: "bg-muted-foreground",
        }
    }
  }

  const colors = getColors()

  return (
    <div className="relative flex items-center justify-center">
      {isActive && (
        <>
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={`ring-${animationKey}-${i}`}
              className={`absolute ${sizeClasses[size]} rounded-full border-2 ${colors.ring}`}
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{
                scale: 2.5 + i * 0.3,
                opacity: 0,
              }}
              transition={{
                duration: 3 + i * 0.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </>
      )}

      {isActive && (
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`particle-${animationKey}-${i}`}
              className={`absolute w-1 h-1 ${colors.particle} rounded-full opacity-60`}
              style={{
                left: `${20 + i * 12}%`,
                top: `${30 + Math.sin(i) * 20}%`,
              }}
              animate={{
                y: [-10, -30, -10],
                x: [0, Math.sin(i) * 10, 0],
                opacity: [0.6, 0.2, 0.6],
                scale: [1, 0.5, 1],
              }}
              transition={{
                duration: 2 + i * 0.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </div>
      )}

      {/* Main indicator circle */}
      <motion.div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${colors.main} ${colors.glow} relative overflow-hidden`}
        animate={{
          scale: isActive ? [1, 1.08, 1] : 1,
          rotate: isProcessing ? [0, 360] : 0,
          boxShadow: isActive
            ? [
                `0 0 30px ${
                  colors.glow.includes("yellow")
                    ? "rgba(251, 191, 36, 0.4)"
                    : colors.glow.includes("accent")
                      ? "rgba(16, 185, 129, 0.4)"
                      : "rgba(5, 150, 105, 0.4)"
                }`,
                `0 0 60px ${
                  colors.glow.includes("yellow")
                    ? "rgba(251, 191, 36, 0.6)"
                    : colors.glow.includes("accent")
                      ? "rgba(16, 185, 129, 0.6)"
                      : "rgba(5, 150, 105, 0.6)"
                }`,
                `0 0 30px ${
                  colors.glow.includes("yellow")
                    ? "rgba(251, 191, 36, 0.4)"
                    : colors.glow.includes("accent")
                      ? "rgba(16, 185, 129, 0.4)"
                      : "rgba(5, 150, 105, 0.4)"
                }`,
              ]
            : `0 0 20px rgba(0, 0, 0, 0.1)`,
        }}
        transition={{
          scale: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
          rotate: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
          boxShadow: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
        }}
      >
        {isProcessing && (
          <>
            <motion.div
              className="absolute inset-3 border-4 border-white/30 border-t-white/80 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-6 border-2 border-white/20 border-b-white/60 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
          </>
        )}

        {isListening && !isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center gap-1">
            {waveHeights.map((height, i) => (
              <motion.div
                key={i}
                className="bg-white/90 rounded-full"
                style={{ width: size === "large" ? "6px" : "3px" }}
                animate={{
                  height: [`${height * 20}%`, `${height * 60}%`, `${height * 20}%`],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.1,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        )}

        {isSpeaking && !isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center gap-1">
            {waveHeights.map((height, i) => (
              <motion.div
                key={i}
                className="bg-white/95 rounded-full"
                style={{ width: size === "large" ? "8px" : "4px" }}
                animate={{
                  height: [`${height * 25}%`, `${height * 70}%`, `${height * 25}%`],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 1,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        )}

        {/* Enhanced idle state with subtle animation */}
        {!isActive && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent rounded-full"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
        )}

        <motion.div
          className="absolute inset-2 bg-gradient-to-br from-white/30 to-transparent rounded-full"
          animate={{
            opacity: isActive ? [0.3, 0.6, 0.3] : 0.2,
            scale: isActive ? [1, 1.05, 1] : 1,
          }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  )
}
