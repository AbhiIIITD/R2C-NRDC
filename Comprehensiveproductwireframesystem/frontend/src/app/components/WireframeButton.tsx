interface WireframeButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}

export function WireframeButton({
  label,
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
}: WireframeButtonProps) {
  const variantClasses = {
    primary:
      'bg-neutral-900 text-white border-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.18),0_1px_3px_rgba(16,24,40,0.10)] hover:bg-neutral-800 hover:shadow-[0_6px_16px_-4px_rgba(16,24,40,0.30)] active:bg-black active:text-white',
    secondary:
      'bg-white text-neutral-900 border-neutral-200 shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:bg-neutral-50 hover:border-neutral-300 hover:shadow-[0_4px_12px_-4px_rgba(16,24,40,0.12)] active:bg-neutral-100 active:text-neutral-950',
    ghost:
      'bg-transparent text-neutral-600 border-transparent hover:bg-neutral-100 hover:text-neutral-950 active:bg-neutral-200',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center border font-medium rounded-lg select-none focus-visible:outline-none ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed bg-neutral-100 text-neutral-400 border-neutral-200 shadow-none' : 'transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'} ${className}`}
    >
      {label}
    </button>
  );
}
