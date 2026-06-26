import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { songs } from "@/db/schema";
import lamejs from "lamejs";

const HF_API_URL = "https://router.huggingface.co/hf-inference/models/facebook/musicgen-small";

function wavToMp3(wavBuffer: ArrayBuffer): Buffer {
  const view = new DataView(wavBuffer);

  const numChannels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);

  const dataOffset = 44;
  const dataLength = wavBuffer.byteLength - dataOffset;
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = dataLength / (bytesPerSample * numChannels);

  const encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128);
  const mp3Chunks: Int8Array[] = [];

  const blockSize = 1152;
  const left = new Int16Array(blockSize);
  const right = numChannels > 1 ? new Int16Array(blockSize) : undefined;

  for (let i = 0; i < numSamples; i += blockSize) {
    const count = Math.min(blockSize, numSamples - i);
    for (let j = 0; j < count; j++) {
      const idx = dataOffset + (i + j) * bytesPerSample * numChannels;
      left[j] = view.getInt16(idx, true);
      if (right) right[j] = view.getInt16(idx + bytesPerSample, true);
    }
    const chunk = right
      ? encoder.encodeBuffer(left.slice(0, count), right.slice(0, count))
      : encoder.encodeBuffer(left.slice(0, count));
    if (chunk.length > 0) mp3Chunks.push(chunk);
  }

  const final = encoder.flush();
  if (final.length > 0) mp3Chunks.push(final);

  const totalLength = mp3Chunks.reduce((acc, c) => acc + c.length, 0);
  const mp3Buffer = Buffer.alloc(totalLength);
  let offset = 0;
  for (const chunk of mp3Chunks) {
    mp3Buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return mp3Buffer;
}

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

    const wavBuffer = await hfRes.arrayBuffer();
    const mp3Buffer = wavToMp3(wavBuffer);

    const filename = `songs/${Date.now()}.mp3`;
    const { url } = await put(filename, mp3Buffer, {
      access: "public",
      contentType: "audio/mpeg",
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
