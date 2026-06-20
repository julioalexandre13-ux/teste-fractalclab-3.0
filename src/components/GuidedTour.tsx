import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

export interface TourStep {
  title: string;
  description: string;
  emoji: string;
  tip?: string;
}


const TOUR_STEPS: TourStep[] = [
  {
    emoji: "👋",
    title: "Bem-vindo ao FractalCLab!",
    description:
      "Este é um laboratório interativo para explorar fractais matemáticos. Você vai aprender sobre o Conjunto de Mandelbrot e fractais geométricos clássicos.",
    tip: "Este tour vai te guiar pelos principais recursos do app.",
  },
  {
    emoji: "🎨",
    title: "O Canvas do Fractal",
    description:
      "O fractal que você vê é o famoso Conjunto de Mandelbrot. Cada ponto colorido representa quantas iterações a sequência z → z² + c levou para 'escapar'.",
    tip: "Use o scroll do mouse ou pinça para dar zoom e explorar detalhes infinitos!",
  },
  {
    emoji: "🖱️",
    title: "Navegação Interativa",
    description:
      "Você pode arrastar o fractal para explorar diferentes regiões. O zoom é centrado exatamente onde você está com o cursor.",
    tip: "Em dispositivos touch, use dois dedos para dar zoom (gesto de pinça).",
  },
  {
    emoji: "⚙️",
    title: "Parâmetros da Fórmula",
    description:
      "A fórmula zₙ₊₁ = A · zₙᴾ + c tem três parâmetros: A (constante complexa), P (expoente) e c (o ponto do plano). Altere-os e veja o fractal mudar em tempo real!",
    tip: "O expoente P controla a simetria: P=2 gera simetria de ordem 2, P=3 gera ordem 3, etc.",
  },
  {
    emoji: "🔮",
    title: "Conjunto de Julia",
    description:
      "Clique em qualquer ponto do Mandelbrot para ver o Conjunto de Julia correspondente! Cada ponto do Mandelbrot gera um Julia diferente — essa é a conexão matemática mais fascinante entre eles.",
    tip: "Pontos dentro do Mandelbrot geram Julias conectados; pontos fora geram Julias fragmentados (poeira de Cantor).",
  },
  {
    emoji: "🎨",
    title: "Paletas de Cor",
    description:
      "Escolha entre 5 paletas diferentes: Padrão (azul-dourado), Fogo, Oceano, Escala de Cinza e Arco-íris. Cada uma revela aspectos diferentes da estrutura do fractal.",
    tip: "A paleta Arco-Íris é ótima para visualizar as 'bandas' de escape com mais contraste.",
  },
  {
    emoji: "📸",
    title: "Exporte suas Descobertas",
    description:
      "Encontrou um padrão bonito? Clique em 'Salvar Imagem' para baixar o fractal como PNG. O histórico de parâmetros também guarda suas últimas explorações!",
    tip: "O histórico salva automaticamente os últimos 5 conjuntos de parâmetros que você usou.",
  },
  {
    emoji: "📐",
    title: "Fractais Geométricos",
    description:
      "Na aba 'Fractais Geométricos' você encontra os fractais clássicos: Conjunto de Cantor, Curva de Koch e Triângulo de Sierpinski — cada um com sua dimensão fractal exibida!",
    tip: "A dimensão fractal (Hausdorff) é um número não-inteiro que mede a 'complexidade' de um fractal.",
  },
  {
    emoji: "🚀",
    title: "Pronto para Explorar!",
    description:
      "Você conhece todos os recursos do FractalCLab. Explore, experimente e descubra a beleza infinita da matemática fractal!",
    tip: "Dica final: tente dar zoom em uma borda do Mandelbrot e observe os mini-Mandelbrots que aparecem — isso é auto-similaridade!",
  },
];

interface GuidedTourProps {
  open: boolean;
  onClose: () => void;
  steps?: TourStep[];
  label?: string;
}

export function GuidedTour({ open, onClose, steps, label = "Tour Guiado" }: GuidedTourProps) {
  const tourSteps = steps && steps.length > 0 ? steps : TOUR_STEPS;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && step < tourSteps.length - 1) setStep((s) => s + 1);
      if (e.key === "ArrowLeft" && step > 0) setStep((s) => s - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, step, onClose, tourSteps.length]);

  if (!open) return null;

  const current = tourSteps[step];
  const isLast = step === tourSteps.length - 1;
  const progress = ((step + 1) / tourSteps.length) * 100;


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl"
        style={{ border: "1px solid var(--color-border)" }}
      >
        {/* Progress bar */}
        <div className="h-1 w-full bg-secondary">
          <div
            className="h-1 bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Tour Guiado — {step + 1} / {TOUR_STEPS.length}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-2 pt-4">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-4xl">
            {current.emoji}
          </div>
          <h2 className="text-lg font-semibold text-foreground">{current.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {current.description}
          </p>
          {current.tip && (
            <div className="mt-4 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3">
              <p className="text-xs leading-relaxed text-foreground">
                <span className="font-semibold text-warn">💡 Dica: </span>
                {current.tip}
              </p>
            </div>
          )}
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 py-4">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground"
                }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground disabled:pointer-events-none disabled:opacity-40 hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <button
            onClick={isLast ? onClose : () => setStep((s) => s + 1)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {isLast ? "Começar a Explorar! 🚀" : <>Próximo <ChevronRight className="h-4 w-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
