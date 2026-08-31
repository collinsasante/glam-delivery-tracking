export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { getRiders } from "@/services/riders";
import { Button } from "@/components/ui/button";
import { Plus, User } from "lucide-react";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const all = await getRiders();
  const staff = all.filter((r) => r.role === "Admin");

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900">Staff</h1>
          <p className="text-[13.5px] text-gray-400 mt-1.5">
            {staff.filter((s) => s.active).length} active · {staff.length} total
          </p>
        </div>
        <Link href="/staff/new">
          <Button className="h-11 px-5 rounded-xl bg-red-800 hover:bg-red-900 gap-2 text-[13.5px] font-semibold shadow-[0_6px_16px_-4px_rgba(153,27,27,0.5)]">
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        </Link>
      </div>

      {staff.length === 0 ? (
        <div className="rounded-2xl border border-black/[0.045] bg-white py-16 px-4 text-center shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)]">
          <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center mb-3 mx-auto">
            <User className="h-5 w-5 text-gray-400" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-medium text-gray-700">No staff yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first staff member to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => (
            <Link key={member.id} href={`/riders/${member.id}`}>
              <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] p-5 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(16,24,32,0.04),0_20px_34px_-18px_rgba(16,24,32,0.24)] transition-all cursor-pointer h-full">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-red-800 font-bold text-sm shrink-0 overflow-hidden">
                    {member.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.photoUrl} alt={member.name} className="w-11 h-11 object-cover" />
                    ) : (
                      member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14.5px] font-bold text-gray-900 truncate">{member.name}</p>
                      {!member.active && (
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-[7px] py-[2px] rounded-[6px]">Inactive</span>
                      )}
                    </div>
                    <p className="text-[13px] text-gray-500 mt-1 truncate">{member.email}</p>
                  </div>
                </div>
                <div className="mt-4 pt-3.5 border-t border-black/[0.05] flex items-center gap-1.5">
                  <span className="text-[10.5px] font-semibold px-[10px] py-[4px] rounded-full bg-red-800 text-white">Admin</span>
                  {member.active && (
                    <span className="text-[10.5px] font-semibold text-green-800 bg-green-50 px-[10px] py-[4px] rounded-full">Active</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
