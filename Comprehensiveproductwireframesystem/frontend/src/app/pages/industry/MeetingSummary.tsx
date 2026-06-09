import { useNavigate, useParams } from 'react-router';
import { useAppData } from '@/contexts/AppDataContext';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { StatusBadge } from '../../components/StatusBadge';

export function MeetingSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { meetings, studies } = useAppData();
  const meeting = meetings.find((item) => item.id === id) || meetings[0];
  const study = meeting ? studies.find((item) => item.id === meeting.studyId) : undefined;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">Meeting Request Submitted</h1>
        <p className="text-sm text-neutral-600">Your request is now awaiting NRDC review.</p>
      </div>
      <WireframeCard title="Meeting Summary">
        <div className="space-y-3 text-sm mb-4">
          <div className="flex justify-between"><span className="text-neutral-500">Technology</span><span className="text-neutral-800">{study?.title || meeting?.studyId}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">Researcher</span><span className="text-neutral-800">{study?.researcherName || meeting?.researcherId}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">Status</span><StatusBadge status="pending" /></div>
        </div>
        <WireframeButton label="Back to Meeting Center" variant="primary" onClick={() => navigate('/industry/meetings')} />
      </WireframeCard>
    </div>
  );
}
