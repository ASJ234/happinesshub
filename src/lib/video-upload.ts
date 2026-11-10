import { Upload as TusUpload } from "tus-js-client";

// Browser-side steps of a video upload: reading the file's metadata and
// thumbnail, and sending the file to Bunny over tus.

export interface VideoMeta {
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  thumbnail: Blob | null;
  readable: boolean;
}

/**
 * Reads the dimensions and duration of the file and grabs a frame for the
 * thumbnail. The duration is what the category limits are checked against.
 */
export async function readVideo(file: File): Promise<VideoMeta> {
  const meta: VideoMeta = {
    width: null,
    height: null,
    durationSeconds: null,
    thumbnail: null,
    readable: false,
  };

  let url: string | null = null;
  try {
    url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("could not load video"));
      setTimeout(() => reject(new Error("timeout")), 10_000);
    });

    meta.width = video.videoWidth || null;
    meta.height = video.videoHeight || null;
    meta.durationSeconds = Number.isFinite(video.duration)
      ? Math.round(video.duration)
      : null;
    meta.readable = meta.width !== null && meta.height !== null;

    if (!meta.readable) return meta;

    video.currentTime = Math.min(1, (video.duration || 2) / 2);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      setTimeout(resolve, 3_000);
    });

    const canvas = document.createElement("canvas");
    canvas.width = meta.width || 640;
    canvas.height = meta.height || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return meta;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    meta.thumbnail = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8)
    );
  } catch {
    return meta;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }

  return meta;
}

export interface BunnyUpload {
  endpoint: string;
  libraryId: string;
  videoId: string;
  signature: string;
  expires: number;
}

/** Sends the file straight to Bunny, resuming across dropped connections. */
export function uploadToBunny(
  file: File,
  title: string,
  upload: BunnyUpload,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    new TusUpload(file, {
      endpoint: upload.endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        AuthorizationSignature: upload.signature,
        AuthorizationExpire: String(upload.expires),
        LibraryId: upload.libraryId,
        VideoId: upload.videoId,
      },
      metadata: { filetype: file.type, title },
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onError: reject,
      onSuccess: () => resolve(),
    }).start();
  });
}
