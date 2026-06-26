import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { songs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { del } from "@vercel/blob";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [song] = await db
      .select()
      .from(songs)
      .where(eq(songs.id, Number(id)));

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    await del(song.audioUrl);
    await db.delete(songs).where(eq(songs.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: "Failed to delete song" }, { status: 500 });
  }
}
