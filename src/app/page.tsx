"use client";

import { useState, useEffect, useRef } from "react";
import type { Song } from "@/db/schema";

const GENRES = ["Cinematic", "Jazz", "Lo-fi", "Electronic", "Ambient", "Classical", "Rock", "Acoustic"];
const MOODS = ["Uplifting", "Relaxing", "Energetic", "Melancholic", "Mysterious", "Happy", "Dark", "Romantic"];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(15);
  const [generating, setGenerating] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({});

  useEffect(() => {
    fetchSongs();
  }, []);

  async function fetchSongs() {
    try {
      const res = await fetch("/api/songs");
      const data = await res.json();
      setSongs(data.songs || []);
    } catch {
      // silently fail on load
    } finally {
      setLoadingSongs(false);
    }
  }

  function addTag(tag: string) {
    setPrompt((p) => (p ? `${p}, ${tag.toLowerCase()}` : tag.toLowerCase()));
  }

  async function generate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, title, duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setSongs((prev) => [data.song, ...prev]);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  async function deleteSong(id: number) {
    try {
      await fetch(`/api/songs/${id}`, { method: "DELETE" });
      setSongs((prev) => prev.filter((s) => s.id !== id));
      if (playingId === id) setPlayingId(null);
    } catch {
      // ignore
    }
  }

  function togglePlay(id: number) {
    const audio = audioRefs.current[id];
    if (!audio) return;

    if (playingId === id) {
      audio.pause();
      setPlayingId(null);
    } else {
      if (playingId !== null && audioRefs.current[playingId]) {
        audioRefs.current[playingId]!.pause();
      }
      audio.play();
      setPlayingId(id);
    }
  }

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)", padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--accent-light))", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 18 }}>♪</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>AI Music Generator</h1>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: 99 }}>Free · Instrumental</span>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        {/* Generator Card */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px", marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, background: "linear-gradient(135deg, var(--text), var(--accent-light))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Create Music with AI
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 28, fontSize: 15 }}>Describe the music you want and let AI compose it for you.</p>

          {/* Title */}
          <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>Title (optional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My awesome track..."
            style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", color: "var(--text)", fontSize: 15, outline: "none", marginBottom: 20 }}
          />

          {/* Prompt */}
          <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>Describe your music *</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. calm piano melody with soft strings, cinematic, peaceful..."
            rows={3}
            style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", color: "var(--text)", fontSize: 15, outline: "none", resize: "vertical", fontFamily: "inherit", marginBottom: 16 }}
          />

          {/* Genre tags */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 8 }}>Genres:</span>
            {GENRES.map((g) => (
              <button key={g} onClick={() => addTag(g)} style={{ fontSize: 12, padding: "4px 10px", marginRight: 6, marginBottom: 6, borderRadius: 99, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-muted)", cursor: "pointer" }}>
                {g}
              </button>
            ))}
          </div>

          {/* Mood tags */}
          <div style={{ marginBottom: 24 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 8 }}>Moods:</span>
            {MOODS.map((m) => (
              <button key={m} onClick={() => addTag(m)} style={{ fontSize: 12, padding: "4px 10px", marginRight: 6, marginBottom: 6, borderRadius: 99, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-muted)", cursor: "pointer" }}>
                {m}
              </button>
            ))}
          </div>

          {/* Duration */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
              Duration: <strong style={{ color: "var(--text)" }}>{duration}s</strong>
            </label>
            <input
              type="range"
              min={5}
              max={30}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              <span>5s</span><span>30s</span>
            </div>
          </div>

          {error && (
            <div style={{ background: "#2d1b1b", border: "1px solid #7f1d1d", borderRadius: 8, padding: "12px 16px", color: "#f87171", fontSize: 14, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <button
            onClick={generate}
            disabled={generating || !prompt.trim()}
            className={generating ? "generating-btn" : ""}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 12,
              border: "none",
              background: generating || !prompt.trim() ? "var(--border)" : "linear-gradient(135deg, var(--accent), var(--accent-light))",
              color: "white",
              fontSize: 16,
              fontWeight: 600,
              cursor: generating || !prompt.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "all 0.2s",
            }}
          >
            {generating ? (
              <>
                <WaveBars />
                Generating your music...
              </>
            ) : (
              <>♪ Generate Music</>
            )}
          </button>

          {generating && (
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, marginTop: 12 }}>
              This may take 30–60 seconds — AI is composing your track ✨
            </p>
          )}
        </div>

        {/* Songs Library */}
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: "var(--text)" }}>
            Your Library {songs.length > 0 && <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 400 }}>({songs.length} tracks)</span>}
          </h3>

          {loadingSongs ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>Loading...</div>
          ) : songs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>♪</div>
              <p style={{ fontSize: 16 }}>No songs yet. Generate your first track above!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {songs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isPlaying={playingId === song.id}
                  onTogglePlay={() => togglePlay(song.id)}
                  onDelete={() => deleteSong(song.id)}
                  audioRef={(el) => { audioRefs.current[song.id] = el; }}
                  onEnded={() => setPlayingId(null)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function WaveBars() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 20 }}>
      {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
        <div
          key={i}
          className="wave-bar"
          style={{
            width: 3,
            height: 16,
            background: "white",
            borderRadius: 2,
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function SongCard({
  song,
  isPlaying,
  onTogglePlay,
  onDelete,
  audioRef,
  onEnded,
  formatDate,
}: {
  song: Song;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onDelete: () => void;
  audioRef: (el: HTMLAudioElement | null) => void;
  onEnded: () => void;
  formatDate: (d: Date | string) => string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${isPlaying ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        transition: "border-color 0.2s",
      }}
    >
      {/* Play button */}
      <button
        onClick={onTogglePlay}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "none",
          background: isPlaying ? "var(--accent)" : "var(--bg-input)",
          color: "white",
          fontSize: 16,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 0.2s",
        }}
      >
        {isPlaying ? "⏸" : "▶"}
      </button>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {song.title}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {song.prompt}
        </div>
        {isPlaying && (
          <div style={{ marginTop: 8 }}>
            <audio
              ref={audioRef}
              src={song.audioUrl}
              onEnded={onEnded}
              controls
              autoPlay
              style={{ width: "100%", height: 32, accentColor: "var(--accent)" }}
            />
          </div>
        )}
      </div>

      {/* Meta */}
      <div style={{ textAlign: "right", flexShrink: 0, fontSize: 12, color: "var(--text-muted)" }}>
        <div>{song.duration}s</div>
        <div style={{ marginTop: 4 }}>{formatDate(song.createdAt)}</div>
      </div>

      {/* Download */}
      <a
        href={song.audioUrl}
        download={`${song.title}.wav`}
        style={{ color: "var(--text-muted)", fontSize: 18, textDecoration: "none", flexShrink: 0 }}
        title="Download"
      >
        ↓
      </a>

      {/* Delete */}
      <button
        onClick={onDelete}
        style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer", flexShrink: 0, padding: "4px 8px" }}
        title="Delete"
      >
        ×
      </button>
    </div>
  );
}
