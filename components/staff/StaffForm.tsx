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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

type FormData = z.infer<typeof createRiderSchema>;

export function StaffForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: safeResolver,
    defaultValues: { role: "Admin", active: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onSubmit(data: any) {
    startTransition(async () => {
      const result = await createRiderAction({ ...data, role: "Admin" });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Staff member created — invite email sent");
        router.push("/staff");
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
              placeholder="Staff member name"
              className={errors.name ? "border-red-400" : ""}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="staff@example.com"
              className={errors.email ? "border-red-400" : ""}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" type="tel" {...register("phone")} placeholder="+233…" />
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 flex items-start gap-2.5">
            <Mail className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              An invite email will be sent with a link to set their password. They will have Admin access.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 mt-4">
        <Button type="button" variant="outline" onClick={() => router.push("/staff")}>
          Cancel
        </Button>
        <Button type="submit" className="bg-red-800 hover:bg-red-900" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating…
            </>
          ) : (
            "Create & Send Invite"
          )}
        </Button>
      </div>
    </form>
  );
}
