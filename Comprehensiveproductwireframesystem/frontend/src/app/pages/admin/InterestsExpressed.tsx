import { useNavigate } from 'react-router';
import { useAppData } from '@/contexts/AppDataContext';
import { MOCK_USERS } from '@/lib/mockData';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { WireframeTable } from '../../components/WireframeTable';
import { toast } from 'sonner';

const interestStatusLabel = (status: string) => {
  if (status === 'interested') return 'Interest Expressed';
  if (status === 'meeting_scheduled') return 'Meeting Scheduled';
  if (status === 'discussion_approved') return 'Discussion Completed';
  if (status === 'license_requested') return 'Licensing Requested';
  if (status === 'licensed') return 'Licensed';
  return status.replace(/_/g, ' ');
};

export function InterestsExpressed() {
  const navigate = useNavigate();
  const {
    interests,
    studies,
    updateInterest,
    addMeeting,
    addNotification,
  } = useAppData();

  const scheduleMeeting = (interestId: string) => {
    const interest = interests.find((item) => item.id === interestId);
    const study = interest ? studies.find((item) => item.id === interest.studyId) : undefined;
    if (!interest || !study) return;

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
      id: `notif_${Date.now()}_interest_meeting_industry`,
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
      id: `notif_${Date.now()}_interest_meeting_researcher`,
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

  const completeDiscussion = (interestId: string) => {
    const interest = interests.find((item) => item.id === interestId);
    if (!interest) return;
    updateInterest({ ...interest, status: 'discussion_approved', updatedAt: new Date() });
    toast.success('Discussion Completed', {
      description: 'Current status: Discussion Completed. Next step: Industry may submit a licensing request when ready.',
    });
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl text-neutral-800 mb-2">Interests Expressed</h1>
          <p className="text-sm text-neutral-600">Centralized admin queue for industry interest submissions</p>
        </div>
        <div className="border-2 border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700">
          Total Interests: {interests.length}
        </div>
      </div>

      <WireframeCard title="Interest Submissions">
        <WireframeTable
          headers={['Study/Technology', 'Industry/User', 'Organization', 'Contact', 'Date', 'Status', 'Actions']}
          rows={interests.map((interest) => {
            const study = studies.find((item) => item.id === interest.studyId);
            const industry = MOCK_USERS[interest.industryUserId];

            return [
              study?.title || interest.studyId,
              industry?.name || interest.industryName,
              industry?.organization || interest.industryName,
              industry?.email || 'contact@example.com',
              new Date(interest.createdAt).toLocaleDateString(),
              interestStatusLabel(interest.status),
              <div className="flex flex-wrap gap-2">
                <WireframeButton label="View Details" variant="ghost" size="sm" onClick={() => navigate(`/admin/interests/${interest.id}`)} />
                <WireframeButton label="Schedule Meeting" variant="primary" size="sm" onClick={() => scheduleMeeting(interest.id)} />
                {interest.status === 'meeting_scheduled' && (
                  <WireframeButton label="Discussion Completed" variant="secondary" size="sm" onClick={() => completeDiscussion(interest.id)} />
                )}
              </div>,
            ];
          })}
        />
      </WireframeCard>
    </div>
  );
}
