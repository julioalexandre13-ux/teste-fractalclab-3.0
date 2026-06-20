/**
 * Gera, fora da main thread, pontos `c` que pertencem ao conjunto de
 * Mandelbrot, em dois modos possíveis:
 *
 * - "random": amostragem aleatória + early-accept de cardióide/bulbo.
 *   Produz uma nuvem de pontos espalhada por toda a região desde o início,
 *   ganhando densidade progressivamente (bom para o efeito visual de
 *   "revelação" da figura).
 *
 * - "grid": varredura sequencial de uma grade regular (linha a linha, da
 *   esquerda para a direita, de cima para baixo), testando CADA ponto da
 *   grade — sem sorteio e sem atalho de cardióide/bulbo. Reproduz fielmente
 *   a ideia de "testar todos os pontos do plano", reforçando o conceito de
 *   varredura exaustiva (em contraste com a amostragem por densidade do
 *   modo aleatório).
 *
 * Resposta: `Float32Array` empacotado em buffer transferível.
 */

export type SamplingMode = "random" | "grid";

export type PointsRequest = {
  target: number;
  maxIter: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  mode?: SamplingMode; // default: "random" (compatibilidade com chamadas antigas)
  gridCols?: number; // usado apenas no modo "grid"
};

export type PointsResponse = {
  type: "done";
  buffer: ArrayBuffer;
  count: number;
  tested: number; // quantos candidatos foram avaliados ao todo (random: attempts; grid: cols*rows)
  mode: SamplingMode;
};

function escapesMandelbrot(cx: number, cy: number, maxIter: number): boolean {
  // Atalho de cardióide principal + bulbo period-2: pontos aqui dentro
  // nunca escapam, então evitamos rodar o loop de iterações para eles.
  const q = (cx - 0.25) * (cx - 0.25) + cy * cy;
  const inCardioid = q * (q + (cx - 0.25)) <= 0.25 * cy * cy;
  const inBulb = (cx + 1) * (cx + 1) + cy * cy <= 0.0625;
  if (inCardioid || inBulb) return false;

  let zx = 0,
    zy = 0;
  for (let i = 0; i < maxIter; i++) {
    const nx = zx * zx - zy * zy + cx;
    const ny = 2 * zx * zy + cy;
    zx = nx;
    zy = ny;
    if (zx * zx + zy * zy > 4) return true;
  }
  return false;
}

function generateRandom(req: PointsRequest): { points: Float32Array; tested: number } {
  const { target, maxIter, xMin, xMax, yMin, yMax } = req;
  const out = new Float32Array(target * 2);
  let found = 0;
  let attempts = 0;
  const maxAttempts = target * 60;

  while (found < target && attempts < maxAttempts) {
    attempts++;
    const cx = xMin + Math.random() * (xMax - xMin);
    const cy = yMin + Math.random() * (yMax - yMin);

    if (!escapesMandelbrot(cx, cy, maxIter)) {
      out[found * 2] = cx;
      out[found * 2 + 1] = cy;
      found++;
    }
  }

  return { points: out.subarray(0, found * 2) as Float32Array, tested: attempts };
}

function generateGrid(req: PointsRequest): { points: Float32Array; tested: number } {
  const { maxIter, xMin, xMax, yMin, yMax } = req;
  // Número de colunas da grade: por padrão, deriva de `target` para manter
  // uma densidade comparável à do modo aleatório (target ~ cols * rows).
  const aspect = (xMax - xMin) / (yMax - yMin);
  const cols = req.gridCols ?? Math.round(Math.sqrt(req.target * aspect));
  const rows = Math.round(cols / aspect);

  // Capacidade máxima: todo ponto da grade poderia pertencer ao conjunto.
  const out = new Float32Array(cols * rows * 2);
  let found = 0;
  let tested = 0;

  // Varredura linha a linha (top-down, left-right) — ordem de varredura
  // "clássica", reforçando a ideia de testar sistematicamente cada ponto.
  for (let row = 0; row < rows; row++) {
    const cy = yMax - (row / Math.max(1, rows - 1)) * (yMax - yMin);
    for (let col = 0; col < cols; col++) {
      const cx = xMin + (col / Math.max(1, cols - 1)) * (xMax - xMin);
      tested++;
      if (!escapesMandelbrot(cx, cy, maxIter)) {
        out[found * 2] = cx;
        out[found * 2 + 1] = cy;
        found++;
      }
    }
  }

  return { points: out.subarray(0, found * 2) as Float32Array, tested };
}

self.onmessage = (e: MessageEvent<PointsRequest>) => {
  const req = e.data;
  const mode: SamplingMode = req.mode ?? "random";

  const { points, tested } = mode === "grid" ? generateGrid(req) : generateRandom(req);

  // Copiamos para um buffer "limpo" do tamanho exato antes de transferir.
  const trimmed = new Float32Array(points);
  const buffer = trimmed.buffer;
  const msg: PointsResponse = {
    type: "done",
    buffer,
    count: trimmed.length / 2,
    tested,
    mode,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).postMessage(msg, [buffer]);
};
