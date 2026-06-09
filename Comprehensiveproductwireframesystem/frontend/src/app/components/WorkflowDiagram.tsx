import { ArrowDown } from 'lucide-react';

interface WorkflowStep {
  label: string;
  status?: 'active' | 'completed' | 'pending';
}

interface WorkflowDiagramProps {
  steps: WorkflowStep[];
  className?: string;
}

export function WorkflowDiagram({ steps, className = '' }: WorkflowDiagramProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {steps.map((step, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <div
            className={`border-2 px-6 py-3 text-center min-w-48 ${
              step.status === 'active'
                ? 'border-neutral-800 bg-neutral-800 text-white'
                : step.status === 'completed'
                ? 'border-neutral-500 bg-neutral-500 text-white'
                : 'border-neutral-400 bg-neutral-100 text-neutral-700'
            }`}
          >
            {step.label}
          </div>
          {idx < steps.length - 1 && <ArrowDown className="my-1 text-neutral-500" size={20} />}
        </div>
      ))}
    </div>
  );
}
