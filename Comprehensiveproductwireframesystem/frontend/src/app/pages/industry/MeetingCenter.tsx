import { Link, useNavigate } from 'react-router';
import { useMemo } from 'react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { WireframeTable } from '../../components/WireframeTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Calendar, Video, Clock } from 'lucide-react';
import { WireframeInput } from '../../components/WireframeInput';

const toBadgeStatus = (status: string) => status.replace(/_/g, '-') as 'pending';

export function MeetingCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { studies, getMeetingsByIndustryUser, updateMeeting } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const meetings = useMemo(() => (user ? getMeetingsByIndustryUser(user.id) : []), [user, getMeetingsByIndustryUser]);
  const filteredMeetings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return meetings.filter((meeting) => {
      const study = studies.find((item) => item.id === meeting.studyId);
      return (
        !query ||
        meeting.id.toLowerCase().includes(query) ||
        meeting.status.toLowerCase().includes(query) ||
        meeting.notes?.toLowerCase().includes(query) ||
        study?.title.toLowerCase().includes(query) ||
        study?.researcherName.toLowerCase().includes(query)
      );
    });
  }, [meetings, studies, searchTerm]);

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl text-neutral-800 mb-2">Meeting Center</h1>
          <p className="text-sm text-neutral-600">Manage meetings with researchers</p>
        </div>
        <Link to="/industry/meetings/new">
          <WireframeButton label="Request New Meeting" variant="primary" />
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{meetings.filter((m) => m.status === 'scheduled').length}</div>
          <div className="text-sm text-neutral-600">Upcoming</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{meetings.filter((m) => m.status === 'completed').length}</div>
          <div className="text-sm text-neutral-600">Completed</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{meetings.filter((m) => m.status === 'pending').length}</div>
          <div className="text-sm text-neutral-600">Pending</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{meetings.length}</div>
          <div className="text-sm text-neutral-600">Total</div>
        </WireframeCard>
      </div>

      <div className="mb-6 border-2 border-neutral-400 bg-white p-4">
        <WireframeInput placeholder="Search meetings..." type="search" value={searchTerm} onChange={setSearchTerm} />
      </div>

      <div className="space-y-4 mb-8">
        {filteredMeetings.length === 0 ? (
          <WireframeCard>
            <div className="text-sm text-neutral-700 mb-3">{meetings.length === 0 ? 'No meeting requests yet.' : 'No meetings match your search.'}</div>
            <Link to="/industry/marketplace">
              <WireframeButton label="Find Technologies" variant="primary" />
            </Link>
          </WireframeCard>
        ) : (
          filteredMeetings.map((meeting) => {
            const study = studies.find((item) => item.id === meeting.studyId);
            const date = meeting.scheduledDate || meeting.proposedDate || meeting.createdAt;
            return (
              <WireframeCard key={meeting.id}>
                <div className="flex gap-4">
                  <div className="w-20 h-20 border-2 border-neutral-400 bg-neutral-100 flex flex-col items-center justify-center">
                    <div className="text-2xl text-neutral-800">{new Date(date).getDate().toString().padStart(2, '0')}</div>
                    <div className="text-xs text-neutral-600">{new Date(date).toLocaleString('default', { month: 'short' }).toUpperCase()}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-base text-neutral-800 mb-1">{study?.title || meeting.studyId}</div>
                        <div className="text-sm text-neutral-600">with {study?.researcherName || meeting.researcherId}</div>
                      </div>
                      <StatusBadge status={toBadgeStatus(meeting.status)} />
                    </div>
                    <div className="flex gap-6 text-xs text-neutral-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(date).toLocaleTimeString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Video size={14} />
                        {meeting.meetingLink ? 'Video Ready' : 'Awaiting NRDC'}
                      </span>
                    </div>
                    <div className="text-sm text-neutral-600 mb-3">{meeting.notes || 'Commercialization discussion'}</div>
                    <div className="flex gap-2">
                      <WireframeButton label="Join Meeting" variant="primary" size="sm" disabled={!meeting.meetingLink} onClick={() => updateMeeting({ ...meeting, status: 'completed', updatedAt: new Date() })} />
                      {meeting.status === 'scheduled' && (
                        <WireframeButton
                          label="Mark Complete"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateMeeting({ ...meeting, status: 'completed', updatedAt: new Date() })}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </WireframeCard>
            );
          })
        )}
      </div>

      <WireframeCard title="Pending Requests">
        <WireframeTable
          headers={['Researcher', 'Technology', 'Requested Date', 'Proposed Time', 'Status']}
          rows={filteredMeetings
            .filter((meeting) => meeting.status === 'pending')
            .map((meeting) => {
              const study = studies.find((item) => item.id === meeting.studyId);
              return [
                study?.researcherName || meeting.researcherId,
                study?.title || meeting.studyId,
                new Date(meeting.createdAt).toLocaleDateString(),
                new Date(meeting.proposedDate || meeting.createdAt).toLocaleString(),
                <StatusBadge status="pending" />,
              ];
            })}
        />
      </WireframeCard>
    </div>
  );
}
