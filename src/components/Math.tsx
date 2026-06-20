import { useMemo } from "react";
import katex from "katex";

type Props = { tex: string; display?: boolean; className?: string };

/** Renderiza LaTeX com KaTeX. Use `display` para fórmulas em bloco. */
export function Math({ tex, display = false, className }: Props) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        output: "html",
      }),
    [tex, display],
  );
  return (
    <span
      className={className}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
