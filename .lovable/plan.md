# Plano: 15 melhorias de UX no FractalCLab

Todas as alterações são pontuais e ficam restritas a 3 arquivos: `src/routes/index.tsx`, `src/routes/geometria.tsx` e `src/components/Sidebar.tsx`. Nenhuma mudança em arquitetura, design system ou renderização dos fractais.

## Plano Complexo (`src/routes/index.tsx`)

1. **Ícones de zoom corretos** — trocar `Plus`/`Minus` por `ZoomIn`/`ZoomOut` do `lucide-react` nos botões de zoom do canvas.
2. **Atalhos de teclado** — adicionar um `useEffect` global que escuta `keydown`:
   - `+` / `=` → zoom in, `-` → zoom out
   - `←↑↓→` → pan no plano complexo (ajusta `view.cx/cy`)
   - `R` → `resetView()`
   - `Esc` → cancela modo "Ver Julia" / fecha painel Julia
   - Ignora eventos quando o foco está em `<input>`/`<textarea>`.
3. **Indicador de zoom** — calcular `zoomLevel = (4/600) / view.scale` e mostrar `Zoom: 12×` numa pequena badge ao lado das coordenadas dentro do `MandelbrotCanvas` (passar via prop para não acoplar). Alternativa: renderizar a badge no overlay da seção que envolve o canvas, sem tocar no componente.
4. **Validação visual dos campos Re/Im do Julia** — estado `juliaError` derivado da validação dos inputs; se inválido, aplicar borda `border-destructive` e `title="Digite um número válido (ex: -0.7)"`. Botão "Abrir" desabilitado quando inválido.
5. **Tooltips em `A (real)`, `A (imag)` e `P`** — usar atributo `title` nativo nos `ParamField` (basta passar prop `tooltip` para o componente).
6. **Marcações no slider de iterações** — adicionar um `<datalist>` com pontos em 10/50/100 e legendas pequenas embaixo do slider.
7. **Histórico inteligente** — substituir o `setTimeout` que grava a cada mudança por uma função `shouldRecord(prev, next)` que só salva quando:
   - `preset` mudou, ou
   - `Math.abs(prev.iterations - next.iterations) >= 10`, ou
   - razão entre `view.scale` é > 2 ou < 0,5 em relação ao último snapshot, ou
   - `palette` mudou.

## Geometria (`src/routes/geometria.tsx`)

8. **Slider com escala visual** — adicionar abaixo do slider de cada fractal uma linha `0 · · · Atual: N · · · Máx: M` em texto pequeno, mostrando posição relativa.
9. **Botões Anterior / Próxima iteração** — dois botões `−1` e `+1` ao lado do slider, com `disabled` nos extremos.
10. **Contagem ao vivo** — exibir, junto da dimensão, "N segmentos / N triângulos" calculado por fórmula fechada:
    - Cantor: `2^iter`
    - Koch: `4^iter` (segmentos)
    - Sierpinski: `3^iter`
11. **Animação Play** — botão `Play/Pause` por fractal: reutiliza padrão do `index.tsx` com `requestAnimationFrame` avançando 1 nível a cada ~700ms até atingir `max`, depois para (não fica em loop, para evitar travar com altas iterações).

## Sidebar (`src/components/Sidebar.tsx`)

12. **Nome da seção atual no botão hamburguer mobile** — mostrar texto pequeno ao lado do `Menu` icon com o label da rota ativa ("Algébricos" / "Geométricos"). Largura do botão passa a ser `auto` em mobile.

## Geral (ambas as páginas)

13. **Confirmação ao restaurar** — substituir `resetAll()` direto por `if (confirm('Restaurar todos os parâmetros para o padrão?'))`. Mesma coisa no botão equivalente da página de Geometria (adicionar um botão "Restaurar" lá, que hoje não existe).
14. **`aria-label` em todos os botões só-ícone** — header (História, Restaurar, Salvar, Como funciona em mobile), controles de zoom (ZoomIn, ZoomOut, Reset view), fechar Julia, fechar drawer mobile.
15. **Restaurar Julia só se estava visível** — adicionar `juliaVisible: boolean` ao estado persistido; só restaurar `juliaPoint` no mount se `juliaVisible === true`. Ao fechar o painel Julia, marcar `juliaVisible = false`.

## Validação pós-implementação

- Browser preview em 1366×768 (desktop) e 390×844 (mobile) confirmando:
  - atalhos funcionando (testar `+`, `-`, `R`, `Esc`)
  - badge de zoom aparece e atualiza
  - botões `+1/−1` da geometria avançam o fractal
  - confirm ao restaurar
  - sem erros no console