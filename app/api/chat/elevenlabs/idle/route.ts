import { NextRequest, NextResponse } from "next/server";
import { Buffer } from "buffer";

const elevenLabsVoices: Record<string, string> = {
  maya: "21m00Tcm4TlvDq8ikWAM",
  miles: "pNInz6obpgDQGcFmaJgB",
  sophia: "EXAVITQu4vr4xnSDxMaL",
  alex: "ErXwobaYiN019PkySvjV",
  luna: "AZnzlk1XvdvUeBnXmlld",
};

export async function POST(req: NextRequest) {
  try {
    const { text, contactId } = await req.json();

    if (!text || !contactId || !elevenLabsVoices[contactId]) {
      return NextResponse.json(
        { error: "Invalid idle request" },
        { status: 400 }
      );
    }

    const voiceId = elevenLabsVoices[contactId];

    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenResponse.ok) {
      const err = await elevenResponse.text();
      console.error("Idle ElevenLabs error:", err);
      return NextResponse.json({ error: "Idle TTS failed" }, { status: 500 });
    }

    const audioBuffer = Buffer.from(await elevenResponse.arrayBuffer());

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("Idle API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
