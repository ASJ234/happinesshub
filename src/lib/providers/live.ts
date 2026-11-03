/**
 * Live streaming provider adapter.
 *
 * The live workflow (request -> admin approval -> go live -> chat -> gifts ->
 * end) is implemented end to end in the app and does not depend on a media
 * vendor. `LocalProvider` runs the workflow with the Supabase database and
 * Realtime chat only, which keeps the product usable while the ingest and
 * playback pieces are still being negotiated.
 *
 * To plug in a real vendor (e.g. Mux, LiveKit, StreamYard) implement
 * `LiveProvider` and switch `getLiveProvider()` over to it. Nothing else in
 * the app needs to change: the pages only ever talk to this interface.
 */

export interface LiveSession {
  /** The row id in public.live_streams. */
  streamId: string;
  provider: string;
  /** Where the viewer pulls the media from. Null when the provider has no playback. */
  playbackUrl: string | null;
  /** Where the creator pushes the media to. Null when the provider has no ingest. */
  ingestUrl: string | null;
  /** Realtime channel used for the chat. */
  chatChannel: string;
  createdAt: string;
}

export interface LiveProvider {
  readonly name: string;
  /** Prepares a session for a stream the admin already approved. */
  createSession(streamId: string, title: string): Promise<LiveSession>;
  /** Releases the session when the stream ends. */
  endSession(session: LiveSession): Promise<void>;
}

class LocalProvider implements LiveProvider {
  readonly name = "local";

  async createSession(streamId: string): Promise<LiveSession> {
    return {
      streamId,
      provider: this.name,
      playbackUrl: null,
      ingestUrl: null,
      chatChannel: `live:${streamId}`,
      createdAt: new Date().toISOString(),
    };
  }

  async endSession(): Promise<void> {
    // Nothing to release: the local provider has no external resources.
  }
}

let provider: LiveProvider | null = null;

export function getLiveProvider(): LiveProvider {
  if (!provider) provider = new LocalProvider();
  return provider;
}
