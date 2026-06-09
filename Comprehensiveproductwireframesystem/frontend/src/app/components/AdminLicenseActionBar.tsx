import { LicenseRequest, LicenseStatus } from '@/types/index';
import {
  buildLicenseTransition,
  canTransitionLicense,
  normalizeLicenseStatus,
} from '@/app/config/licenseStatus';
import { WireframeButton } from './WireframeButton';

interface AdminLicenseActionBarProps {
  request: LicenseRequest;
  onUpdate: (request: LicenseRequest) => void;
  onTransition?: (request: LicenseRequest, nextStatus: LicenseStatus) => void;
  onViewResearch: () => void;
}

export function AdminLicenseActionBar({
  request,
  onUpdate,
  onTransition,
  onViewResearch,
}: AdminLicenseActionBarProps) {
  const status = normalizeLicenseStatus(request.status);

  const transition = (nextStatus: LicenseStatus) => {
    if (onTransition) {
      onTransition({ ...request, status }, nextStatus);
      return;
    }
    onUpdate(buildLicenseTransition({ ...request, status }, nextStatus));
  };

  return (
    <div className="border-2 border-neutral-400 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        {canTransitionLicense(status, 'admin_approved') && (
          <WireframeButton label="Approve Request" variant="primary" size="sm" onClick={() => transition('admin_approved')} />
        )}
        {canTransitionLicense(status, 'rejected') && (
          <WireframeButton label="Reject Request" variant="ghost" size="sm" onClick={() => transition('rejected')} />
        )}
        {canTransitionLicense(status, 'agreement_generated') && (
          <WireframeButton label="Generate Agreement" variant="primary" size="sm" onClick={() => transition('agreement_generated')} />
        )}
        {canTransitionLicense(status, 'agreement_executed') && (
          <WireframeButton label="Approve Signed Agreement" variant="primary" size="sm" onClick={() => transition('agreement_executed')} />
        )}
        {canTransitionLicense(status, 'commercialized') && (
          <WireframeButton label="Commercialize Technology" variant="primary" size="sm" onClick={() => transition('commercialized')} />
        )}
        <WireframeButton label="View Research Details" variant="ghost" size="sm" onClick={onViewResearch} />
      </div>
    </div>
  );
}
