import { useNavigate, useParams } from 'react-router';
import { useAppData } from '@/contexts/AppDataContext';
import { MOCK_USERS } from '@/lib/mockData';
import { LicenseStatus } from '@/types/index';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { StatusBadge } from '../../components/StatusBadge';
import { LicenseLifecycleStepper } from '../../components/LicenseLifecycleStepper';
import { AdminLicenseActionBar } from '../../components/AdminLicenseActionBar';
import {
  buildLicenseTransition,
  buildMockAgreement,
  getLicenseBadgeStatus,
  getLicenseStageSummary,
  LICENSE_STATUS_LABELS,
  normalizeLicenseStatus,
} from '@/app/config/licenseStatus';
import { toast } from 'sonner';

export function AdminLicenseDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { licenseRequests, studies, updateLicenseRequest, addNotification } = useAppData();
  const request = licenseRequests.find((item) => item.id === id) || licenseRequests[0];
  const study = request ? studies.find((item) => item.id === request.studyId) : undefined;
  const industry = request ? MOCK_USERS[request.industryUserId] : undefined;
  const isListedCompany = industry?.isListedCompany !== false;

  if (!request) {
    return (
      <WireframeCard title="License Request Not Found">
        <WireframeButton label="Back to Licensing" variant="primary" onClick={() => navigate('/admin/licensing')} />
      </WireframeCard>
    );
  }

  const status = normalizeLicenseStatus(request.status);
  const summary = getLicenseStageSummary(status);

  const transitionLicense = (item: typeof request, nextStatus: LicenseStatus) => {
    let nextRequest = buildLicenseTransition({ ...item, status }, nextStatus);
    const nextLabel = LICENSE_STATUS_LABELS[nextStatus];

    if (nextStatus === 'agreement_generated') {
      nextRequest = {
        ...nextRequest,
        agreementTerms: buildMockAgreement(nextRequest, study, industry),
      };
    }

    updateLicenseRequest(nextRequest);

    if (nextStatus === 'admin_approved' || nextStatus === 'researcher_approval') {
      addNotification({
        id: `notif_${Date.now()}_researcher_license`,
        userId: study?.researcherId || 'researcher1',
        type: 'license_approved',
        title: 'Licensing Approval Required',
        message: `NRDC approved the license request for "${study?.title || item.studyId}". Researcher licensing review is required.`,
        relatedId: item.id,
        relatedType: 'license',
        read: false,
        createdAt: new Date(),
      });
      toast.success('License Request Approved', {
        description: 'Status: Admin Approved. Next owner: Researcher.',
      });
    }

    if (nextStatus === 'agreement_generated') {
      addNotification({
        id: `notif_${Date.now()}_agreement`,
        userId: item.industryUserId,
        type: 'agreement_generated',
        title: 'Agreement Generated',
        message: `NRDC generated the tripartite agreement for "${study?.title || item.studyId}". Please review, download, sign, and upload it.`,
        relatedId: item.id,
        relatedType: 'license',
        read: false,
        createdAt: new Date(),
      });
      toast.success('Agreement Generated', {
        description: 'Status: Agreement Pending Signature. Next owner: Industry.',
      });
    }

    if (nextStatus === 'commercialized') {
      addNotification({
        id: `notif_${Date.now()}_commercialized`,
        userId: item.industryUserId,
        type: 'commercialization_completed',
        title: 'Commercialization Completed',
        message: `NRDC marked "${study?.title || item.studyId}" as commercialized. Licensing process completed.`,
        relatedId: item.id,
        relatedType: 'license',
        read: false,
        createdAt: new Date(),
      });
      toast.success('Commercialization Completed', {
        description: 'Status: Commercialized. Workflow complete.',
      });
    }

    if (nextStatus !== 'admin_approved' && nextStatus !== 'researcher_approval' && nextStatus !== 'agreement_generated' && nextStatus !== 'commercialized') {
      addNotification({
        id: `notif_${Date.now()}_license_update`,
        userId: item.industryUserId,
        type: 'license_approved',
        title: 'License Updated',
        message: `NRDC moved your license request for "${study?.title || item.studyId}" to ${nextLabel}.`,
        relatedId: item.id,
        relatedType: 'license',
        read: false,
        createdAt: new Date(),
      });
      if (nextStatus === 'agreement_executed') {
        toast.success('Agreement Approved', {
          description: 'Status: Agreement Executed. Next owner: Admin for commercialization.',
        });
      }
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl text-neutral-800 mb-2">License Case Detail</h1>
          <p className="text-sm text-neutral-600">Case {request.id}</p>
        </div>
        <StatusBadge status={getLicenseBadgeStatus(status)} />
      </div>

      {!isListedCompany && (
        <div className="mb-6 border-2 border-neutral-700 bg-neutral-100 p-4 text-sm text-neutral-800">
          Warning: This request is associated with a non-listed company. Additional verification may be required.
        </div>
      )}

      <div className="mb-6">
        <LicenseLifecycleStepper status={status} />
      </div>

      <div className="mb-6">
        <AdminLicenseActionBar
          request={{ ...request, status }}
          onUpdate={updateLicenseRequest}
          onTransition={transitionLicense}
          onViewResearch={() => navigate(`/admin/review/${request.studyId}`)}
        />
      </div>

      <WireframeCard title="Admin Timeline" className="mb-6">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-neutral-500 mb-1">Current Owner</div>
            <div className="text-neutral-800">{summary.currentOwner}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Current Stage</div>
            <div className="text-neutral-800">{summary.currentStage}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Pending Action</div>
            <div className="text-neutral-800">{summary.pendingAction}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Next Step</div>
            <div className="text-neutral-800">{summary.nextStep}</div>
          </div>
        </div>
        {summary.progress && (
          <div className="mt-4 inline-block border-2 border-neutral-300 bg-neutral-50 px-3 py-1 text-xs text-neutral-700">
            {summary.currentStage}: {summary.progress}
          </div>
        )}
      </WireframeCard>

      <div className="grid grid-cols-2 gap-6">
        <WireframeCard title="Case Information">
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs text-neutral-500 mb-1">Research Title</div>
              <div className="text-neutral-800">{study?.title || request.studyId}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Research Summary</div>
              <div className="text-neutral-700">{study?.abstract || 'Research summary unavailable.'}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Problem Statement</div>
              <div className="text-neutral-700">Industry commercialization need mapped to this research request.</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">AI Analysis</div>
              <div className="text-neutral-700">{study?.commercialPotential || 'AI analysis pending.'}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Keywords</div>
              <div className="flex flex-wrap gap-2">
                {(study?.keywords || []).map((keyword) => (
                  <span key={keyword} className="border-2 border-neutral-300 bg-neutral-100 px-2 py-1 text-xs">{keyword}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Metadata</div>
                <div className="text-neutral-800">TRL {study?.trl || 'N/A'} | {study?.domain || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Current Stage</div>
                <div className="text-neutral-800">{LICENSE_STATUS_LABELS[status]}</div>
              </div>
            </div>
          </div>
        </WireframeCard>

        <WireframeCard title="Industry Information">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between gap-3">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Company Profile</div>
                <div className="text-neutral-800">{industry?.organization || request.industryUserId}</div>
              </div>
              <span className="h-fit border-2 border-neutral-400 bg-white px-2 py-1 text-xs">
                {isListedCompany ? 'Listed Company' : 'Non-listed Company'}
              </span>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Verification Status</div>
              <div className="text-neutral-800">{industry?.verificationStatus?.replace(/_/g, ' ') || 'pending'}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Contact Details</div>
              <div className="text-neutral-800">{industry?.name || 'Industry contact'}</div>
              <div className="text-neutral-600">{industry?.email || 'contact@example.com'} | {industry?.phone || '+1-555-0200'}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Previous Requests</div>
              <div className="text-neutral-800">2 prior evaluations, 1 active license discussion</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Request Value</div>
                <div className="text-neutral-800">${(request.licenseFee || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Requested</div>
                <div className="text-neutral-800">{new Date(request.requestedAt).toLocaleDateString()}</div>
              </div>
            </div>
            {status === 'agreement_generated' && (
              <div className="border-2 border-neutral-300 bg-neutral-50 p-3">
                Agreement generated on {new Date(request.agreementGeneratedAt || request.updatedAt).toLocaleString()}
              </div>
            )}
            {request.agreementTerms && (
              <div>
                <div className="text-xs text-neutral-500 mb-1">Agreement Preview</div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap border-2 border-neutral-300 bg-neutral-50 p-3 text-xs text-neutral-700">
                  {request.agreementTerms}
                </pre>
              </div>
            )}
            {status === 'commercialized' && (
              <div className="border-2 border-neutral-300 bg-neutral-50 p-3">
                Commercialization summary: partner marked this technology as moved into commercial deployment.
              </div>
            )}
          </div>
        </WireframeCard>
      </div>
    </div>
  );
}
