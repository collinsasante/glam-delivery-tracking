"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
  defaultValue?: string;
  placeholder?: string;
  paramKey?: string;
}

export function SearchInput({
  defaultValue = "",
  placeholder = "Search…",
  paramKey = "search",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(defaultValue);
  const debounced = useDebounce(value, 400);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (debounced) {
      url.searchParams.set(paramKey, debounced);
    } else {
      url.searchParams.delete(paramKey);
    }
    router.replace(`${pathname}?${url.searchParams.toString()}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-56 rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent transition"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
