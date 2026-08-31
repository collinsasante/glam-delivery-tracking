"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageSquare, Loader2, Check } from "lucide-react";
import { addDeliveryCommentAction } from "@/actions/stops";

interface DeliveryCommentFormProps {
  deliveryId: string;
  existingComment: string | null;
}

export function DeliveryCommentForm({ deliveryId, existingComment }: DeliveryCommentFormProps) {
  const [comment, setComment] = useState(existingComment ?? "");
  const [saved, setSaved] = useState(!!existingComment);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addDeliveryCommentAction(deliveryId, comment);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setSaved(true);
        toast.success("Comment saved");
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_12px_24px_-16px_rgba(16,24,32,0.2)] p-[18px]">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-gray-400" />
        <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-300">
          Rider Note
        </p>
        {saved && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-green-600">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <textarea
          value={comment}
          onChange={(e) => { setComment(e.target.value); setSaved(false); }}
          placeholder="e.g. Customer was not available, left package at gate…"
          rows={3}
          className="w-full text-sm text-gray-700 placeholder-gray-300 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-red-800 focus:border-red-800 transition"
        />
        <button
          type="submit"
          disabled={isPending || !comment.trim() || saved}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium bg-gray-900 text-white rounded-lg py-2 disabled:opacity-40 transition hover:bg-gray-800"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saved ? "Saved" : "Save Note"}
        </button>
      </form>
    </div>
  );
}
