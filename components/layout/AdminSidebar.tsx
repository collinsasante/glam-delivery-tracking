"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Users,
  BarChart3,
  Receipt,
  LogOut,
} from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/deliveries", label: "Deliveries", icon: Truck },
  { href: "/riders", label: "Riders", icon: Users },
  { href: "/performance", label: "Performance", icon: BarChart3 },
  { href: "/expenses", label: "Expenses", icon: Receipt },
];

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-gray-950 flex flex-col z-40">
      {/* Logo */}
      <div className="h-14 px-4 flex items-center shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Glam Delivery"
            width={26}
            height={26}
            className="rounded-md shrink-0"
          />
          <span className="text-white font-semibold text-sm tracking-tight">
            Glam Delivery
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                active
                  ? "bg-red-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
              )}
            >
              <Icon className="h-[15px] w-[15px] shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-2.5 py-3 border-t border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5">
          <div className="w-6 h-6 rounded-full bg-red-800 flex items-center justify-center shrink-0">
            <span className="text-white text-[9px] font-bold tracking-wide">
              {initials}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-white truncate leading-none">
              {userName}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">Admin</p>
          </div>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors"
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
