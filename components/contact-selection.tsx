"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Phone, User, Settings, Plus, Star, Clock } from "lucide-react"
import VoiceChat from "./voice-chat"

interface Contact {
  id: string
  name: string
  personality: string
  avatar: string
  description: string
  specialty: string
  mood: string
  lastUsed?: Date
  isFavorite?: boolean
}

const contacts: Contact[] = [
  {
    id: "maya",
    name: "Maya",
    personality: "Professional & Empathetic",
    avatar: "👩‍💼",
    description: "Your professional AI assistant for business conversations and productivity",
    specialty: "Business Strategy",
    mood: "Focused",
    isFavorite: true,
  },
  {
    id: "miles",
    name: "Miles",
    personality: "Creative & Inspiring",
    avatar: "👨‍🎨",
    description: "Creative AI companion for brainstorming and innovative thinking",
    specialty: "Creative Arts",
    mood: "Energetic",
  },
  {
    id: "sophia",
    name: "Sophia",
    personality: "Wise & Calming",
    avatar: "👩‍🏫",
    description: "Thoughtful AI mentor for learning and personal development",
    specialty: "Education",
    mood: "Serene",
    isFavorite: true,
  },
  {
    id: "alex",
    name: "Alex",
    personality: "Tech-Savvy & Analytical",
    avatar: "👨‍💻",
    description: "Technical AI expert for coding, tech discussions, and problem-solving",
    specialty: "Technology",
    mood: "Analytical",
  },
  {
    id: "luna",
    name: "Luna",
    personality: "Friendly & Supportive",
    avatar: "👩‍⚕️",
    description: "Caring AI companion for wellness, health, and emotional support",
    specialty: "Wellness",
    mood: "Compassionate",
  },
]

export default function ContactSelection() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const getGreeting = () => {
    const hour = currentTime.getHours()
    const name = "User" // In a real app, you'd get this from user context
    if (hour < 12) return `Good morning, ${name}`
    if (hour < 18) return `Good afternoon, ${name}`
    return `Good evening, ${name}`
  }

  const categories = [
    { id: "all", name: "All", icon: User },
    { id: "favorites", name: "Favorites", icon: Star },
    { id: "recent", name: "Recent", icon: Clock },
  ]

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.personality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.specialty.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      selectedCategory === "all" ||
      (selectedCategory === "favorites" && contact.isFavorite) ||
      (selectedCategory === "recent" && contact.lastUsed)

    return matchesSearch && matchesCategory
  })

  if (selectedContact) {
    return <VoiceChat contact={selectedContact} onBack={() => setSelectedContact(null)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.05 }}
          >
            <Phone className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Voice AI
            </span>
            <p className="text-xs text-muted-foreground">Premium Assistant</p>
          </div>
        </div>
        <button className="p-2 hover:bg-muted rounded-xl transition-colors">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </header>

      {/* Main Content */}
      <div className="px-6 pb-6">
        {/* Greeting Section */}
        <div className="text-center mb-8">
          <motion.h1
            className="text-4xl font-bold text-foreground mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {getGreeting()}
          </motion.h1>
          <motion.p
            className="text-muted-foreground text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Choose an AI personality to start your conversation
          </motion.p>
        </div>

        {/* Search Bar */}
        <motion.div
          className="max-w-md mx-auto mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <input
            type="text"
            placeholder="Search assistants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </motion.div>

        {/* Category Filters */}
        <motion.div
          className="flex justify-center gap-2 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  selectedCategory === category.id
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-card hover:bg-card/80 text-card-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            )
          })}
        </motion.div>

        {/* Contact Cards */}
        <div className="max-w-2xl mx-auto">
          {filteredContacts.length === 0 ? (
            <motion.div className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No assistants found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or category filter</p>
            </motion.div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredContacts.map((contact, index) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <button
                    onClick={() => setSelectedContact(contact)}
                    className="w-full p-6 bg-card hover:bg-card/80 rounded-2xl border border-border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] text-left relative overflow-hidden"
                  >
                    {/* Favorite indicator */}
                    {contact.isFavorite && (
                      <div className="absolute top-4 right-4">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Avatar with mood indicator */}
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center text-2xl group-hover:from-primary/30 group-hover:to-accent/30 transition-all">
                          {contact.avatar}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card"></div>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Name and call button */}
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                          <h3 className="font-bold text-lg text-card-foreground truncate">{contact.name}</h3>
                        </div>

                        {/* Personality and specialty */}
                        <div className="space-y-1 mb-3">
                          <p className="text-sm font-medium text-primary">{contact.personality}</p>
                          <p className="text-xs text-accent">
                            {contact.specialty} • {contact.mood}
                          </p>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground leading-relaxed">{contact.description}</p>

                        {/* Last used indicator */}
                        {contact.lastUsed && (
                          <div className="flex items-center gap-1 mt-3">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Last used {contact.lastUsed.toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hover effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Add Custom Assistant Button */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button className="flex items-center gap-2 mx-auto px-6 py-3 bg-muted hover:bg-muted/80 rounded-2xl transition-all hover:scale-105 text-muted-foreground">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Create Custom Assistant</span>
          </button>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-xs text-muted-foreground">
            Powered by advanced AI • Secure & Private • {contacts.length} Personalities Available
          </p>
        </motion.div>
      </div>
    </div>
  )
}
