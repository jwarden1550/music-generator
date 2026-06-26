import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { songs } from "@/db/schema";

const HF_API_URL = "https://api-inference.huggingface.co/models/facebook/musicgen-small";

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration, title } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const clampedDuration = Math.min(Math.max(Number(duration) || 10, 5), 30);

    const hfRes = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: clampedDuration * 50,
        },
      }),
    });

    if (!hfRes.ok) {
      const text = await hfRes.text();
      console.error("HuggingFace error:", text);

      if (hfRes.status === 503) {
        return NextResponse.json(
          { error: "Model is loading, please try again in 30 seconds." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Music generation failed. Please try again." },
        { status: 500 }
      );
    }

    const audioBuffer = await hfRes.arrayBuffer();
    const filename = `songs/${Date.now()}.wav`;

    const { url } = await put(filename, Buffer.from(audioBuffer), {
      access: "public",
      contentType: "audio/wav",
    });

    const songTitle = title?.trim() || prompt.slice(0, 50);

    const [song] = await db
      .insert(songs)
      .values({
        title: songTitle,
        prompt,
        audioUrl: url,
        duration: clampedDuration,
      })
      .returning();

    return NextResponse.json({ song });
  } catch (err) {
    console.error("Generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate music. Please try again." },
      { status: 500 }
    );
  }
}
