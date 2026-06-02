import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CHARS = "!<>-_\\/[]{}—=+*^?#________";

export function TextScramble({ text, className, trigger = "mount" }: { text: string; className?: string; trigger?: "mount" | "hover" }) {
  const [display, setDisplay] = useState(text);
  const rafRef = useRef<number | undefined>(undefined);

  const run = () => {
    const from = display;
    const to = text;
    const length = Math.max(from.length, to.length);
    const queue: { from: string; to: string; start: number; end: number; char?: string }[] = [];
    for (let i = 0; i < length; i++) {
      const start = Math.floor(Math.random() * 20);
      const end = start + Math.floor(Math.random() * 20);
      queue.push({ from: from[i] || "", to: to[i] || "", start, end });
    }
    let frame = 0;
    const update = () => {
      let output = "";
      let complete = 0;
      for (let i = 0; i < queue.length; i++) {
        const { from: f, to: t, start, end } = queue[i];
        let char = queue[i].char;
        if (frame >= end) { complete++; output += t; }
        else if (frame >= start) {
          if (!char || Math.random() < 0.28) { char = CHARS[Math.floor(Math.random() * CHARS.length)]; queue[i].char = char; }
          output += `<span class="opacity-60 text-primary">${char}</span>`;
        } else output += f;
      }
      setDisplay(output);
      if (complete === queue.length) return;
      frame++;
      rafRef.current = requestAnimationFrame(update);
    };
    cancelAnimationFrame(rafRef.current!);
    update();
  };

  useEffect(() => {
    if (trigger === "mount") { run(); }
    return () => cancelAnimationFrame(rafRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <span
      className={cn("font-mono tracking-[0.2em]", className)}
      onMouseEnter={() => trigger === "hover" && run()}
      dangerouslySetInnerHTML={{ __html: display }}
    />
  );
}
