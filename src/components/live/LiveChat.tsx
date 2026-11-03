"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LiveChatMessage } from "@/lib/live";

interface LiveChatProps {
  streamId: string;
  initialMessages: LiveChatMessage[];
  disabled?: boolean;
  disabledReason?: string;
}

export function LiveChat({
  streamId,
  initialMessages,
  disabled = false,
  disabledReason,
}: LiveChatProps) {
  const [messages, setMessages] = useState<LiveChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live:${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: number;
            stream_id: string;
            user_id: string;
            body: string;
            created_at: string;
          };
          setMessages((prev) =>
            prev.some((m) => m.id === row.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: row.id,
                    stream_id: row.stream_id,
                    user_id: row.user_id,
                    body: row.body,
                    created_at: row.created_at,
                    sender: null,
                  },
                ]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    setNotice(null);

    const response = await fetch("/api/live/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stream_id: streamId, body }),
    });

    const result = await response.json().catch(() => null);
    setSending(false);

    if (!response.ok) {
      setNotice(result?.error ?? "Could not send the message");
      return;
    }

    setText("");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-3 min-h-[220px] max-h-[360px]">
        {messages.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">
            No messages yet. Say hello.
          </p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="text-sm">
              <span className="text-primary font-medium">
                {message.sender?.display_name || message.sender?.username || "Guest"}
              </span>
              <span className="text-muted">: </span>
              <span className="text-foreground break-words">{message.body}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3">
        {notice && <p className="text-xs text-red-400 mb-2">{notice}</p>}
        {disabled ? (
          <p className="text-xs text-muted">{disabledReason ?? "Chat is closed"}</p>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              maxLength={500}
              placeholder="Say something..."
              className="flex-1 bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="w-9 h-9 rounded-lg bg-primary hover:bg-primary-hover text-white flex items-center justify-center disabled:opacity-50"
              title="Send"
            >
              <Send size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
