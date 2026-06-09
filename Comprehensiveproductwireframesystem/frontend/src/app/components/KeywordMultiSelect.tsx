import { KeyboardEvent, useMemo, useState } from 'react';
import { X } from 'lucide-react';

interface KeywordMultiSelectProps {
  label?: string;
  options?: string[];
  value: string[];
  onChange: (keywords: string[]) => void;
  placeholder?: string;
}

export function KeywordMultiSelect({
  label = 'Keywords',
  options = [],
  value,
  onChange,
  placeholder = 'Search or add keyword',
}: KeywordMultiSelectProps) {
  const [query, setQuery] = useState('');

  const suggestions = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) return options.filter((item) => !value.includes(item)).slice(0, 6);
    return options
      .filter((item) => item.toLowerCase().includes(lower) && !value.includes(item))
      .slice(0, 6);
  }, [options, query, value]);

  const addKeyword = (keyword: string) => {
    const clean = keyword.trim();
    if (!clean || value.some((item) => item.toLowerCase() === clean.toLowerCase())) return;
    onChange([...value, clean]);
    setQuery('');
  };

  const removeKeyword = (keyword: string) => {
    onChange(value.filter((item) => item !== keyword));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ','].includes(event.key)) {
      event.preventDefault();
      addKeyword(query);
    }
    if (event.key === 'Backspace' && !query && value.length > 0) {
      removeKeyword(value[value.length - 1]);
    }
  };

  return (
    <div>
      <div className="text-sm mb-1 text-neutral-700">{label}</div>
      <div className="border-2 border-neutral-400 bg-white p-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((keyword) => (
            <span key={keyword} className="inline-flex items-center gap-1 border-2 border-neutral-300 bg-neutral-100 px-2 py-1 text-xs text-neutral-800">
              {keyword}
              <button type="button" onClick={() => removeKeyword(keyword)} className="text-neutral-500 hover:text-neutral-900">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full outline-none text-sm text-neutral-800"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((keyword) => (
            <button
              key={keyword}
              type="button"
              onClick={() => addKeyword(keyword)}
              className="border-2 border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
            >
              {keyword}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
