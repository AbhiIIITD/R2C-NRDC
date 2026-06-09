import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Study,
  Interest,
  Meeting,
  LicenseRequest,
  Notification,
  ChatSession,
  ProblemStatement,
} from '@/types/index';
import { normalizeLicenseStatus } from '@/app/config/licenseStatus';
import { sortByRecent } from '@/app/utils/sort';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// App Data Context Type
// ============================================================================

interface AppDataContextType {
  // Studies
  studies: Study[];
  addStudy: (study: Study & { documentFile?: File }) => void;
  updateStudy: (study: Study) => void;
  getStudyById: (id: string) => Study | undefined;
  getStudiesByResearcher: (researcherId: string) => Study[];

  // Interests
  interests: Interest[];
  addInterest: (interest: Interest) => void;
  updateInterest: (interest: Interest) => void;
  getInterestsByStudy: (studyId: string) => Interest[];
  getInterestsByIndustryUser: (industryUserId: string) => Interest[];

  // Meetings
  meetings: Meeting[];
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (meeting: Meeting) => void;
  getMeetingsByResearcher: (researcherId: string) => Meeting[];
  getMeetingsByIndustryUser: (industryUserId: string) => Meeting[];

  // License Requests
  licenseRequests: LicenseRequest[];
  addLicenseRequest: (request: LicenseRequest) => void;
  updateLicenseRequest: (request: LicenseRequest) => void;
  getLicenseRequestsByStudy: (studyId: string) => LicenseRequest[];
  getLicenseRequestsByIndustryUser: (
    industryUserId: string
  ) => LicenseRequest[];

  // Problem Statements
  problemStatements: ProblemStatement[];
  addProblemStatement: (problem: ProblemStatement) => void;
  updateProblemStatement: (problem: ProblemStatement) => void;
  deleteProblemStatement: (problemId: string) => void;
  getProblemStatementsByIndustryUser: (industryUserId: string) => ProblemStatement[];

  // Chat Sessions
  chatSessions: ChatSession[];
  addChatSession: (session: ChatSession) => void;
  updateChatSession: (session: ChatSession) => void;
  getChatSessionsByUser: (userId: string) => ChatSession[];

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (notificationId: string) => void;
  getUnreadNotifications: (userId: string) => Notification[];
  getUserNotifications: (userId: string) => Notification[];
}

// ============================================================================
// Create Context
// ============================================================================

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// ============================================================================
// App Data Provider
// ============================================================================

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [licenseRequests, setLicenseRequests] = useState<LicenseRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  // Pull the authoritative server state for every role-scoped collection. This is
  // the single source of truth: it runs on login AND after every mutation, so the
  // UI always reflects what the backend actually persisted (never a phantom local
  // change). Returns a promise so callers can await a re-sync.
  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setStudies([]);
      setInterests([]);
      setMeetings([]);
      setLicenseRequests([]);
      setNotifications([]);
      setProblemStatements([]);
      return;
    }
    try {
      const [nextStudies, nextInterests, nextMeetings, nextLicenses, nextNotifications, nextProblems] = await Promise.all([
        api.get<Study[]>('/studies'),
        api.get<Interest[]>('/interests'),
        api.get<Meeting[]>('/meetings'),
        api.get<LicenseRequest[]>('/licenses'),
        api.get<Notification[]>('/notifications'),
        api.get<ProblemStatement[]>('/problem-statements').catch(() => []),
      ]);
      setStudies(sortByRecent(nextStudies));
      setInterests(sortByRecent(nextInterests));
      setMeetings(sortByRecent(nextMeetings));
      setLicenseRequests(sortByRecent(nextLicenses.map((request) => ({ ...request, status: normalizeLicenseStatus(request.status) }))));
      setNotifications(sortByRecent(nextNotifications));
      setProblemStatements(sortByRecent(nextProblems));
    } catch (error) {
      console.error('Failed to load backend data:', error);
    }
  }, [isAuthenticated, user?.id]);

  // Load role-scoped backend data after authentication.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Run a backend mutation, then reconcile the UI with the server. On failure the
  // optimistic change is rolled back to the real backend state and the user is told
  // — so an action that didn't persist can never look like it succeeded.
  const commit = useCallback(
    (request: Promise<unknown>, errorLabel: string) =>
      void request
        .then(() => refresh())
        .catch((error) => {
          console.error(`${errorLabel} failed:`, error);
          toast.error(`${errorLabel} could not be saved`, {
            description: error instanceof Error ? error.message : 'The change was reverted. Please try again.',
          });
          return refresh();
        }),
    [refresh],
  );

  // Server-owned collections (studies, interests, meetings, licenses,
  // notifications, problems) come ONLY from the backend. When unauthenticated we
  // show nothing — never a localStorage cache, which could hold stale/old data.
  // Also purge any legacy cache written by earlier builds so it can't resurface.
  useEffect(() => {
    if (isAuthenticated) return;
    [
      'app_studies',
      'app_interests',
      'app_meetings',
      'app_license_requests',
      'app_notifications',
      'app_problem_statements',
    ].forEach((key) => localStorage.removeItem(key));
    setStudies([]);
    setInterests([]);
    setMeetings([]);
    setLicenseRequests([]);
    setNotifications([]);
    setProblemStatements([]);
    // Chat sessions have no backend yet, so they remain a client-only cache.
    const savedChatSessions = localStorage.getItem('app_chat_sessions');
    try {
      setChatSessions(sortByRecent(savedChatSessions ? JSON.parse(savedChatSessions) : []));
    } catch {
      setChatSessions([]);
    }
  }, [isAuthenticated]);

  // Persist only the client-only chat sessions.
  useEffect(() => {
    localStorage.setItem('app_chat_sessions', JSON.stringify(chatSessions));
  }, [chatSessions]);

  // ========================================================================
  // Studies Methods
  // ========================================================================

  const addStudy = (study: Study & { documentFile?: File }): void => {
    const { documentFile, ...studyPayload } = study;
    setStudies((prev) => sortByRecent([study, ...prev]));
    const request = documentFile
      ? (() => {
          const formData = new FormData();
          Object.entries(studyPayload).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            formData.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
          });
          formData.append('file', documentFile);
          return api.upload<Study>('/studies', formData);
        })()
      : api.post<Study>('/studies', studyPayload);
    commit(request, 'Study');
  };

  const updateStudy = (study: Study): void => {
    setStudies((prev) =>
      sortByRecent(prev.map((s) => (s.id === study.id ? study : s)))
    );
    const action = study.status === 'published' ? 'publish' : study.status === 'approved' ? 'approve' : study.status === 'rejected' ? 'reject' : study.status === 'under_review' ? 'request-changes' : null;
    if (action) commit(api.post(`/studies/${study.id}/${action}`, { reason: study.rejectionReason }), 'Study update');
  };

  const getStudyById = (id: string): Study | undefined => {
    return studies.find((s) => s.id === id);
  };

  const getStudiesByResearcher = (researcherId: string): Study[] => {
    return sortByRecent(studies.filter((s) => s.researcherId === researcherId));
  };

  // ========================================================================
  // Interests Methods
  // ========================================================================

  const addInterest = (interest: Interest): void => {
    setInterests((prev) => sortByRecent([interest, ...prev]));
    commit(api.post<Interest>(`/technologies/${interest.studyId}/interests`, interest), 'Interest');
  };

  const updateInterest = (interest: Interest): void => {
    setInterests((prev) =>
      sortByRecent(prev.map((i) => (i.id === interest.id ? interest : i)))
    );
    commit(api.patch(`/interests/${interest.id}/status`, { status: interest.status }), 'Interest update');
  };

  const getInterestsByStudy = (studyId: string): Interest[] => {
    return sortByRecent(interests.filter((i) => i.studyId === studyId));
  };

  const getInterestsByIndustryUser = (industryUserId: string): Interest[] => {
    return sortByRecent(interests.filter((i) => i.industryUserId === industryUserId));
  };

  // ========================================================================
  // Meetings Methods
  // ========================================================================

  const addMeeting = (meeting: Meeting): void => {
    setMeetings((prev) => sortByRecent([meeting, ...prev]));
    commit(api.post<Meeting>('/meetings', meeting), 'Meeting');
  };

  const updateMeeting = (meeting: Meeting): void => {
    setMeetings((prev) =>
      sortByRecent(prev.map((m) => (m.id === meeting.id ? meeting : m)))
    );
    commit(api.patch(`/meetings/${meeting.id}/status`, { status: meeting.status, scheduledDate: meeting.scheduledDate, meetingLink: meeting.meetingLink }), 'Meeting update');
  };

  const getMeetingsByResearcher = (researcherId: string): Meeting[] => {
    return sortByRecent(meetings.filter((m) => m.researcherId === researcherId));
  };

  const getMeetingsByIndustryUser = (industryUserId: string): Meeting[] => {
    return sortByRecent(meetings.filter((m) => m.industryUserId === industryUserId));
  };

  // ========================================================================
  // License Requests Methods
  // ========================================================================

  const addLicenseRequest = (request: LicenseRequest): void => {
    setLicenseRequests((prev) => sortByRecent([{ ...request, status: normalizeLicenseStatus(request.status) }, ...prev]));
    commit(api.post<LicenseRequest>('/licenses', request), 'License request');
  };

  const updateLicenseRequest = (request: LicenseRequest): void => {
    setLicenseRequests((prev) =>
      sortByRecent(prev.map((r) => (r.id === request.id ? { ...request, status: normalizeLicenseStatus(request.status) } : r)))
    );
    const status = normalizeLicenseStatus(request.status);
    if (status === 'agreement_generated') {
      commit(api.post(`/licenses/${request.id}/agreement`, { terms: request.agreementTerms }), 'License update');
    } else if (status === 'agreement_executed') {
      commit(api.patch(`/licenses/${request.id}/execute`), 'License update');
    } else if (status === 'commercialized') {
      commit(api.patch(`/licenses/${request.id}/commercialize`), 'License update');
    } else {
      commit(api.patch(`/licenses/${request.id}/status`, request), 'License update');
    }
  };

  const getLicenseRequestsByStudy = (studyId: string): LicenseRequest[] => {
    return sortByRecent(licenseRequests.filter((r) => r.studyId === studyId));
  };

  const getLicenseRequestsByIndustryUser = (
    industryUserId: string
  ): LicenseRequest[] => {
    return sortByRecent(licenseRequests.filter((r) => r.industryUserId === industryUserId));
  };

  // ========================================================================
  // Problem Statement Methods
  // ========================================================================

  const addProblemStatement = (problem: ProblemStatement): void => {
    setProblemStatements((prev) => [problem, ...prev]);
    commit(api.post<ProblemStatement>('/problem-statements', problem), 'Problem statement');
  };

  const updateProblemStatement = (problem: ProblemStatement): void => {
    setProblemStatements((prev) =>
      prev.map((p) => (p.id === problem.id ? problem : p))
    );
    commit(api.patch(`/problem-statements/${problem.id}`, problem), 'Problem statement update');
  };

  const deleteProblemStatement = (problemId: string): void => {
    setProblemStatements((prev) => prev.filter((p) => p.id !== problemId));
    commit(api.delete(`/problem-statements/${problemId}`), 'Delete problem statement');
  };

  const getProblemStatementsByIndustryUser = (
    industryUserId: string
  ): ProblemStatement[] => {
    return problemStatements.filter((p) => p.industryUserId === industryUserId);
  };

  // ========================================================================
  // Chat Session Methods
  // ========================================================================

  const addChatSession = (session: ChatSession): void => {
    setChatSessions((prev) => [session, ...prev]);
  };

  const updateChatSession = (session: ChatSession): void => {
    setChatSessions((prev) =>
      prev.map((s) => (s.id === session.id ? session : s))
    );
  };

  const getChatSessionsByUser = (userId: string): ChatSession[] => {
    return chatSessions.filter((s) => s.userId === userId);
  };

  // ========================================================================
  // Notifications Methods
  // ========================================================================

  const addNotification = (notification: Notification): void => {
    setNotifications((prev) => sortByRecent([notification, ...prev]));
  };

  const markNotificationAsRead = (notificationId: string): void => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    void api.patch(`/notifications/${notificationId}/read`).catch(console.error);
  };

  const getUnreadNotifications = (userId: string): Notification[] => {
    return sortByRecent(notifications.filter(
      (n) => n.userId === userId && !n.read
    ));
  };

  const getUserNotifications = (userId: string): Notification[] => {
    return sortByRecent(notifications.filter((n) => n.userId === userId));
  };

  const value: AppDataContextType = {
    studies,
    addStudy,
    updateStudy,
    getStudyById,
    getStudiesByResearcher,
    interests,
    addInterest,
    updateInterest,
    getInterestsByStudy,
    getInterestsByIndustryUser,
    meetings,
    addMeeting,
    updateMeeting,
    getMeetingsByResearcher,
    getMeetingsByIndustryUser,
    licenseRequests,
    addLicenseRequest,
    updateLicenseRequest,
    getLicenseRequestsByStudy,
    getLicenseRequestsByIndustryUser,
    problemStatements,
    addProblemStatement,
    updateProblemStatement,
    deleteProblemStatement,
    getProblemStatementsByIndustryUser,
    chatSessions,
    addChatSession,
    updateChatSession,
    getChatSessionsByUser,
    notifications,
    addNotification,
    markNotificationAsRead,
    getUnreadNotifications,
    getUserNotifications,
  };

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
};

// ============================================================================
// useAppData Hook
// ============================================================================

export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
};
