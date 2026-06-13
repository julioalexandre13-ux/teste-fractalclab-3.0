import { useEffect, useRef } from "react";

interface Props {
  power: number;
  aReal: number;
  aImag: number;
  iterations: number;
  view: { cx: number; cy: number; scale: number }; // scale = units per pixel
  onWheel?: (e: React.WheelEvent) => void;
  onDrag?: (dx: number, dy: number) => void;
}

export function MandelbrotCanvas({ power, aReal, aImag, iterations, view, onWheel, onDrag }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const W = Math.floor(rect.width);
    const H = Math.floor(rect.height);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = ctx.createImageData(W, H);
    const data = img.data;
    const maxIter = iterations;
    const p = power;

    for (let py = 0; py < H; py++) {
      const cy = view.cy + (py - H / 2) * view.scale;
      for (let px = 0; px < W; px++) {
        const cx = view.cx + (px - W / 2) * view.scale;
        let zx = 0, zy = 0;
        let i = 0;
        let escaped = false;
        for (; i < maxIter; i++) {
          // z^p (integer power via repeated multiplication for small p; fallback for non-integer)
          let nx: number, ny: number;
          if (Number.isInteger(p) && p >= 2 && p <= 6) {
            nx = zx; ny = zy;
            for (let k = 1; k < p; k++) {
              const tx = nx * zx - ny * zy;
              ny = nx * zy + ny * zx;
              nx = tx;
            }
          } else {
            const r = Math.sqrt(zx * zx + zy * zy);
            const t = Math.atan2(zy, zx);
            const rp = Math.pow(r, p);
            nx = rp * Math.cos(p * t);
            ny = rp * Math.sin(p * t);
          }
          // multiply by A
          const ax = aReal * nx - aImag * ny;
          const ay = aReal * ny + aImag * nx;
          zx = ax + cx;
          zy = ay + cy;
          if (zx * zx + zy * zy > 16) { escaped = true; break; }
        }
        const idx = (py * W + px) * 4;
        if (!escaped) {
          data[idx] = 8; data[idx + 1] = 10; data[idx + 2] = 20; data[idx + 3] = 255;
        } else {
          // smooth coloring
          const log_zn = Math.log(zx * zx + zy * zy) / 2;
          const nu = Math.log(log_zn / Math.log(2)) / Math.log(p);
          const t = (i + 1 - nu) / maxIter;
          // blue-to-gold palette
          if (t < 0.7) {
            const k = t / 0.7;
            data[idx] = Math.floor(220 - 180 * (1 - k));
            data[idx + 1] = Math.floor(235 - 100 * (1 - k));
            data[idx + 2] = Math.floor(255 - 40 * (1 - k));
          } else {
            const k = (t - 0.7) / 0.3;
            data[idx] = Math.floor(240 - 60 * k);
            data[idx + 1] = Math.floor(190 - 60 * k);
            data[idx + 2] = Math.floor(90 - 40 * k);
          }
          data[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [power, aReal, aImag, iterations, view]);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden rounded-xl bg-[oklch(0.97_0.02_240)]"
      onWheel={(e) => onWheel?.(e)}
      onMouseDown={(e) => { dragRef.current = { x: e.clientX, y: e.clientY }; }}
      onMouseMove={(e) => {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.x;
        const dy = e.clientY - dragRef.current.y;
        dragRef.current = { x: e.clientX, y: e.clientY };
        onDrag?.(dx, dy);
      }}
      onMouseUp={() => { dragRef.current = null; }}
      onMouseLeave={() => { dragRef.current = null; }}
      style={{ cursor: "grab" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
