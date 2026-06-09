import { useAppData } from '@/contexts/AppDataContext';
import { useNavigate } from 'react-router';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeInput } from '../../components/WireframeInput';
import { WireframeTable } from '../../components/WireframeTable';
import { WireframeCard } from '../../components/WireframeCard';
import { StatusBadge } from '../../components/StatusBadge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  buildLicenseTransition,
  buildMockAgreement,
  canTransitionLicense,
  getLicenseBadgeStatus,
  getLicenseStageSummary,
  LICENSE_STATUS_LABELS,
  normalizeLicenseStatus,
} from '@/app/config/licenseStatus';
import { MOCK_USERS } from '@/lib/mockData';
import { api } from '@/services/api';

export function LicensingManagement() {
  const navigate = useNavigate();
  const { licenseRequests, studies, updateLicenseRequest, addNotification } = useAppData();
  const [signedAgreementReviewId, setSignedAgreementReviewId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workflowFilter, setWorkflowFilter] = useState('all');
  const signedAgreementReview = licenseRequests.find((request) => request.id === signedAgreementReviewId);
  const filteredLicenseRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return licenseRequests.filter((request) => {
      const study = studies.find((item) => item.id === request.studyId);
      const status = normalizeLicenseStatus(request.status);
      const workflow = (request.licenseFee || 0) > 300000 ? 'full' : 'simplified';
      const matchesSearch =
        !query ||
        request.id.toLowerCase().includes(query) ||
        request.industryUserId.toLowerCase().includes(query) ||
        study?.title.toLowerCase().includes(query) ||
        study?.researcherName.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesWorkflow = workflowFilter === 'all' || workflow === workflowFilter;
      return matchesSearch && matchesStatus && matchesWorkflow;
    });
  }, [licenseRequests, studies, searchTerm, statusFilter, workflowFilter]);

  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadSignedAgreement = async (id: string) => {
    const request = licenseRequests.find((item) => item.id === id);
    if (!request?.signedAgreementContent) return;
    try {
      const blob = await api.download(`/licenses/${request.id}/signed-agreement/download`);
      saveBlob(blob, request.signedAgreementFileName || `${request.id}-signed-agreement.txt`);
    } catch {
      saveBlob(new Blob([request.signedAgreementContent], { type: 'text/plain;charset=utf-8' }), request.signedAgreementFileName || `${request.id}-signed-agreement.txt`);
    }
  };

  const moveLicense = (id: string) => {
    const request = licenseRequests.find((item) => item.id === id);
    if (!request) return;
    const study = studies.find((item) => item.id === request.studyId);
    const status = normalizeLicenseStatus(request.status);
    const next =
      status === 'pending'
        ? 'admin_approved'
        : status === 'admin_approved'
          ? 'researcher_approval'
          : status === 'researcher_approval'
            ? undefined
            : status === 'researcher_approved'
              ? 'agreement_generated'
              : status === 'agreement_generated'
                ? undefined
                : status === 'signed_submitted'
                  ? 'agreement_executed'
                  : status === 'agreement_executed'
                  ? 'commercialized'
                  : undefined;
    if (!next || !canTransitionLicense(status, next)) return;
    let nextRequest = buildLicenseTransition({ ...request, status }, next);
    if (next === 'agreement_generated') {
      nextRequest = {
        ...nextRequest,
        agreementTerms: buildMockAgreement(nextRequest, study, MOCK_USERS[request.industryUserId]),
      };
    }
    updateLicenseRequest(nextRequest);

    if (next === 'admin_approved') {
      addNotification({
        id: `notif_${Date.now()}_researcher_license`,
        userId: study?.researcherId || 'researcher1',
        type: 'license_approved',
        title: 'Licensing Approval Required',
        message: `NRDC approved the license request for "${study?.title || 'the selected technology'}". Please review it in License Requests.`,
        relatedId: request.id,
        relatedType: 'license',
        read: false,
        createdAt: new Date(),
      });
      toast.success('License Request Approved', {
        description: 'Status: Admin Approved. Next owner: Researcher.',
      });
      return;
    }

    addNotification({
      id: `notif_${Date.now()}`,
      userId: request.industryUserId,
      type: 'license_approved',
      title: 'License Updated',
      message: `NRDC moved your license request for "${study?.title || 'the selected technology'}" to ${LICENSE_STATUS_LABELS[next]}.`,
      relatedId: request.id,
      relatedType: 'license',
      read: false,
      createdAt: new Date(),
    });
    if (next === 'agreement_generated') {
      toast.success('Agreement Generated', {
        description: 'Status: Agreement Pending Signature. Next owner: Industry.',
      });
    } else if (next === 'agreement_executed') {
      toast.success('Agreement Approved', {
        description: 'Status: Agreement Executed. Next owner: Admin for commercialization.',
      });
    } else if (next === 'commercialized') {
      toast.success('Commercialization Completed', {
        description: 'Status: Commercialized. Workflow complete.',
      });
    }
  };

  const pending = licenseRequests.filter((request) => ['pending', 'admin_approved', 'researcher_approval', 'researcher_approved', 'signed_submitted'].includes(normalizeLicenseStatus(request.status)));
  const active = licenseRequests.filter((request) => ['agreement_generated', 'agreement_executed', 'commercialized'].includes(normalizeLicenseStatus(request.status)));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">Licensing Management</h1>
        <p className="text-sm text-neutral-600">Oversee all technology licensing agreements</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{pending.length}</div>
          <div className="text-sm text-neutral-600">Pending Review</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{active.length}</div>
          <div className="text-sm text-neutral-600">Active Licenses</div>
        </WireframeCard>
        <WireframeCard>
            <div className="text-2xl text-neutral-800 mb-1">{licenseRequests.filter((r) => ['signed_submitted', 'agreement_executed', 'commercialized'].includes(normalizeLicenseStatus(r.status))).length}</div>
          <div className="text-sm text-neutral-600">Signed/Executed</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">
            ${Math.round(licenseRequests.reduce((sum, request) => sum + (request.licenseFee || 0), 0) / 1000)}K
          </div>
          <div className="text-sm text-neutral-600">Pipeline Value</div>
        </WireframeCard>
      </div>

      <div className="mb-6 border-2 border-neutral-400 bg-white p-4">
        <div className="flex gap-4 items-end mb-4">
          <div className="flex-1">
            <WireframeInput placeholder="Search licenses..." type="search" value={searchTerm} onChange={setSearchTerm} />
          </div>
          <div className="w-48">
            <div className="text-sm mb-1 text-neutral-700">Status</div>
            <select className="w-full border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-600" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Statuses</option>
              {Object.entries(LICENSE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="w-48">
            <div className="text-sm mb-1 text-neutral-700">Workflow</div>
            <select className="w-full border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-600" value={workflowFilter} onChange={(event) => setWorkflowFilter(event.target.value)}>
              <option value="all">All Workflows</option>
              <option value="simplified">Simplified</option>
              <option value="full">Full Review</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 p-3 bg-neutral-50 border-2 border-neutral-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-neutral-600" />
            <div>
              <div className="text-xs text-neutral-500">Simplified Process</div>
              <div className="text-sm text-neutral-800">{active.length} licenses</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-neutral-600" />
            <div>
              <div className="text-xs text-neutral-500">Full Review Process</div>
              <div className="text-sm text-neutral-800">{pending.length} licenses</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Avg Processing Time</div>
            <div className="text-sm text-neutral-800">Simplified: 3 days | Full: 28 days</div>
          </div>
        </div>
      </div>

      <WireframeTable
        headers={['Technology', 'Licensee', 'Current Owner', 'Current Stage', 'Pending Action', 'Next Step', 'Status', 'Actions']}
        rows={filteredLicenseRequests.map((request) => {
          const study = studies.find((item) => item.id === request.studyId);
          const summary = getLicenseStageSummary(request.status);
          const status = normalizeLicenseStatus(request.status);
          const canAdminContinue = ['pending', 'researcher_approved', 'signed_submitted', 'agreement_executed'].includes(status);
          return [
            study?.title || request.studyId,
            MOCK_USERS[request.industryUserId]?.organization || request.industryUserId,
            summary.currentOwner,
            summary.currentStage,
            summary.pendingAction,
            summary.nextStep,
            <StatusBadge status={getLicenseBadgeStatus(request.status)} />,
            <div className="flex gap-2">
              {canAdminContinue && normalizeLicenseStatus(request.status) !== 'rejected' && (
                <WireframeButton label={summary.pendingAction} variant="primary" size="sm" onClick={() => moveLicense(request.id)} />
              )}
              {status === 'signed_submitted' && (
                <>
                  <WireframeButton label="View Signed Agreement" variant="secondary" size="sm" onClick={() => setSignedAgreementReviewId(request.id)} />
                  <WireframeButton label="Download Signed Agreement" variant="ghost" size="sm" onClick={() => downloadSignedAgreement(request.id)} />
                </>
              )}
              <WireframeButton label="View" variant="ghost" size="sm" onClick={() => navigate(`/admin/licensing/${request.id}`)} />
            </div>,
          ];
        })}
      />

      {signedAgreementReview && (
        <WireframeCard title="Signed Agreement Review" className="mt-6">
          {(() => {
            const study = studies.find((item) => item.id === signedAgreementReview.studyId);
            const industry = MOCK_USERS[signedAgreementReview.industryUserId];

            return (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Technology</div>
                    <div className="text-neutral-800">{study?.title || signedAgreementReview.studyId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Industry Partner</div>
                    <div className="text-neutral-800">{industry?.organization || signedAgreementReview.industryUserId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Uploaded File</div>
                    <div className="text-neutral-800">{signedAgreementReview.signedAgreementFileName || 'Signed agreement file'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Submitted</div>
                    <div className="text-neutral-800">{signedAgreementReview.signedAgreementSubmittedAt ? new Date(signedAgreementReview.signedAgreementSubmittedAt).toLocaleString() : 'Recently'}</div>
                  </div>
                </div>

                <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-2 border-neutral-300 bg-neutral-50 p-4 text-xs text-neutral-700">
                  {signedAgreementReview.signedAgreementContent || 'Signed agreement preview is unavailable. Verify uploaded file metadata before approval.'}
                </pre>

                <div className="flex gap-2">
                  <WireframeButton label="Download Signed Agreement" variant="secondary" size="sm" onClick={() => downloadSignedAgreement(signedAgreementReview.id)} />
                  <WireframeButton label="Approve Signed Agreement" variant="primary" size="sm" onClick={() => moveLicense(signedAgreementReview.id)} />
                  <WireframeButton label="Close Review" variant="ghost" size="sm" onClick={() => setSignedAgreementReviewId(null)} />
                </div>
              </div>
            );
          })()}
        </WireframeCard>
      )}

      <WireframeCard title="Workflow Automation Rules" className="mt-6">
        <div className="space-y-4">
          <div className="p-4 border-2 border-neutral-400 bg-white">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-sm text-neutral-800 mb-1">Auto-Simplified Workflow Criteria</div>
                <div className="text-xs text-neutral-600">Licenses matching standard criteria use simplified process</div>
              </div>
              <WireframeButton label="Edit Rules" variant="ghost" size="sm" onClick={() => navigate('/admin/audit-logs')} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked readOnly className="w-4 h-4 border-2 border-neutral-400" />
                  <span className="text-neutral-700">Non-exclusive license type</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked readOnly className="w-4 h-4 border-2 border-neutral-400" />
                  <span className="text-neutral-700">Value under $50,000</span>
                </label>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked readOnly className="w-4 h-4 border-2 border-neutral-400" />
                  <span className="text-neutral-700">No custom terms requested</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" readOnly className="w-4 h-4 border-2 border-neutral-400" />
                  <span className="text-neutral-700">Prior successful licenses</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </WireframeCard>
    </div>
  );
}
