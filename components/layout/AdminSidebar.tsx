"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Users,
  UserCog,
  BarChart3,
  Receipt,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/deliveries", label: "Deliveries", icon: Truck },
      { href: "/riders", label: "Riders", icon: Users },
      { href: "/staff", label: "Staff", icon: UserCog },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/performance", label: "Performance", icon: BarChart3 },
      { href: "/expenses", label: "Expenses", icon: Receipt },
    ],
  },
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
    <aside className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-[#0d0d10] to-[#0a0a0c] flex flex-col z-40">
      {/* Logo */}
      <div className="h-[68px] px-5 flex items-center gap-2.5 shrink-0 border-b border-white/[0.06]">
        <div className="w-[30px] h-[30px] rounded-lg bg-red-800 flex items-center justify-center shadow-[0_2px_8px_rgba(153,27,27,0.4)] shrink-0">
          <Image src="/logo.png" alt="" width={16} height={16} className="rounded-[3px]" />
        </div>
        <span className="text-white font-bold text-[15px] tracking-tight">
          Drop
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3.5 py-5 overflow-y-auto">
        {navSections.map((section, i) => (
          <div key={section.label} className={i > 0 ? "mt-4" : ""}>
            <div className="px-2.5 pb-2 text-[10px] font-semibold tracking-[0.08em] text-gray-600 uppercase">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors",
                      active
                        ? "bg-red-800 text-white font-semibold shadow-[0_4px_14px_-2px_rgba(153,27,27,0.45)]"
                        : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
                    )}
                  >
                    <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.9} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-[34px] h-[34px] rounded-full bg-[#1c1c22] border-[1.5px] border-red-800 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-white truncate leading-tight">
              {userName}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">Administrator</p>
          </div>
          <ChevronRight className="h-[15px] w-[15px] text-gray-600 shrink-0" strokeWidth={1.8} />
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-gray-500 hover:text-gray-200 hover:bg-white/[0.06] transition-colors mt-1"
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
