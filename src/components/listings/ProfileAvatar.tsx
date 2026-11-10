import { UserRound } from "lucide-react";

const SIZES = {
  md: { box: "w-16 h-16", icon: 28 },
  lg: { box: "w-20 h-20", icon: 30 },
  xl: { box: "w-28 h-28", icon: 44 },
} as const;

interface ProfileAvatarProps {
  src: string | null | undefined;
  alt: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/** A round profile picture, or a placeholder when none was uploaded. */
export function ProfileAvatar({
  src,
  alt,
  size = "md",
  className = "",
}: ProfileAvatarProps) {
  const { box, icon } = SIZES[size];
  return (
    <div
      className={`${box} rounded-full overflow-hidden bg-surface-elevated border border-border flex items-center justify-center shrink-0 ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <UserRound size={icon} className="text-muted" />
      )}
    </div>
  );
}
