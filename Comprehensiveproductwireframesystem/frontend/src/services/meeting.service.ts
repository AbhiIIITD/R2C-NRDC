import { Meeting, MeetingStatus } from '@/types/index';

/**
 * Meeting Service
 * Handles meeting requests and management
 */

// ============================================================================
// Create Meeting Request
// ============================================================================

export async function createMeetingRequest(
  interestId: string,
  studyId: string,
  researcherId: string,
  industryUserId: string,
  proposedDate?: Date,
  notes?: string
): Promise<Meeting> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // In future: POST /api/meetings

  const meeting: Meeting = {
    id: `meeting_${Date.now()}`,
    interestId,
    studyId,
    researcherId,
    industryUserId,
    status: 'pending',
    proposedDate,
    notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store in localStorage
  const meetings = JSON.parse(localStorage.getItem('app_meetings') || '[]');
  meetings.push(meeting);
  localStorage.setItem('app_meetings', JSON.stringify(meetings));

  return meeting;
}

// ============================================================================
// Update Meeting Status
// ============================================================================

export async function updateMeetingStatus(
  meetingId: string,
  status: MeetingStatus
): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In future: PATCH /api/meetings/:id/status

  const meetings = JSON.parse(localStorage.getItem('app_meetings') || '[]');
  const index = meetings.findIndex((m: Meeting) => m.id === meetingId);
  if (index !== -1) {
    meetings[index].status = status;
    meetings[index].updatedAt = new Date();
    localStorage.setItem('app_meetings', JSON.stringify(meetings));
  }
}

// ============================================================================
// Schedule Meeting
// ============================================================================

export async function scheduleMeeting(
  meetingId: string,
  scheduledDate: Date,
  meetingLink: string
): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In future: PATCH /api/meetings/:id/schedule

  const meetings = JSON.parse(localStorage.getItem('app_meetings') || '[]');
  const index = meetings.findIndex((m: Meeting) => m.id === meetingId);
  if (index !== -1) {
    meetings[index].scheduledDate = scheduledDate;
    meetings[index].meetingLink = meetingLink;
    meetings[index].status = 'scheduled';
    meetings[index].updatedAt = new Date();
    localStorage.setItem('app_meetings', JSON.stringify(meetings));
  }
}

// ============================================================================
// Get Researcher Meetings
// ============================================================================

export async function getResearcherMeetings(
  researcherId: string
): Promise<Meeting[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  // In future: GET /api/meetings?researcherId=:id

  const meetings = JSON.parse(localStorage.getItem('app_meetings') || '[]');
  return meetings.filter((m: Meeting) => m.researcherId === researcherId);
}

// ============================================================================
// Get Industry User Meetings
// ============================================================================

export async function getIndustryUserMeetings(
  industryUserId: string
): Promise<Meeting[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  // In future: GET /api/meetings?industryUserId=:id

  const meetings = JSON.parse(localStorage.getItem('app_meetings') || '[]');
  return meetings.filter((m: Meeting) => m.industryUserId === industryUserId);
}

// ============================================================================
// Get Pending Meetings
// ============================================================================

export async function getPendingMeetings(): Promise<Meeting[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  // In future: GET /api/meetings?status=pending

  const meetings = JSON.parse(localStorage.getItem('app_meetings') || '[]');
  return meetings.filter((m: Meeting) => m.status === 'pending');
}

// ============================================================================
// Approve Meeting Request
// ============================================================================

export async function approveMeetingRequest(meetingId: string): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In future: POST /api/meetings/:id/approve

  await updateMeetingStatus(meetingId, 'approved');
}
