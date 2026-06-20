import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  HelpCircle, ZoomIn, ZoomOut, Maximize2, Play, Pause,
  Target, Loader2, Sparkles, Lightbulb, Download, History,
  X, Flame, Waves, SunMedium, Rainbow, Palette, RotateCcw,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { MandelbrotCanvas, type Palette as PaletteType } from "@/components/MandelbrotCanvas";
import { GuidedTour } from "@/components/GuidedTour";

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

// ---------------------------------------------------------------------------

type Preset = { id: string; label: string; sub: string; a: { r: number; i: number }; p: number };

const PRESETS: Preset[] = [
  { id: "classic", label: "Clássico", sub: "z² + c", a: { r: 1, i: 0 }, p: 2 },
  { id: "cubic", label: "Cúbico", sub: "z³ + c", a: { r: 1, i: 0 }, p: 3 },
  { id: "p4", label: "Potência 4", sub: "z⁴ + c", a: { r: 1, i: 0 }, p: 4 },
];

const PALETTES: { id: PaletteType; label: string; icon: React.ReactNode; preview: string[] }[] = [
  { id: "default", label: "Clássico", icon: <SunMedium className="h-3.5 w-3.5" />, preview: ["#283593", "#42a5f5", "#fff176", "#ef6c00"] },
  { id: "fire", label: "Fogo", icon: <Flame className="h-3.5 w-3.5" />, preview: ["#1a0533", "#8b1a2e", "#e64a19", "#ffd54f"] },
  { id: "ocean", label: "Oceano", icon: <Waves className="h-3.5 w-3.5" />, preview: ["#000428", "#004e92", "#00bcd4", "#e0f7fa"] },
  { id: "grayscale", label: "Cinza", icon: <Palette className="h-3.5 w-3.5" />, preview: ["#111", "#555", "#aaa", "#eee"] },
  { id: "rainbow", label: "Arco-íris", icon: <Rainbow className="h-3.5 w-3.5" />, preview: ["#f44336", "#ff9800", "#4caf50", "#2196f3"] },
];

type HistoryEntry = {
  id: string;
  preset: string;
  a: { r: number; i: number };
  p: number;
  iterations: number;
  view: { cx: number; cy: number; scale: number };
  palette: PaletteType;
  timestamp: number;
};

type SavedLabState = Omit<HistoryEntry, "id" | "timestamp"> & {
  juliaPoint: { x: number; y: number } | null;
};

const DEFAULT_STATE: SavedLabState = {
  preset: "classic", a: { r: 1, i: 0 }, p: 2, iterations: 50,
  view: { cx: -0.5, cy: 0, scale: 4 / 600 }, palette: "default", juliaPoint: null,
};

// v2 — qualquer mudança incompatível em SavedLabState/HistoryEntry deve incrementar o sufixo.
const LAB_STATE_KEY = "fractalclab_lab_state_v2";
const HISTORY_KEY = "fractalclab_history_v2";
const LEGACY_LAB_STATE_KEY = "fractalclab_lab_state";
const LEGACY_HISTORY_KEY = "fractalclab_history";

function readLabState(): SavedLabState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(LAB_STATE_KEY) ?? localStorage.getItem(LEGACY_LAB_STATE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    // Migração silenciosa: descarta a chave antiga após ler.
    if (!localStorage.getItem(LAB_STATE_KEY)) {
      localStorage.removeItem(LEGACY_LAB_STATE_KEY);
    }
    return { ...DEFAULT_STATE, ...parsed };
  } catch { return DEFAULT_STATE; }
}

// ---------------------------------------------------------------------------

function PlanoComplexo() {
  const initial = useRef(readLabState()).current;
  const [preset, setPreset] = useState(initial.preset);
  const [a, setA] = useState(initial.a);
  const [p, setP] = useState(initial.p);
  const [iterations, setIterations] = useState(initial.iterations);
  const [view, setView] = useState(initial.view);
  const [animating, setAnimating] = useState(false);
  const [palette, setPalette] = useState<PaletteType>(initial.palette);
  const [juliaPoint, setJuliaPoint] = useState<{ x: number; y: number } | null>(initial.juliaPoint);
  const [juliaReal, setJuliaReal] = useState(initial.juliaPoint?.x.toString() ?? "-0.7");
  const [juliaImag, setJuliaImag] = useState(initial.juliaPoint?.y.toString() ?? "0.27015");
  const [juliaError, setJuliaError] = useState<{ re?: boolean; im?: boolean }>({});
  const [juliaClickMode, setJuliaClickMode] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY) ?? localStorage.getItem(LEGACY_HISTORY_KEY) ?? "[]";
      return JSON.parse(raw);
    } catch { return []; }
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const juliaCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<HistoryEntry | null>(null);

  useEffect(() => {
    localStorage.setItem(LAB_STATE_KEY, JSON.stringify({ preset, a, p, iterations, view, palette, juliaPoint }));
  }, [preset, a, p, iterations, view, palette, juliaPoint]);

  // Save history only on significant changes (debounced)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const last = lastSavedRef.current ?? history[0] ?? null;
      const ratio = last && view.scale > 0 ? last.view.scale / view.scale : 1;
      const significant =
        !last ||
        last.preset !== preset ||
        last.palette !== palette ||
        Math.abs(last.iterations - iterations) >= 10 ||
        ratio > 2 || ratio < 0.5;
      if (!significant) return;
      const entry: HistoryEntry = {
        id: `${Date.now()}`, preset, a, p, iterations, view, palette, timestamp: Date.now(),
      };
      lastSavedRef.current = entry;
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 5);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, a, p, iterations, palette, view]);

  // Animate iterations
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

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "+" || e.key === "=") { e.preventDefault(); setView((v) => ({ ...v, scale: v.scale * 0.7 })); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); setView((v) => ({ ...v, scale: v.scale * 1.4 })); }
      else if (e.key === "r" || e.key === "R") { e.preventDefault(); setView({ cx: -0.5, cy: 0, scale: 4 / 600 }); }
      else if (e.key === "Escape") {
        if (juliaClickMode) setJuliaClickMode(false);
        else if (juliaPoint) setJuliaPoint(null);
      }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setView((v) => ({ ...v, cx: v.cx - 40 * v.scale })); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setView((v) => ({ ...v, cx: v.cx + 40 * v.scale })); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setView((v) => ({ ...v, cy: v.cy - 40 * v.scale })); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setView((v) => ({ ...v, cy: v.cy + 40 * v.scale })); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [juliaClickMode, juliaPoint]);

  function applyPreset(id: string) {
    const found = PRESETS.find((x) => x.id === id);
    if (!found) return;
    setPreset(id);
    setA(found.a);
    setP(found.p);
    setJuliaPoint(null);
    setJuliaClickMode(false);
  }

  function zoom(factor: number) {
    setView((v) => ({ ...v, scale: v.scale * factor }));
  }

  function resetView() {
    setView({ cx: -0.5, cy: 0, scale: 4 / 600 });
  }

  function downloadCanvas(canvas: HTMLCanvasElement | null, name: string) {
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `fractalclab-${name}-p${p}-iter${iterations}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function saveImage() {
    if (juliaPoint) setSaveOpen(true);
    else downloadCanvas(canvasRef.current, "mandelbrot");
  }

  function resetAll() {
    if (typeof window !== "undefined" && !window.confirm("Restaurar todos os parâmetros para o padrão?")) return;
    setPreset(DEFAULT_STATE.preset); setA(DEFAULT_STATE.a); setP(DEFAULT_STATE.p);
    setIterations(DEFAULT_STATE.iterations); setView(DEFAULT_STATE.view);
    setPalette(DEFAULT_STATE.palette); setJuliaPoint(null); setJuliaClickMode(false); setAnimating(false);
    setJuliaError({});
  }

  const juliaInputsValid = (() => {
    const x = Number(juliaReal.replace(",", "."));
    const y = Number(juliaImag.replace(",", "."));
    return Number.isFinite(x) && Number.isFinite(y);
  })();

  function openTypedJulia() {
    const x = Number(juliaReal.replace(",", "."));
    const y = Number(juliaImag.replace(",", "."));
    const err = { re: !Number.isFinite(x), im: !Number.isFinite(y) };
    setJuliaError(err);
    if (!err.re && !err.im) setJuliaPoint({ x, y });
  }

  const handleCanvasClick = useCallback((re: number, im: number) => {
    if (!juliaClickMode) return;
    setJuliaPoint({ x: re, y: im });
    setJuliaClickMode(false);
  }, [juliaClickMode]);

  function restoreHistory(entry: HistoryEntry) {
    setPreset(entry.preset);
    setA(entry.a);
    setP(entry.p);
    setIterations(entry.iterations);
    setView(entry.view);
    setPalette(entry.palette);
    setHistoryOpen(false);
  }

  // Hausdorff dimension (approximate for Mandelbrot family)
  const hausdorffDim = p <= 1 ? "—" : (2 / p).toFixed(3);

  // Zoom level (1x = default scale of 4/600)
  const zoomLevel = (4 / 600) / view.scale;
  const zoomLabel = zoomLevel >= 100 ? `${zoomLevel.toFixed(0)}×` : zoomLevel >= 10 ? `${zoomLevel.toFixed(1)}×` : `${zoomLevel.toFixed(2)}×`;

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-8">
          {/* Header */}
          <header className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-5 pt-16 md:pt-0">
            <div className="flex-1 w-full px-2 md:px-0">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Fractais Algébricos</h1>
              <p className="mt-2 text-base md:text-sm text-muted-foreground">
                Altere os parâmetros, observe o fractal e descubra padrões incríveis!
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-auto w-full md:w-auto overflow-x-auto pb-2 md:pb-0 px-2 md:px-0">
              <button
                onClick={() => setTourOpen(true)}
                aria-label="Como funciona?"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 md:px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-secondary transition-colors"
              >
                <HelpCircle className="h-4 w-4" /> <span className="hidden sm:inline">Como funciona?</span>
              </button>
              <button
                onClick={() => setHistoryOpen(true)}
                aria-label="Histórico de explorações"
                title="Histórico de explorações"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm hover:bg-secondary transition-colors"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                onClick={resetAll}
                aria-label="Restaurar padrão"
                title="Restaurar padrão"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm hover:bg-secondary transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={saveImage}
                aria-label="Salvar imagem"
                title="Salvar imagem"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm hover:bg-secondary transition-colors"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            {/* Center column */}
            <div className="space-y-6">
              {/* Formula panel */}
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="min-w-[200px]">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fórmula Atual</div>
                    <div className="mt-2 font-serif text-2xl italic text-foreground">
                      z<sub>n+1</sub> = A · z<sub>n</sub><sup>P</sup> + c
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Dim. Hausdorff ≈ <span className="font-semibold text-primary">{hausdorffDim}</span>
                    </div>
                  </div>
                  <div className="ml-auto grid grid-cols-3 gap-3">
                    <ParamField label="A (real)" tone="cantor" value={a.r.toFixed(2)} tooltip="Parte real do coeficiente A. Escala as órbitas no eixo horizontal." />
                    <ParamField label="A (imag)" tone="koch" value={`${a.i >= 0 ? "+" : ""}${a.i.toFixed(2)}i`} tooltip="Parte imaginária de A. Rotaciona as órbitas no plano complexo." />
                    <ParamField label="P (exp)" tone="destructive" value={p.toFixed(1)} tooltip="Expoente P da fórmula z^P + c. Define a simetria do fractal." />
                  </div>
                </div>
              </section>

              {/* Canvas */}
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                {juliaClickMode && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-primary/30 bg-accent px-4 py-2.5 text-sm text-primary">
                    <Target className="h-4 w-4 animate-pulse" />
                    <span className="font-medium">Clique em um ponto do Mandelbrot para gerar o Julia correspondente</span>
                    <button onClick={() => setJuliaClickMode(false)} className="ml-auto text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Main canvas + optional Julia side by side */}
                <div className={`grid gap-4 ${juliaPoint ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                  {/* Mandelbrot */}
                  <div className="relative aspect-[16/10] w-full">
                    <div className="absolute left-0 top-0 z-10 flex h-full flex-col justify-between py-3 pl-1 text-[10px] text-muted-foreground pointer-events-none">
                      <span>2</span><span>1</span><span>0</span><span>-1</span><span>-2</span>
                    </div>
                    <div className="absolute -rotate-90 left-[-27px] top-1/2 text-[10px] text-muted-foreground pointer-events-none">Imaginário</div>
                    <div className="absolute bottom-0 left-0 z-10 flex w-full justify-between px-6 pb-1 text-[10px] text-muted-foreground pointer-events-none">
                      <span>-2</span><span>-1</span><span>0</span><span>1</span><span>2</span>
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground pointer-events-none">Real</div>
                    <div className="absolute inset-0 px-6 py-3">
                      <MandelbrotCanvas
                        power={p}
                        aReal={a.r}
                        aImag={a.i}
                        iterations={iterations}
                        palette={palette}
                        view={view}
                        onViewChange={setView}
                        onCanvasClick={handleCanvasClick}
                        canvasRef={canvasRef}
                      />
                    </div>
                    {/* Zoom controls */}
                    <div className="absolute top-1/2 -translate-y-1/2 -right-3.5 z-10 flex flex-col gap-1 rounded-xl border border-border bg-card p-0.4 shadow-sm">
                      <div className="px-1 pt-0.5 text-center font-mono text-[9px] font-semibold text-muted-foreground" title="Nível de zoom atual">{zoomLabel}</div>
                      <button onClick={() => zoom(0.7)} aria-label="Aproximar" title="Aproximar (+)" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
                        <ZoomIn className="h-4 w-4" />
                      </button>
                      <button onClick={() => zoom(1.4)} aria-label="Afastar" title="Afastar (−)" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
                        <ZoomOut className="h-4 w-4" />
                      </button>
                      <button onClick={resetView} aria-label="Resetar vista" title="Resetar vista (R)" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Julia Set */}
                  {juliaPoint && (
                    <div className="relative aspect-[16/10] w-full">
                      <div className="absolute right-2 top-2 z-10">
                        <button
                          onClick={() => setJuliaPoint(null)}
                          aria-label="Fechar Julia"
                          title="Fechar Julia (Esc)"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="absolute inset-0">
                        <MandelbrotCanvas
                          power={p}
                          aReal={a.r}
                          aImag={a.i}
                          iterations={iterations}
                          palette={palette}
                          view={{ cx: 0, cy: 0, scale: 4 / 600 }}
                          onViewChange={() => { }}
                          isJulia
                          juliaC={juliaPoint}
                          canvasRef={juliaCanvasRef}
                        />
                      </div>
                      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 font-mono text-[10px] text-white/80">
                        c = {juliaPoint.x.toFixed(4)} {juliaPoint.y >= 0 ? "+" : ""}{juliaPoint.y.toFixed(4)}i
                      </div>
                    </div>
                  )}
                </div>

                {/* Canvas actions */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setJuliaClickMode((v) => !v)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${juliaClickMode
                      ? "border-primary/40 bg-accent text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                      }`}
                  >
                    <Target className="h-3.5 w-3.5" />
                    {juliaClickMode ? "Cancelar seleção" : "Ver Julia (clique no fractal)"}
                  </button>
                  <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-2">
                    <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      c — Ponto do Conjunto de Julia
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="pl-1 text-[11px] font-medium text-muted-foreground">Re:</span>
                      <input
                        aria-label="Parte real de c"
                        aria-invalid={juliaError.re || undefined}
                        value={juliaReal}
                        onChange={(e) => { setJuliaReal(e.target.value); setJuliaError((p) => ({ ...p, re: false })); }}
                        onKeyDown={(e) => e.key === "Enter" && openTypedJulia()}
                        title={juliaError.re ? "Digite um número válido (ex: -0.7)" : undefined}
                        className={`w-20 rounded-lg border bg-background px-2 py-1 text-xs ${juliaError.re ? "border-destructive" : "border-input"}`}
                        inputMode="decimal"
                        placeholder="ex: −0.7"
                      />
                      <span className="text-[11px] font-medium text-muted-foreground">Im:</span>
                      <input
                        aria-label="Parte imaginária de c"
                        aria-invalid={juliaError.im || undefined}
                        value={juliaImag}
                        onChange={(e) => { setJuliaImag(e.target.value); setJuliaError((p) => ({ ...p, im: false })); }}
                        onKeyDown={(e) => e.key === "Enter" && openTypedJulia()}
                        title={juliaError.im ? "Digite um número válido (ex: 0.27)" : undefined}
                        className={`w-20 rounded-lg border bg-background px-2 py-1 text-xs ${juliaError.im ? "border-destructive" : "border-input"}`}
                        inputMode="decimal"
                        placeholder="ex: 0.27"
                      />
                      <button
                        onClick={openTypedJulia}
                        disabled={!juliaInputsValid}
                        className="rounded-lg bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      >Abrir</button>
                    </div>
                  </div>
                  <button
                    onClick={saveImage}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Salvar imagem
                  </button>
                </div>
              </section>

              {/* Parameter sliders */}
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Controle dos Parâmetros</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* A Real */}
                  <SliderField
                    label="A (parte real)"
                    value={a.r}
                    min={-2} max={2} step={0.05}
                    display={a.r.toFixed(2)}
                    onChange={(v) => setA((prev) => ({ ...prev, r: v }))}
                    color="oklch(0.55 0.16 150)"
                  />
                  {/* A Imaginário */}
                  <SliderField
                    label="A (parte imaginária)"
                    value={a.i}
                    min={-2} max={2} step={0.05}
                    display={`${a.i >= 0 ? "+" : ""}${a.i.toFixed(2)}i`}
                    onChange={(v) => setA((prev) => ({ ...prev, i: v }))}
                    color="oklch(0.55 0.18 255)"
                  />
                  {/* P */}
                  <SliderField
                    label="P (expoente)"
                    value={p}
                    min={1} max={8} step={0.5}
                    display={p.toFixed(1)}
                    onChange={setP}
                    color="oklch(0.55 0.2 25)"
                  />
                  {/* Iterations */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-muted-foreground">Iterações</div>
                      <div className="text-sm font-semibold text-foreground">{iterations}</div>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="range" min={10} max={200} step={5}
                        value={iterations}
                        onChange={(e) => setIterations(Number(e.target.value))}
                        list="iter-marks"
                        className="flex-1 accent-primary"
                      />
                      <datalist id="iter-marks">
                        <option value="10" />
                        <option value="50" />
                        <option value="100" />
                        <option value="200" />
                      </datalist>
                      <button
                        onClick={() => setAnimating((x) => !x)}
                        aria-label={animating ? "Pausar animação" : "Animar iterações"}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity flex-shrink-0"
                      >
                        {animating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {animating ? "Pausar" : "Animar"}
                      </button>
                    </div>
                    <div className="mt-1 flex justify-between px-0.5 text-[10px] text-muted-foreground">
                      <span>10</span><span>50</span><span>100</span><span>200</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Palette selector */}
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Paleta de Cores</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PALETTES.map((pal) => (
                    <button
                      key={pal.id}
                      onClick={() => setPalette(pal.id)}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-colors ${palette === pal.id
                        ? "border-primary/40 bg-accent text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary"
                        }`}
                    >
                      <div className="flex gap-0.5 rounded-md overflow-hidden h-4">
                        {pal.preview.map((c, i) => (
                          <div key={i} className="w-5 h-4" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="flex items-center gap-1">{pal.icon} {pal.label}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* How it works */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Como Funciona?</h3>
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Step n={1} icon={<Target className="h-7 w-7" />} text={<>Escolha um ponto <em>c</em> no plano complexo.</>} />
                  <Step n={2} icon={<Loader2 className="h-7 w-7" />} text={<>Começamos em z₀ = 0 e aplicamos a fórmula.</>} />
                  <Step n={3} icon={<DotsIcon />} text={<>Se z<sub>n</sub> fica limitado, o ponto pertence ao conjunto.</>} />
                  <Step n={4} icon={<Sparkles className="h-7 w-7" />} text={<>Se z<sub>n</sub> explode, o ponto fica fora do conjunto.</>} />
                </div>
              </section>

              {/* Math concepts */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conceitos Matemáticos</h3>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ConceptCard
                    title="Auto-similaridade"
                    body="O fractal parece igual em qualquer escala de zoom. Mini-Mandelbrots surgem nas bordas!"
                    color="oklch(0.55 0.16 150)"
                  />
                  <ConceptCard
                    title="Dimensão de Hausdorff"
                    body={`A dimensão fractal não é inteira. Para P=${p.toFixed(1)}, a borda tem dim. ≈ ${hausdorffDim}.`}
                    color="oklch(0.55 0.18 255)"
                  />
                  <ConceptCard
                    title="Conjunto de Julia"
                    body="Cada ponto c do Mandelbrot define um Julia único. Pontos dentro geram Julias conectados!"
                    color="oklch(0.5 0.2 300)"
                  />
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
                        className={`w-full rounded-xl border px-4 py-3 text-center transition-colors ${active ? "border-primary/40 bg-accent text-primary" : "border-border bg-card hover:bg-secondary"
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
                  <li><span className="font-semibold text-[oklch(0.5_0.16_150)]">A real:</span> escala as órbitas no eixo real.</li>
                  <li><span className="font-semibold text-[oklch(0.5_0.18_255)]">A imag:</span> rotaciona as órbitas no plano complexo.</li>
                  <li><span className="font-semibold text-[oklch(0.5_0.18_255)]">P (expoente):</span> define a simetria de ordem P do fractal.</li>
                  <li><span className="font-semibold text-[oklch(0.55_0.2_25)]">c (ponto):</span> cada ponto do plano é testado.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-warn/30 bg-warn-soft p-4">
                <div className="flex items-start gap-2 text-xs text-foreground">
                  <Lightbulb className="mt-0.5 h-4 w-4 text-warn" />
                  <p><span className="font-semibold">Dica:</span> clique em "Ver Julia" e depois em qualquer ponto do fractal para gerar o Conjunto de Julia correspondente!</p>
                </div>
              </div>

              {/* Julia point info */}
              {juliaPoint && (
                <div className="rounded-2xl border border-primary/20 bg-accent p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Julia Ativo</div>
                  <div className="mt-1 font-mono text-xs text-foreground">
                    c = {juliaPoint.x.toFixed(5)}<br />
                    {juliaPoint.y >= 0 ? "+" : ""}{juliaPoint.y.toFixed(5)}i
                  </div>
                  <button
                    onClick={() => setJuliaPoint(null)}
                    className="mt-2 text-[11px] text-muted-foreground hover:text-foreground underline"
                  >
                    Remover Julia
                  </button>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      {/* Tour */}
      <GuidedTour open={tourOpen} onClose={() => setTourOpen(false)} />

      {/* History modal */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setHistoryOpen(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Histórico de Explorações</h2>
              <button onClick={() => setHistoryOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma exploração salva ainda.</p>
            ) : (
              <div className="space-y-2">
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => restoreHistory(entry)}
                    className="w-full rounded-xl border border-border bg-secondary/30 px-4 py-3 text-left hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-foreground capitalize">{entry.preset} • P={entry.p} • {entry.palette}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString("pt-BR")}</div>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      iter={entry.iterations} • cx={entry.view.cx.toFixed(3)}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <RotateCcw className="h-3 w-3" /> Restaurar exploração
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {saveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={(e) => e.target === e.currentTarget && setSaveOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Qual imagem deseja baixar?</h2>
              <button onClick={() => setSaveOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">O conjunto de Julia está aberto. Escolha uma opção:</p>
            <div className="mt-4 grid gap-2">
              <button onClick={() => { downloadCanvas(canvasRef.current, "mandelbrot"); setSaveOpen(false); }} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Mandelbrot</button>
              <button onClick={() => { downloadCanvas(juliaCanvasRef.current, "julia"); setSaveOpen(false); }} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Julia</button>
              <button onClick={() => { downloadCanvas(canvasRef.current, "mandelbrot"); downloadCanvas(juliaCanvasRef.current, "julia"); setSaveOpen(false); }} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Baixar os dois</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components

function SliderField({
  label, value, min, max, step, display, onChange, color,
}: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void; color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="font-mono text-sm font-semibold" style={{ color }}>{display}</div>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full"
        style={{ accentColor: color }}
      />
    </div>
  );
}

function ParamField({ label, value, tone, tooltip }: { label: string; value: string; tone: "cantor" | "koch" | "destructive"; tooltip?: string }) {
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
    <div className="text-center" title={tooltip}>
      <div className={`text-[11px] font-semibold ${labelTone} ${tooltip ? "cursor-help" : ""}`}>
        {label}{tooltip ? <span className="ml-0.5 text-muted-foreground/70">ⓘ</span> : null}
      </div>
      <div className={`mt-1 rounded-lg border ${toneClass} px-3 py-2 font-mono text-sm font-medium text-foreground`}>{value}</div>
    </div>
  );
}

function ConceptCard({ title, body, color }: { title: string; body: string; color: string }) {
  return (
    <div className="rounded-xl border border-border p-4" style={{ background: `${color}08` }}>
      <div className="text-xs font-semibold" style={{ color }}>{title}</div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
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
