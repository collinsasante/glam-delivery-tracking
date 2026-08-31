import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { signOutAction } from "@/actions/auth";
import Image from "next/image";
import { LogOut } from "lucide-react";
import type { SessionPayload } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/session";
import { getRiderById } from "@/services/riders";
import { FcmRegistration } from "@/components/rider/FcmRegistration";

export default async function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/signin");
  const user = session.user as SessionPayload;
  if (user.role !== "Rider") redirect("/dashboard");

  // Force sign-out if the rider account was deleted or deactivated
  const riderRecord = await getRiderById(user.id).catch(() => null);
  if (!riderRecord || !riderRecord.active) {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    redirect("/signin");
  }

  return (
    <div className="min-h-full bg-[#f6f6f8]">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-black/[0.06]">
        <div className="max-w-lg mx-auto px-5 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[9px] bg-red-800 flex items-center justify-center shadow-[0_2px_8px_rgba(153,27,27,0.35)] shrink-0">
              <Image src="/logo.png" alt="" width={16} height={16} className="rounded-[3px]" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-gray-900 leading-tight">
                {user.name}
              </p>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                {user.riderId ?? "Rider"}
              </p>
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-[34px] h-[34px] rounded-full bg-[#f6f6f8] flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </form>
        </div>
      </header>
      <FcmRegistration />
      <main className="max-w-lg mx-auto px-5 py-5">{children}</main>
    </div>
  );
}
