"use client";

import { Clock3 } from "lucide-react";

interface SchedulePickerProps {
  value: string;
  onChange: (value: string) => void;
}

function toDateTimeLocal(date: Date) {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());

  return localDate.toISOString().slice(0, 16);
}

export default function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  const setOffset = (minutes: number) => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    onChange(toDateTimeLocal(date));
  };

  return (
    <div className="space-y-3">
      <label className="silent-input flex min-h-12 items-center gap-3 rounded-2xl px-4 transition focus-within:border-[#bde5ad]/50 focus-within:ring-2 focus-within:ring-[#bde5ad]/20">
        <Clock3 size={17} className="text-zinc-500" aria-hidden="true" />
        <input
          type="datetime-local"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Next hour", minutes: 60 },
          { label: "Tonight", minutes: 360 },
          { label: "Tomorrow", minutes: 1440 },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setOffset(item.minutes)}
            className="min-h-9 rounded-xl bg-white/[0.045] px-2 text-xs font-bold text-zinc-300 transition hover:bg-[#bde5ad]/10 hover:text-[#d8ffd0] focus:outline-none focus:ring-2 focus:ring-[#bde5ad]/55"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
