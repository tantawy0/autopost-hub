"use client";

interface FirstCommentFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export default function FirstCommentField({ value, onChange }: FirstCommentFieldProps) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Write a first comment"
      className="min-h-28 w-full resize-none rounded-lg border border-white/10 bg-zinc-950/50 p-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
    />
  );
}
