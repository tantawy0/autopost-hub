"use client";

import type { PostStatus } from "@/lib/types";

interface PostFiltersProps {
  value: PostStatus | "All";
  onChange: (value: PostStatus | "All") => void;
  options: Array<PostStatus | "All">;
}

export default function PostFilters({ value, onChange, options }: PostFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
            value === option
              ? "bg-emerald-400 text-zinc-950"
              : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/8"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
