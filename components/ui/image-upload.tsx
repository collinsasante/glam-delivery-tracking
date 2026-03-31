"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, X } from "lucide-react";

interface Props {
  value?: string;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <div className="relative w-full h-48">
            <Image
              src={value}
              alt="Receipt"
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-contain"
            />
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5 text-gray-500" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              <span className="text-xs text-gray-400">Uploading…</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-5 w-5 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">
                Click or drag to upload receipt
              </span>
              <span className="text-[11px] text-gray-400">JPG, PNG, WEBP · max 10 MB</span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
