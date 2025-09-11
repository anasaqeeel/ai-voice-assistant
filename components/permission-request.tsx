"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Mic, Shield, CheckCircle } from "lucide-react"

interface PermissionRequestProps {
  onPermissionGranted: () => void
}

export default function PermissionRequest({ onPermissionGranted }: PermissionRequestProps) {
  const [isRequesting, setIsRequesting] = useState(false)

  const requestPermission = async () => {
    setIsRequesting(true)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      onPermissionGranted()
    } catch (error) {
      console.error("Microphone permission denied:", error)
      alert(
        "Microphone access is required for voice chat. Please allow microphone permissions in your browser settings.",
      )
    } finally {
      setIsRequesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
        <motion.div
          className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          <Mic className="w-10 h-10 text-primary" />
        </motion.div>

        <h2 className="text-2xl font-bold text-foreground mb-4">Microphone Access Required</h2>

        <p className="text-muted-foreground mb-6 leading-relaxed">
          Voice AI needs access to your microphone to enable voice conversations with our AI assistants.
        </p>

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-primary" />
            <span>Your voice data is processed securely</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span>No recordings are stored permanently</span>
          </div>
        </div>

        <motion.button
          onClick={requestPermission}
          disabled={isRequesting}
          className="w-full px-6 py-3 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isRequesting ? "Requesting Access..." : "Allow Microphone Access"}
        </motion.button>

        <p className="text-xs text-muted-foreground mt-4">
          You can revoke this permission at any time in your browser settings
        </p>
      </motion.div>
    </div>
  )
}
