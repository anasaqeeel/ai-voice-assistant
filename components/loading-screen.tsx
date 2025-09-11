"use client"

import { motion } from "framer-motion"
import { Phone } from "lucide-react"

interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen({ message = "Loading Voice AI..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
      <div className="text-center">
        <motion.div
          className="w-20 h-20 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 360],
            boxShadow: [
              "0 0 20px rgba(5, 150, 105, 0.3)",
              "0 0 40px rgba(16, 185, 129, 0.5)",
              "0 0 20px rgba(5, 150, 105, 0.3)",
            ],
          }}
          transition={{
            scale: { duration: 2, repeat: Number.POSITIVE_INFINITY },
            rotate: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
            boxShadow: { duration: 2, repeat: Number.POSITIVE_INFINITY },
          }}
        >
          <Phone className="w-8 h-8 text-white" />
        </motion.div>

        <motion.h2
          className="text-xl font-semibold text-foreground mb-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        >
          {message}
        </motion.h2>

        <div className="flex justify-center gap-1">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-primary rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
