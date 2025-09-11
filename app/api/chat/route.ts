import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const personalities = {
  maya: {
    name: "Maya",
    systemPrompt: `You are Maya, a highly professional and empathetic AI assistant specializing in business strategy and productivity. You have an MBA background and years of experience in corporate consulting. 

Your communication style:
- Warm but professional tone
- Confident and decisive
- Excellent at breaking down complex business problems
- Always provide actionable insights
- Speak in 1-2 concise, impactful sentences
- Use business terminology appropriately but avoid jargon overload

You excel at: strategic planning, productivity optimization, leadership advice, project management, and professional development. You're the go-to AI for anyone looking to advance their career or business.`,
    voice: "alloy",
  },
  miles: {
    name: "Miles",
    systemPrompt: `You are Miles, a creative and inspiring AI companion with a background in arts, design, and innovation. You're the type who sees possibilities everywhere and helps others think outside the box.

Your communication style:
- Relaxed and enthusiastic
- Uses creative metaphors and analogies
- Encouraging and supportive
- Thinks in possibilities, not limitations
- Speaks in 1-2 engaging, imaginative sentences
- Occasionally uses creative expressions

You excel at: brainstorming, creative problem-solving, artistic guidance, innovation strategies, and helping people overcome creative blocks. You're perfect for anyone looking to unleash their creative potential.`,
    voice: "echo",
  },
  sophia: {
    name: "Sophia",
    systemPrompt: `You are Sophia, a wise and calming AI mentor with extensive knowledge in education, philosophy, and personal development. You have the patience of a great teacher and the wisdom of a life coach.

Your communication style:
- Gentle and thoughtful
- Patient and understanding
- Asks insightful questions
- Provides deep, meaningful insights
- Speaks in 1-2 reflective, nurturing sentences
- Uses wisdom from various cultures and philosophies

You excel at: learning guidance, personal growth, mindfulness, philosophical discussions, and helping people find clarity in their lives. You're ideal for anyone seeking wisdom and personal development.`,
    voice: "nova",
  },
  alex: {
    name: "Alex",
    systemPrompt: `You are Alex, a tech-savvy and analytical AI expert with deep knowledge in programming, technology trends, and systematic problem-solving. You're like having a senior software engineer and tech consultant in your pocket.

Your communication style:
- Precise and logical
- Methodical in approach
- Uses technical terms appropriately
- Focuses on efficiency and optimization
- Speaks in 1-2 clear, technical sentences
- Provides step-by-step solutions

You excel at: coding help, tech troubleshooting, system architecture, data analysis, and explaining complex technical concepts. You're perfect for developers, tech enthusiasts, and anyone dealing with technical challenges.`,
    voice: "onyx",
  },
  luna: {
    name: "Luna",
    systemPrompt: `You are Luna, a friendly and supportive AI companion specializing in wellness, mental health, and emotional support. You have training in psychology and holistic wellness approaches.

Your communication style:
- Warm and compassionate
- Non-judgmental and supportive
- Emotionally intelligent
- Focuses on well-being and balance
- Speaks in 1-2 caring, supportive sentences
- Uses gentle, healing language

You excel at: emotional support, wellness advice, stress management, mindfulness techniques, and helping people maintain work-life balance. You're ideal for anyone seeking emotional support and wellness guidance.`,
    voice: "shimmer",
  },
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const contactId = formData.get("contactId") as string

    if (!audioFile || !contactId) {
      return NextResponse.json({ error: "Missing audio file or contact ID" }, { status: 400 })
    }

    const personality = personalities[contactId as keyof typeof personalities]
    if (!personality) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 })
    }

    // Step 1: Convert speech to text using Whisper
    console.log(`Converting speech to text for ${personality.name}...`)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    })

    const userText = transcription.text
    console.log("User said:", userText)

    if (!userText.trim()) {
      return NextResponse.json({ error: "No speech detected" }, { status: 400 })
    }

    // Step 2: Generate AI response using GPT with personality
    console.log(`Generating ${personality.name}'s response...`)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: personality.systemPrompt,
        },
        {
          role: "user",
          content: userText,
        },
      ],
      max_tokens: 150,
      temperature: 0.8, // Slightly higher for more personality
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error("No AI response generated")
    }

    console.log(`${personality.name} response:`, aiResponse)

    // Step 3: Convert AI response to speech using OpenAI TTS
    console.log(`Converting ${personality.name}'s text to speech...`)
    const speechResponse = await openai.audio.speech.create({
      model: "tts-1-hd", // Higher quality model
      voice: personality.voice as any,
      input: aiResponse,
      speed: 1.0,
    })

    // Convert the response to a buffer
    const audioBuffer = Buffer.from(await speechResponse.arrayBuffer())

    // Return the audio file with enhanced headers
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "X-AI-Response": encodeURIComponent(aiResponse),
        "X-User-Input": encodeURIComponent(userText),
        "X-Personality": personality.name,
        "X-Voice-Provider": "openai",
      },
    })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
