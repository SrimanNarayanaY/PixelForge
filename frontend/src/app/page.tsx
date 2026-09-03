"use client";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [lastUsedReference, setLastUsedReference] = useState<string | null>(null);
  const [lastUsedPrompt, setLastUsedPrompt] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check backend health on mount
  useEffect(() => {
    checkBackend();
  }, []);

  async function checkBackend() {
    try {
      const res = await fetch("http://localhost:7777/", { method: "GET" });
      if (res.ok) {
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
    }
  }

  function handleFileProcess(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, WEBP).");
      return;
    }
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
    };
    reader.readAsDataURL(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  }

  function removeUploadedImage() {
    setUploadedImage(null);
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function generateImage(overridePrompt?: string) {
    const textToUse = (overridePrompt ?? prompt).trim();
    if (!textToUse && !uploadedImage) return;
    if (loading) return;

    setLoading(true);
    setImage(null);
    setStatusMessage("Forging your artwork...");

    try {
      const payload: { prompt: string; image?: string } = {
        prompt: textToUse,
      };

      if (uploadedImage) {
        payload.image = uploadedImage;
      }

      const res = await fetch("http://localhost:7777/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Image generation failed");
      }

      setImage(`data:image/png;base64,${data.image}`);
      setLastUsedReference(uploadedImage);
      setLastUsedPrompt(textToUse);
      setStatusMessage(null);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Generation failed";
      setStatusMessage(`Error: ${msg}`);
      alert(`Generation failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  const promptIdeas = uploadedImage
    ? [
        "Transform into futuristic cyberpunk with vibrant neon glow",
        "Reimagine as an ethereal anime studio fantasy scene",
        "Convert into a dramatic Renaissance oil painting masterpiece",
        "Recreate with cinematic 3D lighting, ultra-detailed 8k",
      ]
    : [
        "Cyberpunk neon city street in heavy rain with reflections",
        "Majestic snow leopard with glowing sapphire eyes, 8k render",
        "Anime style peaceful Japanese shrine surrounded by cherry blossoms",
        "Ultra-realistic cinematic portrait of an ancient warrior in ornate gold armor",
      ];

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950 text-white overflow-x-hidden">
      {/* Dynamic ambient background glow */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-violet-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <div className="relative z-10 flex flex-col items-center gap-6 p-6 sm:p-10 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45)] max-w-2xl w-full">
        
        {/* Top Header & Status */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                backendOnline === true
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : backendOnline === false
                  ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                  : "bg-amber-400 animate-ping"
              }`}
            />
            <span className="text-xs text-gray-400 font-medium">
              {backendOnline === true
                ? "PixelEngine Ready"
                : backendOnline === false
                ? "Engine Offline (Port 7777)"
                : "Connecting engine..."}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[11px] text-gray-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>AI Studio</span>
          </div>
        </div>

        {/* Logo and Brand Identity */}
        <div className="flex flex-col items-center gap-3 text-center">
          {/* Custom PixelForge Logo Icon */}
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-cyan-400 p-[1.5px] shadow-[0_0_30px_rgba(139,92,246,0.35)] group">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <svg
                viewBox="0 0 32 32"
                className="w-7 h-7 text-white fill-current transition-transform duration-300 group-hover:scale-110"
              >
                {/* Modern PixelForge Forge / Crystal Anvil icon */}
                <path
                  d="M16 3L6 8.5V19.5L16 25L26 19.5V8.5L16 3Z"
                  fill="none"
                  stroke="url(#logoGradient)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 7L10 10.5V17.5L16 21L22 17.5V10.5L16 7Z"
                  fill="url(#logoGradient)"
                  opacity="0.3"
                />
                <path
                  d="M16 11L12 13.5V17L16 19.5L20 17V13.5L16 11Z"
                  fill="url(#logoGradient)"
                />
                <circle cx="16" cy="15" r="1.5" fill="#ffffff" />
                <defs>
                  <linearGradient id="logoGradient" x1="6" y1="3" x2="26" y2="25" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#c084fc" />
                    <stop offset="0.5" stopColor="#a855f7" />
                    <stop offset="1" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
            PixelForge
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm max-w-md">
            Transform creative ideas and reference photos into breathtaking high-definition visuals.
          </p>
        </div>

        {/* Reference Image Upload Area */}
        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <span>🖼️</span>
              <span>Reference Image</span>
              <span className="text-[10px] text-gray-500 font-normal">(Optional)</span>
            </span>
            {uploadedImage && (
              <button
                onClick={removeUploadedImage}
                className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
              >
                <span>✕</span>
                <span>Remove Image</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={handleFileInput}
          />

          {!uploadedImage ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full p-4 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? "border-cyan-400 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                  : "border-white/10 hover:border-violet-500/50 bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-300 text-base">
                📷
              </div>
              <div className="text-center">
                <span className="text-xs font-medium text-gray-300 hover:text-white">
                  Click to upload or drag &amp; drop reference photo
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Supports PNG, JPG, or WEBP
                </p>
              </div>
            </div>
          ) : (
            <div className="relative w-full p-3 rounded-2xl border border-violet-500/30 bg-violet-950/20 backdrop-blur-md flex items-center gap-3.5">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/15 shrink-0 bg-black/40">
                <img
                  src={uploadedImage}
                  alt="Uploaded reference"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-semibold text-white truncate">
                  {uploadedFileName || "Reference Image"}
                </span>
                <span className="text-[11px] text-violet-300 mt-0.5 flex items-center gap-1">
                  <span>✓</span>
                  <span>Reference photo loaded</span>
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  Will inspire the composition, colors &amp; scene
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-colors"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={removeUploadedImage}
                  className="w-7 h-7 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs flex items-center justify-center transition-colors"
                  title="Remove image"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Prompt Input Box */}
        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-300">
              {uploadedImage ? "Creative Instructions (Optional):" : "Prompt Description:"}
            </label>
            {prompt && (
              <button
                onClick={() => setPrompt("")}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="relative group">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  generateImage();
                }
              }}
              placeholder={
                uploadedImage
                  ? "Describe changes or style (e.g. 'Turn into glowing cyberpunk anime style with cherry blossoms')..."
                  : "Describe what you want to create (e.g. 'Cyberpunk samurai walking in neon rainy alley, detailed cinematic lighting')..."
              }
              className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-500 
              focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 
              transition-all duration-300 text-sm resize-none"
            />
          </div>

          {/* Quick Idea Chips */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className="text-[11px] text-gray-500 self-center mr-1">Inspirations:</span>
            {promptIdeas.map((idea, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(idea);
                  generateImage(idea);
                }}
                disabled={loading}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-gray-300 hover:text-white transition-all text-left truncate max-w-[200px] sm:max-w-none"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => generateImage()}
          disabled={loading || (!prompt.trim() && !uploadedImage)}
          className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide
          bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white
          hover:from-violet-500 hover:to-cyan-400 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
          transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99]
          flex items-center justify-center gap-2 shadow-lg"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Forging your artwork...</span>
            </>
          ) : (
            <span>
              {uploadedImage ? "🎨 Transform & Generate Image" : "✨ Forge Masterpiece"}
            </span>
          )}
        </button>

        {/* Status indicator */}
        {statusMessage && (
          <div className="w-full text-center text-xs text-cyan-300/90 animate-pulse bg-cyan-950/30 border border-cyan-800/40 rounded-xl py-2 px-3">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Generated Result Container */}
      {image && (
        <div className="relative z-10 mt-8 p-4 sm:p-5 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-2xl max-w-2xl w-full flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400">✓ Creation Complete</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-gray-300 font-medium">
                PixelForge HD
              </span>
            </div>
            <a
              href={image}
              download="pixelforge-artwork.png"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-xs font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-md shadow-violet-900/30"
            >
              <span>⬇ Download HD</span>
            </a>
          </div>

          {/* If reference image was used, show comparison */}
          {lastUsedReference && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-gray-400">Reference Photo</span>
                <div className="rounded-xl overflow-hidden border border-white/10 aspect-square bg-black/40">
                  <img
                    src={lastUsedReference}
                    alt="Original Reference"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-cyan-300">Generated Result</span>
                <div className="rounded-xl overflow-hidden border border-cyan-500/30 aspect-square bg-black/40">
                  <img
                    src={image}
                    alt="AI Transformation"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Main Display (full preview) */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 group">
            <img
              src={image}
              alt="PixelForge Generated Artwork"
              className="w-full h-auto object-cover rounded-2xl transition-transform duration-700 group-hover:scale-[1.01]"
            />
          </div>

          {lastUsedPrompt && (
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400">
              <span className="text-[11px] text-gray-500">Prompt:</span>
              <p className="text-gray-300 italic">&ldquo;{lastUsedPrompt}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="relative z-10 text-center text-xs text-gray-500 mt-10 mb-4 flex items-center justify-center gap-2">
        <span>PixelForge AI</span>
        <span>•</span>
        <span>Next-Gen Visual Creation Studio</span>
      </div>
    </main>
  );
}
