import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Bunny Stream hosts regular videos. Files go straight from the browser to
 * Bunny over TUS, and playback uses signed embeds that are only issued after
 * the app's access check.
 */

const API_BASE = "https://video.bunnycdn.com";
const EMBED_BASE = "https://player.mediadelivery.net/embed";
const UPLOAD_TTL_SECONDS = 24 * 60 * 60;
const EMBED_TTL_SECONDS = 6 * 60 * 60;

/** Webhook status codes. These differ from the status codes on the video API. */
export const BunnyWebhookStatus = {
  Queued: 0,
  Processing: 1,
  Encoding: 2,
  Finished: 3,
  ResolutionFinished: 4,
  Failed: 5,
  UploadStarted: 6,
  UploadFinished: 7,
  UploadFailed: 8,
} as const;

/** Status codes on the video API. */
export const BunnyVideoStatus = {
  Finished: 4,
  Error: 5,
  UploadFailed: 6,
} as const;

export function isBunnyUploadConfigured(): boolean {
  return Boolean(
    process.env.BUNNY_STREAM_LIBRARY_ID && process.env.BUNNY_STREAM_API_KEY
  );
}

export function isBunnyPlaybackConfigured(): boolean {
  return Boolean(
    process.env.BUNNY_STREAM_LIBRARY_ID && process.env.BUNNY_STREAM_TOKEN_KEY
  );
}

export function isBunnyWebhookConfigured(): boolean {
  return Boolean(
    process.env.BUNNY_STREAM_LIBRARY_ID &&
      process.env.BUNNY_STREAM_READ_ONLY_API_KEY
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Bunny Stream is not configured. Set ${name}.`);
  return value;
}

function libraryId(): string {
  return requireEnv("BUNNY_STREAM_LIBRARY_ID");
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function unixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

async function bunnyFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}/library/${libraryId()}/videos${path}`, {
    ...init,
    headers: {
      AccessKey: requireEnv("BUNNY_STREAM_API_KEY"),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
}

/** Creates the empty video object that the browser then uploads into. */
export async function createBunnyVideo(title: string): Promise<string> {
  const response = await bunnyFetch("", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    throw new Error(`Bunny create video failed (${response.status})`);
  }

  const video = (await response.json()) as { guid?: string };
  if (!video.guid) throw new Error("Bunny did not return a video id");
  return video.guid;
}

export interface BunnyVideoDetails {
  status: number;
  length: number;
  width: number;
  height: number;
}

export async function getBunnyVideo(guid: string): Promise<BunnyVideoDetails> {
  const response = await bunnyFetch(`/${guid}`);
  if (!response.ok) {
    throw new Error(`Bunny get video failed (${response.status})`);
  }
  return (await response.json()) as BunnyVideoDetails;
}

export async function deleteBunnyVideo(guid: string): Promise<void> {
  const response = await bunnyFetch(`/${guid}`, { method: "DELETE" });
  // A missing video is already gone.
  if (!response.ok && response.status !== 404) {
    throw new Error(`Bunny delete video failed (${response.status})`);
  }
}

export interface BunnyUploadCredentials {
  endpoint: string;
  libraryId: string;
  videoId: string;
  signature: string;
  expires: number;
}

/** Lets the browser upload into this one video without seeing the API key. */
export function createBunnyUploadCredentials(
  guid: string
): BunnyUploadCredentials {
  const library = libraryId();
  const expires = unixSeconds() + UPLOAD_TTL_SECONDS;

  return {
    endpoint: `${API_BASE}/tusupload`,
    libraryId: library,
    videoId: guid,
    signature: sha256Hex(
      `${library}${requireEnv("BUNNY_STREAM_API_KEY")}${expires}${guid}`
    ),
    expires,
  };
}

/** Callers must complete the access check before asking for a signed embed. */
export function signBunnyEmbedUrl(guid: string): string {
  const expires = unixSeconds() + EMBED_TTL_SECONDS;
  const token = sha256Hex(
    `${requireEnv("BUNNY_STREAM_TOKEN_KEY")}${guid}${expires}`
  );

  const url = new URL(`${EMBED_BASE}/${libraryId()}/${guid}`);
  url.searchParams.set("token", token);
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("autoplay", "true");
  return url.toString();
}

export function verifyBunnyWebhook(
  rawBody: Buffer,
  signature: string | null
): boolean {
  if (!signature) return false;

  const expected = Buffer.from(
    createHmac("sha256", requireEnv("BUNNY_STREAM_READ_ONLY_API_KEY"))
      .update(rawBody)
      .digest("hex")
  );
  const received = Buffer.from(signature);

  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}
