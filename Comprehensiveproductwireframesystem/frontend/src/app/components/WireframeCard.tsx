import { ReactNode } from 'react';

interface WireframeCardProps {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function WireframeCard({ title, children, actions, className = '' }: WireframeCardProps) {
  return (
    <div
      className={`group rounded-xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neutral-300/90 hover:shadow-[0_10px_22px_-8px_rgba(16,24,40,0.12),0_18px_36px_-14px_rgba(16,24,40,0.10)] ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 bg-gradient-to-b from-neutral-50/80 to-white px-5 py-3.5 rounded-t-xl">
          <h3 className="text-[0.95rem] font-semibold tracking-tight text-neutral-900">{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
