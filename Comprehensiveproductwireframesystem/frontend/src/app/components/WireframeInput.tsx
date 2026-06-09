interface WireframeInputProps {
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'search' | 'number' | 'date';
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function WireframeInput({
  label,
  placeholder = 'Input field',
  type = 'text',
  className = '',
  value,
  onChange,
}: WireframeInputProps) {
  return (
    <div className={`${className}`}>
      {label && <div className="mb-1.5 text-sm font-medium text-neutral-700">{label}</div>}
      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition-all duration-150 placeholder:text-neutral-400 hover:border-neutral-400 focus:border-neutral-800 focus:shadow-[0_0_0_3px_rgba(67,56,202,0.12)]"
      />
    </div>
  );
}
