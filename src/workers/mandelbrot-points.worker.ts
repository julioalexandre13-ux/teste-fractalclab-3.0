/**
 * Gera, fora da main thread, pontos `c` que pertencem ao conjunto de
 * Mandelbrot (por amostragem aleatória + early-accept de cardióide/bulbo).
 *
 * Resposta: `Float32Array` empacotado em buffer transferível.
 */

export type PointsRequest = {
  target: number;
  maxIter: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export type PointsResponse = {
  type: "done";
  buffer: ArrayBuffer;
  count: number;
};

self.onmessage = (e: MessageEvent<PointsRequest>) => {
  const { target, maxIter, xMin, xMax, yMin, yMax } = e.data;
  const out = new Float32Array(target * 2);
  let found = 0;
  let attempts = 0;
  const maxAttempts = target * 60;

  while (found < target && attempts < maxAttempts) {
    attempts++;
    const cx = xMin + Math.random() * (xMax - xMin);
    const cy = yMin + Math.random() * (yMax - yMin);

    const q = (cx - 0.25) * (cx - 0.25) + cy * cy;
    const inCardioid = q * (q + (cx - 0.25)) <= 0.25 * cy * cy;
    const inBulb = (cx + 1) * (cx + 1) + cy * cy <= 0.0625;

    let inside = inCardioid || inBulb;
    if (!inside) {
      let zx = 0, zy = 0;
      let escaped = false;
      for (let i = 0; i < maxIter; i++) {
        const nx = zx * zx - zy * zy + cx;
        const ny = 2 * zx * zy + cy;
        zx = nx; zy = ny;
        if (zx * zx + zy * zy > 4) { escaped = true; break; }
      }
      inside = !escaped;
    }

    if (inside) {
      out[found * 2] = cx;
      out[found * 2 + 1] = cy;
      found++;
    }
  }

  const trimmed = out.slice(0, found * 2);
  const buffer = trimmed.buffer;
  const msg: PointsResponse = { type: "done", buffer, count: found };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).postMessage(msg, [buffer]);
};
