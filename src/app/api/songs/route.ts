import { NextResponse } from "next/server";
import { db } from "@/db";
import { songs } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allSongs = await db
      .select()
      .from(songs)
      .orderBy(desc(songs.createdAt))
      .limit(50);

    return NextResponse.json({ songs: allSongs });
  } catch (err) {
    console.error("Fetch songs error:", err);
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 });
  }
}
