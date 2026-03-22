"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createRiderSchema } from "@/lib/validations";
import { createRiderAction } from "@/actions/riders";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeResolver = zodResolver(createRiderSchema) as any;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type FormData = z.infer<typeof createRiderSchema>;

export function RiderForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: safeResolver,
    defaultValues: { role: "Rider", active: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onSubmit(data: any) {
    startTransition(async () => {
      const result = await createRiderAction(data);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Rider created");
        router.push("/dashboard/riders");
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
              placeholder="Rider name"
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
              placeholder="rider@example.com"
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

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder="Min. 8 characters"
              className={errors.password ? "border-red-400" : ""}
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                defaultValue="Rider"
                onValueChange={(v) => setValue("role", v as FormData["role"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rider">Rider</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Vehicle</Label>
              <Select
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
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/riders")}
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
            "Create Rider"
          )}
        </Button>
      </div>
    </form>
  );
}
