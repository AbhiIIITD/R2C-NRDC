import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';

export function MeetingRequestForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { studies, addInterest, addMeeting, addNotification } = useAppData();
  const study = studies.find((item) => item.status === 'published') || studies[0];

  const submit = () => {
    if (!user || !study) return;
    const now = Date.now();
    const interestId = `interest_${now}`;
    const meetingId = `meeting_${now}`;
    addInterest({
      id: interestId,
      studyId: study.id,
      industryUserId: user.id,
      industryName: user.organization || user.name,
      status: 'meeting_scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    addMeeting({
      id: meetingId,
      interestId,
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
      id: `notif_${now}`,
      userId: 'admin1',
      type: 'meeting_requested',
      title: 'Meeting Requested',
      message: `${user.organization || user.name} requested a meeting for "${study.title}".`,
      relatedId: meetingId,
      relatedType: 'meeting',
      read: false,
      createdAt: new Date(),
    });
    navigate(`/industry/meetings/${meetingId}/summary`);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">Request New Meeting</h1>
        <p className="text-sm text-neutral-600">Submit a researcher meeting request for NRDC review.</p>
      </div>
      <WireframeCard title="Meeting Request Form">
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-xs text-neutral-500 mb-1">Selected Technology</div>
            <div className="text-neutral-800">{study?.title}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-neutral-400 p-3">Preferred date: next available week</div>
            <div className="border-2 border-neutral-400 p-3">Format: video meeting</div>
          </div>
          <div className="border-2 border-neutral-400 p-3 text-neutral-700">Discussion goals: technical fit, licensing path, commercialization timing.</div>
          <WireframeButton label="Submit Meeting Request" variant="primary" onClick={submit} />
        </div>
      </WireframeCard>
    </div>
  );
}
