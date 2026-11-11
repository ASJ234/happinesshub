"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { inputLargeClass, submitButtonClass } from "@/components/ui/styles";
import { createClient } from "@/lib/supabase/client";
import {
  VIDEO_CATEGORIES,
  getCategory,
  validateUploadForCategory,
} from "@/lib/categories";
import { readVideo, uploadToBunny, type BunnyUpload } from "@/lib/video-upload";
import { UploadDone } from "./upload/UploadDone";
import { VideoDropzone } from "./upload/VideoDropzone";

const DEFAULT_CATEGORY = "explore";

/** "5 minutes or shorter." for sectors with a length limit. */
function lengthHint(slug: string): string | null {
  const maxSeconds = getCategory(slug)?.maxSeconds;
  if (!maxSeconds) return null;
  const minutes = Math.round(maxSeconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"} or shorter.`;
}

interface UploadWidgetProps {
  /** Locks the upload to one sector and hides the category picker. */
  lockedCategory?: string;
  heading?: string;
  subheading?: string;
}

export function UploadWidget({
  lockedCategory,
  heading = "Upload Your Video",
  subheading = "Share your video with the world in just a few clicks — MP4, MOV, WebM",
}: UploadWidgetProps = {}) {
  const router = useRouter();
  const initialCategory = lockedCategory ?? DEFAULT_CATEGORY;

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);
  const pickedRef = useRef<File | null>(null);

  function pickFile(next: File | undefined) {
    if (!next) return;
    if (!next.type.startsWith("video/")) {
      setError("Please choose a video file (MP4, MOV, WebM...)");
      return;
    }
    setError(null);
    setFile(next);
    pickedRef.current = next;
    // Catch an over-long clip as soon as it is picked rather than at submit.
    if (lockedCategory) {
      readVideo(next).then((meta) => {
        const problem = meta.readable
          ? validateUploadForCategory(lockedCategory, meta)
          : null;
        // Ignore the result if another file was picked in the meantime.
        if (problem && pickedRef.current === next) {
          setFile(null);
          setError(problem);
        }
      });
    }
    if (!title.trim()) {
      setTitle(next.name.replace(/\.[^.]+$/, "").slice(0, 200));
    }
  }

  function fail(message: string) {
    setUploading(false);
    setError(message);
  }

  async function handleSubmit() {
    setError(null);

    if (!title.trim()) return setError("Give your video a title.");
    if (!file) return setError("Choose a video file to upload.");
    if (uploading) return;

    setUploading(true);
    setProgress(0);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("Your session expired. Please sign in again.");

    const meta = await readVideo(file);
    if (!meta.readable) {
      return fail("Could not read this video file. Try an MP4, MOV or WebM.");
    }

    const problem = validateUploadForCategory(category, meta);
    if (problem) return fail(problem);

    // Cover images stay in the public thumbnails bucket so locked cards never
    // need a playback token.
    let thumbnailPath: string | null = null;
    if (meta.thumbnail) {
      thumbnailPath = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: thumbError } = await supabase.storage
        .from("thumbnails")
        .upload(thumbnailPath, meta.thumbnail, { contentType: "image/jpeg" });
      if (thumbError) thumbnailPath = null;
    }

    let pendingVideoId: string | null = null;
    try {
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category,
          thumbnail_path: thumbnailPath,
          width: meta.width,
          height: meta.height,
          durationSeconds: meta.durationSeconds,
          aspect: meta.width && meta.height ? `${meta.width}:${meta.height}` : null,
        }),
      });

      const created = await response.json().catch(() => null);
      if (created?.videoId) pendingVideoId = created.videoId as string;

      if (!response.ok || !created?.upload || !created?.videoId) {
        if (pendingVideoId) {
          // DELETE also removes the thumbnail from storage.
          await fetch(`/api/videos/${pendingVideoId}`, { method: "DELETE" });
        } else if (thumbnailPath) {
          // Row was never created; clean up the orphaned thumbnail manually.
          await supabase.storage.from("thumbnails").remove([thumbnailPath]);
        }
        return fail(created?.error ?? "Could not start the upload.");
      }

      await uploadToBunny(file, title.trim(), created.upload as BunnyUpload, setProgress);

      pendingVideoId = null;
      setUploading(false);
      setPendingReview(created.status !== "published");
      setDone(true);
      setFile(null);
      setTitle("");
      setDescription("");
      setCategory(initialCategory);
      router.refresh();
    } catch {
      if (pendingVideoId) {
        await fetch(`/api/videos/${pendingVideoId}`, { method: "DELETE" }).catch(
          () => undefined
        );
      }
      fail("The upload failed. Please try again.");
    }
  }

  if (done) {
    return (
      <UploadDone pendingReview={pendingReview} onUploadAnother={() => setDone(false)} />
    );
  }

  return (
    <div className="bg-surface border-2 border-dashed border-primary/40 rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />

      <div className="relative space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">{heading}</h2>
          <p className="text-sm text-muted">{subheading}</p>
        </div>

        <VideoDropzone file={file} onPick={pickFile} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Title" className="sm:col-span-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className={inputLargeClass}
            />
          </Field>
          {!lockedCategory && (
            <Field label="Category" hint={lengthHint(category)}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputLargeClass}
              >
                {VIDEO_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Description" optional className="sm:col-span-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${inputLargeClass} resize-y`}
            />
          </Field>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <button onClick={handleSubmit} disabled={uploading} className={submitButtonClass}>
          {uploading
            ? progress > 0
              ? `Uploading... ${progress}%`
              : "Uploading... this may take a moment"
            : "Submit video"}
        </button>
      </div>
    </div>
  );
}
