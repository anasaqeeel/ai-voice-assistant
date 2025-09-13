import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Buffer } from "buffer";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const elevenLabsVoices = {
  maya: {
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    name: "Maya",
    systemPrompt: `You are Maya, a highly professional and empathetic AI assistant...`,
  },
  miles: {
    voiceId: "pNInz6obpgDQGcFmaJgB",
    name: "Miles",
    systemPrompt: `You are Miles, a creative and inspiring AI companion...`,
  },
  sophia: {
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    name: "Sophia",
    systemPrompt: `You are Sophia, a wise and calming AI mentor...`,
  },
  alex: {
    voiceId: "ErXwobaYiN019PkySvjV",
    name: "Alex",
    systemPrompt: `You are Alex, a tech-savvy and analytical AI expert...`,
  },
  luna: {
    voiceId: "AZnzlk1XvdvUeBnXmlld",
    name: "Luna",
    systemPrompt: `You are Luna, a friendly and supportive AI companion...`,
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

    if (audioFile.size < 1000) {
      console.log("Audio too small");
      return NextResponse.json(
        { error: "Audio too short. Record for at least 1 second." },
        { status: 400 }
      );
    }

    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Audio too large. Maximum 25MB." },
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

    console.log(`Converting speech to text for ${voiceConfig.name}...`);

    let userText = "";
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
        response_format: "json",
        temperature: 0.0,
        prompt:
          "Transcribe spoken English accurately, ignoring background noise and short utterances under 0.5 seconds, focusing on clear speech.",
      });

      userText = transcription.text?.trim() || "";
      console.log("User said:", userText);

      if (!userText || userText.length < 2) {
        console.log("No meaningful speech detected");
        return NextResponse.json(
          { error: "No clear speech detected. Speak louder and closer." },
          { status: 400 }
        );
      }

      const commonErrors = ["you", ".", "uh", "um", "ah", ""];
      if (commonErrors.includes(userText.toLowerCase())) {
        console.log("Detected common error:", userText);
        return NextResponse.json(
          { error: "Unclear audio. Speak more clearly into the mic." },
          { status: 400 }
        );
      }
    } catch (transcriptionError: any) {
      console.error("Whisper error:", transcriptionError);
      if (transcriptionError.message?.includes("too short")) {
        return NextResponse.json(
          { error: "Audio too short. Hold longer and speak clearly." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Failed to process audio. Try again." },
        { status: 400 }
      );
    }

    console.log(`Generating ${voiceConfig.name}'s response...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: voiceConfig.systemPrompt },
        { role: "user", content: userText },
      ],
      max_tokens: 150,
      temperature: 0.8,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) throw new Error("No AI response");

    console.log(`${voiceConfig.name} response:`, aiResponse);

    console.log(`Converting ${voiceConfig.name}'s text to speech...`);
    if (!process.env.ELEVENLABS_API_KEY)
      throw new Error("Missing ElevenLabs key");

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
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.85,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error("ElevenLabs error:", errorText);
      throw new Error(`ElevenLabs failed: ${elevenLabsResponse.status}`);
    }

    const audioBuffer = Buffer.from(await elevenLabsResponse.arrayBuffer());

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
    console.error("API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
