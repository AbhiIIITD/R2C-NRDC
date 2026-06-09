interface WireframeTableProps {
  headers: string[];
  rows: (string | JSX.Element)[][];
  className?: string;
}

export function WireframeTable({ headers, rows, className = '' }: WireframeTableProps) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-neutral-50/95 backdrop-blur-sm">
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="border-b border-neutral-200 px-5 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-neutral-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-neutral-100 bg-white transition-colors duration-150 last:border-0 hover:bg-neutral-50/70"
            >
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-5 py-3.5 text-sm text-neutral-700 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
