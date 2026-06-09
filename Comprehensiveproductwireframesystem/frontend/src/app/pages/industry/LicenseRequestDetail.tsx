import { useNavigate, useParams } from 'react-router';
import { useAppData } from '@/contexts/AppDataContext';
import { useState } from 'react';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { StatusBadge } from '../../components/StatusBadge';
import { LicenseLifecycleStepper } from '../../components/LicenseLifecycleStepper';
import {
  buildLicenseTransition,
  getLicenseBadgeStatus,
  getLicenseStageSummary,
  LICENSE_STATUS_LABELS,
  normalizeLicenseStatus,
} from '@/app/config/licenseStatus';
import { toast } from 'sonner';
import { api } from '@/services/api';

export function LicenseRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { licenseRequests, studies, updateLicenseRequest, addNotification } = useAppData();
  const [showAgreement, setShowAgreement] = useState(false);
  const request = licenseRequests.find((item) => item.id === id) || licenseRequests[0];
  const study = request ? studies.find((item) => item.id === request.studyId) : undefined;

  if (!request) {
    return (
      <WireframeCard title="License Request Not Found">
        <WireframeButton label="Back to Licensing" variant="primary" onClick={() => navigate('/industry/licensing')} />
      </WireframeCard>
    );
  }

  const status = normalizeLicenseStatus(request.status);
  const summary = getLicenseStageSummary(status);

  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadAgreement = async () => {
    if (!request.agreementTerms) return;
    try {
      const blob = await api.download(`/licenses/${request.id}/agreement/download`);
      saveBlob(blob, `${request.id}-tripartite-license-agreement.txt`);
    } catch {
      saveBlob(new Blob([request.agreementTerms], { type: 'text/plain;charset=utf-8' }), `${request.id}-tripartite-license-agreement.txt`);
    }
  };

  const uploadSignedAgreement = async (file?: File) => {
    if (!file || status !== 'agreement_generated') return;
    const formData = new FormData();
    formData.append('file', file);
    await api.upload(`/licenses/${request.id}/signed-agreement`, formData);
    const signedAgreementContent =
      file.type.startsWith('text') || file.name.endsWith('.txt')
        ? await file.text()
        : `SIGNED AGREEMENT UPLOAD\n\nFile Name: ${file.name}\nFile Type: ${file.type || 'Unknown'}\nFile Size: ${file.size.toLocaleString()} bytes\nUploaded At: ${new Date().toLocaleString()}\n\nMock file preview: Binary document content is represented as upload metadata in this frontend-only POC. Admin must verify this signed agreement before execution.`;
    const nextRequest = {
      ...buildLicenseTransition({ ...request, status }, 'signed_submitted'),
      signedAgreementFileName: file.name,
      signedAgreementContent,
    };
    updateLicenseRequest(nextRequest);
    addNotification({
      id: `notif_${Date.now()}_signed_upload`,
      userId: 'admin1',
      type: 'signed_agreement_uploaded',
      title: 'Signed Agreement Uploaded',
      message: `${request.industryUserId} uploaded signed agreement "${file.name}" for "${study?.title || request.studyId}".`,
      relatedId: request.id,
      relatedType: 'license',
      read: false,
      createdAt: new Date(),
    });
    toast.success('Agreement Uploaded', {
      description: 'Status: Signed Agreement Submitted. Next owner: Admin.',
    });
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl text-neutral-800 mb-2">License Request Details</h1>
          <p className="text-sm text-neutral-600">{study?.title || request.studyId}</p>
        </div>
        <StatusBadge status={getLicenseBadgeStatus(status)} />
      </div>
      <div className="mb-6">
        <LicenseLifecycleStepper status={status} />
      </div>
      <WireframeCard title="Agreement Status">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-neutral-500 mb-1">Requested</div>
            <div className="text-neutral-800">{new Date(request.requestedAt).toLocaleDateString()}</div>
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
            <div className="text-xs text-neutral-500 mb-1">Agreement</div>
            <div className="text-neutral-800">{request.agreementGeneratedAt ? `Generated ${new Date(request.agreementGeneratedAt).toLocaleDateString()}` : 'Not generated'}</div>
          </div>
        </div>
      </WireframeCard>

      <WireframeCard title="Agreement Review" className="mt-6">
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-neutral-500 mb-1">Status</div>
              <div className="text-neutral-800">{LICENSE_STATUS_LABELS[status]}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Signed File</div>
              <div className="text-neutral-800">{request.signedAgreementFileName || 'Not uploaded'}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Commercialization</div>
              <div className="text-neutral-800">{request.commercializedAt ? new Date(request.commercializedAt).toLocaleDateString() : 'Pending'}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <WireframeButton label="View Agreement" variant="secondary" size="sm" disabled={!request.agreementTerms} onClick={() => setShowAgreement((value) => !value)} />
            <WireframeButton label="Download Agreement" variant="secondary" size="sm" disabled={!request.agreementTerms} onClick={downloadAgreement} />
          </div>

          {showAgreement && request.agreementTerms && (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-2 border-neutral-300 bg-neutral-50 p-4 text-xs text-neutral-700">
              {request.agreementTerms}
            </pre>
          )}

          {status === 'agreement_generated' && (
            <div className="border-2 border-neutral-300 bg-neutral-50 p-4">
              <div className="text-sm text-neutral-800 mb-2">Upload Signed Agreement</div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="block w-full border-2 border-neutral-400 bg-white p-2 text-sm"
                onChange={(event) => uploadSignedAgreement(event.target.files?.[0])}
              />
            </div>
          )}
        </div>
      </WireframeCard>
    </div>
  );
}
