import { liveStreams } from "@/lib/mock-data";

export function LiveStreams() {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Live Stream</h2>
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Live now: 12 streams active
          </div>
        </div>
        <button className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          Go Live
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {liveStreams.map((stream) => (
          <div
            key={stream.id}
            className="bg-surface border border-border rounded-xl overflow-hidden group cursor-pointer hover:border-primary/30 transition-colors"
          >
            <div className={`relative aspect-video bg-gradient-to-br ${stream.thumbnail}`}>
              <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                LIVE
              </span>
              <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                {stream.viewers} watching
              </span>
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {stream.title}
              </h3>
              <p className="text-xs text-muted mt-1">{stream.creator}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
