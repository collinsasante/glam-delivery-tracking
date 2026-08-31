import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import type { SessionPayload } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/session";
import { getRiderById } from "@/services/riders";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/signin");
  const user = session.user as SessionPayload;
  if (user.role !== "Admin") redirect("/rider");

  // Force sign-out if the admin account was deleted or deactivated
  const adminRecord = await getRiderById(user.id).catch(() => null);
  if (!adminRecord || !adminRecord.active) {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    redirect("/signin");
  }

  return (
    <div className="flex h-full">
      <AdminSidebar userName={user.name ?? "Admin"} />
      <main className="pl-64 flex-1 min-h-full min-w-0 overflow-x-auto">
        <div className="max-w-5xl mx-auto px-11 py-10">{children}</div>
      </main>
    </div>
  );
}
