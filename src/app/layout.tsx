import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HappinessHub — Pleasure. Passion. Privacy.",
  description: "Your premium video streaming and creator platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full bg-background text-foreground font-sans">{children}</body>
    </html>
  );
}
