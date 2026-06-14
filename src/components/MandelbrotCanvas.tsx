import { useEffect, useRef, useState, useCallback } from "react";
import type { WorkerRequest } from "../workers/mandelbrot.worker";

export type Palette = "default" | "fire" | "ocean" | "grayscale" | "rainbow";

interface Props {
  power: number;
  aReal: number;
  aImag: number;
  iterations: number;
  palette: Palette;
  view: { cx: number; cy: number; scale: number };
  onViewChange?: (v: { cx: number; cy: number; scale: number }) => void;
  isJulia?: boolean;
  juliaC?: { x: number; y: number };
  onCanvasClick?: (re: number, im: number) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function MandelbrotCanvas({
  power,
  aReal,
  aImag,
  iterations,
  palette,
  view,
  onViewChange,
  isJulia = false,
  juliaC,
  onCanvasClick,
  canvasRef: externalCanvasRef,
}: Props) {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef ?? internalRef;
  const wrapRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<number | null>(null);
  const requestRef = useRef(0);
  const paintedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ re: number; im: number } | null>(null);

  // Initialize Web Worker
  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/mandelbrot.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;
    return () => {
      worker.terminate();
    };
  }, []);

  // Render fractal via worker
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const worker = workerRef.current;
    if (!canvas || !wrap || !worker) return;

    const rect = wrap.getBoundingClientRect();
    const W = Math.max(1, Math.floor(rect.width));
    const H = Math.max(1, Math.floor(rect.height));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
      paintedRef.current = false;
    }

    if (!paintedRef.current) setLoading(true);
    const requestId = ++requestRef.current;

    const msg: WorkerRequest = {
      requestId,
      width: W,
      height: H,
      power,
      aReal,
      aImag,
      iterations,
      view,
      palette,
      isJulia,
      juliaC,
    };

    // Replace previous handler
    worker.onmessage = (e: MessageEvent) => {
      const { requestId: completedId, buffer, width, height } = e.data;
      if (completedId !== requestRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const arr = new Uint8ClampedArray(buffer);
      const imageData = new ImageData(arr, width, height);
      ctx.putImageData(imageData, 0, 0);
      paintedRef.current = true;
      setLoading(false);
    };

    worker.postMessage(msg);
  }, [power, aReal, aImag, iterations, view, palette, isJulia, juliaC]);

  // Pixel to complex coordinate
  const pixelToComplex = useCallback(
    (px: number, py: number) => {
      const wrap = wrapRef.current;
      if (!wrap) return { re: 0, im: 0 };
      const rect = wrap.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      const re = view.cx + (px - W / 2) * view.scale;
      const im = view.cy + (py - H / 2) * view.scale;
      return { re, im };
    },
    [view]
  );

  // Zoom centered on a pixel position
  const zoomAt = useCallback(
    (px: number, py: number, factor: number) => {
      if (!onViewChange) return;
      const { re, im } = pixelToComplex(px, py);
      const newScale = view.scale * factor;
      // Keep the point (re, im) fixed: new center such that pixel (px,py) stays at (re,im)
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const newCx = re - (px - rect.width / 2) * newScale;
      const newCy = im - (py - rect.height / 2) * newScale;
      onViewChange({ cx: newCx, cy: newCy, scale: newScale });
    },
    [view, pixelToComplex, onViewChange]
  );

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = wrapRef.current!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      zoomAt(px, py, e.deltaY > 0 ? 1.2 : 0.83);
    },
    [zoomAt]
  );

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Update coords display
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect) {
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        setCoords(pixelToComplex(px, py));
      }

      if (!dragRef.current || !onViewChange) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current = { x: e.clientX, y: e.clientY };
      onViewChange({
        ...view,
        cx: view.cx - dx * view.scale,
        cy: view.cy - dy * view.scale,
      });
    },
    [view, pixelToComplex, onViewChange]
  );
  const handleMouseUp = (e: React.MouseEvent) => {
    const moved =
      dragRef.current &&
      Math.abs(e.clientX - dragRef.current.x) < 3 &&
      Math.abs(e.clientY - dragRef.current.y) < 3;
    if (moved && onCanvasClick) {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect) {
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const { re, im } = pixelToComplex(px, py);
        onCanvasClick(re, im);
      }
    }
    dragRef.current = null;
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragRef.current && onViewChange) {
        const dx = e.touches[0].clientX - dragRef.current.x;
        const dy = e.touches[0].clientY - dragRef.current.y;
        dragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        onViewChange({
          ...view,
          cx: view.cx - dx * view.scale,
          cy: view.cy - dy * view.scale,
        });
      } else if (e.touches.length === 2 && pinchRef.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.sqrt(dx * dx + dy * dy);
        const factor = pinchRef.current / newDist;
        pinchRef.current = newDist;
        // Zoom toward midpoint
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = wrapRef.current?.getBoundingClientRect();
        if (rect) {
          zoomAt(midX - rect.left, midY - rect.top, factor);
        }
      }
    },
    [view, zoomAt, onViewChange]
  );
  const handleTouchEnd = () => {
    dragRef.current = null;
    pinchRef.current = null;
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden rounded-xl bg-[oklch(0.08_0.02_240)]"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { dragRef.current = null; setCoords(null); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: dragRef.current ? "grabbing" : onCanvasClick ? "crosshair" : "grab" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Loading overlay */}
      {loading && !paintedRef.current && (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/30 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <span className="text-[11px] text-white/70">Renderizando…</span>
          </div>
        </div>
      )}

      {/* Coordinate display */}
      {coords && (
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 font-mono text-[10px] text-white/80 backdrop-blur-sm">
          {coords.re >= 0 ? "+" : ""}{coords.re.toFixed(5)}{" "}
          {coords.im >= 0 ? "+" : ""}{coords.im.toFixed(5)}i
        </div>
      )}

      {/* Julia mode label */}
      {isJulia && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white/80 backdrop-blur-sm">
          Conjunto de Julia
        </div>
      )}
    </div>
  );
}
