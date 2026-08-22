"use client";

import { useEffect, useRef } from "react";

/**
 * Interactive dot-field background (React Bits "Dot Grid"-style):
 * a calm lattice of violet dots that brightens around the pointer
 * and breathes with a slow sine wave. Single canvas, zero deps,
 * honors prefers-reduced-motion by rendering one static frame.
 */
export function DotField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let raf = 0;
    const pointer = { x: -9999, y: -9999 };
    const GAP = 28;
    const REACH = 170;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onResize = () => resize();
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove);

    let t = 0;
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, width, height);
      for (let x = GAP / 2; x < width; x += GAP) {
        for (let y = GAP / 2; y < height; y += GAP) {
          const d = Math.hypot(x - pointer.x, y - pointer.y);
          const near = Math.max(0, 1 - d / REACH);
          const wave = Math.sin(t * 1.3 + (x + y) * 0.018) * 0.5 + 0.5;
          const alpha = 0.05 + wave * 0.04 + near * 0.38;
          const radius = 1 + near * 1.7;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          // violet-400 at low alpha — reads as stardust on the dark base
          ctx.fillStyle = `rgba(167, 139, 250, ${alpha.toFixed(3)})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      draw();
      cancelAnimationFrame(raf); // one static frame
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
