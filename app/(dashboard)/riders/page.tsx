export const dynamic = "force-dynamic";
export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { getRiders } from "@/services/riders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, User, Bike, Car, Truck } from "lucide-react";

export const metadata: Metadata = { title: "Riders" };

const vehicleIcons = {
  motor: Bike,
  bike: Bike,
  car: Car,
};

export default async function RidersPage() {
  const riders = await getRiders();
  const active = riders.filter((r) => r.active).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Riders</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {active} active · {riders.length} total
          </p>
        </div>
        <Link href="/riders/new">
          <Button className="bg-red-800 hover:bg-red-900 gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Rider
          </Button>
        </Link>
      </div>

      {riders.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white py-16 px-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3 mx-auto">
            <User className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No riders yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first rider to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {riders.map((rider) => {
            const VehicleIcon = rider.vehicleType
              ? vehicleIcons[rider.vehicleType as keyof typeof vehicleIcons] ?? Truck
              : null;

            return (
              <Link key={rider.id} href={`/riders/${rider.id}`}>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-800 font-semibold text-sm shrink-0 overflow-hidden">
                      {rider.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rider.photoUrl}
                          alt={rider.name}
                          className="w-10 h-10 object-cover"
                        />
                      ) : (
                        rider.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {rider.name}
                        </p>
                        {!rider.active && (
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {rider.riderId}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {rider.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          rider.role === "Admin"
                            ? "bg-red-800 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {rider.role}
                      </span>
                      {rider.active && (
                        <span className="text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    {VehicleIcon && rider.vehicleType && (
                      <div className="flex items-center gap-1 text-gray-400">
                        <VehicleIcon className="h-3.5 w-3.5" />
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
