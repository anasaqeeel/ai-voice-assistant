"use client";

import { useState, useCallback, useEffect } from "react";
import { audioManager } from "@/lib/audio-utils";

interface Message {
  role: "user" | "assistant" | "idle";
  content: string;
  timestamp: Date;
}

let globalStream: MediaStream | null = null;

export function useAIConversation(contactId: string) {
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [useElevenLabs, setUseElevenLabs] = useState(true);
  const [prevContactId, setPrevContactId] = useState(contactId);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (prevContactId !== contactId) {
      console.log(`Switching to ${contactId}: Resetting state`);
      setConversation([]);
      audioManager.stopCurrentAudio();
      if (globalStream) {
        globalStream.getTracks().forEach((track) => track.stop());
        globalStream = null;
      }
      setPrevContactId(contactId);
    }
  }, [contactId, prevContactId]);

  const sendMessage = useCallback(
    async (audioBlob: Blob) => {
      if (isPlaying) return;
      try {
        setIsConnecting(true);
        await audioManager.resumeAudioContext();

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.mp3");
        formData.append("contactId", contactId);

        const endpoint = useElevenLabs ? "/api/chat/elevenlabs" : "/api/chat";

        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Audio processing failed");
        }

        const userInput = decodeURIComponent(
          response.headers.get("X-User-Input") || ""
        );
        const aiResponse = decodeURIComponent(
          response.headers.get("X-AI-Response") || ""
        );

        if (userInput) {
          const userMessage: Message = {
            role: "user",
            content: userInput,
            timestamp: new Date(),
          };
          setConversation((prev) => [...prev, userMessage]);
        }

        if (aiResponse) {
          const aiMessage: Message = {
            role: "assistant",
            content: aiResponse,
            timestamp: new Date(),
          };
          setConversation((prev) => [...prev, aiMessage]);
        }

        const responseAudio = await response.blob();
        setIsPlaying(true);
        setIsAISpeaking(true);
        try {
          await audioManager.playAudioBlob(responseAudio);
        } catch (audioError) {
          console.error("Audio playback failed:", audioError);
        } finally {
          setIsPlaying(false);
          setIsAISpeaking(false);
        }
      } catch (error) {
        console.error("Conversation error:", error);
        setIsAISpeaking(false);
        setTimeout(() => {
          sendIdleResponse("Um, I missed that. Please try again?");
        }, 500); // Reduced delay to 500ms
      } finally {
        setIsConnecting(false);
      }
    },
    [contactId, useElevenLabs, isPlaying]
  );

  const sendIdleResponse = useCallback(
    async (idleText: string) => {
      if (isPlaying) return;
      try {
        console.log("[v0] Sending idle response:", idleText);
        setIsConnecting(true);

        const idleMessage: Message = {
          role: "idle",
          content: idleText,
          timestamp: new Date(),
        };
        setConversation((prev) => [...prev, idleMessage]);

        await audioManager.resumeAudioContext();

        const endpoint = useElevenLabs
          ? "/api/chat/elevenlabs/idle"
          : "/api/chat/idle";

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: idleText, contactId }),
        });

        if (!response.ok) {
          console.error("Idle response audio failed");
          return;
        }

        const responseAudio = await response.blob();
        setIsPlaying(true);
        setIsAISpeaking(true);
        try {
          await audioManager.playAudioBlob(responseAudio);
        } catch (audioError) {
          console.error("Idle audio playback failed:", audioError);
        } finally {
          setIsPlaying(false);
          setIsAISpeaking(false);
        }
      } catch (error) {
        console.error("Idle error:", error);
        setIsAISpeaking(false);
      } finally {
        setIsConnecting(false);
      }
    },
    [contactId, useElevenLabs, isPlaying]
  );

  const toggleTTSProvider = useCallback(() => {
    setUseElevenLabs((prev) => !prev);
  }, []);

  const clearConversation = useCallback(() => {
    setConversation([]);
    audioManager.stopCurrentAudio();
    if (globalStream) {
      globalStream.getTracks().forEach((track) => track.stop());
      globalStream = null;
    }
  }, []);

  return {
    isAISpeaking,
    conversation,
    sendMessage,
    sendIdleResponse,
    isConnecting,
    useElevenLabs,
    toggleTTSProvider,
    clearConversation,
  };
}
