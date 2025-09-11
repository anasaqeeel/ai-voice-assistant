import { type NextRequest, NextResponse } from "next/server";

const elevenLabsVoices = {
  maya: { voiceId: "21m00Tcm4TlvDq8ikWAM" },
  miles: { voiceId: "pNInz6obpgDQGcFmaJgB" },
  sophia: { voiceId: "EXAVITQu4vr4xnSDxMaL" },
  alex: { voiceId: "ErXwobaYiN019PkySvjV" },
  luna: { voiceId: "AZnzlk1XvdvUeBnXmlld" },
};

export async function POST(request: NextRequest) {
  try {
    const { text, contactId } = await request.json();

    if (!text || !contactId) {
      return NextResponse.json(
        { error: "Missing text or contact ID" },
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

    console.log(
      `Converting idle response to speech with ElevenLabs: "${text}"`
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
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.8, // More stable for idle responses
            similarity_boost: 0.85,
            style: 0.2, // Less dramatic for idle responses
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

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "X-Response-Type": "idle",
        "X-Personality": contactId,
        "X-Voice-Provider": "elevenlabs",
      },
    });
  } catch (error) {
    console.error("Error in ElevenLabs idle response API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
