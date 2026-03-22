"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createDeliverySchema } from "@/lib/validations";
import { createDeliveryAction } from "@/actions/deliveries";
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
import { Plus, Trash2, Loader2, MapPin, Navigation } from "lucide-react";
import type { Rider } from "@/types/rider";

type FormData = z.infer<typeof createDeliverySchema>;

interface Props {
  riders: Rider[];
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

export function DeliveryForm({ riders }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [calculatingDist, setCalculatingDist] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    control,
  } = useForm<FormData>({
    resolver: zodResolver(createDeliverySchema),
    defaultValues: {
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

  const warehouse = watch("warehouse");

  const WAREHOUSE_COORDS: Record<string, { lat: number; lng: number }> = {
    "Pantang West": { lat: 5.7122928, lng: -0.1894738 },
    Amrahia: { lat: 5.7641229, lng: -0.1398611 },
  };

  async function calculateDistance(index: number) {
    const dest = watch(`destinations.${index}`);
    const coords = dest?.coordinates as { lat: number; lng: number } | null | undefined;
    if (!coords) {
      toast.error("Set the dropoff location first");
      return;
    }

    const origin = WAREHOUSE_COORDS[warehouse];
    setCalculatingDist(index);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${coords.lng},${coords.lat}?overview=false`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("Distance service unavailable");
      const data = await res.json();
      if (data.routes?.[0]) {
        const km = Math.round((data.routes[0].distance / 1000) * 10) / 10;
        setValue(`destinations.${index}.distanceKm`, km);
        toast.success(`Distance: ${km} km`);
      } else {
        toast.error("Could not calculate distance for this route");
      }
    } catch {
      toast.error("Failed to calculate distance");
    } finally {
      setCalculatingDist(null);
    }
  }

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = await createDeliveryAction(data);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Delivery created successfully");
        router.refresh();
        router.push("/dashboard");
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
              defaultValue="Pantang West"
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
            <Select
              items={riders.map((r) => ({ value: r.id, label: `${r.name} · ${r.riderId}` }))}
              onValueChange={(v) => setValue("assignedRiderId", v as string)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rider…" />
              </SelectTrigger>
              <SelectContent>
                {riders.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} · {r.riderId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              defaultValue="Normal"
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
          {fields.length < 10 && (
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
                <div className="flex gap-2">
                  <div className="flex-1">
                    <LocationAutocomplete
                      value={watch(`destinations.${index}.dropoffLocation`) ?? ""}
                      onChange={(val, coords) => {
                        setValue(`destinations.${index}.dropoffLocation`, val);
                        if (coords) {
                          setValue(`destinations.${index}.coordinates`, {
                            lat: coords.lat,
                            lng: coords.lon,
                          });
                        }
                      }}
                      placeholder="Search location in Ghana…"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-10 px-3"
                    onClick={() => calculateDistance(index)}
                    disabled={calculatingDist === index}
                    title="Calculate distance"
                  >
                    {calculatingDist === index ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {watch(`destinations.${index}.distanceKm`) != null && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {watch(`destinations.${index}.distanceKm`) ?? ""} km from {warehouse}
                  </p>
                )}
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
              Creating…
            </>
          ) : (
            "Create Delivery"
          )}
        </Button>
      </div>
    </form>
  );
}
