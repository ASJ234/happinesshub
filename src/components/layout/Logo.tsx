import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

const sizes = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
};

export function Logo({ size = "sm", showTagline = false }: LogoProps) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
      <span
        className={`${sizes[size]} font-black tracking-tight leading-none select-none`}
      >
        <span className="text-foreground">HAPPYPORN</span>
        <span className="gradient-text">.COM</span>
      </span>
      {showTagline && (
        <span className="hidden lg:block text-[10px] tracking-widest text-muted uppercase">
          Pleasure. Passion. Privacy.
        </span>
      )}
    </Link>
  );
}
