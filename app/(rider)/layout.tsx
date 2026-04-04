import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signOutAction } from "@/actions/auth";
import Image from "next/image";
import { LogOut } from "lucide-react";
import type { SessionPayload } from "@/lib/session";
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

  return (
    <div className="min-h-full bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Drop"
              width={24}
              height={24}
              className="rounded-md shrink-0"
            />
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {user.name}
              </p>
              <p className="text-[10px] text-gray-400 font-mono">
                {user.riderId ?? "Rider"}
              </p>
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </header>
      <FcmRegistration />
      <main className="max-w-lg mx-auto px-4 py-5">{children}</main>
    </div>
  );
}
