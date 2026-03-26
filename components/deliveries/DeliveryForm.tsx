"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createDeliverySchema } from "@/lib/validations";
import { createDeliveryAction, updateDeliveryAction } from "@/actions/deliveries";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { Rider } from "@/types/rider";
import type { Delivery } from "@/types/delivery";

type FormData = z.infer<typeof createDeliverySchema>;

interface Props {
  riders: Rider[];
  deliveryId?: string;
  initialDelivery?: Delivery;
}

const WAREHOUSES = [
  { value: "Pantang West", label: "Pantang West" },
  { value: "Amrahia", label: "Amrahia" },
];

const PRIORITIES = [
  { value: "Normal", label: "Normal" },
  { value: "Urgent", label: "Urgent" },
  { value: "Express", label: "Express" },
];


export function DeliveryForm({ riders, deliveryId, initialDelivery }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEdit = !!deliveryId && !!initialDelivery;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    control,
  } = useForm<FormData>({
    resolver: zodResolver(createDeliverySchema),
    defaultValues: isEdit
      ? {
          warehouse: initialDelivery.warehouse ?? "Pantang West",
          assignedRiderId: initialDelivery.assignedRiderId ?? undefined,
          priority: initialDelivery.priority ?? "Normal",
          deliveryDate: initialDelivery.deliveryDate ?? new Date().toISOString().split("T")[0],
          notes: initialDelivery.notes ?? "",
          destinations: [
            {
              orderId: initialDelivery.orderId ?? "",
              customerName: initialDelivery.customerName ?? "",
              customerPhone: initialDelivery.customerPhone ?? "",
              dropoffLocation: initialDelivery.dropoffLocation ?? "",
              coordinates: initialDelivery.dropoffCoordinates
                ? { lat: initialDelivery.dropoffCoordinates.lat, lng: initialDelivery.dropoffCoordinates.lng }
                : null,
              distanceKm: initialDelivery.distance ?? null,
            },
          ],
        }
      : {
          warehouse: "Pantang West",
          priority: "Normal",
          deliveryDate: new Date().toISOString().split("T")[0],
          destinations: [
            {
              orderId: "",
              customerName: "",
              customerPhone: "",
              dropoffLocation: "",
              coordinates: null,
              distanceKm: null,
            },
          ],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "destinations",
  });

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateDeliveryAction(deliveryId, data)
        : await createDeliveryAction(data);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(isEdit ? "Delivery updated" : "Delivery created");
        router.push(isEdit ? `/deliveries/${deliveryId}` : "/dashboard");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Delivery details */}
      <Card className="border-gray-200 shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Delivery Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Warehouse</Label>
            <Select
              defaultValue={isEdit ? initialDelivery.warehouse : "Pantang West"}
              onValueChange={(v) => setValue("warehouse", v as FormData["warehouse"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WAREHOUSES.map((w) => (
                  <SelectItem key={w.value} value={w.value}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Assign Rider</Label>
            {(() => {
              const selectedRiderId = watch("assignedRiderId");
              const selectedRider = riders.find((r) => r.id === selectedRiderId);
              return (
                <Select
                  value={selectedRiderId ?? ""}
                  onValueChange={(v) => setValue("assignedRiderId", v as string)}
                >
                  <SelectTrigger>
                    {selectedRider ? (
                      <span className="flex-1 text-left truncate">
                        {selectedRider.name} · {selectedRider.riderId}
                      </span>
                    ) : (
                      <span className="flex-1 text-left text-muted-foreground">
                        Select rider…
                      </span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {riders.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} · {r.riderId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })()}
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              defaultValue={isEdit ? initialDelivery.priority : "Normal"}
              onValueChange={(v) => setValue("priority", v as FormData["priority"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliveryDate">Delivery Date</Label>
            <Input
              id="deliveryDate"
              type="date"
              {...register("deliveryDate")}
              className={errors.deliveryDate ? "border-red-400" : ""}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Any special instructions…"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Destinations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Destinations
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({fields.length}/10)
            </span>
          </h2>
          {fields.length < 10 && !isEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  orderId: "",
                  customerName: "",
                  customerPhone: "",
                  dropoffLocation: "",
                  coordinates: null,
                  distanceKm: null,
                })
              }
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add destination
            </Button>
          )}
        </div>

        {fields.map((field, index) => (
          <Card key={field.id} className="border-gray-200 shadow-none overflow-visible">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-800 flex items-center justify-center text-xs font-bold">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    Destination {String.fromCharCode(65 + index)}
                  </span>
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-red-500"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Order ID</Label>
                <Input
                  {...register(`destinations.${index}.orderId`)}
                  placeholder="ORD-001"
                  className={
                    errors.destinations?.[index]?.orderId ? "border-red-400" : ""
                  }
                />
                {errors.destinations?.[index]?.orderId && (
                  <p className="text-xs text-red-500">
                    {errors.destinations[index]?.orderId?.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Customer Name</Label>
                <Input
                  {...register(`destinations.${index}.customerName`)}
                  placeholder="Customer full name"
                  className={
                    errors.destinations?.[index]?.customerName ? "border-red-400" : ""
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Customer Phone (optional)</Label>
                <Input
                  {...register(`destinations.${index}.customerPhone`)}
                  type="tel"
                  placeholder="+233…"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Dropoff Location</Label>
                <LocationAutocomplete
                  value={watch(`destinations.${index}.dropoffLocation`) ?? ""}
                  onChange={(val, coords) => {
                    setValue(`destinations.${index}.dropoffLocation`, val);
                    if (coords) {
                      setValue(`destinations.${index}.coordinates`, {
                        lat: coords.lat,
                        lng: coords.lon,
                      });
                    } else {
                      setValue(`destinations.${index}.coordinates`, null);
                    }
                  }}
                  placeholder="Search location in Ghana…"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-red-800 hover:bg-red-900"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? "Saving…" : "Creating…"}
            </>
          ) : (
            isEdit ? "Save Changes" : "Create Delivery"
          )}
        </Button>
      </div>
    </form>
  );
}
