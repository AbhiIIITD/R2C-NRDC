import { useNavigate, useParams } from 'react-router';
import { useAppData } from '@/contexts/AppDataContext';
import { MOCK_USERS } from '@/lib/mockData';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { StatusBadge } from '../../components/StatusBadge';

const toBadgeStatus = (status: string) => status.replace(/_/g, '-') as 'pending';

export function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { meetings, studies } = useAppData();
  const meeting = meetings.find((item) => item.id === id) || meetings[0];
  const study = meeting ? studies.find((item) => item.id === meeting.studyId) : undefined;
  const industry = meeting ? MOCK_USERS[meeting.industryUserId] : undefined;
  const researcher = meeting ? MOCK_USERS[meeting.researcherId] : undefined;

  if (!meeting) {
    return (
      <WireframeCard title="Meeting Not Found">
        <WireframeButton label="Back to Meetings" variant="primary" onClick={() => navigate('/admin/meetings')} />
      </WireframeCard>
    );
  }

  const date = meeting.scheduledDate || meeting.proposedDate || meeting.createdAt;

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl text-neutral-800 mb-2">Meeting Detail</h1>
          <p className="text-sm text-neutral-600">Meeting {meeting.id}</p>
        </div>
        <StatusBadge status={toBadgeStatus(meeting.status)} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <WireframeCard title="Meeting Details">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Technology</span><span className="text-neutral-800">{study?.title || meeting.studyId}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Date</span><span className="text-neutral-800">{new Date(date).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Status</span><span className="text-neutral-800">{meeting.status}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Meeting Link</span><span className="text-neutral-800">{meeting.meetingLink || 'Awaiting scheduling'}</span></div>
          </div>
        </WireframeCard>
        <WireframeCard title="Participants">
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-neutral-500 mb-1">Researcher</div>
              <div className="text-neutral-800">{researcher?.name || study?.researcherName || meeting.researcherId}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Company</div>
              <div className="text-neutral-800">{industry?.organization || meeting.industryUserId}</div>
              {industry?.isListedCompany === false && (
                <div className="mt-2 border-2 border-neutral-500 bg-neutral-100 px-2 py-1 text-xs">Non-listed Company</div>
              )}
            </div>
          </div>
        </WireframeCard>
        <WireframeCard title="Notes">
          <div className="text-sm text-neutral-700">{meeting.notes || 'No notes captured yet.'}</div>
        </WireframeCard>
        <WireframeCard title="Timeline">
          <div className="space-y-2 text-xs text-neutral-700">
            <div>Created: {new Date(meeting.createdAt).toLocaleString()}</div>
            <div>Last updated: {new Date(meeting.updatedAt).toLocaleString()}</div>
            <div>Current state: {meeting.status}</div>
          </div>
        </WireframeCard>
      </div>
    </div>
  );
}
