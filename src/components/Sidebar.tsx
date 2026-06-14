import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Triangle, Menu, X } from "lucide-react";

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = [
    {
      to: "/",
      label: "Plano Complexo",
      sub: "(Mandelbrot)",
      icon: Compass,
      active: pathname === "/",
    },
    {
      to: "/geometria",
      label: "Geometria Básica",
      sub: "(Cantor, Koch, Sierpinski)",
      icon: Triangle,
      active: pathname.startsWith("/geometria"),
    },
  ];

  return (
    <div className="flex h-full flex-col justify-between px-5 py-6">
      <div>
        <Link to="/" className="flex items-center gap-3 px-2 pb-8" onClick={onClose}>
          <svg viewBox="0 0 40 40" className="h-9 w-9 text-primary" fill="currentColor" aria-hidden>
            <polygon points="20,4 36,32 4,32" opacity="0.18" />
            <polygon points="20,12 30,30 10,30" opacity="0.35" />
            <polygon points="20,18 26,29 14,29" opacity="0.6" />
            <polygon points="20,23 23,29 17,29" />
          </svg>
          <div className="leading-tight">
            <div className="text-[17px] font-semibold tracking-tight text-foreground">
              Fractal<span className="text-primary" title="ℂ — conjunto dos números complexos">ℂ</span>Lab
            </div>
            <div className="text-xs text-muted-foreground">Laboratório Experimental</div>
          </div>
        </Link>

        <nav className="flex flex-col gap-2">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={onClose}
                className={`flex items-start gap-3 rounded-xl px-3 py-3 transition-colors ${
                  it.active
                    ? "bg-accent border border-primary/20 text-primary"
                    : "hover:bg-secondary text-foreground"
                }`}
              >
                <Icon className={`mt-0.5 h-5 w-5 ${it.active ? "text-primary" : "text-muted-foreground"}`} />
                <div className="leading-tight">
                  <div className="text-sm font-semibold">{it.label}</div>
                  <div className={`text-xs ${it.active ? "text-primary/70" : "text-muted-foreground"}`}>
                    {it.sub}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-2xl border border-border bg-secondary/60 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-xs">i</span>
          Sobre o FractalCLab
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Projeto educacional para explorar a beleza da matemática através dos fractais.
        </p>
      </div>
    </div>
  );
}

export function Sidebar({ collapseUntilLarge = false }: { collapseUntilLarge?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopClass = collapseUntilLarge ? "hidden lg:flex" : "hidden md:flex";
  const mobileClass = collapseUntilLarge ? "lg:hidden" : "md:hidden";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`${desktopClass} w-[280px] shrink-0 flex-col border-r border-border bg-card`}>
        <SidebarContent />
      </aside>

      {/* Mobile hamburger button */}
      <button
        className={`${mobileClass} fixed top-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-md text-foreground`}
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className={`${mobileClass} fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm`}
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className={`${mobileClass} fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-card border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-200`}>
            <button
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
