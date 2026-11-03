"use client";

import { MessageCircle } from "lucide-react";

interface WhatsAppButtonProps {
  number: string;
  message: string;
}

export function WhatsAppButton({ number, message }: WhatsAppButtonProps) {
  const digits = number.replace(/[^\d]/g, "");
  if (!digits) return null;

  const href = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white text-sm font-medium shadow-lg shadow-black/30 hover:brightness-95 transition"
      aria-label="Chat with support on WhatsApp"
    >
      <MessageCircle size={18} />
      <span className="hidden sm:inline">Support</span>
    </a>
  );
}
