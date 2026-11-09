import {
  Eye,
  Users,
  TrendingUp,
  BarChart3,
  DollarSign,
  Video,
  AlertTriangle,
} from "lucide-react";

export const uploadTips = [
  "Use 1080p or 4K resolution for best quality",
  "Add titles, descriptions, and tags for discoverability",
  "Set visibility before publishing",
];

export const analyticsStats = [
  { label: "Total Views", value: "24.8K", change: "+12%", icon: Eye },
  { label: "Subscribers", value: "1,204", change: "+8%", icon: Users },
  { label: "Watch Time", value: "892 hrs", change: "+15%", icon: TrendingUp },
  { label: "Engagement", value: "6.2%", change: "+2%", icon: BarChart3 },
];

export const creatorStats = [
  { label: "Revenue (30d)", value: "$1,248", icon: DollarSign },
  { label: "New Subscribers", value: "+86", icon: Users },
  { label: "Growth Rate", value: "+14%", icon: TrendingUp },
];

export const adminStats = [
  { label: "Total Users", value: "12,847", icon: Users },
  { label: "Active Videos", value: "3,421", icon: Video },
  { label: "Reports Pending", value: "7", icon: AlertTriangle },
];

export type MockUser = {
  name: string;
  email: string;
  role: "Viewer" | "Creator" | "Admin";
  status: "Active" | "Banned";
};

export const adminUsers: MockUser[] = [
  { name: "Jane Viewer", email: "viewer@happyporn.com", role: "Viewer", status: "Active" },
  { name: "John Creator", email: "creator@happyporn.com", role: "Creator", status: "Active" },
  { name: "Alex Admin", email: "admin@happyporn.com", role: "Admin", status: "Active" },
  { name: "Spam Bot", email: "bot@spam.com", role: "Viewer", status: "Banned" },
];

export type CommentItem = {
  user: string;
  text: string;
  video: string;
  time: string;
};

export const mockComments: CommentItem[] = [
  { user: "Sarah M.", text: "Great tutorial! Really helped me understand the concepts.", video: "Getting Started with Next.js 16", time: "2h ago" },
  { user: "Mike T.", text: "Can you do a follow-up on authentication?", video: "Dark Mode UI Design Tips", time: "5h ago" },
  { user: "Emma L.", text: "Love the dark mode design in this one 🔥", video: "Dark Mode UI Design Tips", time: "1d ago" },
];

export type VideoItem = {
  title: string;
  views: string;
  status: "Published" | "Draft" | "Scheduled";
  date: string;
};

export const mockVideos: VideoItem[] = [
  { title: "Getting Started with Next.js 16", views: "2.4K", status: "Published", date: "Sep 5, 2026" },
  { title: "Dark Mode UI Design Tips", views: "1.8K", status: "Published", date: "Sep 3, 2026" },
  { title: "Stream Setup Tutorial", views: "—", status: "Draft", date: "Sep 7, 2026" },
  { title: "Weekly Vlog #12", views: "—", status: "Scheduled", date: "Sep 10, 2026" },
];
