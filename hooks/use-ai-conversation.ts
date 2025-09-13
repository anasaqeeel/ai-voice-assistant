"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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

  const currentReqRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>("");

  const newSessionId = () => Math.random().toString(36).slice(2);

  useEffect(() => {
    if (prevContactId !== contactId) {
      // Switching persona: fully reset
      interrupt();
      setConversation([]);
      if (globalStream) {
        globalStream.getTracks().forEach((track) => track.stop());
        globalStream = null;
      }
      setPrevContactId(contactId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, prevContactId]);

  /** Hard stop audio, cancel requests, invalidate pending playback. */
  const interrupt = useCallback(() => {
    try {
      audioManager.stopCurrentAudio();
    } catch {}
    setIsPlaying(false);
    setIsAISpeaking(false);
    if (currentReqRef.current) {
      try {
        currentReqRef.current.abort();
      } catch {}
      currentReqRef.current = null;
    }
    sessionIdRef.current = newSessionId();
  }, []);

  const hardStop = useCallback(() => {
    interrupt();
  }, [interrupt]);

  const sendMessage = useCallback(
    async (audioBlob: Blob) => {
      if (!audioBlob || audioBlob.size === 0) return;

      // Barge-in: kill current audio & request first
      interrupt();
      const mySession = (sessionIdRef.current = newSessionId());

      try {
        setIsConnecting(true);
        await audioManager.resumeAudioContext();

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.mp3");
        formData.append("contactId", contactId);

        const endpoint = useElevenLabs ? "/api/chat/elevenlabs" : "/api/chat";

        const ac = new AbortController();
        currentReqRef.current = ac;

        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
          signal: ac.signal,
        });

        currentReqRef.current = null;

        if (!response.ok) {
          // Body might be empty → include status in logs
          let info: any = {
            status: response.status,
            statusText: response.statusText,
          };
          try {
            info = await response.json();
          } catch {}
          console.error("Audio processing failed:", info);
          return;
        }

        const userInput = decodeURIComponent(
          response.headers.get("X-User-Input") || ""
        );
        const aiResponse = decodeURIComponent(
          response.headers.get("X-AI-Response") || ""
        );

        if (userInput) {
          setConversation((prev) => [
            ...prev,
            { role: "user", content: userInput, timestamp: new Date() },
          ]);
        }
        if (aiResponse) {
          setConversation((prev) => [
            ...prev,
            { role: "assistant", content: aiResponse, timestamp: new Date() },
          ]);
        }

        if (sessionIdRef.current !== mySession) return;
        const responseAudio = await response.blob();
        if (sessionIdRef.current !== mySession) return;

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
      } catch (error: any) {
        if (error?.name === "AbortError") return; // expected on interrupt
        console.error("Conversation error:", error);
      } finally {
        setIsConnecting(false);
      }
    },
    [contactId, useElevenLabs, interrupt]
  );

  const sendIdleResponse = useCallback(
    async (idleText: string) => {
      if (!idleText) return;
      if (isPlaying || isConnecting) return; // don't stack idle on top

      interrupt();
      const mySession = (sessionIdRef.current = newSessionId());

      try {
        setIsConnecting(true);

        setConversation((prev) => [
          ...prev,
          { role: "idle", content: idleText, timestamp: new Date() },
        ]);

        await audioManager.resumeAudioContext();

        const endpoint = useElevenLabs
          ? "/api/chat/elevenlabs/idle"
          : "/api/chat/idle";

        const ac = new AbortController();
        currentReqRef.current = ac;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: idleText, contactId }),
          signal: ac.signal,
        });

        currentReqRef.current = null;

        if (!response.ok) {
          let info: any = {
            status: response.status,
            statusText: response.statusText,
          };
          try {
            info = await response.json();
          } catch {}
          console.error("Idle response failed:", info);
          return;
        }

        if (sessionIdRef.current !== mySession) return;
        const responseAudio = await response.blob();
        if (sessionIdRef.current !== mySession) return;

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
      } catch (error: any) {
        if (error?.name !== "AbortError") console.error("Idle error:", error);
      } finally {
        setIsConnecting(false);
      }
    },
    [contactId, useElevenLabs, isPlaying, isConnecting, interrupt]
  );

  const toggleTTSProvider = useCallback(() => {
    setUseElevenLabs((prev) => !prev);
  }, []);

  const clearConversation = useCallback(() => {
    interrupt();
    setConversation([]);
    if (globalStream) {
      globalStream.getTracks().forEach((track) => track.stop());
      globalStream = null;
    }
  }, [interrupt]);

  return {
    isAISpeaking,
    conversation,
    sendMessage,
    sendIdleResponse,
    isConnecting,
    useElevenLabs,
    toggleTTSProvider,
    clearConversation,
    // expose for UI
    hardStop,
    interrupt,
  };
}
