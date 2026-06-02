import { useEffect, useRef } from "react";

/**
 * Subtle image-trail effect — spawns a faded thumbnail of the hovered
 * asset that drifts and fades. Used inside Media Library only.
 */
export function ImageTrail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef({ x: 0, y: 0, t: 0 });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const onMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tile = target.closest<HTMLElement>("[data-trail-src]");
      if (!tile) return;

      const now = performance.now();
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      const dist = Math.hypot(dx, dy);
      if (now - last.current.t < 70 || dist < 28) return;
      last.current = { x: e.clientX, y: e.clientY, t: now };

      const rect = root.getBoundingClientRect();
      const ghost = tile.cloneNode(true) as HTMLElement;
      ghost.style.position = "absolute";
      ghost.style.left = `${e.clientX - rect.left - 40}px`;
      ghost.style.top = `${e.clientY - rect.top - 40}px`;
      ghost.style.width = "80px";
      ghost.style.height = "80px";
      ghost.style.pointerEvents = "none";
      ghost.style.borderRadius = "12px";
      ghost.style.overflow = "hidden";
      ghost.style.boxShadow = "0 12px 30px -10px hsl(var(--primary) / 0.4)";
      ghost.style.transition = "opacity 700ms ease, transform 700ms ease";
      ghost.style.opacity = "0.85";
      ghost.style.transform = "scale(1) translateY(0)";
      ghost.style.zIndex = "30";
      root.appendChild(ghost);

      requestAnimationFrame(() => {
        ghost.style.opacity = "0";
        ghost.style.transform = "scale(0.85) translateY(-30px)";
      });
      setTimeout(() => ghost.remove(), 750);
    };

    root.addEventListener("mousemove", onMove);
    return () => root.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div ref={ref} className="relative">
      {children}
    </div>
  );
}
