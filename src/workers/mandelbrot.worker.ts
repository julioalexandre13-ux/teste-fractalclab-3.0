/**
 * Mandelbrot Web Worker
 * Executa o cálculo pixel-a-pixel fora da main thread,
 * evitando travar a interface do usuário.
 */

export type WorkerRequest = {
  width: number;
  height: number;
  power: number;
  aReal: number;
  aImag: number;
  iterations: number;
  view: { cx: number; cy: number; scale: number };
  palette: "fire" | "ocean" | "grayscale" | "rainbow" | "default";
  isJulia?: boolean;
  juliaC?: { x: number; y: number };
};

export type WorkerResponse = {
  buffer: ArrayBuffer;
  width: number;
  height: number;
};

function applyPalette(
  t: number,
  palette: WorkerRequest["palette"],
  data: Uint8ClampedArray,
  idx: number
) {
  let r = 0, g = 0, b = 0;

  switch (palette) {
    case "fire": {
      // Azul escuro → roxo → vermelho → laranja → dourado
      if (t < 0.5) {
        const k = t / 0.5;
        r = Math.floor(40 + 200 * k);
        g = Math.floor(10 + 30 * k);
        b = Math.floor(120 - 80 * k);
      } else {
        const k = (t - 0.5) / 0.5;
        r = Math.floor(240 - 20 * k);
        g = Math.floor(40 + 180 * k);
        b = Math.floor(40 - 30 * k);
      }
      break;
    }
    case "ocean": {
      // Preto → azul profundo → ciano → branco
      if (t < 0.4) {
        const k = t / 0.4;
        r = Math.floor(5 * k);
        g = Math.floor(50 * k);
        b = Math.floor(180 * k);
      } else if (t < 0.8) {
        const k = (t - 0.4) / 0.4;
        r = Math.floor(5 + 200 * k);
        g = Math.floor(50 + 190 * k);
        b = Math.floor(180 + 60 * k);
      } else {
        const k = (t - 0.8) / 0.2;
        r = Math.floor(205 + 50 * k);
        g = Math.floor(240 + 15 * k);
        b = 240;
      }
      break;
    }
    case "grayscale": {
      const v = Math.floor(255 * t);
      r = g = b = v;
      break;
    }
    case "rainbow": {
      // HSL cíclico pelo valor t
      const h = (t * 360 * 5) % 360;
      const s = 0.9, l = 0.5;
      const c2 = (1 - Math.abs(2 * l - 1)) * s;
      const x2 = c2 * (1 - Math.abs((h / 60) % 2 - 1));
      const m = l - c2 / 2;
      let r1 = 0, g1 = 0, b1 = 0;
      if (h < 60)      { r1 = c2; g1 = x2; b1 = 0; }
      else if (h < 120){ r1 = x2; g1 = c2; b1 = 0; }
      else if (h < 180){ r1 = 0;  g1 = c2; b1 = x2; }
      else if (h < 240){ r1 = 0;  g1 = x2; b1 = c2; }
      else if (h < 300){ r1 = x2; g1 = 0;  b1 = c2; }
      else             { r1 = c2; g1 = 0;  b1 = x2; }
      r = Math.floor((r1 + m) * 255);
      g = Math.floor((g1 + m) * 255);
      b = Math.floor((b1 + m) * 255);
      break;
    }
    default: {
      // Paleta original azul-dourado
      if (t < 0.7) {
        const k = t / 0.7;
        r = Math.floor(40 + 180 * k);
        g = Math.floor(135 + 100 * k);
        b = Math.floor(215 + 40 * k);
      } else {
        const k = (t - 0.7) / 0.3;
        r = Math.floor(220 - 60 * k);
        g = Math.floor(235 - 100 * k);
        b = Math.floor(255 - 165 * k);
      }
    }
  }

  data[idx]     = Math.max(0, Math.min(255, r));
  data[idx + 1] = Math.max(0, Math.min(255, g));
  data[idx + 2] = Math.max(0, Math.min(255, b));
  data[idx + 3] = 255;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { width, height, power, aReal, aImag, iterations, view, palette, isJulia, juliaC } = e.data;
  const buf = new Uint8ClampedArray(width * height * 4);
  const maxIter = iterations;
  const p = power;

  for (let py = 0; py < height; py++) {
    const cy = view.cy + (py - height / 2) * view.scale;
    for (let px = 0; px < width; px++) {
      const cx = view.cx + (px - width / 2) * view.scale;

      // Para Julia, z₀ = ponto do plano, c = juliaC fixo
      // Para Mandelbrot, z₀ = 0, c = ponto do plano
      let zx = isJulia ? cx : 0;
      let zy = isJulia ? cy : 0;
      const fixCx = isJulia ? (juliaC?.x ?? 0) : cx;
      const fixCy = isJulia ? (juliaC?.y ?? 0) : cy;

      let i = 0;
      let escaped = false;

      for (; i < maxIter; i++) {
        let nx: number, ny: number;
        if (Number.isInteger(p) && p >= 2 && p <= 8) {
          nx = zx; ny = zy;
          for (let k = 1; k < p; k++) {
            const tx = nx * zx - ny * zy;
            ny = nx * zy + ny * zx;
            nx = tx;
          }
        } else {
          const r = Math.sqrt(zx * zx + zy * zy);
          const theta = Math.atan2(zy, zx);
          const rp = Math.pow(r, p);
          nx = rp * Math.cos(p * theta);
          ny = rp * Math.sin(p * theta);
        }
        // multiply by A (complex)
        const ax = aReal * nx - aImag * ny;
        const ay = aReal * ny + aImag * nx;
        zx = ax + fixCx;
        zy = ay + fixCy;
        if (zx * zx + zy * zy > 16) { escaped = true; break; }
      }

      const idx = (py * width + px) * 4;
      if (!escaped) {
        // Interior: cor escura (quase preto)
        buf[idx] = 8; buf[idx + 1] = 10; buf[idx + 2] = 20; buf[idx + 3] = 255;
      } else {
        // Smooth coloring
        const log_zn = Math.log(zx * zx + zy * zy) / 2;
        const nu = Math.log(log_zn / Math.log(2)) / Math.log(Math.max(2, p));
        const t = Math.min(1, Math.max(0, (i + 1 - nu) / maxIter));
        applyPalette(t, palette, buf, idx);
      }
    }
  }

  const transferable = buf.buffer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).postMessage(
    { buffer: transferable, width, height },
    [transferable]
  );
};
