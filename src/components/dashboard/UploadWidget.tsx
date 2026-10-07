"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, CloudUpload, FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { VIDEO_CATEGORIES } from "@/lib/videos";

const inputClass =
  "w-full bg-surface-elevated border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

async function generateThumbnail(file: File): Promise<Blob | null> {
  try {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("could not load video"));
      setTimeout(() => reject(new Error("timeout")), 10_000);
    }).catch(() => {
      throw new Error("skip thumbnail");
    });

    video.currentTime = Math.min(1, (video.duration || 2) / 2);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      setTimeout(resolve, 3_000);
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8)
    );
    URL.revokeObjectURL(url);
    return blob;
  } catch {
    return null;
  }
}

export function UploadWidget() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("explore");
  const [description, setDescription] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function pickFile(next: File | null | undefined) {
    if (!next) return;
    if (!next.type.startsWith("video/")) {
      setError("Please choose a video file (MP4, MOV, WebM...)");
      return;
    }
    setError(null);
    setFile(next);
    if (!title.trim()) {
      setTitle(next.name.replace(/\.[^.]+$/, "").slice(0, 200));
    }
  }

  async function handleSubmit() {
    setError(null);

    if (!title.trim()) {
      setError("Give your video a title.");
      return;
    }
    if (!file) {
      setError("Choose a video file to upload.");
      return;
    }
    if (uploading) return;

    setUploading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploading(false);
      setError("Your session expired. Please sign in again.");
      return;
    }

    const extMatch = file.name.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ".mp4";
    const videoPath = `${user.id}/${crypto.randomUUID()}${ext}`;
    let thumbnailPath: string | null = null;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(videoPath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setUploading(false);
      setError(`Upload failed: ${uploadError.message}`);
      return;
    }

    const thumbBlob = await generateThumbnail(file);
    if (thumbBlob) {
      thumbnailPath = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: thumbError } = await supabase.storage
        .from("thumbnails")
        .upload(thumbnailPath, thumbBlob, { contentType: "image/jpeg" });
      if (thumbError) thumbnailPath = null;
    }

    const { error: insertError } = await supabase.from("videos").insert({
      creator_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      category,
      video_path: videoPath,
      thumbnail_path: thumbnailPath,
      status: "published",
    });

    if (insertError) {
      // Clean up the files we just stored so no orphans are left behind.
      await supabase.storage.from("videos").remove([videoPath]);
      if (thumbnailPath) {
        await supabase.storage.from("thumbnails").remove([thumbnailPath]);
      }
      setUploading(false);
      setError(`Could not save video: ${insertError.message}`);
      return;
    }

    setUploading(false);
    setDone(true);
    setFile(null);
    setTitle("");
    setDescription("");
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  if (done) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={24} />
        </div>
        <h2 className="text-lg font-semibold mb-1">Video published</h2>
        <p className="text-sm text-muted mb-6">
          Your video is live. You can watch it for free — others need an active
          subscription to unlock it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard/my-content"
            className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FolderOpen size={16} />
            My Content
          </Link>
          <button
            onClick={() => setDone(false)}
            className="bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            Upload another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border-2 border-dashed border-primary/40 rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />

      <div className="relative space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">Upload Your Video</h2>
          <p className="text-sm text-muted">
            Share your video with the world in just a few clicks — MP4, MOV, WebM
          </p>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
            dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
          }`}
        >
          <CloudUpload size={40} className="text-primary mb-3" />
          {file ? (
            <>
              <p className="text-sm font-medium mb-1">{file.name}</p>
              <p className="text-xs text-muted">
                {(file.size / (1024 * 1024)).toFixed(1)} MB — click to change
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium mb-1">
                Drag &amp; drop your video here
              </p>
              <p className="text-xs text-muted">or click to browse your device</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-sm text-muted block mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {VIDEO_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-muted block mb-1.5">
              Description <span className="text-xs">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading... this may take a moment" : "Publish video"}
        </button>
      </div>
    </div>
  );
}
