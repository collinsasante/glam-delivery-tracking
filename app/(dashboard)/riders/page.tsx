export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { getRiders } from "@/services/riders";
import { Button } from "@/components/ui/button";
import { Plus, User, Bike, Car, Truck } from "lucide-react";

export const metadata: Metadata = { title: "Riders" };

const vehicleIcons = {
  motor: Bike,
  bike: Bike,
  car: Car,
};

export default async function RidersPage() {
  const all = await getRiders();
  const riders = all.filter((r) => r.role === "Rider");
  const active = riders.filter((r) => r.active).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900">Riders</h1>
          <p className="text-[13.5px] text-gray-400 mt-1.5">
            {active} active · {riders.length} total
          </p>
        </div>
        <Link href="/riders/new">
          <Button className="h-11 px-5 rounded-xl bg-red-800 hover:bg-red-900 gap-2 text-[13.5px] font-semibold shadow-[0_6px_16px_-4px_rgba(153,27,27,0.5)]">
            <Plus className="h-4 w-4" />
            Add Rider
          </Button>
        </Link>
      </div>

      {riders.length === 0 ? (
        <div className="rounded-2xl border border-black/[0.045] bg-white py-16 px-4 text-center shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)]">
          <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center mb-3 mx-auto">
            <User className="h-5 w-5 text-gray-400" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-medium text-gray-700">No riders yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first rider to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {riders.map((rider) => {
            const VehicleIcon = rider.vehicleType
              ? vehicleIcons[rider.vehicleType as keyof typeof vehicleIcons] ?? Truck
              : null;

            return (
              <Link key={rider.id} href={`/riders/${rider.id}`}>
                <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] p-5 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(16,24,32,0.04),0_20px_34px_-18px_rgba(16,24,32,0.24)] transition-all cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center text-red-800 font-bold text-sm shrink-0 overflow-hidden">
                      {rider.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rider.photoUrl}
                          alt={rider.name}
                          className="w-11 h-11 object-cover"
                        />
                      ) : (
                        rider.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14.5px] font-bold text-gray-900 truncate">
                          {rider.name}
                        </p>
                        {!rider.active && (
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-[7px] py-[2px] rounded-[6px]">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {rider.riderId}
                      </p>
                      <p className="text-[13px] text-gray-500 mt-1 truncate">
                        {rider.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-black/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10.5px] font-semibold px-[10px] py-[4px] rounded-full ${
                          rider.role === "Admin"
                            ? "bg-red-800 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {rider.role}
                      </span>
                      {rider.active && (
                        <span className="text-[10.5px] font-semibold text-green-800 bg-green-50 px-[10px] py-[4px] rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    {VehicleIcon && rider.vehicleType && (
                      <div className="flex items-center gap-1 text-gray-400">
                        <VehicleIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                        <span className="text-[11px] capitalize text-gray-400">
                          {rider.vehicleType}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
