"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
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
      try {
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
      } catch (err) {
        console.error("[ClockIn] action threw:", err);
        toast.error("Clock in failed — please check your connection and try again.");
        return;
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
    <div className="rounded-[20px] bg-gradient-to-br from-[#141416] to-[#0b0b0d] p-[22px] shadow-[0_16px_30px_-14px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-[11px] flex items-center justify-center bg-white/[0.08]"
            )}
          >
            <Clock
              className={cn("h-[19px] w-[19px]", isClockedIn ? "text-green-400" : "text-gray-300")}
              strokeWidth={1.8}
            />
          </div>
          <div>
            <p className="text-[14.5px] font-bold leading-tight text-white">
              {isClockedIn ? "On Shift" : "Off Shift"}
            </p>
            {isClockedIn && elapsed ? (
              <p className="text-xs text-green-400 mt-0.5 font-medium">{elapsed} elapsed</p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                {isClockedIn
                  ? "Tracking time"
                  : hasClockInToday
                  ? "Shift complete for today"
                  : "Clock in to start"}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handle}
          disabled={isPending || (!isClockedIn && hasClockInToday)}
          className={cn(
            "flex items-center gap-1.5 rounded-[11px] px-[18px] h-11 text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none",
            isClockedIn
              ? "bg-white/[0.08] text-red-400 hover:bg-white/[0.12]"
              : "bg-red-800 text-white shadow-[0_8px_18px_-6px_rgba(153,27,27,0.6)] hover:bg-red-900"
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
        </button>
      </div>

      {/* Status bar */}
      <div className="mt-5 h-1 rounded-full bg-white/[0.08] overflow-hidden">
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
