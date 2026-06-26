import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { songs } from "@/db/schema";
import { Client } from "@gradio/client";
import lamejs from "lamejs";

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration, title } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const clampedDuration = Math.min(Math.max(Number(duration) || 10, 5), 30);

    const client = await Client.connect("facebook/MusicGen");

    // Log available endpoints for debugging
    const api = await client.view_api();
    console.log("Available endpoints:", JSON.stringify(Object.keys(api.named_endpoints)));

    const result = await client.predict("/predict", {
      text: prompt,
      melody: null,
      duration: clampedDuration,
      topk: 250,
      topp: 0,
      temperature: 1,
      cfg_coef: 3,
    });

    const output = result.data as Array<{ url?: string; path?: string } | string>;
    const audioEntry = Array.isArray(output) ? output[1] ?? output[0] : output;
    let audioUrl: string;

    if (typeof audioEntry === "string") {
      audioUrl = audioEntry;
    } else if (audioEntry && typeof audioEntry === "object" && (audioEntry.url || audioEntry.path)) {
      audioUrl = (audioEntry.url ?? audioEntry.path) as string;
    } else {
      console.error("Unexpected Gradio output:", JSON.stringify(output));
      return NextResponse.json({ error: "Music generation failed. Please try again." }, { status: 500 });
    }

    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      return NextResponse.json({ error: "Failed to fetch generated audio." }, { status: 500 });
    }

    const wavBuffer = await audioRes.arrayBuffer();
    const mp3Buffer = wavToMp3(wavBuffer);

    const filename = `songs/${Date.now()}.mp3`;
    const { url: blobUrl } = await put(filename, mp3Buffer, {
      access: "public",
      contentType: "audio/mpeg",
    });

    const songTitle = title?.trim() || prompt.slice(0, 50);

    const [song] = await db
      .insert(songs)
      .values({
        title: songTitle,
        prompt,
        audioUrl: blobUrl,
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
