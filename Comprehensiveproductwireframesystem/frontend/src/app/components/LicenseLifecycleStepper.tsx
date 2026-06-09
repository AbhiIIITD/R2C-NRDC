import { LicenseStatus } from '@/types/index';
import {
  LICENSE_STATUS_LABELS,
  LICENSE_STATUS_ORDER,
  normalizeLicenseStatus,
} from '@/app/config/licenseStatus';
import { CheckCircle2 } from 'lucide-react';

interface LicenseLifecycleStepperProps {
  status: LicenseStatus | string;
}

export function LicenseLifecycleStepper({ status }: LicenseLifecycleStepperProps) {
  const normalized = normalizeLicenseStatus(status);
  const currentIndex = LICENSE_STATUS_ORDER.indexOf(normalized);

  return (
    <div className="border-2 border-neutral-300 bg-white p-4">
      <div className="flex items-start">
        {LICENSE_STATUS_ORDER.map((step, index) => {
          const completed = currentIndex > index || normalized === 'commercialized';
          const active = currentIndex === index;
          return (
            <div key={step} className="flex flex-1 items-start">
              <div className="flex flex-col items-center text-center">
                <div
                  className={`w-8 h-8 border-2 flex items-center justify-center ${
                    completed || active
                      ? 'bg-neutral-800 border-neutral-800 text-white'
                      : 'bg-white border-neutral-400 text-neutral-500'
                  }`}
                >
                  {completed ? <CheckCircle2 size={16} /> : <span className="text-xs">{index + 1}</span>}
                </div>
                <div className={`mt-2 text-[11px] leading-tight ${active ? 'text-neutral-900' : 'text-neutral-600'}`}>
                  {LICENSE_STATUS_LABELS[step]}
                </div>
              </div>
              {index < LICENSE_STATUS_ORDER.length - 1 && (
                <div className={`mt-4 h-0.5 flex-1 ${completed ? 'bg-neutral-800' : 'bg-neutral-300'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
