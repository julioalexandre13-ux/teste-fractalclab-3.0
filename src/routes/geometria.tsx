import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HelpCircle, Settings, Lightbulb, Sparkles, RefreshCw, Star, Circle as CircleIcon, Settings2 } from "lucide-react";
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

function Geometria() {
  const [tab, setTab] = useState<Tab>("cantor");
  const [cantorIter, setCantorIter] = useState(5);
  const [kochIter, setKochIter] = useState(4);
  const [sierIter, setSierIter] = useState(5);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-[1400px] px-8 py-8">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Fractais Geométricos</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Construa e explore fractais clássicos da geometria!
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-secondary">
                <HelpCircle className="h-4 w-4" /> Como funciona?
              </button>
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm hover:bg-secondary">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div className="space-y-6">
              {/* Selector */}
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="ml-2 text-sm text-muted-foreground">Escolha o fractal:</span>
                  <div className="grid flex-1 grid-cols-3 gap-3">
                    <TabBtn active={tab === "cantor"} onClick={() => setTab("cantor")} label="Cantor" icon={<span className="font-mono">---</span>} />
                    <TabBtn active={tab === "koch"} onClick={() => setTab("koch")} label="Koch" icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 18 L8 18 L10 12 L12 18 L14 12 L16 18 L22 18" /></svg>} />
                    <TabBtn active={tab === "sierpinski"} onClick={() => setTab("sierpinski")} label="Sierpinski" icon={<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,3 22,21 2,21" /></svg>} />
                  </div>
                </div>
              </section>

              {/* Blocks - all visible but selected gets highlight; following mockup all three are stacked */}
              <FractalBlock
                title="Conjunto de Cantor"
                desc="Remova o terço médio de um segmento repetidamente."
                color="cantor"
                iter={cantorIter}
                setIter={setCantorIter}
                max={7}
                what="A cada iteração, o terço médio de cada segmento é removido."
                curiosity="A medida total do conjunto tende a 0, mas ele possui infinitos pontos!"
                visual={<CantorViz iterations={cantorIter} />}
                highlight={tab === "cantor"}
              />
              <FractalBlock
                title="Curva de Koch"
                desc="Substitua o terço médio de cada segmento por dois segmentos formando um “pico”."
                color="koch"
                iter={kochIter}
                setIter={setKochIter}
                max={6}
                what="A curva fica cada vez mais comprida e cheia de detalhes, mas continua limitada."
                curiosity="O comprimento da curva tende ao infinito!"
                visual={<KochViz iterations={kochIter} />}
                highlight={tab === "koch"}
              />
              <FractalBlock
                title="Triângulo de Sierpinski"
                desc="Remova o triângulo central de um triângulo e repita o processo."
                color="sierpinski"
                iter={sierIter}
                setIter={setSierIter}
                max={7}
                what="O triângulo se divide em partes menores, criando um padrão infinito."
                curiosity="A área total tende a 0, mas a estrutura permanece!"
                visual={<SierpinskiViz iterations={sierIter} />}
                highlight={tab === "sierpinski"}
              />
            </div>

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

              <div className="rounded-2xl border border-border bg-secondary/50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Lightbulb className="h-4 w-4 text-warn" /> Dica
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Aumente o número de iterações para ver mais detalhes, mas cuidado: muitas iterações podem deixar o desenho lento.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Presets Rápidos</h3>
                <p className="mt-1 text-xs text-muted-foreground">Escolha quantas iterações usar:</p>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5, 6].map((n) => {
                    const current = tab === "cantor" ? cantorIter : tab === "koch" ? kochIter : sierIter;
                    const set = tab === "cantor" ? setCantorIter : tab === "koch" ? setKochIter : setSierIter;
                    const active = current === n;
                    return (
                      <button
                        key={n}
                        onClick={() => set(n)}
                        className={`rounded-lg border px-2 py-2 text-sm font-medium ${active ? "border-primary/40 bg-accent text-primary" : "border-border bg-card hover:bg-secondary"}`}
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

function TabBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
        active ? "border-primary/40 bg-accent text-primary" : "border-border bg-card text-foreground hover:bg-secondary"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function FractalBlock({
  title, desc, color, iter, setIter, max, what, curiosity, visual, highlight,
}: {
  title: string; desc: string;
  color: "cantor" | "koch" | "sierpinski";
  iter: number; setIter: (n: number) => void; max: number;
  what: string; curiosity: string; visual: React.ReactNode; highlight: boolean;
}) {
  const colorVar = `var(--${color})`;
  const softVar = `var(--${color}-soft)`;
  return (
    <section
      className={`rounded-2xl border bg-card p-6 shadow-sm transition ${highlight ? "border-primary/30 ring-1 ring-primary/10" : "border-border"}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr_220px] gap-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold" style={{ color: colorVar }}>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: softVar, color: colorVar }}>✦</span>
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
          <div className="mt-4 rounded-xl border border-border p-3" style={{ backgroundColor: softVar }}>
            <div className="flex items-center justify-between text-xs font-medium" style={{ color: colorVar }}>
              <span>Iterações:</span>
              <span className="text-base font-semibold">{iter}</span>
            </div>
            <input
              type="range" min={0} max={max} value={iter}
              onChange={(e) => setIter(Number(e.target.value))}
              className="mt-2 w-full"
              style={{ accentColor: colorVar as string }}
            />
            <div className="mt-1 flex justify-between text-[10px]" style={{ color: colorVar }}>
              <span>0</span><span>{max}</span>
            </div>
          </div>
        </div>
        <div className="min-h-[200px]">{visual}</div>
        <div className="space-y-3">
          <div className="rounded-xl border p-3" style={{ backgroundColor: softVar, borderColor: "transparent" }}>
            <div className="text-xs font-semibold" style={{ color: colorVar }}>◐ O que acontece?</div>
            <p className="mt-1 text-xs text-muted-foreground">{what}</p>
          </div>
          <div className="rounded-xl border p-3" style={{ backgroundColor: softVar, borderColor: "transparent" }}>
            <div className="text-xs font-semibold" style={{ color: colorVar }}>◉ Curiosidade</div>
            <p className="mt-1 text-xs text-muted-foreground">{curiosity}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Visualizations ---------- */

function CantorViz({ iterations }: { iterations: number }) {
  const rows = [];
  const total = iterations + 1;
  for (let level = 0; level <= iterations; level++) {
    const segments = cantorSegments(level);
    rows.push(
      <div key={level} className="flex items-center gap-3">
        <div className="w-4 text-right text-[10px] text-muted-foreground">{level}</div>
        <svg viewBox="0 0 100 2" preserveAspectRatio="none" className="h-1.5 flex-1">
          {segments.map(([x, w], i) => (
            <rect key={i} x={x * 100} y={0} width={w * 100} height={2} fill="var(--cantor)" />
          ))}
        </svg>
      </div>
    );
  }
  return <div className="flex h-full flex-col justify-around gap-2 py-2" style={{ minHeight: total * 22 }}>{rows}</div>;
}

function cantorSegments(level: number): [number, number][] {
  let segs: [number, number][] = [[0, 1]];
  for (let i = 0; i < level; i++) {
    const next: [number, number][] = [];
    for (const [x, w] of segs) {
      const third = w / 3;
      next.push([x, third]);
      next.push([x + 2 * third, third]);
    }
    segs = next;
  }
  return segs;
}

function KochViz({ iterations }: { iterations: number }) {
  const rows = [];
  for (let level = 0; level <= iterations; level++) {
    const pts = kochPoints(level);
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
    rows.push(
      <div key={level} className="flex items-center gap-3">
        <div className="w-4 text-right text-[10px] text-muted-foreground">{level}</div>
        <svg viewBox="0 -20 100 25" preserveAspectRatio="none" className="h-10 flex-1">
          <path d={d} fill="none" stroke="var(--koch)" strokeWidth="0.4" />
        </svg>
      </div>
    );
  }
  return <div className="flex h-full flex-col justify-around gap-1 py-2">{rows}</div>;
}

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
      // peak point: rotate (bx-ax, by-ay) by -60 deg around (ax, ay)
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

function SierpinskiViz({ iterations }: { iterations: number }) {
  const items = [];
  for (let n = 0; n <= iterations; n++) {
    items.push(
      <div key={n} className="flex flex-col items-center gap-1">
        <div className="text-[10px] text-muted-foreground">{n}</div>
        <svg viewBox="0 0 100 90" className="h-20 w-20">
          {sierpinskiTriangles(n, [50, 5], [95, 85], [5, 85]).map(([a, b, c], i) => (
            <polygon key={i} points={`${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]}`} fill="var(--sierpinski)" />
          ))}
        </svg>
      </div>
    );
  }
  return <div className="flex h-full flex-wrap items-end justify-around gap-2 py-2">{items}</div>;
}

type Pt = [number, number];
function sierpinskiTriangles(level: number, a: Pt, b: Pt, c: Pt): [Pt, Pt, Pt][] {
  if (level === 0) return [[a, b, c]];
  const mid = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
  return [
    ...sierpinskiTriangles(level - 1, a, ab, ca),
    ...sierpinskiTriangles(level - 1, ab, b, bc),
    ...sierpinskiTriangles(level - 1, ca, bc, c),
  ];
}
