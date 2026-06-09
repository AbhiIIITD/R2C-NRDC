import { ReactNode } from 'react';
import { ArrowDown, CornerDownRight } from 'lucide-react';

interface WorkflowStep {
  label: string;
  status?: 'active' | 'completed' | 'pending' | 'skipped';
  optional?: boolean;
}

interface FlexibleWorkflowProps {
  steps: WorkflowStep[];
  workflowType?: 'full' | 'simplified';
  className?: string;
}

export function FlexibleWorkflow({ steps, workflowType = 'full', className = '' }: FlexibleWorkflowProps) {
  return (
    <div className={`${className}`}>
      {/* Workflow Type Indicator */}
      {workflowType && (
        <div className="mb-4 p-2 border-2 border-neutral-400 bg-neutral-100 text-center">
          <div className="text-xs text-neutral-600">Workflow Type</div>
          <div className="text-sm text-neutral-800">
            {workflowType === 'full' ? 'Full Review Process' : 'Simplified Process'}
          </div>
        </div>
      )}

      {/* Workflow Steps */}
      <div className="flex flex-col items-center gap-2">
        {steps.map((step, idx) => (
          <div key={idx} className="flex flex-col items-center w-full">
            {/* Step Box */}
            <div
              className={`border-2 px-6 py-3 text-center w-full ${
                step.status === 'skipped'
                  ? 'border-neutral-300 bg-neutral-100 text-neutral-400 border-dashed opacity-50'
                  : step.status === 'active'
                  ? 'border-neutral-800 bg-neutral-800 text-white'
                  : step.status === 'completed'
                  ? 'border-neutral-500 bg-neutral-500 text-white'
                  : 'border-neutral-400 bg-neutral-100 text-neutral-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {step.status === 'skipped' && (
                  <CornerDownRight size={14} className="text-neutral-400" />
                )}
                <span className="text-sm">{step.label}</span>
                {step.optional && (
                  <span className="text-xs opacity-75">(optional)</span>
                )}
              </div>
            </div>

            {/* Arrow */}
            {idx < steps.length - 1 && (
              <div className="my-1">
                {step.status === 'skipped' ? (
                  <div className="text-neutral-400 text-xs">↓ skipped</div>
                ) : (
                  <ArrowDown className="text-neutral-500" size={20} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
