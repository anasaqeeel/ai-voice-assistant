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

  // in-flight request + session guards
  const currentReqRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>("");

  const newSessionId = () => Math.random().toString(36).slice(2);

  useEffect(() => {
    if (prevContactId !== contactId) {
      // persona switch → hard reset
      interrupt();
      setConversation([]);
      if (globalStream) {
        globalStream.getTracks().forEach((t) => t.stop());
        globalStream = null;
      }
      setPrevContactId(contactId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, prevContactId]);

  /** Stop audio + cancel any in-flight fetch; advance session so stale responses are ignored. */
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

  /** For End Call / Back */
  const hardStop = useCallback(() => {
    interrupt();
  }, [interrupt]);

  const sendMessage = useCallback(
    async (audioBlob: Blob) => {
      if (!audioBlob || audioBlob.size === 0) return;

      // Enable barge-in: kill current playback/requests before sending
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
          // Don’t inject idle here—just log the error. Idle is managed by your idle hook.
          const maybeJson = await safeJson(response);
          console.error("Audio processing failed:", maybeJson);
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

        // If we got interrupted while waiting, drop this audio
        if (sessionIdRef.current !== mySession) return;

        const responseAudio = await response.blob();

        if (sessionIdRef.current !== mySession) return;

        setIsPlaying(true);
        setIsAISpeaking(true);
        try {
          await audioManager.playAudioBlob(responseAudio);
        } catch (e) {
          console.error("Audio playback failed:", e);
        } finally {
          setIsPlaying(false);
          setIsAISpeaking(false);
        }
      } catch (error: any) {
        if (error?.name === "AbortError") return; // interrupted on purpose
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
      // Don’t stack on top of current audio/requests
      if (isPlaying || isConnecting) return;

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
          const maybeJson = await safeJson(response);
          console.error("Idle response failed:", maybeJson);
          return;
        }

        if (sessionIdRef.current !== mySession) return;
        const responseAudio = await response.blob();
        if (sessionIdRef.current !== mySession) return;

        setIsPlaying(true);
        setIsAISpeaking(true);
        try {
          await audioManager.playAudioBlob(responseAudio);
        } catch (e) {
          console.error("Idle audio playback failed:", e);
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
      globalStream.getTracks().forEach((t) => t.stop());
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
    // expose for UI controls
    hardStop,
    interrupt,
  };
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return { status: res.status };
  }
}
