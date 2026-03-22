"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-xl font-bold">!</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <Button
          onClick={reset}
          className="bg-red-800 hover:bg-red-900 text-white"
          size="sm"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
