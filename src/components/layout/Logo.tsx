import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

const sizes = {
  sm: { height: 32, width: 120 },
  md: { height: 48, width: 180 },
  lg: { height: 80, width: 280 },
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
        style={{ height, width: "auto", maxWidth: width }}
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
