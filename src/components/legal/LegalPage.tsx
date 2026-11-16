import type { ReactNode } from "react";
import Link from "next/link";

interface LegalPageProps {
  title: string;
  updated: string;
  children: ReactNode;
}

/** A plain reading layout for the terms and privacy pages. */
export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
        ← Back to the site
      </Link>
      <h1 className="text-3xl font-bold mt-6">{title}</h1>
      <p className="text-sm text-muted mt-2">Last updated {updated}</p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </main>
  );
}
