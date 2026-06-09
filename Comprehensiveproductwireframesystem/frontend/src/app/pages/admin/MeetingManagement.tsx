import { useAppData } from '@/contexts/AppDataContext';
import { useNavigate } from 'react-router';
import { useMemo, useState } from 'react';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeInput } from '../../components/WireframeInput';
import { WireframeTable } from '../../components/WireframeTable';
import { WireframeCard } from '../../components/WireframeCard';
import { StatusBadge } from '../../components/StatusBadge';

const toBadgeStatus = (status: string) => status.replace(/_/g, '-') as 'pending';

export function MeetingManagement() {
  const navigate = useNavigate();
  const { meetings, studies, licenseRequests, updateMeeting, addNotification } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const filteredMeetings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const now = new Date();
    return meetings.filter((meeting) => {
      const study = studies.find((item) => item.id === meeting.studyId);
      const date = new Date(meeting.scheduledDate || meeting.proposedDate || meeting.createdAt);
      const matchesSearch =
        !query ||
        meeting.id.toLowerCase().includes(query) ||
        meeting.industryUserId.toLowerCase().includes(query) ||
        meeting.researcherId.toLowerCase().includes(query) ||
        meeting.notes?.toLowerCase().includes(query) ||
        study?.title.toLowerCase().includes(query) ||
        study?.researcherName.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
      const matchesDate =
        dateFilter === 'all' ||
        (dateFilter === 'upcoming' && date >= now) ||
        (dateFilter === 'past' && date < now);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [meetings, studies, searchTerm, statusFilter, dateFilter]);

  const approveMeeting = (meetingId: string) => {
    const meeting = meetings.find((item) => item.id === meetingId);
    if (!meeting) return;
    const study = studies.find((item) => item.id === meeting.studyId);
    updateMeeting({
      ...meeting,
      status: 'scheduled',
      scheduledDate: meeting.proposedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      meetingLink: meeting.meetingLink || `https://meet.nrdc-r2c.demo/${meeting.id}`,
      updatedAt: new Date(),
    });
    addNotification({
      id: `notif_${Date.now()}`,
      userId: meeting.industryUserId,
      type: 'meeting_approved',
      title: 'Meeting Approved',
      message: `NRDC approved your meeting request for "${study?.title || 'the selected technology'}".`,
      relatedId: meeting.id,
      relatedType: 'meeting',
      read: false,
      createdAt: new Date(),
    });
    addNotification({
      id: `notif_${Date.now()}_researcher`,
      userId: meeting.researcherId,
      type: 'meeting_scheduled',
      title: 'Meeting Scheduled',
      message: `A meeting has been scheduled for "${study?.title || 'your technology'}".`,
      relatedId: meeting.id,
      relatedType: 'meeting',
      read: false,
      createdAt: new Date(),
    });
  };

  const completeMeeting = (meetingId: string) => {
    const meeting = meetings.find((item) => item.id === meetingId);
    if (!meeting) return;
    updateMeeting({ ...meeting, status: 'completed', updatedAt: new Date() });
  };

  // Real meeting analytics derived from loaded data.
  const completedCount = meetings.filter((m) => m.status === 'completed').length;
  const completionRate = meetings.length ? Math.round((completedCount / meetings.length) * 100) : 0;
  const techsWithMeetings = new Set(meetings.map((m) => m.studyId)).size;
  const avgMeetingsPerTech = techsWithMeetings ? (meetings.length / techsWithMeetings).toFixed(1) : '0';
  const meetingsToLicenseRate = meetings.length ? Math.round((licenseRequests.length / meetings.length) * 100) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">Meeting Management</h1>
        <p className="text-sm text-neutral-600">Oversee all researcher-industry meetings</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{meetings.filter((m) => ['pending', 'approved', 'scheduled'].includes(m.status)).length}</div>
          <div className="text-sm text-neutral-600">Active Meetings</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{meetings.filter((m) => m.status === 'completed').length}</div>
          <div className="text-sm text-neutral-600">Completed</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{meetings.filter((m) => m.status === 'pending').length}</div>
          <div className="text-sm text-neutral-600">Pending Approval</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{completionRate}%</div>
          <div className="text-sm text-neutral-600">Completion Rate</div>
        </WireframeCard>
      </div>

      <div className="mb-6 border-2 border-neutral-400 bg-white p-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <WireframeInput placeholder="Search meetings..." type="search" value={searchTerm} onChange={setSearchTerm} />
          </div>
          <div className="w-48">
            <div className="text-sm mb-1 text-neutral-700">Status</div>
            <select className="w-full border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-600" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="w-48">
            <div className="text-sm mb-1 text-neutral-700">Date Range</div>
            <select className="w-full border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-600" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option value="all">All Dates</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>
        </div>
      </div>

      <WireframeTable
        headers={['Researcher', 'Industry Partner', 'Technology', 'Date', 'Time', 'Status', 'Actions']}
        rows={filteredMeetings.map((meeting) => {
          const study = studies.find((item) => item.id === meeting.studyId);
          const date = meeting.scheduledDate || meeting.proposedDate || meeting.createdAt;
          return [
            study?.researcherName || meeting.researcherId,
            meeting.industryUserId,
            study?.title || meeting.studyId,
            new Date(date).toLocaleDateString(),
            new Date(date).toLocaleTimeString(),
            <StatusBadge status={toBadgeStatus(meeting.status)} />,
            <div className="flex gap-2">
              {meeting.status === 'pending' && (
                <WireframeButton label="Approve" variant="primary" size="sm" onClick={() => approveMeeting(meeting.id)} />
              )}
              {meeting.status === 'scheduled' && (
                <WireframeButton label="Complete" variant="secondary" size="sm" onClick={() => completeMeeting(meeting.id)} />
              )}
              <WireframeButton label="View" variant="ghost" size="sm" onClick={() => navigate(`/admin/meetings/${meeting.id}`)} />
            </div>,
          ];
        })}
      />

      <div className="mt-6 grid grid-cols-2 gap-6">
        <WireframeCard title="Meeting Analytics">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-600">Avg Meetings per Technology</span>
              <span className="text-neutral-800">{avgMeetingsPerTech}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Meetings to License Rate</span>
              <span className="text-neutral-800">{meetingsToLicenseRate}%</span>
            </div>
          </div>
        </WireframeCard>

        <WireframeCard title="Recent Activity">
          <div className="space-y-2 text-xs">
            {meetings.slice(0, 3).map((meeting) => (
              <div key={meeting.id}>
                <div className="text-neutral-700">{meeting.status.replace(/_/g, ' ')}</div>
                <div className="text-neutral-500">{studies.find((study) => study.id === meeting.studyId)?.title || meeting.studyId}</div>
              </div>
            ))}
          </div>
        </WireframeCard>
      </div>
    </div>
  );
}
