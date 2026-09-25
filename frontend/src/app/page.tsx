"use client";
import { useState, useEffect, useRef } from "react";

type StudioMode = "image" | "video";
type VideoDuration = 5 | 10 | 15 | 30;
type AspectRatio = "16:9" | "9:16" | "1:1";

export type ImageModelKey = "flux" | "flux-realism" | "flux-anime" | "flux-3d" | "turbo";

export interface ImageModelOption {
  id: ImageModelKey;
  name: string;
  badge: string;
  icon: string;
  desc: string;
}

export const IMAGE_MODELS: ImageModelOption[] = [
  {
    id: "flux",
    name: "FLUX.1 Schnell",
    badge: "Ultra-HD Realistic",
    icon: "🌟",
    desc: "Top fidelity, lifelike humans, intricate details & lighting",
  },
  {
    id: "flux-realism",
    name: "FLUX Realism",
    badge: "Cinematic Portrait",
    icon: "📸",
    desc: "Authentic camera depth, natural skin tones & real-world textures",
  },
  {
    id: "flux-anime",
    name: "FLUX Anime",
    badge: "Manga & Anime",
    icon: "🎨",
    desc: "Japanese anime style, rich colors & Makoto Shinkai aesthetics",
  },
  {
    id: "flux-3d",
    name: "FLUX 3D CGI",
    badge: "Pixar / Disney 3D",
    icon: "🔮",
    desc: "Stylized 3D animation, Disney & Pixar render quality",
  },
  {
    id: "turbo",
    name: "Turbo Speed",
    badge: "Instant Generation",
    icon: "⚡",
    desc: "Lightning fast preview & ideation engine",
  },
];

const BACKEND_URL =
  process.env.BACKEND_URL?.replace(/\/$/, "") || "http://localhost:7777";

// const BACKEND_URL ="http://localhost:7777";

export default function Home() {
  const [studioMode, setStudioMode] = useState<StudioMode>("image");

  // Image State
  const [imagePrompt, setImagePrompt] = useState("");
  const [selectedImageModel, setSelectedImageModel] = useState<ImageModelKey>("flux");
  const [lastImageModelUsed, setLastImageModelUsed] = useState<string>("FLUX.1 Schnell (Photorealistic)");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [lastImageRef, setLastImageRef] = useState<string | null>(null);
  const [lastImagePrompt, setLastImagePrompt] = useState<string | null>(null);
  const [lastImageCorrected, setLastImageCorrected] = useState<boolean>(false);

  // Video State
  const [videoPrompt, setVideoPrompt] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState<string | null>(null);
  const [uploadedMediaName, setUploadedMediaName] = useState<string | null>(null);
  const [uploadedMediaType, setUploadedMediaType] = useState<"image" | "video" | null>(null);
  const [videoDuration, setVideoDuration] = useState<VideoDuration>(5);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoStage, setVideoStage] = useState<number>(0);
  const [videoModelUsed, setVideoModelUsed] = useState<string | null>(null);
  const [lastVideoPrompt, setLastVideoPrompt] = useState<string | null>(null);
  const [lastVideoCorrected, setLastVideoCorrected] = useState<boolean>(false);
  const [lastVideoDuration, setLastVideoDuration] = useState<number>(5);

  // General State
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkBackend();
  }, []);

  async function checkBackend() {
    try {
      const res = await fetch(`${BACKEND_URL}/`, { method: "GET" });
      setBackendOnline(res.ok);
    } catch {
      setBackendOnline(false);
    }
  }

  // Handle Image upload for Image Forge
  function handleImageUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, WEBP).");
      return;
    }
    setUploadedImageName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Handle Media upload (Image or Video) for Video Studio
  function handleMediaUpload(file: File) {
    const isImg = file.type.startsWith("image/");
    const isVid = file.type.startsWith("video/");

    if (!isImg && !isVid) {
      alert("Please upload a valid image or video file (PNG, JPG, WEBP, MP4, WEBM).");
      return;
    }

    setUploadedMediaName(file.name);
    setUploadedMediaType(isImg ? "image" : "video");

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedMedia(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (studioMode === "image") {
      handleImageUpload(file);
    } else {
      handleMediaUpload(file);
    }
  }

  // Generate Image
  async function generateImage(overridePrompt?: string) {
    const textToUse = (overridePrompt ?? imagePrompt).trim();
    if (!textToUse && !uploadedImage) return;
    if (imageLoading) return;

    setImageLoading(true);
    setGeneratedImage(null);
    setStatusMessage("Forging your artwork with FLUX.1...");

    try {
      const payload: { prompt: string; image?: string; model?: string } = {
        prompt: textToUse,
        model: selectedImageModel,
      };
      if (uploadedImage) {
        payload.image = uploadedImage;
      }

      const res = await fetch(`${BACKEND_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Image generation failed");
      }

      setGeneratedImage(`data:image/png;base64,${data.image}`);
      setLastImageRef(uploadedImage);
      setLastImagePrompt(data.corrected_prompt || textToUse);
      setLastImageCorrected(Boolean(data.corrected_prompt));
      if (data.model) {
        setLastImageModelUsed(data.model);
      }
      setStatusMessage(null);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Image generation failed";
      setStatusMessage(`Error: ${msg}`);
      alert(`Generation failed: ${msg}`);
    } finally {
      setImageLoading(false);
    }
  }

  // Generate Video
  async function generateVideo(overridePrompt?: string) {
    const textToUse = (overridePrompt ?? videoPrompt).trim();
    if (!textToUse && !uploadedMedia) return;
    if (videoLoading) return;

    setVideoLoading(true);
    setGeneratedVideo(null);
    setVideoStage(1);

    // Multi-stage visual progress updater
    const stageTimer1 = setTimeout(() => setVideoStage(2), 2500);
    const stageTimer2 = setTimeout(() => setVideoStage(3), 6000);
    const stageTimer3 = setTimeout(() => setVideoStage(4), 10000);

    try {
      const payload: {
        prompt: string;
        media?: string;
        duration: number;
        aspect_ratio: string;
      } = {
        prompt: textToUse,
        duration: videoDuration,
        aspect_ratio: aspectRatio,
      };

      if (uploadedMedia) {
        payload.media = uploadedMedia;
      }

      const res = await fetch(`${BACKEND_URL}/generate-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Video generation failed");
      }

      setGeneratedVideo(data.video);
      setVideoModelUsed(data.model || "Hugging Face Video");
      setLastVideoPrompt(data.corrected_prompt || textToUse);
      setLastVideoCorrected(Boolean(data.corrected_prompt));
      setLastVideoDuration(data.duration || videoDuration);
      setStatusMessage(null);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Video generation failed";
      setStatusMessage(`Error: ${msg}`);
      alert(`Video generation failed: ${msg}`);
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setVideoLoading(false);
      setVideoStage(0);
    }
  }

  // Inspiration Prompts
  const imagePromptIdeas = uploadedImage
    ? [
        "Transform into glowing cyberpunk anime style with neon rain",
        "Reimagine as an ethereal fantasy landscape with floating islands",
        "Convert into a dramatic Renaissance oil painting masterpiece",
        "Recreate with cinematic 3D lighting, ultra-detailed 8k render",
      ]
    : [
        "Cyberpunk neon street in heavy rain with glistening reflections",
        "Majestic snow leopard with glowing sapphire eyes, 8k render",
        "Anime style peaceful Japanese shrine surrounded by cherry blossoms",
        "Ultra-realistic cinematic portrait of an ancient warrior in ornate gold armor",
      ];

  const videoPromptIdeas = uploadedMedia
    ? [
        "Smooth cinematic camera zoom bringing the scene into vivid lifelike motion",
        "Dynamic camera pan with atmospheric volumetric mist and glowing lights",
        "Slow motion cinematic 60fps flythrough of this world",
      ]
    : [
        "Hyper-realistic drone shot soaring through misty pine mountains during sunrise",
        "Futuristic cybernetic car speeding through neon Tokyo skyline in rain, 4k",
        "Ethereal crystal jellyfish swimming gracefully in deep bioluminescent ocean",
        "Cinematic slow motion golden hour waves crashing gently onto a crystal beach",
      ];

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950 text-white overflow-x-hidden">
      {/* Dynamic ambient background glow */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-violet-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <div className="relative z-10 flex flex-col items-center gap-6 p-6 sm:p-10 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45)] max-w-2xl w-full">
        
        {/* Top Header & Engine Status */}
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
                ? "Engine Offline"
                : "Connecting engine..."}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[11px] text-gray-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>AI Creative Suite</span>
          </div>
        </div>

        {/* Logo and Brand Identity */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-cyan-400 p-[1.5px] shadow-[0_0_30px_rgba(139,92,246,0.35)] group">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <svg
                viewBox="0 0 32 32"
                className="w-7 h-7 text-white fill-current transition-transform duration-300 group-hover:scale-110"
              >
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
            Generate stunning high-definition AI images and up to 30-second cinematic videos.
          </p>
        </div>

        {/* Studio Mode Selector Tabs */}
        <div className="w-full flex p-1 rounded-2xl bg-white/[0.05] border border-white/10">
          <button
            type="button"
            onClick={() => setStudioMode("image")}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              studioMode === "image"
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/40"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>🎨</span>
            <span>Image Forge</span>
          </button>
          <button
            type="button"
            onClick={() => setStudioMode("video")}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 relative ${
              studioMode === "video"
                ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-cyan-900/40"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>🎬</span>
            <span>Video Studio</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 font-bold border border-cyan-400/30">
              30s Max
            </span>
          </button>
        </div>

        {/* -------------------- IMAGE FORGE MODE -------------------- */}
        {studioMode === "image" && (
          <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Reference Image Upload */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <span>🖼️</span>
                  <span>Reference Image</span>
                  <span className="text-[10px] text-gray-500 font-normal">(Optional)</span>
                </span>
                {uploadedImage && (
                  <button
                    onClick={() => {
                      setUploadedImage(null);
                      setUploadedImageName(null);
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    ✕ Remove Image
                  </button>
                )}
              </div>

              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageUpload(f);
                }}
              />

              {!uploadedImage ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => imageFileInputRef.current?.click()}
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
                      {uploadedImageName || "Reference Image"}
                    </span>
                    <span className="text-[11px] text-violet-300 mt-0.5 flex items-center gap-1">
                      <span>✓</span>
                      <span>Reference photo loaded</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedImage(null);
                      setUploadedImageName(null);
                    }}
                    className="w-7 h-7 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* AI Model Selector */}
            <div className="w-full flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <span>🤖</span>
                  <span>AI Visual Model</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    100% Free
                  </span>
                </span>
                <span className="text-[11px] text-gray-400 hidden sm:inline">
                  Selected: <strong className="text-cyan-300 font-medium">{IMAGE_MODELS.find(m => m.id === selectedImageModel)?.name}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {IMAGE_MODELS.map((m) => {
                  const isSelected = selectedImageModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedImageModel(m.id)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/50"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-base">{m.icon}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></span>
                        )}
                      </div>
                      <span className={`text-xs font-semibold truncate ${isSelected ? "text-cyan-200" : "text-gray-200"}`}>
                        {m.name}
                      </span>
                      <span className="text-[10px] text-gray-400 line-clamp-1 leading-tight">
                        {m.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300">
                  {uploadedImage ? "Creative Instructions (Optional):" : "Prompt Description:"}
                </label>
                {imagePrompt && (
                  <button
                    onClick={() => setImagePrompt("")}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <textarea
                rows={3}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    generateImage();
                  }
                }}
                placeholder={
                  uploadedImage
                    ? "Describe changes or aesthetic (e.g. 'Turn into glowing cyberpunk anime style')..."
                    : "Describe what you want to create (e.g. 'Cyberpunk samurai in neon rainy street')..."
                }
                className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-500 
                focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 
                transition-all duration-300 text-sm resize-none"
              />

              {/* Inspiration Chips */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="text-[11px] text-gray-500 self-center mr-1">Inspirations:</span>
                {imagePromptIdeas.map((idea, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setImagePrompt(idea);
                      generateImage(idea);
                    }}
                    disabled={imageLoading}
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
              disabled={imageLoading || (!imagePrompt.trim() && !uploadedImage)}
              className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide
              bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white
              hover:from-violet-500 hover:to-cyan-400 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
              transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99]
              flex items-center justify-center gap-2 shadow-lg"
            >
              {imageLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Forging your artwork...</span>
                </>
              ) : (
                <span>
                  {uploadedImage ? "🎨 Transform & Generate Image" : "✨ Forge Image Masterpiece"}
                </span>
              )}
            </button>
          </div>
        )}

        {/* -------------------- VIDEO STUDIO MODE -------------------- */}
        {studioMode === "video" && (
          <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Reference Image/Video Upload */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <span>🎬</span>
                  <span>Reference Media</span>
                  <span className="text-[10px] text-gray-500 font-normal">(Photo or Video)</span>
                </span>
                {uploadedMedia && (
                  <button
                    onClick={() => {
                      setUploadedMedia(null);
                      setUploadedMediaName(null);
                      setUploadedMediaType(null);
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    ✕ Remove Media
                  </button>
                )}
              </div>

              <input
                ref={mediaFileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, video/mp4, video/webm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleMediaUpload(f);
                }}
              />

              {!uploadedMedia ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => mediaFileInputRef.current?.click()}
                  className={`w-full p-4 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? "border-cyan-400 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                      : "border-white/10 hover:border-cyan-500/50 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-cyan-300 text-base">
                    🎞️
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-medium text-gray-300 hover:text-white">
                      Click to upload or drag &amp; drop starting photo or video
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Supports PNG, JPG, MP4, WEBM
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full p-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 backdrop-blur-md flex items-center gap-3.5">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/15 shrink-0 bg-black/40 flex items-center justify-center">
                    {uploadedMediaType === "video" ? (
                      <video
                        src={uploadedMedia}
                        className="w-full h-full object-cover"
                        muted
                        autoPlay
                        loop
                      />
                    ) : (
                      <img
                        src={uploadedMedia}
                        alt="Uploaded reference"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-semibold text-white truncate">
                      {uploadedMediaName || "Reference Media"}
                    </span>
                    <span className="text-[11px] text-cyan-300 mt-0.5 flex items-center gap-1">
                      <span>✓</span>
                      <span>Starting scene loaded</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedMedia(null);
                      setUploadedMediaName(null);
                      setUploadedMediaType(null);
                    }}
                    className="w-7 h-7 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Duration Selector (5s, 10s, 15s, 30s) */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <span>⏱️</span>
                  <span>Video Duration</span>
                </label>
                <span className="text-[11px] text-cyan-400 font-semibold">
                  {videoDuration} Seconds
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {([5, 10, 15, 30] as VideoDuration[]).map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setVideoDuration(dur)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                      videoDuration === dur
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 text-white shadow-lg shadow-cyan-900/40 scale-[1.02]"
                        : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    {dur}s {dur === 30 && "🔥"}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <span>📐</span>
                  <span>Aspect Ratio</span>
                </label>
                <span className="text-[11px] text-gray-400">
                  {aspectRatio === "16:9" ? "Landscape (YouTube)" : aspectRatio === "9:16" ? "Portrait (Reels/TikTok)" : "Square (1:1)"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { ratio: "16:9", label: "16:9 Landscape" },
                  { ratio: "9:16", label: "9:16 Portrait" },
                  { ratio: "1:1", label: "1:1 Square" },
                ].map((item) => (
                  <button
                    key={item.ratio}
                    type="button"
                    onClick={() => setAspectRatio(item.ratio as AspectRatio)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                      aspectRatio === item.ratio
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 border-violet-400 text-white shadow-md shadow-violet-900/30"
                        : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300">
                  {uploadedMedia ? "Camera & Motion Direction:" : "Video Prompt Description:"}
                </label>
                {videoPrompt && (
                  <button
                    onClick={() => setVideoPrompt("")}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <textarea
                rows={3}
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    generateVideo();
                  }
                }}
                placeholder={
                  uploadedMedia
                    ? "Describe camera movement or transformation (e.g. 'Cinematic slow drone zoom with volumetric lighting')..."
                    : "Describe the video scene (e.g. 'Flying drone shot through futuristic cyber city in heavy rain, 4k 60fps')..."
                }
                className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder:text-gray-500 
                focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 
                transition-all duration-300 text-sm resize-none"
              />

              {/* Inspiration Chips */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="text-[11px] text-gray-500 self-center mr-1">Cinematic ideas:</span>
                {videoPromptIdeas.map((idea, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setVideoPrompt(idea);
                      generateVideo(idea);
                    }}
                    disabled={videoLoading}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-gray-300 hover:text-white transition-all text-left truncate max-w-[200px] sm:max-w-none"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Generation Progress Feedback */}
            {videoLoading && (
              <div className="w-full p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold">
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-cyan-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>
                      {videoStage === 1 && "Stage 1/4: Analyzing visual composition & motion vector..."}
                      {videoStage === 2 && "Stage 2/4: Synthesizing neural video frames..."}
                      {videoStage === 3 && `Stage 3/4: Seamlessly chaining & extending to ${videoDuration}s...`}
                      {videoStage === 4 && "Stage 4/4: Finalizing H.264 MP4 render..."}
                    </span>
                  </span>
                  <span>{videoStage * 25}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-500 rounded-full"
                    style={{ width: `${videoStage * 25}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={() => generateVideo()}
              disabled={videoLoading || (!videoPrompt.trim() && !uploadedMedia)}
              className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide
              bg-gradient-to-r from-indigo-600 via-cyan-600 to-teal-500 text-white
              hover:from-indigo-500 hover:to-teal-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
              transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99]
              flex items-center justify-center gap-2 shadow-lg"
            >
              {videoLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Rendering {videoDuration}s Video...</span>
                </>
              ) : (
                <span>
                  🎬 Generate {videoDuration}s AI Video
                </span>
              )}
            </button>
          </div>
        )}

        {/* Global status alert */}
        {statusMessage && (
          <div className="w-full text-center text-xs text-cyan-300/90 bg-cyan-950/30 border border-cyan-800/40 rounded-xl py-2 px-3">
            {statusMessage}
          </div>
        )}
      </div>

      {/* -------------------- GENERATED VIDEO RESULT DISPLAY -------------------- */}
      {generatedVideo && (
        <div className="relative z-10 mt-8 p-4 sm:p-6 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-2xl max-w-2xl w-full flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-cyan-400">✓ Video Rendered</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-gray-300 font-medium">
                {lastVideoDuration}s MP4
              </span>
              {videoModelUsed && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30">
                  {videoModelUsed}
                </span>
              )}
            </div>
            <a
              href={generatedVideo}
              download="pixelforge-video.mp4"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-xs font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-md shadow-cyan-900/30"
            >
              <span>⬇ Download MP4</span>
            </a>
          </div>

          {/* HTML5 Video Player */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-inner">
            <video
              src={generatedVideo}
              controls
              autoPlay
              loop
              playsInline
              className="w-full h-auto max-h-[500px] object-contain mx-auto rounded-2xl"
            />
          </div>

          {lastVideoPrompt && (
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Video Prompt:</span>
                {lastVideoCorrected && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    ✨ Spelling Auto-Corrected
                  </span>
                )}
              </div>
              <p className="text-gray-300 italic">&ldquo;{lastVideoPrompt}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {/* -------------------- GENERATED IMAGE RESULT DISPLAY -------------------- */}
      {generatedImage && studioMode === "image" && (
        <div className="relative z-10 mt-8 p-4 sm:p-5 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-2xl max-w-2xl w-full flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-emerald-400">✓ Creation Complete</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                {lastImageModelUsed}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-gray-300 font-medium">
                No Watermark • 100% Clean
              </span>
            </div>
            <a
              href={generatedImage}
              download="pixelforge-artwork.png"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-xs font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-md shadow-violet-900/30"
            >
              <span>⬇ Download HD</span>
            </a>
          </div>

          {lastImageRef && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-gray-400">Reference Photo</span>
                <div className="rounded-xl overflow-hidden border border-white/10 aspect-square bg-black/40">
                  <img
                    src={lastImageRef}
                    alt="Original Reference"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-cyan-300">Generated Result</span>
                <div className="rounded-xl overflow-hidden border border-cyan-500/30 aspect-square bg-black/40">
                  <img
                    src={generatedImage}
                    alt="AI Transformation"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="relative overflow-hidden rounded-2xl border border-white/10 group">
            <img
              src={generatedImage}
              alt="PixelForge Generated Artwork"
              className="w-full h-auto object-cover rounded-2xl transition-transform duration-700 group-hover:scale-[1.01]"
            />
          </div>

          {lastImagePrompt && (
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Prompt:</span>
                {lastImageCorrected && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    ✨ Spelling Auto-Corrected
                  </span>
                )}
              </div>
              <p className="text-gray-300 italic">&ldquo;{lastImagePrompt}&rdquo;</p>
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
