import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import type { SessionPayload } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/signin");
  const user = session.user as SessionPayload;
  if (user.role !== "Admin") redirect("/rider");

  return (
    <div className="flex h-full">
      <AdminSidebar userName={user.name ?? "Admin"} />
      <main className="pl-56 flex-1 min-h-full">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
