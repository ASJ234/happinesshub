import { CreditCard, Eye, Users, Video } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UsersTable, type AdminUserRow } from "@/components/admin/UsersTable";
import {
  PendingPayments,
  type AdminSubscriptionRow,
} from "@/components/admin/PendingPayments";
import { GiftPackagesForm } from "@/components/admin/GiftPackagesForm";
import { fetchGiftTopUpPackages } from "@/lib/gift-topups";
import { PlanLinksForm } from "@/components/admin/PlanLinksForm";
import { headers } from "next/headers";
import { DeleteVideoButton } from "@/components/videos/DeleteVideoButton";
import {
  creatorLabel,
  formatDate,
  fetchSubscriptionPlans,
  formatViews,
  videoStatusLabel,
  type VideoRow,
} from "@/lib/videos";

export default async function AdminPage() {
  const admin = await requireRole("admin");
  const supabase = await createClient();

  const [profilesResult, videosResult, subsResult, giftPackages, plans] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, username, display_name, role, created_at, verification_exempted"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("videos")
        .select("*, creator:creator_id(username, display_name)")
        .order("views", { ascending: false })
        .limit(100),
      supabase
        .from("subscriptions")
        .select(
          "*, user:user_id(username, display_name)"
        )
        .order("created_at", { ascending: false })
        .limit(50),
      fetchGiftTopUpPackages(supabase),
      fetchSubscriptionPlans(supabase),
    ]);

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const siteUrl = `${proto}://${host}`;

  const profiles = profilesResult.data ?? [];
  const videos = (videosResult.data ?? []) as VideoRow[];
  const subscriptions = subsResult.data ?? [];
  const pendingCount = subscriptions.filter(
    (s) => s.status === "pending" && s.method !== "marzpay"
  ).length;
  const totalViews = videos.reduce((sum, v) => sum + (v.views ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Eye className="text-primary" size={28} />}
        title="Admin Panel"
        description="Oversee users, payments, and every video on the platform"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={profiles.length.toLocaleString()}
          icon={Users}
        />
        <StatCard
          label="Videos Uploaded"
          value={videos.length.toLocaleString()}
          icon={Video}
        />
        <StatCard
          label="Total Views"
          value={formatViews(totalViews)}
          icon={Eye}
        />
        <StatCard
          label="Pending Deposits"
          value={pendingCount.toLocaleString()}
          icon={CreditCard}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Deposit Requests</h2>
          <p className="text-xs text-muted mt-0.5">
            Approving a request opens that customer&apos;s padlocks immediately
          </p>
        </div>
        <PendingPayments requests={subscriptions as AdminSubscriptionRow[]} />
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">MarzPay Payment Links</h2>
          <p className="text-xs text-muted mt-0.5">
            Subscribers pay through these. Approve their requests above once the
            money shows in MarzPay.
          </p>
        </div>
        <PlanLinksForm
          plans={plans}
          redirectUrl={`${siteUrl}/dashboard/subscription`}
          callbackUrl={`${siteUrl}/api/webhooks/marzpay-link`}
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Gift Credit Top-up Links</h2>
          <p className="text-xs text-muted mt-0.5">
            Users buy gift credit through these. Approve their top-ups on Live
            Requests once the money shows in MarzPay.
          </p>
        </div>
        <GiftPackagesForm
          packages={giftPackages}
          redirectUrl={`${siteUrl}/dashboard/subscription#gift-credit`}
          callbackUrl={`${siteUrl}/api/webhooks/marzpay-link?for=gift`}
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">User Management</h2>
          <p className="text-xs text-muted mt-0.5">
            Edit roles and display names, or delete accounts
          </p>
        </div>
        <UsersTable
          users={profiles as AdminUserRow[]}
          currentUserId={admin.id}
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Videos &amp; Views</h2>
          <p className="text-xs text-muted mt-0.5">
            Every upload on the platform, ordered by views
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border text-muted text-left">
                <th className="p-4 font-medium">Video</th>
                <th className="p-4 font-medium">Creator</th>
                <th className="p-4 font-medium">Views</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted">
                    No videos uploaded yet.
                  </td>
                </tr>
              )}
              {videos.map((video) => (
                <tr
                  key={video.id}
                  className="border-b border-border last:border-0 hover:bg-surface-elevated"
                >
                  <td className="p-4">
                    <p className="font-medium line-clamp-1 max-w-64">
                      {video.title}
                    </p>
                  </td>
                  <td className="p-4 text-muted">{creatorLabel(video)}</td>
                  <td className="p-4">
                    <span className="flex items-center gap-1 font-medium">
                      <Eye size={14} className="text-muted" />
                      {video.views.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={videoStatusLabel(video.status)} />
                  </td>
                  <td className="p-4 text-muted">
                    {formatDate(video.created_at)}
                  </td>
                  <td className="p-4">
                    <DeleteVideoButton videoId={video.id} title={video.title} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
