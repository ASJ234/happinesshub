import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <Sidebar />
      <MobileNav />
      <main className="lg:ml-60 pt-[6.75rem] lg:pt-14 min-h-screen">
        <div className="px-4 sm:px-6 py-4 sm:py-6 pb-24 lg:pb-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
