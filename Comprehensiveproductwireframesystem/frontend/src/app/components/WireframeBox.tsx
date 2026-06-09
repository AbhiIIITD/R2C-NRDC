import { ReactNode } from 'react';

interface WireframeBoxProps {
  children?: ReactNode;
  className?: string;
  height?: string;
  label?: string;
  dashed?: boolean;
}

export function WireframeBox({ children, className = '', height = 'auto', label, dashed = false }: WireframeBoxProps) {
  const borderStyle = dashed ? 'border-dashed' : 'border-solid';

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${borderStyle} border-neutral-200/80 ${className}`}
      style={{ height }}
    >
      {/* Premium enterprise backdrop: layered gradient + faint engineering grid + glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-neutral-100" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(17,24,39,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.05) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 78%)',
        }}
      />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-neutral-500/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-neutral-900/[0.04] blur-3xl" />

      {children ? (
        <div className="relative h-full w-full">{children}</div>
      ) : (
        label && (
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 px-4 py-6 text-center">
            {/* Abstract layered-panels motif */}
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rotate-6 rounded-lg border border-neutral-300 bg-white/70 shadow-sm" />
              <div className="absolute inset-0 -rotate-3 rounded-lg border border-neutral-300 bg-white shadow-sm" />
              <div className="absolute inset-[18%] rounded-md bg-gradient-to-br from-neutral-800 to-neutral-600" />
            </div>
            <span className="text-xs font-medium tracking-wide text-neutral-500">{label}</span>
          </div>
        )
      )}

      {/* Keep the original corner caption when content is present */}
      {label && children && (
        <div className="absolute left-3 top-3 rounded-md border border-neutral-200 bg-white/85 px-2 py-0.5 text-xs text-neutral-500 backdrop-blur-sm">
          {label}
        </div>
      )}
    </div>
  );
}
