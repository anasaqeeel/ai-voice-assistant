"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, User, Bot, Clock } from "lucide-react"

interface Message {
  role: "user" | "assistant" | "idle" // Added idle message type
  content: string
  timestamp: Date
}

interface ConversationHistoryProps {
  conversation: Message[]
  contactName: string
  onClose: () => void
}

export default function ConversationHistory({ conversation, contactName, onClose }: ConversationHistoryProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const getMessageStyling = (role: string) => {
    switch (role) {
      case "user":
        return {
          containerClass: "flex-row-reverse",
          avatarClass: "bg-primary text-primary-foreground",
          bubbleClass: "bg-primary text-primary-foreground rounded-br-md",
          textAlign: "text-right",
          icon: <User className="w-4 h-4" />,
        }
      case "idle":
        return {
          containerClass: "flex-row",
          avatarClass: "bg-orange-500 text-white",
          bubbleClass:
            "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-bl-md border border-orange-200 dark:border-orange-800",
          textAlign: "text-left",
          icon: <Clock className="w-4 h-4" />,
        }
      default: // assistant
        return {
          containerClass: "flex-row",
          avatarClass: "bg-accent text-accent-foreground",
          bubbleClass: "bg-muted text-muted-foreground rounded-bl-md",
          textAlign: "text-left",
          icon: <Bot className="w-4 h-4" />,
        }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full bg-card rounded-t-3xl p-6 max-h-[70vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-card-foreground">Conversation</h3>
            <p className="text-sm text-muted-foreground">
              Chat with {contactName} • {conversation.length} messages
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="space-y-4 overflow-y-auto max-h-96 pr-2">
          <AnimatePresence>
            {conversation.map((message, index) => {
              const styling = getMessageStyling(message.role) // Use dynamic styling

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex gap-3 ${styling.containerClass}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${styling.avatarClass}`}
                  >
                    {styling.icon}
                  </div>

                  {/* Message bubble */}
                  <div className={`flex-1 max-w-[80%] ${styling.textAlign}`}>
                    <div className={`inline-block p-3 rounded-2xl ${styling.bubbleClass}`}>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      {message.role === "idle" && <p className="text-xs opacity-70 mt-1 italic">Idle response</p>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-1">{formatTime(message.timestamp)}</p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {conversation.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No conversation yet</p>
              <p className="text-sm text-muted-foreground">
                Start talking to {contactName} to see your chat history here
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
