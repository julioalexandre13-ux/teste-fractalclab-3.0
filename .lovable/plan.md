## Auditoria do FractalCLab

Após ler as três rotas (`index.tsx` 780 linhas, `construcao.tsx` 727 linhas, `geometria.tsx` 615 linhas), `MandelbrotCanvas`, `Sidebar` e `__root.tsx`, encontrei melhorias relevantes em todas as quatro áreas. Abaixo o diagnóstico e o plano sugerido, agrupado por fases — cada fase é independente e pode ser implementada isoladamente.

---

### Diagnóstico resumido

**UX e didática**
- O **Guided Tour** existe só na home (`/`); as abas Construção e Geometria começam sem nenhum onboarding.
- Equações são texto plano (`z_(n+1) = z_n² + c`, `z<sub>n+1</sub>`) — inconsistente e pouco didático. KaTeX renderizaria igual ao livro.
- O **Verificador de Ponto** está isolado no fim de `/construcao` e não conversa com a página principal — o aluno não consegue "mandar" o `c` testado para o Mandelbrot interativo nem abrir o Julia correspondente.
- A página de Construção sorteia pontos aleatórios (Monte Carlo). Falta um **modo "varredura por grade"** que reforça a ideia de "testar todos os pontos do plano".
- Mensagens de "milestone" são fixas por contagem; não há explicação visível da fórmula durante a animação.
- Sem **idioma declarado** (`<html lang="en">` no `__root.tsx`, mas o app inteiro é em pt-BR).

**Visual e responsividade**
- No viewport atual (635 px) o app está em modo "mobile" (sidebar escondida até `md=768`), mas no `index.tsx` o aside da direita (Exemplos Rápidos, Sobre os Parâmetros, Dica) só aparece em `lg≥1024`. Entre 768 e 1023 px o usuário perde uma navegação importante.
- O cabeçalho da home usa `overflow-x-auto` para acomodar 4 botões — funciona, mas não segue o padrão `grid-cols-[minmax(0,1fr)_auto]` recomendado e fica feio em telas estreitas.
- **Cores hardcoded** em vários pontos: `bg-[oklch(0.08_0.02_240)]` (fundo dos canvases), `text-emerald-300`, `text-rose-300`, `bg-[#ff5577]`, `stroke="rgba(120,200,255,0.85)"`. Quebra o design system e impede tema claro/escuro consistente.
- `min-h-screen` em `index.tsx` e no `__root.tsx` 404/erro — deveria ser `min-h-dvh` para evitar o "salto" da barra de URL no iOS.
- Modal de Histórico e modal de Salvar usam JSX inline com `position:fixed` e backdrop manual em vez do `Dialog` do shadcn — ARIA e foco-trap incompletos.
- A página de Construção esconde o cabeçalho atrás do botão hambúrguer no mobile (`pl-14`) — funciona mas é um workaround.

**Qualidade de código**
- Três arquivos de rota com 615–780 linhas, contendo:
  - Lógica de estado, persistência em localStorage, atalhos de teclado, animação, modais, sub-componentes (`SliderField`, `ParamField`, `Step`, `ConceptCard`, `OrbitDisplay`, `Info`, `DotsIcon`).
  - Duplicação de parsing Re/Im (vírgula→ponto) e da lógica de canvas/axes em duas páginas.
- Sub-componentes definidos no fim do arquivo da rota — não reutilizáveis.
- `localStorage` é lido/gravado sem versionamento de schema; uma mudança em `SavedLabState` quebra silenciosamente o estado salvo.
- `useEffect` com `// eslint-disable-next-line react-hooks/exhaustive-deps` em `index.tsx` (histórico) — fácil introduzir bug ao editar.
- `MandelbrotCanvas` usa `worker.onmessage = …` direto (sobrescreve handler anterior); aceitável porque o efeito é re-executado, mas frágil — não trata mensagens fora de ordem para o mesmo render.

**Performance, SEO, acessibilidade**
- `generateMandelbrotPoints(25000)` roda na main thread em `setTimeout(30ms)` — bloqueia ~80–250 ms ao entrar em `/construcao`. Deveria ir para um Web Worker, igual ao Mandelbrot principal.
- `MandelbrotCanvas` re-renderiza ao soltar o mouse a cada drag — OK pelo worker, mas não há cancelamento explícito do worker em paralelo a múltiplos requests (o `requestId` filtra, mas o trabalho desperdiçado continua).
- Cada rota tem `head()` com `title`/`description`, mas o `og:image` está só no root (a regra é definir og:image apenas nas leaf routes). Sem `canonical`, sem JSON-LD educacional.
- Hierarquia de headings: `h1` → `h3` em todas as páginas (pulando `h2`).
- Único `<main>` por página, ok. `<html lang="en">` precisa virar `pt-BR`.
- Botões icon-only no header da home (`History`, `RotateCcw`, `Download`) já têm `aria-label` — bom.
- Inputs de Re/Im usam `<input>` puro com classes manuais em vez do `Input` do shadcn (que tem foco visível padronizado e melhor contraste).

---

### Plano em 4 fases

> Cada fase entrega valor isolado. Sugiro implementar **na ordem 1 → 4**, mas posso pular para qualquer uma a pedido. Estimativa total: ~4 a 6 mensagens de implementação.

---

#### Fase 1 — Limpeza estrutural e design system (base para o resto)

Objetivo: remover dívida que atrapalha qualquer mudança futura.

1. **Extrair sub-componentes** para `src/components/`:
   - `SliderField`, `ParamField`, `ConceptCard`, `Step`, `DotsIcon` → `src/components/fractal/`.
   - `OrbitDisplay`, `Info`, `drawAxes` → `src/components/construcao/`.
   - Modal de Histórico e modal de Salvar → trocar por `Dialog` do shadcn.
2. **Tokenizar cores hardcoded** em `src/styles.css`:
   - `--canvas-bg` (substitui `oklch(0.08 0.02 240)`).
   - `--orbit-line`, `--orbit-point-start`, `--orbit-point-end-in`, `--orbit-point-end-out`.
   - `--marker-cross` (substitui `#ff5577`).
   - Substituir `text-emerald-300`/`text-rose-300` por variantes `success`/`destructive` do design system.
3. **Trocar `min-h-screen` → `min-h-dvh`** em `index.tsx` e nas telas de 404/erro do `__root.tsx`.
4. **Adicionar versionamento ao localStorage** (`fractalclab_lab_state_v2`) com migração silenciosa do v1.
5. **Corrigir `<html lang>`** para `pt-BR` em `__root.tsx`.

#### Fase 2 — Responsividade (faixa 640–1024 px)

1. **Aside da home aparece em `md`** (768) em vez de `lg` (1024) — promover de `lg:grid-cols-[1fr_300px]` para `md:grid-cols-[1fr_280px]`.
2. **Header da home** vira `grid grid-cols-[minmax(0,1fr)_auto] sm:flex` com `min-w-0` no título e `shrink-0` nos botões — remove o `overflow-x-auto`.
3. **Cabeçalhos da Construção e Geometria** ficam com padding-left dinâmico apenas até `md` (não `md:pl-0` global).
4. **Tap targets**: todos os botões icon-only viram `min-h-11 min-w-11` no mobile (estão em h-10 w-10 hoje).
5. Testar a 360, 414, 768, 1024 e 1440 px com `browser--view_preview` ao final.

#### Fase 3 — UX e didática

1. **KaTeX para fórmulas** (`bun add katex react-katex`):
   - Painel "Fórmula Atual", legendas, mensagem de status do verificador.
2. **Guided Tour para Construção e Geometria** — reutilizar o `GuidedTour` existente com passos por página.
3. **Ponte Verificador ↔ Mandelbrot principal**:
   - Botão "Abrir este c no Mandelbrot" no resultado do verificador → navega para `/?c=re,im&julia=1` com a query lendo no `index.tsx` para abrir Julia automaticamente.
4. **Modo grade no Construção**: switch "Aleatório / Varredura" — no modo varredura, percorre uma grade de pontos (esquerda→direita, cima→baixo) reforçando "testamos todos os pontos do plano".
5. **`<html lang="pt-BR">`** e revisão de headings (h1 → h2 → h3) em todas as páginas.

#### Fase 4 — Performance, SEO e acessibilidade

1. **Mover `generateMandelbrotPoints` para um Web Worker** (`src/workers/mandelbrot-points.worker.ts`) — descongela a entrada em `/construcao` e permite usar `transferable` (`postMessage(buffer, [buffer])`).
2. **`MandelbrotCanvas`**: usar `worker.addEventListener` + cleanup; descartar `chunk` cujo `requestId` esteja obsoleto (já faz) e adicionar `worker.postMessage({type:'cancel', requestId})` para realmente parar o trabalho antigo.
3. **`per-route og:image`**: cada rota gera/serve a sua (pode ser screenshot pré-render do Mandelbrot/Cantor). Remover `og:image` do `__root.tsx` (sobrescreve as folhas).
4. **JSON-LD `LearningResource`** em cada rota.
5. **Inputs Re/Im** trocados pelo `Input` do shadcn (foco visível, ARIA invalid já tratado).
6. **Lighthouse pass**: rodar `browser--performance_profile` antes/depois e confirmar LCP e contraste AA.

---

### Observação

Não há nada quebrado no app — esta é uma auditoria de polimento. Se quiser que eu execute apenas uma fase, ou que reordene (ex.: começar pela Fase 3 para o impacto didático), é só dizer.
