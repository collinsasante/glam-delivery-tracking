"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createExpenseSchema } from "@/lib/validations";
import { createExpenseAction } from "@/actions/expenses";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeResolver = zodResolver(createExpenseSchema) as any;

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
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

type FormData = z.infer<typeof createExpenseSchema>;

const EXPENSE_TYPES = ["Fuel", "Maintenance", "Toll", "Parking", "Food", "Other"];

export function RiderExpenseForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: safeResolver,
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onSubmit(data: any) {
    startTransition(async () => {
      const result = await createExpenseAction({
        ...data,
        amount: parseFloat(data.amount),
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Expense submitted");
        router.push("/rider");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="border-gray-200 shadow-none">
        <CardContent className="p-5 space-y-4">
          {/* Expense Type */}
          <div className="space-y-1.5">
            <Label>Expense Type</Label>
            <Select onValueChange={(v) => setValue("expenseType", v as string)}>
              <SelectTrigger className={errors.expenseType ? "border-red-400" : ""}>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.expenseType && (
              <p className="text-xs text-red-500">{errors.expenseType.message}</p>
            )}
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (GH₵)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                {...register("amount")}
                placeholder="0.00"
                className={errors.amount ? "border-red-400" : ""}
              />
              {errors.amount && (
                <p className="text-xs text-red-500">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                {...register("date")}
                className={errors.date ? "border-red-400" : ""}
              />
              {errors.date && (
                <p className="text-xs text-red-500">{errors.date.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="What was this expense for?"
              rows={3}
            />
          </div>

          {/* Receipt image */}
          <div className="space-y-1.5">
            <Label>Receipt (optional)</Label>
            <ImageUpload
              value={receiptUrl}
              onChange={(url) => {
                setReceiptUrl(url);
                setValue("receiptUrl", url ?? "");
              }}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/rider")}
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
              Submitting…
            </>
          ) : (
            "Submit Expense"
          )}
        </Button>
      </div>
    </form>
  );
}
