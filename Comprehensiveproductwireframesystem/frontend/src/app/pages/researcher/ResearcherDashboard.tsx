import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { StatusBadge } from '../../components/StatusBadge';
import { FileText, Calendar, TrendingUp, Bell } from 'lucide-react';
import { buildLicenseTransition, getLicenseStageSummary, normalizeLicenseStatus } from '@/app/config/licenseStatus';
import { MOCK_USERS } from '@/lib/mockData';

const toBadgeStatus = (status: string) => status.replace(/_/g, '-') as 'draft';

export function ResearcherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { studies, interests, meetings, licenseRequests, updateLicenseRequest, addNotification } = useAppData();

  const researcherStudies = studies.filter((study) => study.researcherId === user?.id);
  const researcherStudyIds = researcherStudies.map((study) => study.id);
  const researcherInterests = interests.filter((interest) => researcherStudyIds.includes(interest.studyId));
  const researcherMeetings = meetings.filter(
    (meeting) => meeting.researcherId === user?.id && ['pending', 'approved', 'scheduled'].includes(meeting.status)
  );
  const pendingLicensingApprovals = licenseRequests.filter(
    (request) =>
      researcherStudyIds.includes(request.studyId) &&
      ['admin_approved', 'researcher_approval'].includes(normalizeLicenseStatus(request.status))
  );
  const recentStudies = researcherStudies.slice(0, 4);

  const reviewLicense = (licenseId: string, approved: boolean) => {
    const request = licenseRequests.find((item) => item.id === licenseId);
    if (!request) return;
    const study = studies.find((item) => item.id === request.studyId);
    const status = normalizeLicenseStatus(request.status);
    const reviewReady = status === 'admin_approved'
      ? buildLicenseTransition({ ...request, status }, 'researcher_approval')
      : { ...request, status };
    const nextRequest = approved
      ? buildLicenseTransition(reviewReady, 'researcher_approved')
      : buildLicenseTransition(reviewReady, 'rejected');
    updateLicenseRequest(nextRequest);
    addNotification({
      id: `notif_${Date.now()}_researcher_response`,
      userId: 'admin1',
      type: approved ? 'researcher_license_approved' : 'license_approved',
      title: approved ? 'Researcher Approved License' : 'Researcher Rejected License',
      message: `${user?.name || 'Researcher'} ${approved ? 'approved' : 'rejected'} licensing for "${study?.title || request.studyId}".`,
      relatedId: request.id,
      relatedType: 'license',
      read: false,
      createdAt: new Date(),
    });
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">Dashboard</h1>
        <p className="text-sm text-neutral-600">Welcome back, {user?.name || 'Researcher'}</p>
      </div>

      {/* Primary Action */}
      <div className="mb-6">
        <Link to="/researcher/upload">
          <WireframeButton label="+ Upload New Research" variant="primary" size="lg" />
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <WireframeCard>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl text-neutral-800 mb-1">{researcherStudies.length}</div>
              <div className="text-sm text-neutral-600">Total Studies</div>
            </div>
            <FileText size={24} className="text-neutral-400" />
          </div>
        </WireframeCard>
        <WireframeCard>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl text-neutral-800 mb-1">{researcherStudies.filter((study) => study.status === 'published').length}</div>
              <div className="text-sm text-neutral-600">Published</div>
            </div>
            <TrendingUp size={24} className="text-neutral-400" />
          </div>
        </WireframeCard>
        <WireframeCard>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl text-neutral-800 mb-1">{researcherInterests.length}</div>
              <div className="text-sm text-neutral-600">Industry Interests</div>
            </div>
            <Bell size={24} className="text-neutral-400" />
          </div>
        </WireframeCard>
        <WireframeCard>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl text-neutral-800 mb-1">{researcherMeetings.length}</div>
              <div className="text-sm text-neutral-600">Upcoming Meetings</div>
            </div>
            <Calendar size={24} className="text-neutral-400" />
          </div>
        </WireframeCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent Studies */}
        <div>
          <WireframeCard
            title="Recent Studies"
            actions={
              <Link to="/researcher/studies">
                <WireframeButton label="View All" variant="ghost" size="sm" />
              </Link>
            }
          >
            <div className="space-y-3">
              {(recentStudies.length > 0 ? recentStudies : studies.slice(0, 4)).map((study) => (
                <div
                  key={study.id}
                  className="border-2 border-neutral-300 p-4 hover:border-neutral-500 cursor-pointer"
                  onClick={() => navigate(`/researcher/studies/${study.id}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-neutral-800 flex-1">{study.title}</div>
                    <StatusBadge status={toBadgeStatus(study.status)} />
                  </div>
                  <div className="flex gap-4 text-xs text-neutral-500">
                    <span>{study.readinessScore || 0}% readiness</span>
                    <span>{interests.filter((interest) => interest.studyId === study.id).length} industry interests</span>
                  </div>
                </div>
              ))}
            </div>
          </WireframeCard>
        </div>

        {/* License Request Approvals */}
        <div>
          <WireframeCard title="License Request Approvals">
            <div className="space-y-3">
              {pendingLicensingApprovals.length === 0 ? (
                <div className="border-2 border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
                  No license approvals pending.
                </div>
              ) : (
                pendingLicensingApprovals.map((request) => {
                  const study = studies.find((item) => item.id === request.studyId);
                  const industry = MOCK_USERS[request.industryUserId];
                  const summary = getLicenseStageSummary(request.status);
                  return (
                    <div key={request.id} className="p-3 border-2 border-neutral-300">
                      <div className="text-sm text-neutral-800 mb-1">Approve Licensing</div>
                      <div className="text-xs text-neutral-500 mb-3">{study?.title || request.studyId}</div>

                      <div className="border-2 border-neutral-200 bg-neutral-50 p-3 mb-3 text-xs">
                        <div className="text-neutral-500 mb-2">Industry Person Info</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-neutral-500">Name</div>
                            <div className="text-neutral-800">{industry?.name || request.industryUserId}</div>
                          </div>
                          <div>
                            <div className="text-neutral-500">Organization</div>
                            <div className="text-neutral-800">{industry?.organization || 'Industry Partner'}</div>
                          </div>
                          <div>
                            <div className="text-neutral-500">Email</div>
                            <div className="text-neutral-800 break-all">{industry?.email || 'contact@example.com'}</div>
                          </div>
                          <div>
                            <div className="text-neutral-500">Phone</div>
                            <div className="text-neutral-800">{industry?.phone || '+1-555-0200'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                          <div className="text-neutral-500">Current Stage</div>
                          <div className="text-neutral-800">{summary.currentStage}</div>
                        </div>
                        <div>
                          <div className="text-neutral-500">License Value</div>
                          <div className="text-neutral-800">${(request.licenseFee || 0).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="text-xs text-neutral-700 mb-3">Researcher Approval: In Progress</div>
                      <div className="flex gap-2">
                        <WireframeButton label="Approve Licensing" variant="primary" size="sm" onClick={() => reviewLicense(request.id, true)} />
                        <WireframeButton label="Reject Licensing" variant="ghost" size="sm" onClick={() => reviewLicense(request.id, false)} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </WireframeCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Pending Actions */}
          <WireframeCard title="Pending Actions">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 border-2 border-neutral-300">
                <div className="w-2 h-2 bg-neutral-800 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="text-sm text-neutral-800 mb-1">Review meeting request</div>
                  <div className="text-xs text-neutral-500">PharmaCorp - Cancer Treatment Study</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border-2 border-neutral-300">
                <div className="w-2 h-2 bg-neutral-800 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="text-sm text-neutral-800 mb-1">Complete study revision</div>
                  <div className="text-xs text-neutral-500">Solar Panel Materials - Admin feedback</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border-2 border-neutral-300">
                <div className="w-2 h-2 bg-neutral-800 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="text-sm text-neutral-800 mb-1">Upload missing documents</div>
                  <div className="text-xs text-neutral-500">AI Drug Discovery Platform</div>
                </div>
              </div>
            </div>
          </WireframeCard>

          {/* Upcoming Meetings */}
          <WireframeCard title="Upcoming Meetings">
            <div className="space-y-3">
              <div className="border-2 border-neutral-300 p-3">
                <div className="text-sm text-neutral-800 mb-1">PharmaCorp</div>
                <div className="text-xs text-neutral-500 mb-2">Cancer Treatment Discussion</div>
                <div className="text-xs text-neutral-600">Jun 5, 2026 at 2:00 PM</div>
              </div>
              <div className="border-2 border-neutral-300 p-3">
                <div className="text-sm text-neutral-800 mb-1">TechVentures Inc</div>
                <div className="text-xs text-neutral-500 mb-2">AI Platform Demo</div>
                <div className="text-xs text-neutral-600">Jun 8, 2026 at 10:00 AM</div>
              </div>
            </div>
            <div className="mt-4">
              <WireframeButton label="View Calendar" variant="ghost" size="sm" className="w-full" onClick={() => navigate('/researcher/notifications')} />
            </div>
          </WireframeCard>

          {/* Quick Actions */}
          <WireframeCard title="Quick Actions">
            <div className="space-y-2">
              <Link to="/researcher/upload">
                <WireframeButton label="Upload Research" variant="secondary" size="sm" className="w-full" />
              </Link>
              <Link to="/researcher/copilot">
                <WireframeButton label="Ask AI Copilot" variant="secondary" size="sm" className="w-full" />
              </Link>
              <WireframeButton label="Generate Report" variant="secondary" size="sm" className="w-full" onClick={() => navigate('/researcher/studies')} />
            </div>
          </WireframeCard>
        </div>
      </div>
    </div>
  );
}
