"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mic, MicOff, Phone, PhoneOff, Volume2, Clock } from "lucide-react";
import VoiceIndicator from "./voice-indicator";
import ConversationHistory from "./conversation-history";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useAIConversation } from "@/hooks/use-ai-conversation";
import { useIdleResponses } from "@/hooks/use-idle-responses";

interface Contact {
  id: string;
  name: string;
  personality: string;
  avatar: string;
  description: string;
}

interface VoiceChatProps {
  contact: Contact;
  onBack: () => void;
}

export default function VoiceChat({ contact, onBack }: VoiceChatProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const {
    isRecording,
    isProcessing,
    handleMouseDown,
    handleMouseUp,
    audioLevel,
    recordingDuration,
    setIsProcessing,
    stopRecording,
  } = useVoiceRecorder();

  const {
    isAISpeaking,
    conversation,
    sendMessage,
    sendIdleResponse,
    isConnecting,
    useElevenLabs,
    toggleTTSProvider,
    clearConversation,
    hardStop,      // NEW: make sure we fully stop on back / end call
    interrupt,     // NEW: barge-in when user taps mic
  } = useAIConversation(contact.id);

  const { resetActivityTimer } = useIdleResponses(
    contact.id,
    isCallActive,
    isRecording,
    isAISpeaking,
    isProcessing,
    sendIdleResponse,
  );

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCallActive) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCallActive]);

  // IMPORTANT: allow interrupt even while AI is speaking
  const handleMicPress = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isMuted && isCallActive) {
        // stop current playback/in-flight request immediately
        if (isAISpeaking || isConnecting) {
          interrupt();
        }
        resetActivityTimer();
        handleMouseDown();
      }
    },
    [isMuted, isCallActive, handleMouseDown, resetActivityTimer, isAISpeaking, isConnecting, interrupt]
  );

  const handleMicRelease = useCallback(
    async (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (isRecording && isCallActive) {
        setIsProcessing(true);
        const blob = await stopRecording();
        if (blob && blob.size > 0) {
          await sendMessage(blob);
        }
        setIsProcessing(false);
      }
    },
    [isRecording, isCallActive, stopRecording, sendMessage, setIsProcessing]
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartCall = () => {
    setIsCallActive(true);
    setCallDuration(0);
    resetActivityTimer();
  };

  const handleEndCall = () => {
    // FULL STOP so voice doesn't continue in the background
    hardStop();
    setIsCallActive(false);
    setCallDuration(0);
    clearConversation();
    onBack();
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (isRecording) handleMouseUp();
    if (!isMuted) resetActivityTimer();
  };

  const getStatusText = () => {
    if (!isCallActive) return "Ready to call";
    if (isConnecting) return "Processing your message...";
    if (isAISpeaking) return `${contact.name} is speaking...`;
    if (isRecording) return `Recording... ${formatDuration(recordingDuration)}`;
    if (isProcessing) return "Processing your message...";
    return "Tap and hold to speak";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background relative overflow-hidden">
      <header className="relative z-10 flex items-center justify-between p-6">
        <motion.button
          onClick={handleEndCall /* back should also fully stop */}
          className="p-2 hover:bg-muted/50 rounded-xl transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        <div className="text-center">
          <motion.h2
            className="font-bold text-lg text-primary"
            animate={{ scale: isAISpeaking ? [1, 1.02, 1] : 1 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
          >
            {contact.name} {isCallActive && formatDuration(callDuration)}
          </motion.h2>
          <motion.p
            className="text-sm text-muted-foreground"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          >
            {getStatusText()}
          </motion.p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 hover:bg-muted/50 rounded-xl transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Volume2 className="w-4 h-4" />
          </motion.button>
          <motion.div
            className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center"
            animate={{ scale: isAISpeaking ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
          >
            <span className="text-lg">{contact.avatar}</span>
          </motion.div>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8">
        <AnimatePresence mode="wait">
          {!isCallActive ? (
            <motion.div key="pre-call" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center">
              <motion.button
                onClick={handleStartCall}
                className="w-24 h-24 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Phone className="w-10 h-10 text-white" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="active-call" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center w-full max-w-sm">
              <VoiceIndicator
                isActive={isAISpeaking || isRecording || isProcessing}
                isListening={isRecording}
                isSpeaking={isAISpeaking}
                isProcessing={isProcessing}
                audioLevel={audioLevel}
                size="large"
              />

              <motion.div className="mt-8 mb-12">
                <motion.h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {contact.name}
                </motion.h3>
                <motion.p className="text-muted-foreground text-lg">{getStatusText()}</motion.p>

                {isRecording && (
                  <motion.div className="flex items-center justify-center gap-2 mt-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm text-primary font-mono">{formatDuration(recordingDuration)}</span>
                  </motion.div>
                )}
              </motion.div>

              <div className="flex items-center justify-center gap-6">
                <motion.button
                  onClick={() => setIsMuted((m) => !m)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isMuted ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </motion.button>

                <motion.button
                  onMouseDown={handleMicPress}
                  onMouseUp={handleMicRelease}
                  onTouchStart={handleMicPress}
                  onTouchEnd={handleMicRelease}
                  disabled={isMuted /* allow press even if AI is speaking → we interrupt */}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                    isRecording
                      ? "bg-gradient-to-r from-accent to-primary text-white"
                      : "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  whileHover={{ scale: isRecording ? 1.05 : 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Mic className="w-10 h-10" />
                </motion.button>

                <motion.button
                  onClick={handleEndCall}
                  className="w-14 h-14 bg-destructive hover:bg-destructive/90 rounded-full flex items-center justify-center transition-all duration-300 text-destructive-foreground shadow-lg"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <PhoneOff className="w-6 h-6" />
                </motion.button>
              </div>

              <motion.div className="mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                <motion.button
                  onClick={toggleTTSProvider}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-full bg-muted/30 hover:bg-muted/50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Voice: {useElevenLabs ? "ElevenLabs" : "OpenAI"}
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showHistory && conversation.length > 0 && (
          <ConversationHistory
            conversation={conversation}
            contactName={contact.name}
            onClose={() => setShowHistory(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
