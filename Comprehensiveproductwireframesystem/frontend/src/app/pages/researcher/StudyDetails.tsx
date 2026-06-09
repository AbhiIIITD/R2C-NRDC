import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { useAppData } from '@/contexts/AppDataContext';
import { api } from '@/services/api';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { WireframeTable } from '../../components/WireframeTable';
import { StatusBadge } from '../../components/StatusBadge';
import { WorkflowDiagram } from '../../components/WorkflowDiagram';
import { ArrowLeft, Download, Eye, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const toBadgeStatus = (status: string) => status.replace(/_/g, '-') as 'pending';

interface StudyDocument {
  id: string;
  purpose?: string;
  file?: { id: string; originalName: string };
}

export function StudyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { studies, interests, meetings } = useAppData();
  const [documents, setDocuments] = useState<StudyDocument[]>([]);

  const study = studies.find((item) => item.id === id);

  // Fetch the full record (documents aren't included in the list endpoint).
  useEffect(() => {
    if (!id) return;
    let active = true;
    api
      .get<{ documents?: StudyDocument[] }>(`/studies/${id}`)
      .then((full) => active && setDocuments(full.documents || []))
      .catch(() => active && setDocuments([]));
    return () => {
      active = false;
    };
  }, [id]);

  if (!study) {
    return (
      <div>
        <Link to="/researcher/studies" className="flex items-center gap-2 text-sm text-neutral-600 mb-6 hover:underline">
          <ArrowLeft size={16} />
          Back to My Studies
        </Link>
        <WireframeCard title="Study Not Found">
          <div className="text-sm text-neutral-600 mb-4">This study is not available.</div>
          <WireframeButton label="Back to My Studies" variant="primary" onClick={() => navigate('/researcher/studies')} />
        </WireframeCard>
      </div>
    );
  }

  const studyInterests = interests.filter((interest) => interest.studyId === study.id);
  const studyMeetings = meetings.filter((meeting) => meeting.studyId === study.id);

  const downloadDocument = async (fileId: string, name: string) => {
    try {
      const blob = await api.download(`/files/${fileId}/download`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed', { description: 'The document could not be retrieved.' });
    }
  };

  // Real commercialization journey derived from the study's actual state.
  const reached = (...statuses: string[]) => statuses.includes(study.status);
  const past = (target: string) => {
    const order = ['draft', 'submitted', 'under_review', 'approved', 'published'];
    return order.indexOf(study.status) >= order.indexOf(target);
  };
  const journey: { label: string; status: 'completed' | 'active' | 'pending' }[] = [
    { label: 'Uploaded', status: 'completed' },
    { label: 'Under Review', status: past('under_review') ? (reached('submitted', 'under_review') ? 'active' : 'completed') : 'pending' },
    { label: 'Approved', status: past('approved') ? (reached('approved') ? 'active' : 'completed') : 'pending' },
    { label: 'Published', status: study.status === 'published' ? 'active' : past('published') ? 'completed' : 'pending' },
    { label: 'Industry Interest', status: studyInterests.length ? 'active' : 'pending' },
    { label: 'Meetings', status: studyMeetings.length ? 'active' : 'pending' },
    { label: 'Licensing', status: studyInterests.some((i) => i.status === 'license_requested' || i.status === 'licensed') ? 'active' : 'pending' },
  ];

  return (
    <div>
      <Link to="/researcher/studies" className="flex items-center gap-2 text-sm text-neutral-600 mb-6 hover:underline">
        <ArrowLeft size={16} />
        Back to My Studies
      </Link>

      <div className="mb-6 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl text-neutral-800">{study.title}</h1>
            <StatusBadge status={toBadgeStatus(study.status)} />
          </div>
          <p className="text-sm text-neutral-600">
            Study ID: {study.id}
            {study.publishedAt ? ` | Published: ${new Date(study.publishedAt).toLocaleDateString()}` : ''}
          </p>
        </div>
      </div>

      {/* Key Metrics — all real */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <WireframeCard>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl text-neutral-800 mb-1">{studyInterests.length}</div>
              <div className="text-sm text-neutral-600">Industry Interests</div>
            </div>
            <TrendingUp size={24} className="text-neutral-400" />
          </div>
        </WireframeCard>
        <WireframeCard>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl text-neutral-800 mb-1">{studyMeetings.length}</div>
              <div className="text-sm text-neutral-600">Meetings</div>
            </div>
            <Calendar size={24} className="text-neutral-400" />
          </div>
        </WireframeCard>
        <WireframeCard>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl text-neutral-800 mb-1">{study.readinessScore ?? '—'}{study.readinessScore ? '/100' : ''}</div>
              <div className="text-sm text-neutral-600">Commercial Readiness</div>
            </div>
            <TrendingUp size={24} className="text-neutral-400" />
          </div>
        </WireframeCard>
        <WireframeCard>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl text-neutral-800 mb-1">TRL {study.trl}</div>
              <div className="text-sm text-neutral-600">Readiness Level</div>
            </div>
            <Eye size={24} className="text-neutral-400" />
          </div>
        </WireframeCard>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <WireframeCard title="Study Information">
            <div className="space-y-4">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Abstract</div>
                <div className="text-sm text-neutral-700 whitespace-pre-line">{study.abstract}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Domain</div>
                  <div className="text-sm text-neutral-700">{study.domain}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Researcher</div>
                  <div className="text-sm text-neutral-700">{study.researcherName}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">IP Status</div>
                  <div className="text-sm text-neutral-700">{study.ipStatus || 'Pending'}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Market Size</div>
                  <div className="text-sm text-neutral-700">{study.marketSize || 'To be validated'}</div>
                </div>
              </div>
              {study.keywords && study.keywords.length > 0 && (
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Keywords</div>
                  <div className="flex flex-wrap gap-2">
                    {study.keywords.map((keyword) => (
                      <span key={keyword} className="px-2 py-1 border border-neutral-400 bg-white text-xs">{keyword}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </WireframeCard>

          <WireframeCard title={`Industry Interest (${studyInterests.length})`}>
            {studyInterests.length ? (
              <WireframeTable
                headers={['Company', 'Interest Date', 'Status']}
                rows={studyInterests.map((interest) => [
                  interest.industryName || interest.industryUserId,
                  new Date(interest.createdAt).toLocaleDateString(),
                  <StatusBadge status={toBadgeStatus(interest.status)} />,
                ])}
              />
            ) : (
              <div className="text-sm text-neutral-500 py-6 text-center">No industry interest yet.</div>
            )}
          </WireframeCard>

          <WireframeCard title={`Meeting History (${studyMeetings.length})`}>
            {studyMeetings.length ? (
              <div className="space-y-3">
                {studyMeetings.map((meeting) => {
                  const date = meeting.scheduledDate || meeting.proposedDate || meeting.createdAt;
                  return (
                    <div key={meeting.id} className="border-2 border-neutral-300 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-sm text-neutral-800">{meeting.notes || 'Meeting'}</div>
                          <div className="text-xs text-neutral-500 mt-1">{new Date(date).toLocaleString()}</div>
                        </div>
                        <StatusBadge status={toBadgeStatus(meeting.status)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-neutral-500 py-6 text-center">No meetings scheduled.</div>
            )}
          </WireframeCard>
        </div>

        <div className="space-y-6">
          <WireframeCard title="Commercialization Journey">
            <WorkflowDiagram steps={journey} />
          </WireframeCard>

          <WireframeCard title="Commercial Assessment">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Commercial Readiness</div>
                <div className="w-full h-2 bg-neutral-300 mb-1">
                  <div className="h-2 bg-neutral-700" style={{ width: `${study.readinessScore ?? 0}%` }} />
                </div>
                <div className="text-xs text-neutral-600">{study.readinessScore ? `${study.readinessScore}/100` : 'Not scored'}</div>
              </div>
              {study.commercialPotential && (
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Commercial Rationale</div>
                  <div className="text-xs text-neutral-600">{study.commercialPotential}</div>
                </div>
              )}
              {study.competitors && (
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Competitive Landscape</div>
                  <div className="text-xs text-neutral-600">{study.competitors}</div>
                </div>
              )}
            </div>
          </WireframeCard>

          <WireframeCard title="Documents">
            {documents.length ? (
              <div className="space-y-2">
                {documents.filter((doc) => doc.file).map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => downloadDocument(doc.file!.id, doc.file!.originalName)}
                    className="w-full flex items-center justify-between p-2 border-2 border-neutral-300 hover:bg-neutral-50 text-left"
                  >
                    <div className="text-xs text-neutral-700 truncate">{doc.file!.originalName}</div>
                    <Download size={14} className="text-neutral-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500 py-2 text-center">No documents uploaded.</div>
            )}
          </WireframeCard>

          <WireframeCard title="Actions">
            <div className="space-y-2">
              <WireframeButton label="Ask AI Copilot" variant="secondary" size="sm" className="w-full" onClick={() => navigate(`/researcher/copilot?studyId=${study.id}`)} />
            </div>
          </WireframeCard>
        </div>
      </div>
    </div>
  );
}
