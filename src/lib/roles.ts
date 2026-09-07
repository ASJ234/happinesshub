export type Role = "viewer" | "creator" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: Role[];
  section?: "main" | "creator";
}

export const ROLE_LABELS: Record<Role, string> = {
  viewer: "Viewer",
  creator: "Creator",
  admin: "Admin",
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: "home", roles: ["viewer", "creator", "admin"], section: "main" },
  { label: "Explore", href: "/dashboard/explore", icon: "compass", roles: ["viewer", "creator", "admin"], section: "main" },
  { label: "Upload Video", href: "/dashboard/upload", icon: "upload", roles: ["creator", "admin"], section: "main" },
  { label: "Live Studio", href: "/dashboard/live-studio", icon: "radio", roles: ["creator", "admin"], section: "main" },
  { label: "Shorts Studio", href: "/dashboard/shorts-studio", icon: "zap", roles: ["creator", "admin"], section: "main" },
  { label: "My Content", href: "/dashboard/my-content", icon: "folder", roles: ["creator", "admin"], section: "main" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "bar-chart", roles: ["creator", "admin"], section: "main" },
  { label: "Comments", href: "/dashboard/comments", icon: "message-circle", roles: ["creator", "admin"], section: "main" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings", roles: ["viewer", "creator", "admin"], section: "main" },
  { label: "Creator Dashboard", href: "/dashboard/creator-dashboard", icon: "layout-dashboard", roles: ["creator", "admin"], section: "creator" },
  { label: "Subscription", href: "/dashboard/subscription", icon: "credit-card", roles: ["creator", "admin"], section: "creator" },
  { label: "Monetization", href: "/dashboard/monetization", icon: "dollar-sign", roles: ["creator", "admin"], section: "creator" },
  { label: "Admin Panel", href: "/dashboard/admin", icon: "shield", roles: ["admin"], section: "creator" },
];

export function hasRole(userRole: Role, required: Role[]): boolean {
  return required.includes(userRole);
}

export function canAccessRoute(userRole: Role, pathname: string): boolean {
  const item = NAV_ITEMS.find((nav) => nav.href === pathname);
  if (!item) return true;
  return hasRole(userRole, item.roles);
}

export function getNavForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => hasRole(role, item.roles));
}

export const DEMO_USERS: Record<Role, User> = {
  viewer: {
    id: "1",
    name: "Jane Viewer",
    email: "viewer@happinesshub.com",
    role: "viewer",
    initials: "JV",
  },
  creator: {
    id: "2",
    name: "John Creator",
    email: "creator@happinesshub.com",
    role: "creator",
    initials: "JC",
  },
  admin: {
    id: "3",
    name: "Alex Admin",
    email: "admin@happinesshub.com",
    role: "admin",
    initials: "AA",
  },
};
