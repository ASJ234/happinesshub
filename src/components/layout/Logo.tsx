import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

const sizes = {
  sm: { height: 50, width: 74 },
  md: { height: 100, width: 148 },
  lg: { height: 150, width: 222 },
};

export function Logo({ size = "sm", showTagline = false }: LogoProps) {
  const { height, width } = sizes[size];

  return (
    <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
      <Image
        src="/happinesshub-logo.png"
        alt="HappinessHub"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
      {showTagline && (
        <span className="hidden lg:block text-[10px] tracking-widest text-muted uppercase">
          Pleasure. Passion. Privacy.
        </span>
      )}
    </Link>
  );
}
