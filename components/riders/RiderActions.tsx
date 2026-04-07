"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, PowerOff, Power, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { updateRiderAction, deleteRiderAction } from "@/actions/riders";

interface RiderActionsProps {
  id: string;
  backPath: string; // "/riders" or "/staff"
  rider: {
    name: string;
    email: string;
    phone?: string;
    role: "Rider" | "Admin";
    vehicleType?: string;
    active: boolean;
  };
}

export function RiderActions({ id, backPath, rider }: RiderActionsProps) {
  const router = useRouter();
  const [isTogglingActive, startToggle] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  function handleToggleActive() {
    startToggle(async () => {
      const result = await updateRiderAction(id, {
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        role: rider.role,
        vehicleType: rider.vehicleType as "motor" | "car" | "bike" | undefined,
        active: !rider.active,
        password: "",
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(rider.active ? "Account deactivated" : "Account activated");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete ${rider.name}? This cannot be undone.`)) return;
    startDelete(async () => {
      const result = await deleteRiderAction(id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Account deleted");
        router.push(backPath);
      }
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Link href={`/riders/${id}/edit`}>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </Link>

      <Button
        size="sm"
        variant="outline"
        className={`gap-1.5 text-xs ${
          rider.active
            ? "text-amber-600 border-amber-200 hover:bg-amber-50"
            : "text-green-700 border-green-200 hover:bg-green-50"
        }`}
        onClick={handleToggleActive}
        disabled={isTogglingActive}
      >
        {isTogglingActive ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : rider.active ? (
          <PowerOff className="h-3.5 w-3.5" />
        ) : (
          <Power className="h-3.5 w-3.5" />
        )}
        {rider.active ? "Deactivate" : "Activate"}
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        Delete
      </Button>
    </div>
  );
}
