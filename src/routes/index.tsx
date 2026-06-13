import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HelpCircle, Settings, Info, Plus, Minus, Maximize2, Play, Pause, Target, Loader2, Sparkles, Lightbulb } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { MandelbrotCanvas } from "@/components/MandelbrotCanvas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FractalCLab — Laboratório de Fractais" },
      { name: "description", content: "Explore o conjunto de Mandelbrot e descubra padrões matemáticos incríveis." },
      { property: "og:title", content: "FractalCLab — Laboratório de Fractais" },
      { property: "og:description", content: "Ferramenta educacional para explorar fractais no ensino médio." },
    ],
  }),
  component: PlanoComplexo,
});

type Preset = { id: string; label: string; sub: string; a: { r: number; i: number }; p: number };

const PRESETS: Preset[] = [
  { id: "classic", label: "Clássico", sub: "z² + c", a: { r: 1, i: 0 }, p: 2 },
  { id: "cubic", label: "Cúbico", sub: "z³ + c", a: { r: 1, i: 0 }, p: 3 },
  { id: "p4", label: "Potência 4", sub: "z⁴ + c", a: { r: 1, i: 0 }, p: 4 },
  { id: "julia", label: "Conjunto de Julia", sub: "Fixa um c", a: { r: 0.9, i: 0 }, p: 2 },
];

function PlanoComplexo() {
  const [preset, setPreset] = useState("classic");
  const [a, setA] = useState({ r: 1, i: 0 });
  const [p, setP] = useState(2);
  const [iterations, setIterations] = useState(50);
  const [view, setView] = useState({ cx: -0.5, cy: 0, scale: 4 / 600 });
  const [animating, setAnimating] = useState(false);
  const rafRef = useRef<number | null>(null);

  function applyPreset(id: string) {
    const found = PRESETS.find((x) => x.id === id);
    if (!found) return;
    setPreset(id);
    setA(found.a);
    setP(found.p);
  }

  // animate iterations
  useEffect(() => {
    if (!animating) return;
    let last = performance.now();
    const tick = (t: number) => {
      if (t - last > 150) {
        setIterations((it) => (it >= 100 ? 10 : it + 5));
        last = t;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [animating]);

  function zoom(factor: number) {
    setView((v) => ({ ...v, scale: v.scale * factor }));
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoom(e.deltaY > 0 ? 1.15 : 0.87);
  }

  function handleDrag(dx: number, dy: number) {
    setView((v) => ({ ...v, cx: v.cx - dx * v.scale, cy: v.cy - dy * v.scale }));
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-[1400px] px-8 py-8">
          {/* Header */}
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Laboratório de Fractais</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Altere os parâmetros, observe o fractal e descubra padrões incríveis!
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
            {/* Center column */}
            <div className="space-y-6">
              {/* Formula panel */}
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="min-w-[220px]">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fórmula Atual</div>
                    <div className="mt-2 font-serif text-2xl italic text-foreground">
                      z<sub>n+1</sub> = A · z<sub>n</sub><sup>P</sup> + c
                    </div>
                  </div>
                  <div className="ml-auto grid grid-cols-3 gap-3">
                    <ParamField label="A (constante)" tone="cantor" value={`${a.r.toFixed(1)} ${a.i >= 0 ? "+" : "-"} ${Math.abs(a.i).toFixed(1)}i`} />
                    <ParamField label="P (expoente)" tone="koch" value={p.toFixed(1)} />
                    <ParamField label="c (ponto)" tone="destructive" value="variável" hint />
                  </div>
                </div>
              </section>

              {/* Canvas */}
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="relative aspect-[16/10] w-full">
                  {/* axis labels */}
                  <div className="absolute left-0 top-0 z-10 flex h-full flex-col justify-between py-3 pl-1 text-[10px] text-muted-foreground">
                    <span>2</span><span>1</span><span>0</span><span>-1</span><span>-2</span>
                  </div>
                  <div className="absolute -rotate-90 left-[-18px] top-1/2 text-[10px] text-muted-foreground">Imaginário</div>
                  <div className="absolute bottom-0 left-0 z-10 flex w-full justify-between px-6 pb-1 text-[10px] text-muted-foreground">
                    <span>-2</span><span>-1</span><span>0</span><span>1</span><span>2</span>
                  </div>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">Real</div>

                  <div className="absolute inset-0 px-6 py-3">
                    <MandelbrotCanvas
                      power={p}
                      aReal={a.r}
                      aImag={a.i}
                      iterations={iterations}
                      view={view}
                      onWheel={handleWheel}
                      onDrag={handleDrag}
                    />
                  </div>

                  {/* Zoom controls */}
                  <div className="absolute bottom-12 left-3 z-10 flex flex-col gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
                    <button onClick={() => zoom(0.7)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button onClick={() => zoom(1.4)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                      <Minus className="h-4 w-4" />
                    </button>
                    <button onClick={() => setView({ cx: -0.5, cy: 0, scale: 4 / 600 })} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </section>

              {/* Iterations */}
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Iterações</div>
                      <div className="text-xs text-muted-foreground">(quanto maior, mais detalhes aparecem)</div>
                    </div>
                    <div className="relative mt-4">
                      <input
                        type="range" min={10} max={100} step={5}
                        value={iterations}
                        onChange={(e) => setIterations(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                        {[10,20,30,40,50,60,70,80,90,100].map(n => <span key={n}>{n}</span>)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setAnimating((x) => !x)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
                  >
                    {animating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {animating ? "Pausar" : "Animar"}
                  </button>
                </div>
              </section>

              {/* How it works */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Como Funciona?</h3>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <Step n={1} icon={<Target className="h-7 w-7" />} text={<>Escolha um ponto <em>c</em> no plano complexo.</>} />
                  <Step n={2} icon={<Loader2 className="h-7 w-7" />} text={<>Começamos em z₀ = 0 e aplicamos a fórmula.</>} />
                  <Step n={3} icon={<DotsIcon />} text={<>Se os valores z<sub>n</sub> ficam limitados, o ponto pertence ao conjunto.</>} />
                  <Step n={4} icon={<Sparkles className="h-7 w-7" />} text={<>Se os valores z<sub>n</sub> explodem, o ponto fica fora do conjunto.</>} />
                </div>
              </section>
            </div>

            {/* Right column */}
            <aside className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Exemplos Rápidos</h3>
                <p className="mt-1 text-xs text-muted-foreground">Carregue configurações prontas:</p>
                <div className="mt-4 space-y-2">
                  {PRESETS.map((pr) => {
                    const active = pr.id === preset;
                    return (
                      <button
                        key={pr.id}
                        onClick={() => applyPreset(pr.id)}
                        className={`w-full rounded-xl border px-4 py-3 text-center transition ${
                          active ? "border-primary/40 bg-accent text-primary" : "border-border bg-card hover:bg-secondary"
                        }`}
                      >
                        <div className="text-sm font-semibold">{pr.label}</div>
                        <div className={`mt-0.5 text-xs italic ${active ? "text-primary/70" : "text-muted-foreground"}`}>{pr.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sobre os Parâmetros</h3>
                <ul className="mt-3 space-y-3 text-xs leading-relaxed text-muted-foreground">
                  <li><span className="font-semibold text-[oklch(0.5_0.16_150)]">A (constante):</span> controla o crescimento das órbitas.</li>
                  <li><span className="font-semibold text-[oklch(0.5_0.18_255)]">P (expoente):</span> define a simetria e o comportamento das órbitas.</li>
                  <li><span className="font-semibold text-[oklch(0.55_0.2_25)]">c (ponto):</span> cada ponto do plano é testado para gerar o fractal.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-warn/30 bg-warn-soft p-4">
                <div className="flex items-start gap-2 text-xs text-foreground">
                  <Lightbulb className="mt-0.5 h-4 w-4 text-warn" />
                  <p><span className="font-semibold">Dica:</span> experimente mudar A, P ou dar zoom para ver detalhes!</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function ParamField({ label, value, tone, hint }: { label: string; value: string; tone: "cantor" | "koch" | "destructive"; hint?: boolean }) {
  const toneClass = {
    cantor: "border-[oklch(0.7_0.15_150)]/50 bg-[oklch(0.97_0.04_150)]",
    koch: "border-[oklch(0.7_0.15_255)]/50 bg-[oklch(0.97_0.03_255)]",
    destructive: "border-[oklch(0.7_0.18_25)]/40 bg-[oklch(0.97_0.04_25)]",
  }[tone];
  const labelTone = {
    cantor: "text-[oklch(0.5_0.16_150)]",
    koch: "text-[oklch(0.5_0.18_255)]",
    destructive: "text-[oklch(0.55_0.2_25)]",
  }[tone];
  return (
    <div className="text-center">
      <div className={`flex items-center justify-center gap-1 text-[11px] font-semibold ${labelTone}`}>
        {label} {hint && <Info className="h-3 w-3 text-muted-foreground" />}
      </div>
      <div className={`mt-1 rounded-lg border ${toneClass} px-3 py-2 text-sm font-medium text-foreground`}>
        {value}
      </div>
    </div>
  );
}

function Step({ n, icon, text }: { n: number; icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary">{icon}</div>
      <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{n}.</span> {text}</p>
    </div>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
      <circle cx="12" cy="4" r="1.4" /><circle cx="18" cy="7" r="1.4" /><circle cx="20" cy="12" r="1.4" />
      <circle cx="18" cy="17" r="1.4" /><circle cx="12" cy="20" r="1.4" /><circle cx="6" cy="17" r="1.4" />
      <circle cx="4" cy="12" r="1.4" /><circle cx="6" cy="7" r="1.4" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
