import Mux from "@mux/mux-node";

/** Mux hosts live streams only. Regular videos are on Bunny Stream. */
export function isMuxApiConfigured(): boolean {
  return Boolean(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}

export function isMuxSigningConfigured(): boolean {
  return Boolean(
    process.env.MUX_SIGNING_KEY && process.env.MUX_PRIVATE_KEY
  );
}

export function isMuxWebhookConfigured(): boolean {
  return Boolean(process.env.MUX_WEBHOOK_SECRET);
}

let client: Mux | null = null;

export function getMux(): Mux {
  if (!isMuxApiConfigured()) {
    throw new Error(
      "Mux is not configured. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET."
    );
  }

  if (!client) {
    client = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
      webhookSecret: process.env.MUX_WEBHOOK_SECRET,
      jwtSigningKey: process.env.MUX_SIGNING_KEY,
      jwtPrivateKey: process.env.MUX_PRIVATE_KEY,
    });
  }

  return client;
}

export async function verifyMuxWebhook(
  body: string,
  headers: Record<string, string>
) {
  if (!isMuxWebhookConfigured()) {
    throw new Error("MUX_WEBHOOK_SECRET is not configured");
  }

  return getMux().webhooks.unwrap(body, headers);
}

export const MUX_RTMPS_INGEST_URL = "rtmps://global-live.mux.com:443/app";

export interface MuxLiveStreamResult {
  muxLiveStreamId: string;
  streamKey: string;
  playbackId: string;
}

export async function createMuxLiveStream(options: {
  streamId: string;
  title: string;
}): Promise<MuxLiveStreamResult> {
  const mux = getMux();

  const stream = await mux.video.liveStreams.create({
    playback_policies: ["signed"],
    new_asset_settings: { playback_policies: ["signed"] },
    passthrough: options.streamId,
    latency_mode: "low",
  });

  const playbackId =
    stream.playback_ids?.find((p) => p.policy === "signed")?.id ??
    stream.playback_ids?.[0]?.id;

  if (!stream.stream_key || !playbackId) {
    if (stream.id) {
      await mux.video.liveStreams.delete(stream.id).catch(() => undefined);
    }
    throw new Error("Mux did not return a stream key or playback ID");
  }

  return { muxLiveStreamId: stream.id, streamKey: stream.stream_key, playbackId };
}

export async function completeMuxLiveStream(
  muxLiveStreamId: string
): Promise<void> {
  const mux = getMux();
  try {
    await mux.video.liveStreams.complete(muxLiveStreamId);
  } catch (error) {
    if ((error as { status?: number }).status === 404) return;
    throw error;
  }
}

export async function deleteMuxLiveStream(
  muxLiveStreamId: string
): Promise<void> {
  const mux = getMux();
  try {
    await mux.video.liveStreams.delete(muxLiveStreamId);
  } catch (error) {
    if ((error as { status?: number }).status === 404) return;
    throw error;
  }
}

/**
 * Signs a live stream playback ID. Live tokens use a longer TTL since the
 * stream can run for hours.
 */
export async function signMuxLivePlaybackToken(
  playbackId: string,
  expiration = "12h"
): Promise<string> {
  if (!isMuxSigningConfigured()) {
    throw new Error(
      "Mux signed playback is not configured. Set MUX_SIGNING_KEY and MUX_PRIVATE_KEY."
    );
  }
  const mux = getMux();
  return mux.jwt.signPlaybackId(playbackId, { type: "video", expiration });
}
