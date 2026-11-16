import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AgeGate } from "@/components/layout/AgeGate";
import { AGE_COOKIE } from "@/lib/age-gate";
import "./globals.css";

export const metadata: Metadata = {
  title: "HAPPYPORN.COM — Pleasure. Passion. Privacy.",
  description: "Your premium video streaming and creator platform.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read on the server so confirmed visitors never see the gate flash.
  const ageVerified = (await cookies()).get(AGE_COOKIE)?.value === "1";

  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full bg-background text-foreground font-sans">
        {children}
        {!ageVerified && <AgeGate />}
      </body>
    </html>
  );
}
