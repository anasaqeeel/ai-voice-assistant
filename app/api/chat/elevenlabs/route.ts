import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Buffer } from "buffer";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const elevenLabsVoices = {
  maya: {
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - Professional, confident female
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
  },
  miles: {
    voiceId: "pNInz6obpgDQGcFmaJgB", // Adam - Casual, creative male
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
  },
  sophia: {
    voiceId: "EXAVITQu4vr4xnSDxMaL", // Bella - Wise, calming female
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
  },
  alex: {
    voiceId: "ErXwobaYiN019PkySvjV", // Antoni - Technical, analytical male
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
  },
  luna: {
    voiceId: "AZnzlk1XvdvUeBnXmlld", // Domi - Supportive, caring female
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
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const contactId = formData.get("contactId") as string;

    if (!audioFile || !contactId) {
      return NextResponse.json(
        { error: "Missing audio file or contact ID" },
        { status: 400 }
      );
    }

    console.log(
      `Audio file size: ${audioFile.size} bytes, type: ${audioFile.type}`
    );

    // Validate audio file size and type
    if (audioFile.size < 1000) {
      // Less than 1KB is likely too short
      console.log("Audio file too small, skipping transcription");
      return NextResponse.json(
        {
          error:
            "Audio recording too short. Please record for at least 1 second.",
        },
        { status: 400 }
      );
    }

    if (audioFile.size > 25 * 1024 * 1024) {
      // 25MB limit
      return NextResponse.json(
        { error: "Audio file too large. Maximum size is 25MB." },
        { status: 400 }
      );
    }

    const voiceConfig =
      elevenLabsVoices[contactId as keyof typeof elevenLabsVoices];
    if (!voiceConfig) {
      return NextResponse.json(
        { error: "Invalid contact ID" },
        { status: 400 }
      );
    }

    // Step 1: Convert speech to text using Whisper with enhanced error handling
    console.log(`Converting speech to text for ${voiceConfig.name}...`);

    let userText = "";
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
        response_format: "json",
        temperature: 0.2, // Lower temperature for more accurate transcription
      });

      userText = transcription.text?.trim() || "";
      console.log("User said:", userText);

      if (!userText || userText.length < 2) {
        console.log("No meaningful speech detected in transcription");
        return NextResponse.json(
          {
            error:
              "No clear speech detected. Please speak louder and closer to the microphone.",
            suggestion: "Try recording again with clearer speech",
          },
          { status: 400 }
        );
      }

      const commonErrors = ["you", ".", "uh", "um", "ah"];
      if (commonErrors.includes(userText.toLowerCase())) {
        console.log("Detected common transcription error:", userText);
        return NextResponse.json(
          {
            error: "Unclear audio detected. Please try speaking more clearly.",
            suggestion:
              "Make sure you're speaking directly into the microphone",
          },
          { status: 400 }
        );
      }
    } catch (transcriptionError: any) {
      console.error("Whisper transcription error:", transcriptionError);

      if (transcriptionError.message?.includes("too short")) {
        return NextResponse.json(
          {
            error:
              "Audio recording is too short. Please record for at least 1 second.",
            suggestion: "Hold the record button longer and speak clearly",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "Could not process audio. Please try recording again.",
          suggestion: "Make sure your microphone is working and try again",
        },
        { status: 400 }
      );
    }

    // Step 2: Generate AI response using GPT with enhanced personality
    console.log(`Generating ${voiceConfig.name}'s response...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: voiceConfig.systemPrompt,
        },
        {
          role: "user",
          content: userText,
        },
      ],
      max_tokens: 150,
      temperature: 0.8,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("No AI response generated");
    }

    console.log(`${voiceConfig.name} response:`, aiResponse);

    // Step 3: Convert AI response to speech using ElevenLabs
    console.log(
      `Converting ${voiceConfig.name}'s text to speech with ElevenLabs...`
    );

    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error("ElevenLabs API key not configured");
    }

    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: aiResponse,
          model_id: "eleven_multilingual_v2", // Better model for personality
          voice_settings: {
            stability: 0.7, // Slightly more stable for professional voices
            similarity_boost: 0.85, // Higher similarity for consistency
            style: 0.3, // Moderate style for personality
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error("ElevenLabs API error:", errorText);
      throw new Error(`ElevenLabs API error: ${elevenLabsResponse.status}`);
    }

    const audioBuffer = Buffer.from(await elevenLabsResponse.arrayBuffer());

    // Return the audio file with enhanced headers
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "X-AI-Response": encodeURIComponent(aiResponse),
        "X-User-Input": encodeURIComponent(userText),
        "X-Personality": voiceConfig.name,
        "X-Voice-Provider": "elevenlabs",
        "X-Voice-ID": voiceConfig.voiceId,
      },
    });
  } catch (error) {
    console.error("Error in ElevenLabs chat API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
