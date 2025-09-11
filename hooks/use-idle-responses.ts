"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface IdleResponse {
  text: string;
  personality: string;
}

const idleResponses = {
  maya: [
    "I'm here when you're ready to discuss your next strategic move.",
    "Take your time - sometimes the best decisions come from thoughtful reflection.",
    "Hmm... are you considering your options?",
    "I'm listening whenever you want to continue our conversation.",
    "Sometimes silence speaks volumes about deep thinking.",
  ],
  miles: [
    "The creative mind works in mysterious ways... what's brewing in there?",
    "Hmm... I can almost hear the gears of creativity turning.",
    "You're quiet - are you letting inspiration strike?",
    "Sometimes the best ideas come in moments of silence.",
    "I'm here when the creative spark hits you.",
  ],
  sophia: [
    "Silence can be a form of wisdom too, you know.",
    "Take all the time you need - reflection is valuable.",
    "Hmm... are you contemplating something deeper?",
    "Sometimes we learn more in quiet moments than in conversation.",
    "I'm here whenever you're ready to share your thoughts.",
  ],
  alex: [
    "Processing... are you debugging your thoughts?",
    "Hmm... running into a logic puzzle?",
    "Take your time - good code requires careful thinking.",
    "Sometimes the best solutions come after a pause.",
    "I'm here when you're ready to tackle the next challenge.",
  ],
  luna: [
    "It's okay to take a moment for yourself.",
    "Breathing space is important - I'm here when you need me.",
    "Hmm... are you taking a mindful pause?",
    "Sometimes silence is exactly what we need.",
    "I'm here to support you whenever you're ready.",
  ],
};

export function useIdleResponses(
  contactId: string,
  isCallActive: boolean,
  isRecording: boolean,
  isAISpeaking: boolean,
  isProcessing: boolean,
  onIdleResponse: (response: string) => void
) {
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [idleTimeoutId, setIdleTimeoutId] = useState<NodeJS.Timeout | null>(
    null
  );
  const [hasTriggeredIdle, setHasTriggeredIdle] = useState(false);
  const activityTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Reset activity timer
  const resetActivityTimer = useCallback(() => {
    setLastActivityTime(Date.now());
    setHasTriggeredIdle(false);

    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    if (idleTimeoutId) {
      clearTimeout(idleTimeoutId);
      setIdleTimeoutId(null);
    }
  }, [idleTimeoutId]);

  // Trigger idle response
  const triggerIdleResponse = useCallback(() => {
    if (
      !isCallActive ||
      isRecording ||
      isAISpeaking ||
      isProcessing ||
      hasTriggeredIdle
    ) {
      return;
    }

    const responses =
      idleResponses[contactId as keyof typeof idleResponses] ||
      idleResponses.maya;
    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];

    console.log("[v0] Triggering idle response:", randomResponse);
    onIdleResponse(randomResponse);
    setHasTriggeredIdle(true);
  }, [
    contactId,
    isCallActive,
    isRecording,
    isAISpeaking,
    isProcessing,
    hasTriggeredIdle,
    onIdleResponse,
  ]);

  // Set up idle detection
  useEffect(() => {
    if (!isCallActive) {
      return;
    }

    // Clear any existing timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    // Don't set idle timer if AI is busy or user is active
    if (isRecording || isAISpeaking || isProcessing) {
      resetActivityTimer();
      return;
    }

    // Set idle timer for 8-12 seconds of silence (randomized to feel more natural)
    const idleDelay = 8000 + Math.random() * 4000; // 8-12 seconds

    activityTimeoutRef.current = setTimeout(() => {
      triggerIdleResponse();
    }, idleDelay);

    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      if (idleTimeoutId) {
        clearTimeout(idleTimeoutId);
      }
    };
  }, [
    isCallActive,
    isRecording,
    isAISpeaking,
    isProcessing,
    triggerIdleResponse,
    resetActivityTimer,
  ]);

  // Reset when user becomes active
  useEffect(() => {
    if (isRecording) {
      resetActivityTimer();
    }
  }, [isRecording, resetActivityTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      if (idleTimeoutId) {
        clearTimeout(idleTimeoutId);
      }
    };
  }, [idleTimeoutId]);

  return {
    resetActivityTimer,
    lastActivityTime,
  };
}
