export type Role = "viewer" | "creator" | "admin";

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
  { label: "Appetizers", href: "/dashboard/appetizers", icon: "utensils-crossed", roles: ["viewer", "creator", "admin"], section: "main" },
  { label: "Celebrity Leaks", href: "/dashboard/celebrity-leaks", icon: "star", roles: ["viewer", "creator", "admin"], section: "main" },
  { label: "Live Sex", href: "/dashboard/live-sex", icon: "radio", roles: ["viewer", "creator", "admin"], section: "main" },
  { label: "Quickies", href: "/dashboard/quickies", icon: "zap", roles: ["viewer", "creator", "admin"], section: "main" },
  { label: "Picha", href: "/dashboard/picha", icon: "image", roles: ["viewer", "creator", "admin"], section: "main" },
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
    username: "jane_viewer",
    email: "viewer@happinesshub.com",
    role: "viewer",
    initials: "JV",
  },
  creator: {
    id: "2",
    name: "John Creator",
    username: "john_creator",
    email: "creator@happinesshub.com",
    role: "creator",
    initials: "JC",
  },
  admin: {
    id: "3",
    name: "Alex Admin",
    username: "alex_admin",
    email: "admin@happinesshub.com",
    role: "admin",
    initials: "AA",
  },
};
