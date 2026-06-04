import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const CHARS = "!<>-_\\/[]{}-=+*^?#________";

type DisplaySegment = {
  value: string;
  scrambled?: boolean;
};

function toSegments(value: string): DisplaySegment[] {
  return Array.from(value).map((char) => ({ value: char }));
}

export function TextScramble({
  text,
  className,
  trigger = "mount",
}: {
  text: string;
  className?: string;
  trigger?: "mount" | "hover";
}) {
  const [display, setDisplay] = useState<DisplaySegment[]>(() => toSegments(text));
  const displayTextRef = useRef(text);
  const rafRef = useRef<number | undefined>(undefined);

  const setSafeDisplay = useCallback((segments: DisplaySegment[]) => {
    displayTextRef.current = segments.map((segment) => segment.value).join("");
    setDisplay(segments);
  }, []);

  const run = useCallback(() => {
    const from = displayTextRef.current;
    const to = text;
    const length = Math.max(from.length, to.length);
    const queue: { from: string; to: string; start: number; end: number; char?: string }[] = [];

    for (let i = 0; i < length; i += 1) {
      const start = Math.floor(Math.random() * 20);
      const end = start + Math.floor(Math.random() * 20);
      queue.push({ from: from[i] || "", to: to[i] || "", start, end });
    }

    let frame = 0;
    const update = () => {
      const output: DisplaySegment[] = [];
      let complete = 0;

      for (let i = 0; i < queue.length; i += 1) {
        const { from: previous, to: next, start, end } = queue[i];
        let char = queue[i].char;

        if (frame >= end) {
          complete += 1;
          output.push({ value: next });
        } else if (frame >= start) {
          if (!char || Math.random() < 0.28) {
            char = CHARS[Math.floor(Math.random() * CHARS.length)];
            queue[i].char = char;
          }
          output.push({ value: char, scrambled: true });
        } else {
          output.push({ value: previous });
        }
      }

      setSafeDisplay(output);
      if (complete === queue.length) return;

      frame += 1;
      rafRef.current = requestAnimationFrame(update);
    };

    cancelAnimationFrame(rafRef.current!);
    update();
  }, [setSafeDisplay, text]);

  useEffect(() => {
    if (trigger === "mount") run();
    return () => cancelAnimationFrame(rafRef.current!);
  }, [run, trigger]);

  return (
    <span
      className={cn("font-mono tracking-[0.2em]", className)}
      onMouseEnter={() => trigger === "hover" && run()}
    >
      {display.map((segment, index) =>
        segment.scrambled ? (
          <span key={`${index}-${segment.value}`} className="opacity-60 text-primary">
            {segment.value}
          </span>
        ) : (
          segment.value
        ),
      )}
    </span>
  );
}
