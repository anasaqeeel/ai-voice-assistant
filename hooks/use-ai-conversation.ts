"use client"

import { useState, useCallback } from "react"
import { audioManager } from "@/lib/audio-utils"

interface Message {
  role: "user" | "assistant" | "idle"
  content: string
  timestamp: Date
}

export function useAIConversation(contactId: string) {
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [conversation, setConversation] = useState<Message[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [useElevenLabs, setUseElevenLabs] = useState(true)

  const sendMessage = useCallback(
    async (audioBlob: Blob) => {
      try {
        setIsConnecting(true)

        await audioManager.resumeAudioContext()

        const formData = new FormData()
        formData.append("audio", audioBlob, "recording.webm")
        formData.append("contactId", contactId)

        const endpoint = useElevenLabs ? "/api/chat/elevenlabs" : "/api/chat"

        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to process audio")
        }

        const userInput = decodeURIComponent(response.headers.get("X-User-Input") || "")
        const aiResponse = decodeURIComponent(response.headers.get("X-AI-Response") || "")

        if (userInput) {
          const userMessage: Message = {
            role: "user",
            content: userInput,
            timestamp: new Date(),
          }
          setConversation((prev) => [...prev, userMessage])
        }

        if (aiResponse) {
          const aiMessage: Message = {
            role: "assistant",
            content: aiResponse,
            timestamp: new Date(),
          }
          setConversation((prev) => [...prev, aiMessage])
        }

        const responseAudio = await response.blob()

        setIsAISpeaking(true)

        try {
          await audioManager.playAudioBlob(responseAudio)
        } finally {
          setIsAISpeaking(false)
        }
      } catch (error) {
        console.error("Error in AI conversation:", error)
        setIsAISpeaking(false)
      } finally {
        setIsConnecting(false)
      }
    },
    [contactId, useElevenLabs],
  )

  const sendIdleResponse = useCallback(
    async (idleText: string) => {
      try {
        console.log("[v0] Sending idle response:", idleText)
        setIsConnecting(true)

        // Add idle message to conversation
        const idleMessage: Message = {
          role: "idle",
          content: idleText,
          timestamp: new Date(),
        }
        setConversation((prev) => [...prev, idleMessage])

        await audioManager.resumeAudioContext()

        // Create a simple TTS request for the idle response
        const endpoint = useElevenLabs ? "/api/chat/elevenlabs/idle" : "/api/chat/idle"

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: idleText,
            contactId: contactId,
          }),
        })

        if (!response.ok) {
          console.error("Failed to generate idle response audio")
          return
        }

        const responseAudio = await response.blob()

        setIsAISpeaking(true)

        try {
          await audioManager.playAudioBlob(responseAudio)
        } finally {
          setIsAISpeaking(false)
        }
      } catch (error) {
        console.error("Error in idle response:", error)
        setIsAISpeaking(false)
      } finally {
        setIsConnecting(false)
      }
    },
    [contactId, useElevenLabs],
  )

  const toggleTTSProvider = useCallback(() => {
    setUseElevenLabs((prev) => !prev)
  }, [])

  const clearConversation = useCallback(() => {
    setConversation([])
    audioManager.stopCurrentAudio()
  }, [])

  return {
    isAISpeaking,
    conversation,
    sendMessage,
    sendIdleResponse, // Expose idle response function
    isConnecting,
    useElevenLabs,
    toggleTTSProvider,
    clearConversation,
  }
}
