"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const [trimmingId, setTrimmingId] = useState<number | null>(null);
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
      if (trimmingId === id) setTrimmingId(null);
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
                <div key={song.id}>
                  <SongCard
                    song={song}
                    isPlaying={playingId === song.id}
                    isTrimming={trimmingId === song.id}
                    onTogglePlay={() => togglePlay(song.id)}
                    onToggleTrim={() => setTrimmingId(trimmingId === song.id ? null : song.id)}
                    onDelete={() => deleteSong(song.id)}
                    audioRef={(el) => { audioRefs.current[song.id] = el; }}
                    onEnded={() => setPlayingId(null)}
                    formatDate={formatDate}
                  />
                  {trimmingId === song.id && (
                    <LoopTrimmer song={song} onClose={() => setTrimmingId(null)} />
                  )}
                </div>
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
  isTrimming,
  onTogglePlay,
  onToggleTrim,
  onDelete,
  audioRef,
  onEnded,
  formatDate,
}: {
  song: Song;
  isPlaying: boolean;
  isTrimming: boolean;
  onTogglePlay: () => void;
  onToggleTrim: () => void;
  onDelete: () => void;
  audioRef: (el: HTMLAudioElement | null) => void;
  onEnded: () => void;
  formatDate: (d: Date | string) => string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${isPlaying || isTrimming ? "var(--accent)" : "var(--border)"}`,
        borderRadius: isTrimming ? "12px 12px 0 0" : 12,
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
        <div style={{ fontSize: 13, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 8 }}>
          {song.prompt}
        </div>
        <audio
          ref={audioRef}
          src={song.audioUrl}
          onEnded={onEnded}
          controls
          style={{ width: "100%", height: 32, accentColor: "var(--accent)" }}
        />
      </div>

      {/* Meta */}
      <div style={{ textAlign: "right", flexShrink: 0, fontSize: 12, color: "var(--text-muted)" }}>
        <div>{song.duration}s</div>
        <div style={{ marginTop: 4 }}>{formatDate(song.createdAt)}</div>
      </div>

      {/* Trim loop button */}
      <button
        onClick={onToggleTrim}
        title="Trim Loop"
        style={{
          background: isTrimming ? "var(--accent)" : "var(--bg-input)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          color: isTrimming ? "white" : "var(--text-muted)",
          fontSize: 13,
          padding: "6px 10px",
          cursor: "pointer",
          flexShrink: 0,
          transition: "all 0.2s",
        }}
      >
        ✂ Loop
      </button>

      {/* Download */}
      <a
        href={song.audioUrl}
        download={`${song.title}.mp3`}
        style={{ color: "var(--text-muted)", fontSize: 18, textDecoration: "none", flexShrink: 0 }}
        title="Download MP3"
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

function LoopTrimmer({ song, onClose }: { song: Song; onClose: () => void }) {
  const [startPct, setStartPct] = useState(0);
  const [endPct, setEndPct] = useState(100);
  const [totalDuration, setTotalDuration] = useState(song.duration);
  const [looping, setLooping] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);

  const startSec = (startPct / 100) * totalDuration;
  const endSec = (endPct / 100) * totalDuration;
  const loopDuration = endSec - startSec;

  const loadBuffer = useCallback(async () => {
    if (bufferRef.current) return bufferRef.current;
    const res = await fetch(song.audioUrl);
    const arrayBuffer = await res.arrayBuffer();
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    bufferRef.current = decoded;
    setTotalDuration(decoded.duration);
    return decoded;
  }, [song.audioUrl]);

  function stopLoop() {
    sourceRef.current?.stop();
    sourceRef.current = null;
    setLooping(false);
  }

  async function toggleLoop() {
    if (looping) {
      stopLoop();
      return;
    }
    const buffer = await loadBuffer();
    const ctx = ctxRef.current!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = startSec;
    source.loopEnd = endSec;
    source.connect(ctx.destination);
    source.start(0, startSec);
    sourceRef.current = source;
    setLooping(true);
  }

  async function exportLoop() {
    setExporting(true);
    try {
      const buffer = await loadBuffer();
      const sampleRate = buffer.sampleRate;
      const startFrame = Math.floor(startSec * sampleRate);
      const endFrame = Math.floor(endSec * sampleRate);
      const frameCount = endFrame - startFrame;

      const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, frameCount, sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = buffer;
      source.start(0, startSec, loopDuration);
      source.connect(offlineCtx.destination);
      const rendered = await offlineCtx.startRendering();

      const wav = audioBufferToWav(rendered);
      const blob = new Blob([wav], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${song.title}-loop.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    return () => {
      stopLoop();
      ctxRef.current?.close();
    };
  }, []);

  return (
    <div style={{
      background: "var(--bg-input)",
      border: "1px solid var(--accent)",
      borderTop: "none",
      borderRadius: "0 0 12px 12px",
      padding: "20px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>✂ Loop Trimmer</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {startSec.toFixed(1)}s → {endSec.toFixed(1)}s &nbsp;·&nbsp; <strong style={{ color: "var(--text)" }}>{loopDuration.toFixed(1)}s loop</strong>
        </span>
      </div>

      {/* Start slider */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
          Start: {startSec.toFixed(1)}s
        </label>
        <input
          type="range" min={0} max={endPct - 1} value={startPct}
          onChange={(e) => setStartPct(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--accent)" }}
        />
      </div>

      {/* End slider */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
          End: {endSec.toFixed(1)}s
        </label>
        <input
          type="range" min={startPct + 1} max={100} value={endPct}
          onChange={(e) => setEndPct(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--accent)" }}
        />
      </div>

      {/* Visual range bar */}
      <div style={{ height: 6, background: "var(--border)", borderRadius: 3, marginBottom: 20, position: "relative" }}>
        <div style={{
          position: "absolute",
          left: `${startPct}%`,
          width: `${endPct - startPct}%`,
          height: "100%",
          background: "linear-gradient(90deg, var(--accent), var(--accent-light))",
          borderRadius: 3,
        }} />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={toggleLoop}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 8,
            border: "none",
            background: looping ? "var(--accent)" : "var(--bg-card)",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          {looping ? "⏹ Stop Loop" : "▶ Preview Loop"}
        </button>
        <button
          onClick={exportLoop}
          disabled={exporting}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 8,
            border: "none",
            background: exporting ? "var(--border)" : "linear-gradient(135deg, var(--accent), var(--accent-light))",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: exporting ? "not-allowed" : "pointer",
          }}
        >
          {exporting ? "Exporting..." : "↓ Export Loop (.wav)"}
        </button>
      </div>
    </div>
  );
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const arrayBuffer = new ArrayBuffer(44 + length * numChannels * 2);
  const view = new DataView(arrayBuffer);

  function writeStr(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + length * numChannels * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, length * numChannels * 2, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return arrayBuffer;
}
