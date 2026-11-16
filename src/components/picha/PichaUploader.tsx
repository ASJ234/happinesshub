"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { primaryButtonClass } from "@/components/ui/styles";
import { resizeImage } from "@/lib/image-resize";
import { PICHA_BUCKET } from "@/lib/picha";
import { createClient } from "@/lib/supabase/client";

const MAX_FILES = 20;
const MAX_FILE_BYTES = 30 * 1024 * 1024;
const FULL_SIZE = 2048;
const THUMB_SIZE = 640;

interface PichaUploaderProps {
  userId: string;
}

/** Picks one or more photos, shrinks them and posts them to Picha. */
export function PichaUploader({ userId }: PichaUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function uploadOne(file: File) {
    const supabase = createClient();
    const [full, thumb] = await Promise.all([
      resizeImage(file, FULL_SIZE, 0.85),
      resizeImage(file, THUMB_SIZE, 0.78),
    ]);
    const name = `${userId}/picha/${crypto.randomUUID()}`;
    const path = `${name}.jpg`;
    const thumbPath = `${name}-thumb.jpg`;
    const storage = supabase.storage.from(PICHA_BUCKET);

    const uploads = await Promise.all([
      storage.upload(path, full.blob, { contentType: "image/jpeg" }),
      storage.upload(thumbPath, thumb.blob, { contentType: "image/jpeg" }),
    ]);
    const uploadError = uploads.find((u) => u.error)?.error;
    if (uploadError) {
      await storage.remove([path, thumbPath]);
      throw uploadError;
    }

    const { error } = await supabase.from("picha_photos").insert({
      user_id: userId,
      path,
      thumb_path: thumbPath,
      width: full.width,
      height: full.height,
    });
    if (error) {
      await storage.remove([path, thumbPath]);
      throw error;
    }
  }

  async function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;

    setMessage(null);
    if (files.length > MAX_FILES) {
      return setMessage({ ok: false, text: `Choose up to ${MAX_FILES} photos at a time.` });
    }

    const tooBig = files.filter((f) => f.size > MAX_FILE_BYTES);
    const toUpload = files.filter((f) => f.size <= MAX_FILE_BYTES);
    let failed = 0;

    setProgress({ done: 0, total: toUpload.length });
    for (const [index, file] of toUpload.entries()) {
      try {
        await uploadOne(file);
      } catch (error) {
        failed += 1;
        console.warn(`[picha] upload failed: ${String(error)}`);
      }
      setProgress({ done: index + 1, total: toUpload.length });
    }
    setProgress(null);

    const posted = toUpload.length - failed;
    const problems = failed + tooBig.length;
    setMessage(
      problems === 0
        ? { ok: true, text: `${posted} photo${posted === 1 ? "" : "s"} posted.` }
        : {
            ok: posted > 0,
            text: `${posted} posted, ${problems} couldn't be uploaded${
              tooBig.length ? " (photos must be under 30 MB)" : ""
            }.`,
          }
    );
    if (posted > 0) router.refresh();
  }

  return (
    <div className="flex flex-col items-start sm:items-end gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null}
        className={primaryButtonClass}
      >
        {progress ? <Spinner size={16} /> : <ImagePlus size={16} />}
        {progress
          ? `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
          : "Upload photos"}
      </button>
      {message && (
        <p
          role="status"
          className={`text-xs ${message.ok ? "text-green-400" : "text-red-400"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
