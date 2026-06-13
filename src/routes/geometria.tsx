import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  HelpCircle, Settings, Lightbulb, Sparkles, RefreshCw, Star,
  Circle as CircleIcon, Settings2,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

export const Route = createFileRoute("/geometria")({
  head: () => ({
    meta: [
      { title: "FractalCLab — Fractais Geométricos" },
      { name: "description", content: "Construa e explore fractais geométricos clássicos: Cantor, Koch e Sierpinski." },
    ],
  }),
  component: Geometria,
});

type Tab = "cantor" | "koch" | "sierpinski";

// Math facts for each fractal
const FRACTAL_INFO = {
  cantor: {
    dim: "ln 2 / ln 3 ≈ 0.6309",
    dimNum: Math.log(2) / Math.log(3),
    topFact: "A medida total tende a 0, mas o conjunto tem infinitos pontos!",
    mathFact: "É o primeiro exemplo clássico de conjunto perfeito e totalmente desconexo.",
  },
  koch: {
    dim: "ln 4 / ln 3 ≈ 1.2619",
    dimNum: Math.log(4) / Math.log(3),
    topFact: "O comprimento da curva tende ao infinito, mas a área limitada fica finita!",
    mathFact: "A dimensão > 1 significa que a curva é 'mais que uma linha' mas 'menos que uma área'.",
  },
  sierpinski: {
    dim: "ln 3 / ln 2 ≈ 1.5850",
    dimNum: Math.log(3) / Math.log(2),
    topFact: "A área total tende a 0, mas a estrutura permanece com infinita complexidade!",
    mathFact: "Aparece naturalmente em triângulos de Pascal e em autômatos celulares (Regra 90).",
  },
};

// ---------------------------------------------------------------------------
// Canvas Visualizations
// ---------------------------------------------------------------------------

function CantorCanvas({ iterations, color }: { iterations: number; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth || 600;
    const H = Math.max(30 * (iterations + 1), 60);
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    const rowH = H / (iterations + 1);

    function drawLevel(level: number, segs: [number, number][]) {
      const y = level * rowH + rowH / 2;

      // Label
      ctx!.fillStyle = color + "99";
      ctx!.font = "10px monospace";
      ctx!.fillText(String(level), 2, y + 4);

      // Segments
      ctx!.fillStyle = color;
      for (const [x, w] of segs) {
        const px = 24 + x * (W - 30);
        const pw = w * (W - 30);
        ctx!.fillRect(px, y - 3, Math.max(1, pw), 6);
      }

      if (level < iterations) {
        const next: [number, number][] = [];
        for (const [x, w] of segs) {
          const t = w / 3;
          next.push([x, t]);
          next.push([x + 2 * t, t]);
        }
        drawLevel(level + 1, next);
      }
    }

    drawLevel(0, [[0, 1]]);
  }, [iterations, color]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg"
      style={{ minHeight: Math.max(60, 30 * (iterations + 1)) }}
    />
  );
}

function KochCanvas({ iterations, color }: { iterations: number; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth || 600;
    const rowH = 60;
    const H = rowH * (iterations + 1);
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    function kochPoints(level: number): [number, number][] {
      let pts: [number, number][] = [[0, 0], [100, 0]];
      for (let i = 0; i < level; i++) {
        const next: [number, number][] = [];
        for (let j = 0; j < pts.length - 1; j++) {
          const [x1, y1] = pts[j];
          const [x2, y2] = pts[j + 1];
          const dx = (x2 - x1) / 3;
          const dy = (y2 - y1) / 3;
          const ax = x1 + dx, ay = y1 + dy;
          const bx = x1 + 2 * dx, by = y1 + 2 * dy;
          const ex = bx - ax, ey = by - ay;
          const cos = Math.cos(-Math.PI / 3), sin = Math.sin(-Math.PI / 3);
          const px = ax + ex * cos - ey * sin;
          const py = ay + ex * sin + ey * cos;
          next.push([x1, y1], [ax, ay], [px, py], [bx, by]);
        }
        next.push(pts[pts.length - 1]);
        pts = next;
      }
      return pts;
    }

    for (let level = 0; level <= iterations; level++) {
      const pts = kochPoints(level);
      const offsetY = level * rowH + rowH * 0.6;
      const offsetX = 28;
      const scale = (W - 36) / 100;

      // Label
      ctx.fillStyle = color + "99";
      ctx.font = "10px monospace";
      ctx.fillText(String(level), 2, offsetY + 4);

      // Path
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < pts.length; i++) {
        const x = offsetX + pts[i][0] * scale;
        const y = offsetY - pts[i][1] * scale * 0.8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, [iterations, color]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg"
      style={{ minHeight: Math.max(120, 60 * (iterations + 1)) }}
    />
  );
}

function SierpinskiCanvas({ iterations, color }: { iterations: number; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth || 600;
    const itemSize = Math.min(100, (W - 20) / (iterations + 1));
    const H = itemSize * 1.1;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    function drawSierpinski(
      level: number,
      ax: number, ay: number,
      bx: number, by: number,
      cx: number, cy: number
    ) {
      if (level === 0) {
        ctx!.beginPath();
        ctx!.moveTo(ax, ay);
        ctx!.lineTo(bx, by);
        ctx!.lineTo(cx, cy);
        ctx!.closePath();
        ctx!.fill();
        return;
      }
      const mid = (p: number, q: number) => (p + q) / 2;
      const abx = mid(ax, bx), aby = mid(ay, by);
      const bcx = mid(bx, cx), bcy = mid(by, cy);
      const cax = mid(cx, ax), cay = mid(cy, ay);
      drawSierpinski(level - 1, ax, ay, abx, aby, cax, cay);
      drawSierpinski(level - 1, abx, aby, bx, by, bcx, bcy);
      drawSierpinski(level - 1, cax, cay, bcx, bcy, cx, cy);
    }

    ctx.fillStyle = color;

    for (let n = 0; n <= iterations; n++) {
      const size = itemSize * 0.85;
      const startX = n * itemSize + itemSize * 0.075;
      const startY = H * 0.05;
      const h = size * (Math.sqrt(3) / 2);

      const ax = startX + size / 2, ay = startY;
      const bx = startX + size, by = startY + h;
      const cx2 = startX, cy = startY + h;

      // Label
      ctx.fillStyle = color + "99";
      ctx.font = "9px monospace";
      ctx.fillText(String(n), startX + size / 2 - 4, H - 2);

      ctx.fillStyle = color;
      drawSierpinski(n, ax, ay, bx, by, cx2, cy);
    }
  }, [iterations, color]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg"
      style={{ minHeight: 120 }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function Geometria() {
  const [tab, setTab] = useState<Tab>("cantor");
  const [cantorIter, setCantorIter] = useState(5);
  const [kochIter, setKochIter] = useState(4);
  const [sierIter, setSierIter] = useState(5);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-8">
          <header className="mb-6 flex items-start justify-between gap-4 pl-14 md:pl-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Fractais Geométricos</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Construa e explore fractais clássicos da geometria!
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 md:px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-secondary transition-colors">
                <HelpCircle className="h-4 w-4" /> <span className="hidden sm:inline">Como funciona?</span>
              </button>
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm hover:bg-secondary transition-colors">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div className="space-y-6">
              {/* Tab selector */}
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="ml-2 text-sm text-muted-foreground hidden sm:block">Escolha o fractal:</span>
                  <div className="grid flex-1 grid-cols-3 gap-3">
                    <TabBtn active={tab === "cantor"} onClick={() => setTab("cantor")} label="Cantor"
                      icon={<span className="font-mono text-xs">—·—</span>} />
                    <TabBtn active={tab === "koch"} onClick={() => setTab("koch")} label="Koch"
                      icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 18 L8 18 L10 12 L12 18 L14 12 L16 18 L22 18" /></svg>} />
                    <TabBtn active={tab === "sierpinski"} onClick={() => setTab("sierpinski")} label="Sierpinski"
                      icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,3 22,21 2,21" /></svg>} />
                  </div>
                </div>
              </section>

              {/* Fractal blocks */}
              <FractalBlock
                title="Conjunto de Cantor"
                desc="Remova o terço médio de um segmento repetidamente."
                color="cantor"
                colorHex="oklch(0.55 0.16 150)"
                iter={cantorIter}
                setIter={setCantorIter}
                max={7}
                what="A cada iteração, o terço médio de cada segmento é removido."
                curiosity={FRACTAL_INFO.cantor.topFact}
                mathFact={FRACTAL_INFO.cantor.mathFact}
                dim={FRACTAL_INFO.cantor.dim}
                visual={<CantorCanvas iterations={cantorIter} color="oklch(0.55 0.16 150)" />}
                highlight={tab === "cantor"}
              />
              <FractalBlock
                title="Curva de Koch"
                desc='Substitua o terço médio de cada segmento por dois segmentos formando um "pico".'
                color="koch"
                colorHex="oklch(0.55 0.18 255)"
                iter={kochIter}
                setIter={setKochIter}
                max={6}
                what="A curva fica cada vez mais comprida e cheia de detalhes, mas continua limitada."
                curiosity={FRACTAL_INFO.koch.topFact}
                mathFact={FRACTAL_INFO.koch.mathFact}
                dim={FRACTAL_INFO.koch.dim}
                visual={<KochCanvas iterations={kochIter} color="oklch(0.55 0.18 255)" />}
                highlight={tab === "koch"}
              />
              <FractalBlock
                title="Triângulo de Sierpinski"
                desc="Remova o triângulo central de um triângulo e repita o processo."
                color="sierpinski"
                colorHex="oklch(0.5 0.2 300)"
                iter={sierIter}
                setIter={setSierIter}
                max={7}
                what="O triângulo se divide em partes menores, criando um padrão infinito."
                curiosity={FRACTAL_INFO.sierpinski.topFact}
                mathFact={FRACTAL_INFO.sierpinski.mathFact}
                dim={FRACTAL_INFO.sierpinski.dim}
                visual={<SierpinskiCanvas iterations={sierIter} color="oklch(0.5 0.2 300)" />}
                highlight={tab === "sierpinski"}
              />
            </div>

            {/* Sidebar */}
            <aside className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Como Funciona?</h3>
                <p className="mt-1 text-xs text-muted-foreground">Todos estes fractais são gerados por um processo iterativo simples:</p>
                <ul className="mt-4 space-y-3 text-xs text-foreground">
                  <li className="flex items-center gap-2"><CircleIcon className="h-3 w-3 fill-[oklch(0.55_0.16_150)] text-[oklch(0.55_0.16_150)]" /> 1. Comece com uma figura inicial.</li>
                  <li className="pl-1 text-muted-foreground">↓</li>
                  <li className="flex items-center gap-2"><Settings2 className="h-3.5 w-3.5 text-[oklch(0.5_0.18_255)]" /> 2. Aplique a regra de construção.</li>
                  <li className="pl-1 text-muted-foreground">↓</li>
                  <li className="flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 text-[oklch(0.5_0.2_300)]" /> 3. Repita o processo várias vezes.</li>
                  <li className="pl-1 text-muted-foreground">↓</li>
                  <li className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-warn" /> 4. Observe o padrão emergir!</li>
                </ul>
              </div>

              {/* Dimension comparison */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dimensão Fractal</h3>
                <p className="mt-1 text-xs text-muted-foreground">Comparação das dimensões de Hausdorff:</p>
                <div className="mt-3 space-y-3">
                  {[
                    { name: "Cantor", dim: Math.log(2) / Math.log(3), color: "oklch(0.55 0.16 150)", max: 2 },
                    { name: "Koch",   dim: Math.log(4) / Math.log(3), color: "oklch(0.55 0.18 255)", max: 2 },
                    { name: "Sierp.", dim: Math.log(3) / Math.log(2), color: "oklch(0.5 0.2 300)",   max: 2 },
                  ].map((f) => (
                    <div key={f.name}>
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium" style={{ color: f.color }}>{f.name}</span>
                        <span className="font-mono text-foreground">{f.dim.toFixed(4)}</span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(f.dim / f.max) * 100}%`, backgroundColor: f.color }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Linha = dim. 1 · Quadrado = dim. 2 · Fractais ficam entre os dois!
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Lightbulb className="h-4 w-4 text-warn" /> Dica
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Aumente o número de iterações para ver mais detalhes. As visualizações usam Canvas 2D para alta performance mesmo em iterações altas!
                </p>
              </div>

              {/* Presets */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Presets Rápidos</h3>
                <p className="mt-1 text-xs text-muted-foreground">Escolha quantas iterações usar:</p>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const current = tab === "cantor" ? cantorIter : tab === "koch" ? kochIter : sierIter;
                    const set = tab === "cantor" ? setCantorIter : tab === "koch" ? setKochIter : setSierIter;
                    const active = current === n;
                    return (
                      <button
                        key={n}
                        onClick={() => set(n)}
                        className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                          active ? "border-primary/40 bg-accent text-primary" : "border-border bg-card hover:bg-secondary"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-warn/30 bg-warn-soft p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-warn" /> Experimente!
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Cada fractal tem suas próprias características, mas todos mostram como regras simples podem criar beleza infinita.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components

function TabBtn({ active, onClick, label, icon }: {
  active: boolean; onClick: () => void; label: string; icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
        active ? "border-primary/40 bg-accent text-primary" : "border-border bg-card text-foreground hover:bg-secondary"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function FractalBlock({
  title, desc, color, colorHex, iter, setIter, max, what, curiosity, mathFact, dim, visual, highlight,
}: {
  title: string; desc: string;
  color: "cantor" | "koch" | "sierpinski";
  colorHex: string;
  iter: number; setIter: (n: number) => void; max: number;
  what: string; curiosity: string; mathFact: string; dim: string;
  visual: React.ReactNode; highlight: boolean;
}) {
  const softVar = `var(--${color}-soft)`;
  return (
    <section
      className={`rounded-2xl border bg-card p-6 shadow-sm transition-all ${
        highlight ? "border-primary/30 ring-1 ring-primary/10" : "border-border"
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_200px] gap-5">
        {/* Left: controls */}
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold" style={{ color: colorHex }}>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm" style={{ backgroundColor: softVar, color: colorHex }}>✦</span>
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{desc}</p>

          {/* Dimension badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5" style={{ borderColor: `${colorHex}40`, backgroundColor: softVar }}>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colorHex }}>Dim. Hausdorff</span>
            <span className="font-mono text-xs font-semibold text-foreground">{dim}</span>
          </div>

          <div className="mt-4 rounded-xl border border-border p-3" style={{ backgroundColor: softVar }}>
            <div className="flex items-center justify-between text-xs font-medium" style={{ color: colorHex }}>
              <span>Iterações:</span>
              <span className="text-base font-semibold">{iter}</span>
            </div>
            <input
              type="range" min={0} max={max} value={iter}
              onChange={(e) => setIter(Number(e.target.value))}
              className="mt-2 w-full"
              style={{ accentColor: colorHex }}
            />
            <div className="mt-1 flex justify-between text-[10px]" style={{ color: colorHex }}>
              <span>0</span><span>{max}</span>
            </div>
          </div>
        </div>

        {/* Center: visualization */}
        <div className="min-h-[140px] overflow-auto">{visual}</div>

        {/* Right: info */}
        <div className="space-y-3">
          <div className="rounded-xl p-3" style={{ backgroundColor: softVar }}>
            <div className="text-xs font-semibold" style={{ color: colorHex }}>◐ O que acontece?</div>
            <p className="mt-1 text-xs text-muted-foreground">{what}</p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: softVar }}>
            <div className="text-xs font-semibold" style={{ color: colorHex }}>◉ Curiosidade</div>
            <p className="mt-1 text-xs text-muted-foreground">{curiosity}</p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: softVar }}>
            <div className="text-xs font-semibold" style={{ color: colorHex }}>📐 Matemática</div>
            <p className="mt-1 text-xs text-muted-foreground">{mathFact}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
