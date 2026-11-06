/**
 * Live streaming provider adapter.
 *
 * The live workflow (request -> admin approval -> go live -> chat -> gifts ->
 * end) is implemented end to end in the app and does not depend on a media
 * vendor. When MUX_TOKEN_ID and MUX_TOKEN_SECRET are set, `getLiveProvider()`
 * returns a MuxProvider that creates a real RTMPS ingest point and a signed
 * playback ID. Without those env vars it falls back to LocalProvider, which
 * runs the full workflow without any video ingest or playback.
 */

import {
  completeMuxLiveStream,
  createMuxLiveStream,
  isMuxApiConfigured,
  MUX_RTMPS_INGEST_URL,
} from "@/lib/mux";

export interface LiveSession {
  streamId: string;
  provider: string;
  /** Unsigned Mux playback ID. Viewers exchange this for a signed token. */
  playbackId: string | null;
  /** Legacy field kept for interface compatibility — null for Mux. */
  playbackUrl: string | null;
  /** RTMP(S) ingest server URL. Null when no video ingest is available. */
  ingestUrl: string | null;
  /** RTMP stream key shown to the creator. Null for the local provider. */
  streamKey: string | null;
  /** Mux live stream resource ID, needed to end/delete the stream. */
  muxLiveStreamId: string | null;
  chatChannel: string;
  createdAt: string;
}

export interface LiveProvider {
  readonly name: string;
  createSession(streamId: string, title: string): Promise<LiveSession>;
  endSession(muxLiveStreamId: string | null): Promise<void>;
}

class LocalProvider implements LiveProvider {
  readonly name = "local";

  async createSession(streamId: string): Promise<LiveSession> {
    return {
      streamId,
      provider: this.name,
      playbackId: null,
      playbackUrl: null,
      ingestUrl: null,
      streamKey: null,
      muxLiveStreamId: null,
      chatChannel: `live:${streamId}`,
      createdAt: new Date().toISOString(),
    };
  }

  async endSession(): Promise<void> {
    // Nothing to release for the local provider.
  }
}

class MuxProvider implements LiveProvider {
  readonly name = "mux";

  async createSession(streamId: string, title: string): Promise<LiveSession> {
    const result = await createMuxLiveStream({ streamId, title });
    return {
      streamId,
      provider: this.name,
      playbackId: result.playbackId,
      playbackUrl: null,
      ingestUrl: MUX_RTMPS_INGEST_URL,
      streamKey: result.streamKey,
      muxLiveStreamId: result.muxLiveStreamId,
      chatChannel: `live:${streamId}`,
      createdAt: new Date().toISOString(),
    };
  }

  async endSession(muxLiveStreamId: string | null): Promise<void> {
    if (muxLiveStreamId) {
      await completeMuxLiveStream(muxLiveStreamId);
    }
  }
}

let provider: LiveProvider | null = null;

export function getLiveProvider(): LiveProvider {
  if (!provider) {
    provider = isMuxApiConfigured() ? new MuxProvider() : new LocalProvider();
  }
  return provider;
}
