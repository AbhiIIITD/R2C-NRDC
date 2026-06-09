import { Link, useNavigate } from 'react-router';
import { useMemo } from 'react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { WireframeInput } from '../../components/WireframeInput';
import { StatusBadge } from '../../components/StatusBadge';
import { LicenseLifecycleStepper } from '../../components/LicenseLifecycleStepper';
import { getLicenseBadgeStatus, getLicenseStageSummary, LICENSE_STATUS_LABELS, normalizeLicenseStatus } from '@/app/config/licenseStatus';

export function LicensingCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { studies, getLicenseRequestsByIndustryUser } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const requests = useMemo(
    () => (user ? getLicenseRequestsByIndustryUser(user.id) : []),
    [user, getLicenseRequestsByIndustryUser]
  );
  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return requests.filter((request) => {
      const study = studies.find((item) => item.id === request.studyId);
      return (
        !query ||
        request.id.toLowerCase().includes(query) ||
        normalizeLicenseStatus(request.status).includes(query) ||
        study?.title.toLowerCase().includes(query) ||
        study?.researcherName.toLowerCase().includes(query)
      );
    });
  }, [requests, studies, searchTerm]);

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl text-neutral-800 mb-2">Licensing Center</h1>
          <p className="text-sm text-neutral-600">Manage technology licensing agreements</p>
        </div>
        <Link to="/industry/marketplace">
          <WireframeButton label="Initiate License Request" variant="primary" />
        </Link>
      </div>
      {user?.isListedCompany === false && (
        <div className="mb-6 border-2 border-neutral-700 bg-neutral-100 p-4 text-sm text-neutral-800">
          Warning: This request is associated with a non-listed company. Additional verification may be required.
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{requests.filter((r) => ['pending', 'admin_approved', 'researcher_approval', 'researcher_approved', 'agreement_generated', 'signed_submitted', 'agreement_executed'].includes(normalizeLicenseStatus(r.status))).length}</div>
          <div className="text-sm text-neutral-600">In Progress</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{requests.filter((r) => ['agreement_generated', 'signed_submitted', 'agreement_executed', 'commercialized'].includes(normalizeLicenseStatus(r.status))).length}</div>
          <div className="text-sm text-neutral-600">Active Licenses</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{requests.filter((r) => normalizeLicenseStatus(r.status) === 'commercialized').length}</div>
          <div className="text-sm text-neutral-600">Completed</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{requests.length}</div>
          <div className="text-sm text-neutral-600">Total Requests</div>
        </WireframeCard>
      </div>

      <div className="mb-6 border-2 border-neutral-400 bg-white p-4">
        <WireframeInput placeholder="Search licenses..." type="search" value={searchTerm} onChange={setSearchTerm} />
      </div>

      <div className="space-y-6">
        {filteredRequests.length === 0 ? (
          <WireframeCard>
            <div className="text-sm text-neutral-700 mb-3">{requests.length === 0 ? 'No license requests yet.' : 'No license requests match your search.'}</div>
            <Link to="/industry/marketplace">
              <WireframeButton label="Browse Technologies" variant="primary" />
            </Link>
          </WireframeCard>
        ) : (
          filteredRequests.map((request) => {
            const study = studies.find((item) => item.id === request.studyId);
            const workflowType = (request.licenseFee || 0) > 300000 ? 'full' : 'simplified';
            const status = normalizeLicenseStatus(request.status);
            const summary = getLicenseStageSummary(status);
            return (
              <WireframeCard key={request.id}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-base text-neutral-800 mb-2">{study?.title || request.studyId}</div>
                    <div className="text-sm text-neutral-600">{study?.researcherName || 'Researcher'}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      License ID: {request.id} | ${(request.licenseFee || 0).toLocaleString()} | {workflowType === 'full' ? 'Full Review' : 'Simplified'}
                    </div>
                  </div>
                  <StatusBadge status={getLicenseBadgeStatus(request.status)} />
                </div>

                <div className="mb-4">
                  <LicenseLifecycleStepper status={request.status} />
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4 text-xs">
                  <div>
                    <div className="text-neutral-500 mb-1">Requested</div>
                    <div className="text-neutral-800">{new Date(request.requestedAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 mb-1">License Type</div>
                    <div className="text-neutral-800">{workflowType === 'full' ? 'Exclusive' : 'Non-Exclusive'}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 mb-1">Territory</div>
                    <div className="text-neutral-800">Worldwide</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 mb-1">Status</div>
                    <div className="text-neutral-800">{LICENSE_STATUS_LABELS[status]}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4 text-xs border-2 border-neutral-300 bg-neutral-50 p-3">
                  <div>
                    <div className="text-neutral-500 mb-1">Current Stage</div>
                    <div className="text-neutral-800">{summary.currentStage}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 mb-1">Current Owner</div>
                    <div className="text-neutral-800">{summary.currentOwner}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 mb-1">Pending Action</div>
                    <div className="text-neutral-800">{summary.pendingAction}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <WireframeButton label="View Details" variant="secondary" size="sm" onClick={() => navigate(`/industry/licensing/${request.id}`)} />
                  <WireframeButton label="Download Documents" variant="ghost" size="sm" disabled={!request.agreementTerms} onClick={() => navigate(`/industry/licensing/${request.id}`)} />
                </div>
              </WireframeCard>
            );
          })
        )}
      </div>
    </div>
  );
}
