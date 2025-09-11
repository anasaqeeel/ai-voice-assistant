import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const personalities = {
  maya: { voice: "alloy" },
  miles: { voice: "echo" },
  sophia: { voice: "nova" },
  alex: { voice: "onyx" },
  luna: { voice: "shimmer" },
}

export async function POST(request: NextRequest) {
  try {
    const { text, contactId } = await request.json()

    if (!text || !contactId) {
      return NextResponse.json({ error: "Missing text or contact ID" }, { status: 400 })
    }

    const personality = personalities[contactId as keyof typeof personalities]
    if (!personality) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 })
    }

    console.log(`Converting idle response to speech: "${text}"`)

    // Convert idle response to speech using OpenAI TTS
    const speechResponse = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: personality.voice as any,
      input: text,
      speed: 0.95, // Slightly slower for idle responses to sound more natural
    })

    const audioBuffer = Buffer.from(await speechResponse.arrayBuffer())

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "X-Response-Type": "idle",
        "X-Personality": contactId,
      },
    })
  } catch (error) {
    console.error("Error in idle response API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
