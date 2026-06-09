import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';

export function TechnologyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    studies,
    interests,
    addInterest,
    updateInterest,
    addMeeting,
    addLicenseRequest,
    addNotification,
  } = useAppData();
  const study = studies.find((item) => item.id === id);

  if (!study) {
    return (
      <div>
        <Link to="/industry/marketplace" className="flex items-center gap-2 text-sm text-neutral-600 mb-6 hover:underline">
          <ArrowLeft size={16} />
          Back to Marketplace
        </Link>
        <WireframeCard title="Technology Not Found">
          <div className="text-sm text-neutral-600 mb-4">This marketplace technology is not available.</div>
          <WireframeButton label="Browse Marketplace" variant="primary" onClick={() => navigate('/industry/marketplace')} />
        </WireframeCard>
      </div>
    );
  }

  const currentInterest = interests.find(
    (interest) => interest.studyId === study.id && interest.industryUserId === user?.id
  );

  const ensureInterest = () => {
    if (!user) return undefined;
    if (currentInterest) return currentInterest;

    const interest = {
      id: `interest_${Date.now()}`,
      studyId: study.id,
      industryUserId: user.id,
      industryName: user.organization || user.name,
      status: 'interested' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addInterest(interest);
    addNotification({
      id: `notif_${Date.now()}`,
      userId: 'admin1',
      type: 'interest_received',
      title: 'License Interest Request Submitted',
      message: `Industry Name: ${user.name}; Organization: ${user.organization || user.name}; Contact Person: ${user.name}; Email: ${user.email}; Phone: ${user.phone || '+1-555-0200'}; Technology Interested In: ${study.title}; Date: ${new Date().toLocaleDateString()}.`,
      relatedId: interest.id,
      relatedType: 'interest',
      read: false,
      createdAt: new Date(),
    });
    addNotification({
      id: `notif_${Date.now()}_researcher_interest`,
      userId: study.researcherId,
      type: 'interest_received',
      title: 'New Industry Interest',
      message: `${interest.industryName} expressed interest in "${study.title}".`,
      relatedId: study.id,
      relatedType: 'study',
      read: false,
      createdAt: new Date(),
    });
    return interest;
  };

  const expressInterest = () => {
    ensureInterest();
    toast.success('Interest Submitted', {
      description: 'Status: Interest Expressed. Next owner: Admin.',
    });
  };

  const requestMeeting = () => {
    if (!user) return;
    const interest = ensureInterest();
    if (!interest) return;
    updateInterest({ ...interest, status: 'meeting_scheduled', updatedAt: new Date() });
    addMeeting({
      id: `meeting_${Date.now()}`,
      interestId: interest.id,
      studyId: study.id,
      researcherId: study.researcherId,
      industryUserId: user.id,
      status: 'pending',
      proposedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: `Meeting requested for ${study.title}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    addNotification({
      id: `notif_${Date.now()}_meeting`,
      userId: 'admin1',
      type: 'meeting_requested',
      title: 'Meeting Requested',
      message: `${user.organization || user.name} requested a meeting for "${study.title}".`,
      relatedId: study.id,
      relatedType: 'meeting',
      read: false,
      createdAt: new Date(),
    });
    toast.success('Meeting Requested', {
      description: 'Status: Meeting Requested. Next owner: Admin.',
    });
    navigate('/industry/meetings');
  };

  const requestLicense = () => {
    if (!user) return;
    const interest = ensureInterest();
    if (interest) {
      updateInterest({ ...interest, status: 'license_requested', updatedAt: new Date() });
    }
    const licenseId = `license_${Date.now()}`;
    addLicenseRequest({
      id: licenseId,
      studyId: study.id,
      industryUserId: user.id,
      status: 'pending',
      requestedAt: new Date(),
      licenseFee: 250000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    addNotification({
      id: `notif_${Date.now()}_license`,
      userId: 'admin1',
      type: 'license_requested',
      title: 'License Requested',
      message: `${user.organization || user.name} requested a license for "${study.title}".`,
      relatedId: study.id,
      relatedType: 'license',
      read: false,
      createdAt: new Date(),
    });
    toast.success('Licensing Request Submitted', {
      description: 'Status: License Requested. Next owner: Admin.',
    });
    navigate(`/industry/licensing/${licenseId}`);
  };

  return (
    <div>
      <Link to="/industry/marketplace" className="flex items-center gap-2 text-sm text-neutral-600 mb-6 hover:underline">
        <ArrowLeft size={16} />
        Back to Marketplace
      </Link>

      <div className="mb-6 flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-2xl text-neutral-800 mb-2">{study.title}</h1>
          <p className="text-sm text-neutral-600">Technology ID: {study.id}</p>
        </div>
        <div className="flex gap-2">
          <WireframeButton label="Save" variant="ghost" />
          <WireframeButton label="Express Interest" variant="primary" onClick={expressInterest} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <WireframeCard title="Overview">
            <div className="space-y-4">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Abstract</div>
                <div className="text-sm text-neutral-700">{study.abstract}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Domain</div>
                  <div className="text-sm text-neutral-700">{study.domain}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">TRL</div>
                  <div className="text-sm text-neutral-700">TRL {study.trl}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Published</div>
                  <div className="text-sm text-neutral-700">
                    {study.publishedAt ? new Date(study.publishedAt).toLocaleDateString() : 'Recently'}
                  </div>
                </div>
              </div>
            </div>
          </WireframeCard>

          <WireframeCard title="Commercial Assessment">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-neutral-700">Commercial Readiness Score</span>
                  <span className="text-lg text-neutral-800">{study.readinessScore || 70}/100</span>
                </div>
                <div className="w-full h-3 bg-neutral-300">
                  <div className="h-3 bg-neutral-700" style={{ width: `${study.readinessScore || 70}%` }} />
                </div>
              </div>
              <div>
                <div className="text-sm text-neutral-700 mb-2">Commercial Rationale</div>
                <div className="text-sm text-neutral-600">{study.commercialPotential || 'Strong commercialization pathway under NRDC review.'}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-700 mb-2">Target Keywords</div>
                <div className="flex flex-wrap gap-2">
                  {(study.keywords || []).map((keyword) => (
                    <span key={keyword} className="px-3 py-1 bg-neutral-200 text-xs">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </WireframeCard>

          <WireframeCard title="Market Analysis">
            <div className="space-y-3">
              <div>
                <div className="text-sm text-neutral-700 mb-1">Market Size</div>
                <div className="text-sm text-neutral-600">{study.marketSize || 'To be validated with industry partners'}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-700 mb-1">Competitive Landscape</div>
                <div className="text-sm text-neutral-600">{study.competitors || 'Comparable commercial offerings are being mapped.'}</div>
              </div>
            </div>
          </WireframeCard>
        </div>

        <div className="space-y-6">
          <WireframeCard title="Researcher">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-16 h-16 bg-neutral-400 rounded-full" />
              <div>
                <div className="text-sm text-neutral-800">{study.researcherName}</div>
                <div className="text-xs text-neutral-500">Research Lead</div>
                <div className="text-xs text-neutral-500">Research Institution</div>
              </div>
            </div>
          </WireframeCard>

          <WireframeCard title="Quick Stats">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-neutral-600">Industry Interest</span>
                <span className="text-xs text-neutral-800">{interests.filter((interest) => interest.studyId === study.id).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-neutral-600">Readiness</span>
                <span className="text-xs text-neutral-800">{study.readinessScore || 70}%</span>
              </div>
            </div>
          </WireframeCard>

          <WireframeCard title="IP Status">
            <div className="space-y-2">
              <div className="text-xs text-neutral-600">Patent Status</div>
              <div className="text-sm text-neutral-800">{study.ipStatus || 'Pending'}</div>
            </div>
          </WireframeCard>

          <WireframeCard title="Documents">
            <div className="flex items-center justify-between p-2 border-2 border-neutral-300">
              <div className="text-xs text-neutral-700">Research Summary.pdf</div>
              <Download size={14} className="text-neutral-500" />
            </div>
          </WireframeCard>

          <div className="space-y-2">
            <WireframeButton label={currentInterest ? 'Interest Recorded' : 'Express Interest'} variant="primary" size="sm" className="w-full" onClick={expressInterest} />
            <WireframeButton label="Request Meeting" variant="secondary" size="sm" className="w-full" onClick={requestMeeting} />
            <WireframeButton label="Request License" variant="secondary" size="sm" className="w-full" onClick={requestLicense} />
            <WireframeButton label="Ask AI Assistant" variant="ghost" size="sm" className="w-full" onClick={() => navigate(`/industry/copilot?studyId=${study.id}`)} />
          </div>
        </div>
      </div>
    </div>
  );
}
