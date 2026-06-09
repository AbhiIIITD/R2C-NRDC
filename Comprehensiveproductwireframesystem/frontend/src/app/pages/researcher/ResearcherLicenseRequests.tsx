import { useNavigate, useParams } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { MOCK_USERS } from '@/lib/mockData';
import { buildLicenseTransition, getLicenseBadgeStatus, getLicenseStageSummary, LICENSE_STATUS_LABELS, normalizeLicenseStatus } from '@/app/config/licenseStatus';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { WireframeTable } from '../../components/WireframeTable';
import { StatusBadge } from '../../components/StatusBadge';
import { toast } from 'sonner';

export function ResearcherLicenseRequests() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { studies, interests, meetings, licenseRequests, updateLicenseRequest, addNotification } = useAppData();

  const researcherStudyIds = studies
    .filter((study) => study.researcherId === user?.id)
    .map((study) => study.id);

  const researcherLicenseRequests = licenseRequests.filter((request) =>
    researcherStudyIds.includes(request.studyId)
  );

  const pendingApprovals = researcherLicenseRequests.filter((request) =>
    ['admin_approved', 'researcher_approval'].includes(normalizeLicenseStatus(request.status))
  );
  const selectedRequest =
    researcherLicenseRequests.find((request) => request.id === id) ||
    pendingApprovals[0] ||
    researcherLicenseRequests[0];

  const reviewLicense = (licenseId: string, approved: boolean) => {
    const request = licenseRequests.find((item) => item.id === licenseId);
    if (!request) return;

    const study = studies.find((item) => item.id === request.studyId);
    const status = normalizeLicenseStatus(request.status);
    const reviewReady =
      status === 'admin_approved'
        ? buildLicenseTransition({ ...request, status }, 'researcher_approval')
        : { ...request, status };

    const nextRequest = approved
      ? buildLicenseTransition(reviewReady, 'researcher_approved')
      : buildLicenseTransition(reviewReady, 'rejected');

    updateLicenseRequest(nextRequest);
    addNotification({
      id: `notif_${Date.now()}_researcher_license_review`,
      userId: 'admin1',
      type: approved ? 'researcher_license_approved' : 'license_approved',
      title: approved ? 'Researcher Approved License' : 'Researcher Rejected License',
      message: `${user?.name || 'Researcher'} ${approved ? 'approved' : 'rejected'} licensing for "${study?.title || request.studyId}".`,
      relatedId: request.id,
      relatedType: 'license',
      read: false,
      createdAt: new Date(),
    });
    toast.success(approved ? 'License Approved' : 'License Rejected', {
      description: approved
        ? 'Status: Agreement Generation. Next owner: Admin.'
        : 'Status: Rejected. Next owner: Admin.',
    });
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl text-neutral-800 mb-2">License Requests</h1>
          <p className="text-sm text-neutral-600">Review industry licensing requests for your technologies</p>
        </div>
        <div className="border-2 border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700">
          Pending Approvals: {pendingApprovals.length}
        </div>
      </div>

      <WireframeCard title="Researcher Licensing Queue">
        {researcherLicenseRequests.length === 0 ? (
          <div className="border-2 border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-600">
            No licensing requests are assigned to your studies yet.
          </div>
        ) : (
          <WireframeTable
            headers={['Technology/Study Title', 'Industry Name', 'Organization', 'Request Date', 'Current Status', 'Actions']}
            rows={researcherLicenseRequests.map((request) => {
              const study = studies.find((item) => item.id === request.studyId);
              const industry = MOCK_USERS[request.industryUserId];
              const status = normalizeLicenseStatus(request.status);
              const canReview = ['admin_approved', 'researcher_approval'].includes(status);

              return [
                study?.title || request.studyId,
                industry?.name || request.industryUserId,
                industry?.organization || 'Industry Partner',
                new Date(request.requestedAt).toLocaleDateString(),
                <div>
                  <StatusBadge status={getLicenseBadgeStatus(status)} />
                  <div className="mt-1 text-xs text-neutral-500">{LICENSE_STATUS_LABELS[status]}</div>
                  {canReview && <div className="mt-1 text-xs text-neutral-700">Researcher Approval: In Progress</div>}
                </div>,
                <div className="flex flex-wrap gap-2">
                  {canReview && (
                    <>
                      <WireframeButton label="Approve Licensing" variant="primary" size="sm" onClick={() => reviewLicense(request.id, true)} />
                      <WireframeButton label="Reject Licensing" variant="ghost" size="sm" onClick={() => reviewLicense(request.id, false)} />
                    </>
                  )}
                  <WireframeButton label="View Request Details" variant="secondary" size="sm" onClick={() => navigate(`/researcher/license-requests/${request.id}`)} />
                </div>,
              ];
            })}
          />
        )}
      </WireframeCard>

      {selectedRequest && (
        <WireframeCard title="Request Details" className="mt-6">
          {(() => {
            const study = studies.find((item) => item.id === selectedRequest.studyId);
            const industry = MOCK_USERS[selectedRequest.industryUserId];
            const status = normalizeLicenseStatus(selectedRequest.status);
            const summary = getLicenseStageSummary(status);
            const canReview = ['admin_approved', 'researcher_approval'].includes(status);
            const researcher = study ? MOCK_USERS[study.researcherId] : undefined;
            const relatedInterests = interests.filter(
              (interest) =>
                interest.studyId === selectedRequest.studyId &&
                interest.industryUserId === selectedRequest.industryUserId
            );
            const relatedMeetings = meetings.filter(
              (meeting) =>
                meeting.studyId === selectedRequest.studyId &&
                meeting.industryUserId === selectedRequest.industryUserId
            );

            return (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Technology/Study Title</div>
                    <div className="text-neutral-800">{study?.title || selectedRequest.studyId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Current Status</div>
                    <StatusBadge status={getLicenseBadgeStatus(status)} />
                    <div className="mt-1 text-xs text-neutral-600">{LICENSE_STATUS_LABELS[status]}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Request Date</div>
                    <div className="text-neutral-800">{new Date(selectedRequest.requestedAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">License Value</div>
                    <div className="text-neutral-800">${(selectedRequest.licenseFee || 0).toLocaleString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 border-2 border-neutral-300 bg-neutral-50 p-4">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Industry Name</div>
                    <div className="text-neutral-800">{industry?.name || selectedRequest.industryUserId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Organization</div>
                    <div className="text-neutral-800">{industry?.organization || 'Industry Partner'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Email</div>
                    <div className="text-neutral-800 break-all">{industry?.email || 'contact@example.com'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Phone</div>
                    <div className="text-neutral-800">{industry?.phone || '+1-555-0200'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Researcher Information</div>
                    <div className="border-2 border-neutral-300 bg-white p-3">
                      <div className="text-neutral-800">{researcher?.name || study?.researcherName || user?.name || 'Researcher'}</div>
                      <div className="text-xs text-neutral-600">{researcher?.organization || user?.organization || 'Research Institution'}</div>
                      <div className="text-xs text-neutral-600 break-all">{researcher?.email || user?.email || 'researcher@example.com'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Licensing Type</div>
                    <div className="border-2 border-neutral-300 bg-white p-3 text-neutral-800">
                      {(selectedRequest.licenseFee || 0) > 300000 ? 'Exclusive' : 'Non-Exclusive'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Commercialization Information</div>
                    <div className="border-2 border-neutral-300 bg-white p-3 text-neutral-700">
                      {study?.commercialPotential || 'Commercialization potential pending validation.'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Interest History</div>
                    <div className="space-y-2">
                      {relatedInterests.length === 0 ? (
                        <div className="border-2 border-neutral-300 bg-neutral-50 p-3 text-neutral-600">No prior interest record found.</div>
                      ) : (
                        relatedInterests.map((interest) => (
                          <div key={interest.id} className="border-2 border-neutral-300 bg-neutral-50 p-3">
                            <div className="text-neutral-800">{interest.status.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-neutral-500">{new Date(interest.createdAt).toLocaleDateString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Meeting History</div>
                    <div className="space-y-2">
                      {relatedMeetings.length === 0 ? (
                        <div className="border-2 border-neutral-300 bg-neutral-50 p-3 text-neutral-600">No meeting history recorded.</div>
                      ) : (
                        relatedMeetings.map((meeting) => (
                          <div key={meeting.id} className="border-2 border-neutral-300 bg-neutral-50 p-3">
                            <div className="text-neutral-800">{meeting.status.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-neutral-500">
                              {new Date(meeting.scheduledDate || meeting.proposedDate || meeting.createdAt).toLocaleString()}
                            </div>
                            {meeting.notes && <div className="text-xs text-neutral-600 mt-1">{meeting.notes}</div>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-2 border-neutral-300 bg-neutral-50 p-3 text-xs text-neutral-700">
                  Current Owner: {summary.currentOwner} | Pending Action: {summary.pendingAction} | Next Step: {summary.nextStep}
                </div>

                <div>
                  <div className="text-xs text-neutral-500 mb-1">Notes/Comments</div>
                  <div className="border-2 border-neutral-300 bg-white p-3 text-neutral-700">
                    Industry requested licensing review after commercialization discussion. Researcher decision is required before NRDC can generate the agreement.
                  </div>
                </div>

                <div className="flex gap-2">
                  {canReview && (
                    <>
                      <WireframeButton label="Approve Licensing" variant="primary" size="sm" onClick={() => reviewLicense(selectedRequest.id, true)} />
                      <WireframeButton label="Reject Licensing" variant="ghost" size="sm" onClick={() => reviewLicense(selectedRequest.id, false)} />
                    </>
                  )}
                  <WireframeButton label="View Study" variant="secondary" size="sm" onClick={() => navigate(`/researcher/studies/${selectedRequest.studyId}`)} />
                </div>
              </div>
            );
          })()}
        </WireframeCard>
      )}

      {pendingApprovals.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-6">
          {pendingApprovals.map((request) => {
            const study = studies.find((item) => item.id === request.studyId);
            const industry = MOCK_USERS[request.industryUserId];
            const summary = getLicenseStageSummary(request.status);

            return (
              <WireframeCard key={request.id} title={study?.title || request.studyId}>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">Industry Name</div>
                      <div className="text-neutral-800">{industry?.name || request.industryUserId}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">Organization</div>
                      <div className="text-neutral-800">{industry?.organization || 'Industry Partner'}</div>
                    </div>
                  </div>
                  <div className="border-2 border-neutral-300 bg-neutral-50 p-3 text-xs text-neutral-700">
                    Current Owner: {summary.currentOwner} | Pending Action: {summary.pendingAction}
                  </div>
                  <div className="flex gap-2">
                    <WireframeButton label="Approve Licensing" variant="primary" size="sm" onClick={() => reviewLicense(request.id, true)} />
                    <WireframeButton label="Reject Licensing" variant="ghost" size="sm" onClick={() => reviewLicense(request.id, false)} />
                    <WireframeButton label="View Request Details" variant="secondary" size="sm" onClick={() => navigate(`/researcher/license-requests/${request.id}`)} />
                  </div>
                </div>
              </WireframeCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
