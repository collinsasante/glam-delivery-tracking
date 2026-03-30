"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { clockInAction, clockOutAction } from "@/actions/clockEvents";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClockIn } from "./ClockInContext";

interface Props {
  initialClockedIn: boolean;
  clockInTimestamp?: string;
  hasClockInToday?: boolean;
}

export function ClockInButton({ initialClockedIn, clockInTimestamp, hasClockInToday: initialHasClockInToday }: Props) {
  const { setIsClockedIn: setContextClockedIn } = useClockIn();
  const [isClockedIn, setIsClockedIn] = useState(initialClockedIn);
  const [clockInTime, setClockInTime] = useState(clockInTimestamp);
  const [hasClockInToday, setHasClockInToday] = useState(initialHasClockInToday ?? false);
  const [elapsed, setElapsed] = useState("");
  const [isPending, startTransition] = useTransition();
  const { capture } = useGeolocation();
  const router = useRouter();

  useEffect(() => {
    if (!isClockedIn || !clockInTime) return;

    function update() {
      const mins = Math.round(
        (Date.now() - new Date(clockInTime!).getTime()) / 60000
      );
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`);
    }

    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [isClockedIn, clockInTime]);

  function handle() {
    startTransition(async () => {
      let result;
      if (isClockedIn) {
        result = await clockOutAction();
      } else {
        // Capture GPS location for clock-in; proceed even if denied
        const gps = await capture();
        if (!gps) {
          console.warn("[ClockIn] GPS unavailable or denied — clocking in without location");
          toast("Location unavailable — clocking in without GPS", { icon: "⚠️" });
        } else {
          console.log("[ClockIn] GPS captured:", gps);
        }
        result = await clockInAction(gps ?? undefined);
      }

      if ("error" in result) {
        console.error("[ClockIn] action error:", result.error);
        toast.error(result.error);
        return;
      }

      if (isClockedIn) {
        setIsClockedIn(false);
        setContextClockedIn(false);
        setClockInTime(undefined);
        setElapsed("");
        toast.success("Clocked out — shift ended");
        console.log("[ClockIn] Clocked OUT — context set to false");
      } else {
        setIsClockedIn(true);
        setContextClockedIn(true);
        setHasClockInToday(true);
        setClockInTime(result.timestamp);
        toast.success("Clocked in — ready for deliveries");
        console.log("[ClockIn] Clocked IN — context set to true");
      }
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-5 transition-colors",
        isClockedIn
          ? "bg-green-50 border-green-200"
          : "bg-white border-gray-200"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isClockedIn ? "bg-green-100" : "bg-gray-100"
            )}
          >
            <Clock
              className={cn(
                "h-5 w-5",
                isClockedIn ? "text-green-600" : "text-gray-400"
              )}
            />
          </div>
          <div>
            <p
              className={cn(
                "text-sm font-semibold leading-tight",
                isClockedIn ? "text-green-800" : "text-gray-700"
              )}
            >
              {isClockedIn ? "On Shift" : "Off Shift"}
            </p>
            {isClockedIn && elapsed ? (
              <p className="text-xs text-green-600 mt-0.5">{elapsed} elapsed</p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">
                {isClockedIn
                  ? "Tracking time"
                  : hasClockInToday
                  ? "Shift complete for today"
                  : "Clock in to start"}
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={handle}
          disabled={isPending || (!isClockedIn && hasClockInToday)}
          size="sm"
          className={cn(
            "gap-1.5",
            isClockedIn
              ? "bg-white border border-red-200 text-red-600 hover:bg-red-50 shadow-none"
              : "bg-green-600 hover:bg-green-700 text-white"
          )}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isClockedIn ? (
            <>
              <LogOut className="h-3.5 w-3.5" />
              Clock out
            </>
          ) : (
            <>
              <LogIn className="h-3.5 w-3.5" />
              Clock in
            </>
          )}
        </Button>
      </div>

      {/* Status bar */}
      <div className="mt-4 h-1 rounded-full bg-black/5 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            isClockedIn ? "w-full bg-green-400" : "w-0"
          )}
        />
      </div>
    </div>
  );
}
