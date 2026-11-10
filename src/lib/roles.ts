import type { LucideIcon } from "lucide-react";
import {
  UtensilsCrossed,
  Radio,
  Zap,
  ImageIcon,
  Hand,
  Sparkles,
  Compass,
  Shirt,
  Flag,
  LayoutDashboard,
  Upload,
  Clapperboard,
  Video,
  FolderOpen,
  BarChart3,
  MessageSquare,
  Coins,
  CreditCard,
  Settings,
  ShieldCheck,
  Contact,
  Store,
} from "lucide-react";

export type Role = "viewer" | "creator" | "provider" | "vendor" | "admin";

export type NavSection = "main" | "studio" | "account" | "admin";

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: Role;
  initials: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  section: NavSection;
}

export const ROLE_LABELS: Record<Role, string> = {
  viewer: "Viewer",
  creator: "Creator",
  provider: "Service Provider",
  vendor: "Vendor",
  admin: "Admin",
};

export const SECTION_LABELS: Record<NavSection, string> = {
  main: "Browse",
  studio: "Studio",
  account: "Account",
  admin: "Administration",
};

const ALL_ROLES: Role[] = ["viewer", "creator", "provider", "vendor", "admin"];
const CREATOR_ROLES: Role[] = ["creator", "admin"];

export const SECTION_ORDER: NavSection[] = [
  "main",
  "studio",
  "account",
  "admin",
];

export const NAV_ITEMS: NavItem[] = [
  { label: "Picha", href: "/dashboard/picha", icon: ImageIcon, roles: ALL_ROLES, section: "main" },
  { label: "Wardrobe", href: "/dashboard/wardrobe", icon: Shirt, roles: ALL_ROLES, section: "main" },
  { label: "Exclusively Ugandan", href: "/dashboard/ugandan", icon: Flag, roles: ALL_ROLES, section: "main" },
  { label: "Appetizers", href: "/dashboard/appetizers", icon: UtensilsCrossed, roles: ALL_ROLES, section: "main" },
  { label: "Quickies", href: "/dashboard/quickies", icon: Zap, roles: ALL_ROLES, section: "main" },
  { label: "Masseuse", href: "/dashboard/masseuse", icon: Hand, roles: ALL_ROLES, section: "main" },
  { label: "Hookups", href: "/dashboard/hookups", icon: Sparkles, roles: ALL_ROLES, section: "main" },
  { label: "Live", href: "/dashboard/live", icon: Radio, roles: ALL_ROLES, section: "main" },
  { label: "Explore", href: "/dashboard/explore", icon: Compass, roles: ALL_ROLES, section: "main" },

  { label: "Creator Dashboard", href: "/dashboard/creator-dashboard", icon: LayoutDashboard, roles: CREATOR_ROLES, section: "studio" },
  { label: "Upload", href: "/dashboard/upload", icon: Upload, roles: CREATOR_ROLES, section: "studio" },
  { label: "Shorts Studio", href: "/dashboard/shorts-studio", icon: Clapperboard, roles: CREATOR_ROLES, section: "studio" },
  { label: "Live Studio", href: "/dashboard/live-studio", icon: Video, roles: CREATOR_ROLES, section: "studio" },
  { label: "My Content", href: "/dashboard/my-content", icon: FolderOpen, roles: CREATOR_ROLES, section: "studio" },
  { label: "My Profiles", href: "/dashboard/my-listing", icon: Contact, roles: CREATOR_ROLES, section: "studio" },
  { label: "My Profile", href: "/dashboard/my-listing", icon: Contact, roles: ["provider"], section: "studio" },
  { label: "My Shop", href: "/dashboard/my-listing", icon: Store, roles: ["vendor"], section: "studio" },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, roles: CREATOR_ROLES, section: "studio" },
  { label: "Comments", href: "/dashboard/comments", icon: MessageSquare, roles: CREATOR_ROLES, section: "studio" },
  { label: "Monetization", href: "/dashboard/monetization", icon: Coins, roles: CREATOR_ROLES, section: "studio" },

  { label: "Subscription", href: "/dashboard/subscription", icon: CreditCard, roles: ALL_ROLES, section: "account" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, roles: ALL_ROLES, section: "account" },

  { label: "Admin", href: "/dashboard/admin", icon: ShieldCheck, roles: ["admin"], section: "admin" },
];

export function hasRole(userRole: Role, required: Role[]): boolean {
  return required.includes(userRole);
}

export function getNavForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => hasRole(role, item.roles));
}
