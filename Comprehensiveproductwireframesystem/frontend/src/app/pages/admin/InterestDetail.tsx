import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useAppData } from '@/contexts/AppDataContext';
import { MOCK_USERS } from '@/lib/mockData';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { StatusBadge } from '../../components/StatusBadge';

const interestStatusLabel = (status: string) => {
  if (status === 'interested') return 'Interest Expressed';
  if (status === 'meeting_scheduled') return 'Meeting Scheduled';
  if (status === 'discussion_approved') return 'Discussion Completed';
  if (status === 'license_requested') return 'Licensing Requested';
  if (status === 'licensed') return 'Licensed';
  return status.replace(/_/g, ' ');
};

const interestBadgeStatus = (status: string) => {
  if (status === 'meeting_scheduled') return 'scheduled';
  if (status === 'discussion_approved') return 'approved';
  if (status === 'licensed') return 'completed';
  return 'pending';
};

export function InterestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    interests,
    studies,
    meetings,
    updateInterest,
    addMeeting,
    addNotification,
  } = useAppData();

  const interest = interests.find((item) => item.id === id);

  if (!interest) {
    return (
      <WireframeCard title="Interest Not Found">
        <div className="space-y-4 text-sm text-neutral-700">
          <p>The selected interest record could not be found.</p>
          <WireframeButton label="Back to Interests List" variant="primary" onClick={() => navigate('/admin/interests')} />
        </div>
      </WireframeCard>
    );
  }

  const study = studies.find((item) => item.id === interest.studyId);
  const industry = MOCK_USERS[interest.industryUserId];
  const relatedMeetings = meetings.filter((meeting) => meeting.interestId === interest.id);

  const scheduleMeeting = () => {
    if (!study) return;

    updateInterest({ ...interest, status: 'meeting_scheduled', updatedAt: new Date() });

    const meetingId = `meeting_${Date.now()}`;
    addMeeting({
      id: meetingId,
      interestId: interest.id,
      studyId: study.id,
      researcherId: study.researcherId,
      industryUserId: interest.industryUserId,
      status: 'scheduled',
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      meetingLink: `https://meet.nrdc-r2c.demo/${meetingId}`,
      notes: `Admin scheduled meeting from expressed interest for ${study.title}.`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    addNotification({
      id: `notif_${Date.now()}_interest_detail_meeting_industry`,
      userId: interest.industryUserId,
      type: 'meeting_scheduled',
      title: 'Meeting Scheduled',
      message: `NRDC scheduled a meeting for your interest in "${study.title}".`,
      relatedId: meetingId,
      relatedType: 'meeting',
      read: false,
      createdAt: new Date(),
    });

    addNotification({
      id: `notif_${Date.now()}_interest_detail_meeting_researcher`,
      userId: study.researcherId,
      type: 'meeting_scheduled',
      title: 'Meeting Scheduled',
      message: `NRDC scheduled a meeting with ${interest.industryName} for "${study.title}".`,
      relatedId: meetingId,
      relatedType: 'meeting',
      read: false,
      createdAt: new Date(),
    });

    toast.success('Meeting Scheduled', {
      description: 'Current status: Meeting Scheduled. Next step: Researcher and Industry attend the commercialization discussion.',
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900 mb-2">Interest Details</h1>
          <p className="text-sm text-neutral-600">Record {interest.id}</p>
        </div>
        <StatusBadge status={interestBadgeStatus(interest.status)} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <WireframeCard title="Industry Information">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <InfoItem label="Industry/User Name" value={industry?.name || interest.industryName} />
              <InfoItem label="Organization Name" value={industry?.organization || interest.industryName} />
              <InfoItem label="Contact Person" value={industry?.name || 'Industry Contact'} />
              <InfoItem label="Email Address" value={industry?.email || 'contact@example.com'} className="break-all" />
              <InfoItem label="Phone Number" value={industry?.phone || '+1-555-0200'} />
            </div>
          </WireframeCard>

          <WireframeCard title="Study Information">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoItem label="Study Title" value={study?.title || interest.studyId} />
              <InfoItem label="Technology Title" value={study?.title || interest.studyId} />
              <InfoItem label="Researcher Name" value={study?.researcherName || 'Researcher'} />
              <InfoItem label="Technology Readiness Level" value={study?.trl ? `TRL ${study.trl}` : 'Not available'} />
              <InfoItem label="Research Summary" value={study?.abstract || 'Summary unavailable.'} className="col-span-2" />
              <InfoItem label="Commercialization Potential" value={study?.commercialPotential || 'Commercial potential pending validation.'} className="col-span-2" />
            </div>
          </WireframeCard>

          <WireframeCard title="Interest Information">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoPanel
                label="Message/Reason for Interest"
                value="Interested in evaluating commercialization, partnership, and licensing fit for this technology."
              />
              <InfoPanel label="Current Status" value={interestStatusLabel(interest.status)} />
              <InfoItem label="Submission Date" value={new Date(interest.createdAt).toLocaleDateString()} />
            </div>
          </WireframeCard>

          <WireframeCard title="Meeting History">
            <div className="space-y-2 text-sm">
              {relatedMeetings.length === 0 ? (
                <div className="border border-neutral-200 bg-neutral-50 p-3 text-neutral-600">No meetings scheduled yet.</div>
              ) : (
                relatedMeetings.map((meeting) => (
                  <div key={meeting.id} className="border border-neutral-200 bg-neutral-50 p-3 text-neutral-700">
                    {meeting.status.replace(/_/g, ' ')} | {new Date(meeting.scheduledDate || meeting.proposedDate || meeting.createdAt).toLocaleString()}
                  </div>
                ))
              )}
            </div>
          </WireframeCard>
        </div>

        <div className="space-y-6">
          <WireframeCard title="Actions">
            <div className="space-y-2">
              <WireframeButton label="Schedule Meeting" variant="primary" size="sm" className="w-full" onClick={scheduleMeeting} />
              <WireframeButton label="Back to Interests List" variant="secondary" size="sm" className="w-full" onClick={() => navigate('/admin/interests')} />
              <WireframeButton label="View Study Review" variant="ghost" size="sm" className="w-full" onClick={() => navigate(`/admin/review/${interest.studyId}`)} />
            </div>
          </WireframeCard>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs font-medium text-neutral-500 mb-1">{label}</div>
      <div className="text-neutral-900">{value}</div>
    </div>
  );
}

function InfoPanel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-neutral-500 mb-1">{label}</div>
      <div className="border border-neutral-200 bg-white p-3 text-neutral-800 shadow-sm">{value}</div>
    </div>
  );
}
