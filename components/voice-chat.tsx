"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  } = useAIConversation(contact.id);

  const { resetActivityTimer } = useIdleResponses(
    contact.id,
    isCallActive,
    isRecording,
    isAISpeaking,
    isProcessing,
    sendIdleResponse,
  );

  // Call timer with dependency array to prevent infinite loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCallActive) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCallActive]); // Dependency on isCallActive only

  const handleMicPress = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isMuted && isCallActive) {
        resetActivityTimer();
        handleMouseDown();
      }
    },
    [isMuted, isCallActive, handleMouseDown, resetActivityTimer]
  );

  const handleMicRelease = useCallback(
    async (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (isRecording && isCallActive) {
        setIsProcessing(true);
        const blob = await stopRecording();
        if (blob && blob.size > 0) {
          console.log(`Sending audio blob of size ${blob.size} bytes to AI...`);
          await sendMessage(blob);
        } else {
          console.warn("No audio captured—try speaking louder or hold longer.");
        }
        setIsProcessing(false);
      }
    },
    [isRecording, isCallActive, stopRecording, sendMessage]
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
    setIsCallActive(false);
    setCallDuration(0);
    clearConversation(); // Clear conversation state
    // Stop any ongoing audio contexts and streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    onBack(); // Navigate back after cleanup
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (isRecording) {
      handleMouseUp(); // Stop on mute
    }
    if (!isMuted) {
      resetActivityTimer();
    }
  };

  const getStatusText = () => {
    if (!isCallActive) return "Ready to call";
    if (isConnecting) return "Processing your message...";
    if (isAISpeaking) return `${contact.name} is speaking...`;
    if (isRecording) return `Recording... ${formatDuration(recordingDuration)}`;
    if (isProcessing) return "Processing your message...";
    return "Tap and hold to speak";
  };

  // Expose refs for cleanup (temporary until hook handles this)
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full"
          animate={{
            scale: isAISpeaking ? [1, 1.3, 1] : [1, 1.1, 1],
            opacity: isAISpeaking ? [0.5, 0.9, 0.5] : [0.3, 0.5, 0.3],
            rotate: [0, 360],
          }}
          transition={{
            scale: { duration: 2, repeat: Number.POSITIVE_INFINITY },
            opacity: { duration: 2, repeat: Number.POSITIVE_INFINITY },
            rotate: { duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full"
          animate={{
            scale: isRecording ? [1, 1.2, 1] : [1, 1.05, 1],
            opacity: isRecording ? [0.3, 0.7, 0.3] : [0.2, 0.4, 0.2],
            rotate: [360, 0],
          }}
          transition={{
            scale: { duration: 1.5, repeat: Number.POSITIVE_INFINITY },
            opacity: { duration: 1.5, repeat: Number.POSITIVE_INFINITY },
            rotate: { duration: 15, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
          }}
        />
        <motion.div
          className="absolute top-1/4 left-1/4 w-20 h-20 bg-primary/10 rounded-full"
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/3 w-16 h-16 bg-accent/10 rounded-full"
          animate={{
            y: [20, -20, 20],
            x: [10, -10, 10],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 1 }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between p-6">
        <motion.button
          onClick={onBack}
          className="p-2 hover:bg-muted/50 rounded-xl transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        <div className="text-center">
          <motion.h2
            className="font-bold text-lg text-primary"
            animate={{
              scale: isAISpeaking ? [1, 1.02, 1] : 1,
              color: isRecording ? "#10b981" : "#059669",
            }}
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
            animate={{
              scale: isAISpeaking ? [1, 1.1, 1] : 1,
              rotate: isProcessing ? [0, 360] : 0,
            }}
            transition={{
              scale: { duration: 1, repeat: Number.POSITIVE_INFINITY },
              rotate: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
            }}
          >
            <span className="text-lg">{contact.avatar}</span>
          </motion.div>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8">
        <AnimatePresence mode="wait">
          {!isCallActive ? (
            <motion.div
              key="pre-call"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <motion.div className="mb-8" whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                <motion.div
                  className="w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center text-6xl mb-6 mx-auto shadow-lg"
                  animate={{
                    boxShadow: [
                      "0 10px 30px rgba(0, 0, 0, 0.1)",
                      "0 20px 60px rgba(5, 150, 105, 0.2)",
                      "0 10px 30px rgba(0, 0, 0, 0.1)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                >
                  {contact.avatar}
                </motion.div>
                <motion.h3
                  className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  {contact.name}
                </motion.h3>
                <p className="text-accent font-medium mb-2">{contact.personality}</p>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{contact.description}</p>
              </motion.div>

              <motion.button
                onClick={handleStartCall}
                className="w-20 h-20 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: [
                    "0 10px 30px rgba(0, 0, 0, 0.2)",
                    "0 20px 60px rgba(5, 150, 105, 0.3)",
                    "0 10px 30px rgba(0, 0, 0, 0.2)",
                  ],
                }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                <Phone className="w-8 h-8 text-white" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="active-call"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center w-full max-w-sm"
            >
              <VoiceIndicator
                isActive={isAISpeaking || isRecording || isProcessing}
                isListening={isRecording}
                isSpeaking={isAISpeaking}
                isProcessing={isProcessing}
                audioLevel={audioLevel}
                size="large"
              />

              <motion.div
                className="mt-8 mb-12"
                animate={{ y: isAISpeaking ? [-2, 2, -2] : 0 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                <motion.h3
                  className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                  animate={{ scale: isAISpeaking ? [1, 1.02, 1] : 1 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                >
                  {contact.name}
                </motion.h3>
                <motion.p
                  className="text-muted-foreground text-lg"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                >
                  {getStatusText()}
                </motion.p>

                {isRecording && (
                  <motion.div
                    className="flex items-center justify-center gap-2 mt-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm text-primary font-mono">{formatDuration(recordingDuration)}</span>
                  </motion.div>
                )}
              </motion.div>

              <div className="flex items-center justify-center gap-6">
                <motion.button
                  onClick={handleMuteToggle}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isMuted
                      ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    boxShadow: isMuted
                      ? [
                          "0 0 20px rgba(255, 76, 76, 0.3)",
                          "0 0 40px rgba(255, 76, 76, 0.5)",
                          "0 0 20px rgba(255, 76, 76, 0.3)",
                        ]
                      : "0 10px 20px rgba(0, 0, 0, 0.1)",
                  }}
                  transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </motion.button>

                <motion.button
                  onMouseDown={handleMicPress}
                  onMouseUp={handleMicRelease}
                  onTouchStart={handleMicPress}
                  onTouchEnd={handleMicRelease}
                  disabled={isMuted || isAISpeaking}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                    isRecording
                      ? "bg-gradient-to-r from-accent to-primary text-white"
                      : "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  whileHover={{ scale: isRecording ? 1.05 : 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    scale: isRecording ? [1, 1.05, 1] : 1,
                    boxShadow: isRecording
                      ? [
                          "0 0 30px rgba(16, 185, 129, 0.5)",
                          "0 0 60px rgba(16, 185, 129, 0.8)",
                          "0 0 30px rgba(16, 185, 129, 0.5)",
                        ]
                      : "0 15px 40px rgba(0, 0, 0, 0.2)",
                  }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
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

              <motion.div
                className="mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
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