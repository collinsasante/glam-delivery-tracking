"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateRiderSchema } from "@/lib/validations";
import { updateRiderAction } from "@/actions/riders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeResolver = zodResolver(updateRiderSchema) as any;

type FormData = z.infer<typeof updateRiderSchema>;

interface RiderEditFormProps {
  id: string;
  defaultValues: {
    name: string;
    email: string;
    phone?: string;
    role: "Rider" | "Admin";
    vehicleType?: "motor" | "car" | "bike";
    active: boolean;
  };
}

export function RiderEditForm({ id, defaultValues }: RiderEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: safeResolver,
    defaultValues: { ...defaultValues, password: "" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onSubmit(data: any) {
    startTransition(async () => {
      const result = await updateRiderAction(id, data);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Updated successfully");
        router.push(`/riders/${id}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="border-gray-200 shadow-none">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Full name"
              className={errors.name ? "border-red-400" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="email@example.com"
              className={errors.email ? "border-red-400" : ""}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" type="tel" {...register("phone")} placeholder="+233…" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Vehicle</Label>
              <Select
                defaultValue={defaultValues.vehicleType}
                onValueChange={(v) =>
                  setValue("vehicleType", v as FormData["vehicleType"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="motor">Motorbike</SelectItem>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="bike">Bicycle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                defaultValue={defaultValues.active ? "true" : "false"}
                onValueChange={(v) => setValue("active", v === "true")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">New Password (optional)</Label>
            <PasswordInput
              id="password"
              {...register("password")}
              placeholder="Leave blank to keep current"
              className={errors.password ? "border-red-400" : ""}
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/riders/${id}`)}
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
              Saving…
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
