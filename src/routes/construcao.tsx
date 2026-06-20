import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Sparkles, Target } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/construcao")({
  head: () => ({
    meta: [
      { title: "FractalCLab — Construção do Mandelbrot" },
      {
        name: "description",
        content:
          "Veja o conjunto de Mandelbrot se formar ponto a ponto a partir da recorrência z_{n+1} = z_n² + c.",
      },
    ],
  }),
  component: ConstrucaoPage,
});

// Total de pontos pertencentes ao conjunto que iremos plotar.
// 25 000 já é suficiente para reconhecer claramente a "cardióide + bulbo".
const TOTAL_POINTS = 25000;
const MAX_ITER = 120;

// Domínio visualizado
const X_MIN = -2.1;
const X_MAX = 0.7;
const Y_MIN = -1.25;
const Y_MAX = 1.25;

/** Gera, por amostragem aleatória, pontos c que NÃO escapam (∈ Mandelbrot). */
function generateMandelbrotPoints(target: number): Float32Array {
  const out = new Float32Array(target * 2);
  let found = 0;
  // Limite de segurança para não travar caso target seja muito alto.
  let attempts = 0;
  const maxAttempts = target * 60;

  while (found < target && attempts < maxAttempts) {
    attempts++;
    const cx = X_MIN + Math.random() * (X_MAX - X_MIN);
    const cy = Y_MIN + Math.random() * (Y_MAX - Y_MIN);

    // Cardioid + period-2 bulb early-accept (evita iterar pontos certamente dentro)
    const q = (cx - 0.25) * (cx - 0.25) + cy * cy;
    const inCardioid = q * (q + (cx - 0.25)) <= 0.25 * cy * cy;
    const inBulb = (cx + 1) * (cx + 1) + cy * cy <= 0.0625;

    let inside = inCardioid || inBulb;
    if (!inside) {
      let zx = 0,
        zy = 0;
      let escaped = false;
      for (let i = 0; i < MAX_ITER; i++) {
        const nx = zx * zx - zy * zy + cx;
        const ny = 2 * zx * zy + cy;
        zx = nx;
        zy = ny;
        if (zx * zx + zy * zy > 4) {
          escaped = true;
          break;
        }
      }
      inside = !escaped;
    }

    if (inside) {
      out[found * 2] = cx;
      out[found * 2 + 1] = cy;
      found++;
    }
  }

  return out.subarray(0, found * 2) as Float32Array;
}

type OrbitResult = {
  cRe: number;
  cIm: number;
  points: { re: number; im: number; mod: number }[];
  escapeIteration: number | null; // null => não escapou em MAX_ITER
};

function computeOrbit(cRe: number, cIm: number): OrbitResult {
  const pts: { re: number; im: number; mod: number }[] = [
    { re: 0, im: 0, mod: 0 },
  ];
  let zx = 0,
    zy = 0;
  let escapeIteration: number | null = null;
  for (let i = 1; i <= MAX_ITER; i++) {
    const nx = zx * zx - zy * zy + cRe;
    const ny = 2 * zx * zy + cIm;
    zx = nx;
    zy = ny;
    const mod = Math.hypot(zx, zy);
    pts.push({ re: zx, im: zy, mod });
    if (mod > 2) {
      escapeIteration = i;
      break;
    }
  }
  return { cRe, cIm, points: pts, escapeIteration };
}

function ConstrucaoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Float32Array | null>(null);
  const [count, setCount] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(400); // pontos por frame
  const rafRef = useRef<number | null>(null);
  const lastDrawnRef = useRef(0);

  // Verificador de ponto
  const [cReStr, setCReStr] = useState("-0.75");
  const [cImStr, setCImStr] = useState("0.1");
  const [pointError, setPointError] = useState<string | null>(null);
  const [orbit, setOrbit] = useState<OrbitResult | null>(null);
  const [orbitVisible, setOrbitVisible] = useState(0); // qtos pontos da órbita exibir
  const [animatingOrbit, setAnimatingOrbit] = useState(false);
  const orbitTimerRef = useRef<number | null>(null);

  const handleVerify = () => {
    const re = Number(cReStr.replace(",", "."));
    const im = Number(cImStr.replace(",", "."));
    if (!Number.isFinite(re) || !Number.isFinite(im)) {
      setPointError("Informe números válidos para Re(c) e Im(c).");
      return;
    }
    setPointError(null);
    const o = computeOrbit(re, im);
    setOrbit(o);
    setOrbitVisible(o.points.length);
    setAnimatingOrbit(false);
  };

  const startOrbitAnimation = () => {
    if (!orbit) return;
    setAnimatingOrbit(true);
    setOrbitVisible(1);
  };

  useEffect(() => {
    if (!animatingOrbit || !orbit) return;
    if (orbitVisible >= orbit.points.length) {
      setAnimatingOrbit(false);
      return;
    }
    orbitTimerRef.current = window.setTimeout(() => {
      setOrbitVisible((v) => v + 1);
    }, 200);
    return () => {
      if (orbitTimerRef.current) window.clearTimeout(orbitTimerRef.current);
    };
  }, [animatingOrbit, orbitVisible, orbit]);



  // Gera os pontos uma única vez (em chunks via setTimeout p/ não travar UI).
  useEffect(() => {
    let cancelled = false;
    // Computamos tudo de uma vez — ~25k pontos é rápido em JS moderno.
    const id = window.setTimeout(() => {
      if (cancelled) return;
      const pts = generateMandelbrotPoints(TOTAL_POINTS);
      setPoints(pts);
    }, 30);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

  const total = points ? points.length / 2 : 0;

  // Desenha incrementalmente: só pinta pontos novos desde a última renderização.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !points) return;

    const rect = wrap.getBoundingClientRect();
    const W = Math.max(1, Math.floor(rect.width));
    const H = Math.max(1, Math.floor(rect.height));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
      lastDrawnRef.current = 0; // reset
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Se diminuiu, redesenha do zero.
    if (count < lastDrawnRef.current) {
      ctx.fillStyle = "oklch(0.08 0.02 240)";
      ctx.fillRect(0, 0, W, H);
      drawAxes(ctx, W, H);
      lastDrawnRef.current = 0;
    }

    if (lastDrawnRef.current === 0) {
      ctx.fillStyle = "oklch(0.08 0.02 240)";
      ctx.fillRect(0, 0, W, H);
      drawAxes(ctx, W, H);
    }

    const sx = W / (X_MAX - X_MIN);
    const sy = H / (Y_MAX - Y_MIN);

    ctx.fillStyle = "rgba(120, 200, 255, 0.85)";
    for (let i = lastDrawnRef.current; i < count; i++) {
      const cx = points[i * 2];
      const cy = points[i * 2 + 1];
      const px = (cx - X_MIN) * sx;
      const py = H - (cy - Y_MIN) * sy;
      ctx.fillRect(px, py, 1.2, 1.2);
    }
    lastDrawnRef.current = count;
  }, [count, points]);

  // Animação de play
  useEffect(() => {
    if (!playing || !points) return;
    const step = () => {
      setCount((c) => {
        const next = Math.min(total, c + speed);
        if (next >= total) setPlaying(false);
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed, total, points]);

  // Re-render ao redimensionar
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const obs = new ResizeObserver(() => {
      lastDrawnRef.current = 0;
      // dispara re-render
      setCount((c) => c);
    });
    obs.observe(wrap);
    return () => obs.disconnect();
  }, []);

  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  const milestone = useMemo(() => {
    if (count < 50) return "Apenas alguns pontos — ainda não dá para ver nada.";
    if (count < 500) return "Começa a aparecer uma nuvem dispersa de pontos.";
    if (count < 3000) return "A cardióide central está se formando.";
    if (count < 10000) return "O bulbo à esquerda e os 'satélites' aparecem.";
    if (count < total) return "Os filamentos finos vão preenchendo a borda.";
    return "Pronto! O conjunto de Mandelbrot está formado.";
  }, [count, total]);

  return (
    <div className="flex h-dvh bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
          <header className="mb-6 pl-14 md:pl-0">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Construção do conjunto
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              O Mandelbrot, ponto a ponto
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Cada ponto plotado é um número complexo <em>c</em> tal que a
              recorrência <code className="rounded bg-secondary px-1 py-0.5 text-xs">z₀ = 0, z_(n+1) = z_n² + c</code>{" "}
              <strong>não escapa</strong> ao infinito. Use o controle abaixo
              para ver como a famosa silhueta vai surgindo de poucos pontos
              até a imagem completa.
            </p>
          </header>

          <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
            <div
              ref={wrapRef}
              className="relative aspect-[14/10] w-full overflow-hidden rounded-xl bg-[oklch(0.08_0.02_240)]"
            >
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
              {!points && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Calculando pontos…
                  </div>
                </div>
              )}
              <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 font-mono text-[10px] text-white/80 backdrop-blur-sm">
                {count.toLocaleString("pt-BR")} / {total.toLocaleString("pt-BR")} pontos · {pct}%
              </div>
              {orbit &&
                orbit.cRe >= X_MIN &&
                orbit.cRe <= X_MAX &&
                orbit.cIm >= Y_MIN &&
                orbit.cIm <= Y_MAX && (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: `${((orbit.cRe - X_MIN) / (X_MAX - X_MIN)) * 100}%`,
                      top: `${(1 - (orbit.cIm - Y_MIN) / (Y_MAX - Y_MIN)) * 100}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    aria-hidden
                  >
                    <div className="relative">
                      <div className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-[#ff5577]" />
                      <div className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-[#ff5577]" />
                      <div className="h-3 w-3 rounded-full border-2 border-[#ff5577] bg-[#ff557733]" />
                    </div>
                  </div>
                )}

            </div>

            {/* Controles */}
            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Pontos visíveis</span>
                  <span className="font-mono">{count.toLocaleString("pt-BR")}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={Math.max(1, total)}
                  step={1}
                  value={Math.min(count, total || 1)}
                  onChange={(e) => {
                    setPlaying(false);
                    setCount(Number(e.target.value));
                  }}
                  className="w-full accent-primary"
                  disabled={!points}
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>1</span>
                  <span>{Math.round(total / 2).toLocaleString("pt-BR")}</span>
                  <span>{total.toLocaleString("pt-BR")}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    if (count >= total) setCount(1);
                    setPlaying((p) => !p);
                  }}
                  disabled={!points}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? "Pausar" : "Animar"}
                </button>
                <button
                  onClick={() => {
                    setPlaying(false);
                    setCount(1);
                  }}
                  disabled={!points}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50"
                  aria-label="Reiniciar"
                >
                  <RotateCcw className="h-4 w-4" /> Reiniciar
                </button>
                <button
                  onClick={() => {
                    setPlaying(false);
                    setCount(total);
                  }}
                  disabled={!points}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50"
                >
                  Mostrar tudo
                </button>

                <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Velocidade</span>
                  <input
                    type="range"
                    min={50}
                    max={2000}
                    step={50}
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-28 accent-primary"
                  />
                  <span className="font-mono">{speed}/frame</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                <strong className="text-foreground">O que está acontecendo:</strong>{" "}
                {milestone}
              </div>
            </div>
          </section>

          {/* === Verificador de Ponto === */}
          <section className="mt-6 rounded-2xl border border-border bg-card p-4 md:p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Target className="h-4 w-4" />
              Verificador de ponto
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight md:text-xl">
              Esse <em>c</em> pertence ao conjunto?
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              Digite as partes real e imaginária de <em>c</em>. Calculamos
              iteração por iteração até {MAX_ITER} passos, com{" "}
              <code className="rounded bg-secondary px-1">z₀ = 0</code> e{" "}
              <code className="rounded bg-secondary px-1">z_(n+1) = z_n² + c</code>.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="block text-xs">
                <span className="mb-1 block text-muted-foreground">Re(c)</span>
                <Input
                  inputMode="decimal"
                  value={cReStr}
                  onChange={(e) => setCReStr(e.target.value)}
                  placeholder="-0.75"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block text-muted-foreground">Im(c)</span>
                <Input
                  inputMode="decimal"
                  value={cImStr}
                  onChange={(e) => setCImStr(e.target.value)}
                  placeholder="0.1"
                />
              </label>
              <div className="flex items-end">
                <Button onClick={handleVerify} className="w-full md:w-auto">
                  Verificar
                </Button>
              </div>
            </div>

            {pointError && (
              <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {pointError}
              </div>
            )}

            {orbit && (
              <OrbitDisplay
                orbit={orbit}
                orbitVisible={orbitVisible}
                onAnimate={startOrbitAnimation}
                animating={animatingOrbit}
                onShowAll={() => {
                  setAnimatingOrbit(false);
                  setOrbitVisible(orbit.points.length);
                }}
              />
            )}
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2">

            <Info
              title="Como cada ponto é decidido"
              body={
                <>
                  Para cada candidato <em>c</em>, iteramos{" "}
                  <code className="rounded bg-secondary px-1">z_(n+1) = z_n² + c</code>{" "}
                  com <em>z₀ = 0</em>. Se após {MAX_ITER} iterações o módulo
                  permanece ≤ 2, consideramos que <em>c</em> pertence ao
                  conjunto e o desenhamos.
                </>
              }
            />
            <Info
              title="Por que aparece em ordem 'aleatória'"
              body={
                <>
                  Os candidatos são sorteados uniformemente no retângulo
                  visível. Por isso, com poucos pontos, vemos uma nuvem
                  dispersa; conforme o número cresce, a densidade revela a
                  forma característica da cardióide e dos bulbos.
                </>
              }
            />
          </section>
        </div>
      </main>
    </div>
  );
}

function drawAxes(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const sx = W / (X_MAX - X_MIN);
  const sy = H / (Y_MAX - Y_MIN);
  const ox = (0 - X_MIN) * sx;
  const oy = H - (0 - Y_MIN) * sy;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, oy);
  ctx.lineTo(W, oy);
  ctx.moveTo(ox, 0);
  ctx.lineTo(ox, H);
  ctx.stroke();
}

function Info({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
