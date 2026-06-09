import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { StatusBadge } from '../../components/StatusBadge';
import { ArrowLeft, Download } from 'lucide-react';

const toBadgeStatus = (status: string) => status.replace(/_/g, '-') as 'draft';

export function StudyReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { studies, updateStudy, addNotification } = useAppData();
  const study = studies.find((item) => item.id === id);

  if (!study) {
    return (
      <div>
        <Link to="/admin/review-queue" className="flex items-center gap-2 text-sm text-neutral-600 mb-6 hover:underline">
          <ArrowLeft size={16} />
          Back to Review Queue
        </Link>
        <WireframeCard title="Study Not Found">
          <div className="text-sm text-neutral-600 mb-4">No reviewable study matched this route.</div>
          <WireframeButton label="Return to Queue" variant="primary" onClick={() => navigate('/admin/review-queue')} />
        </WireframeCard>
      </div>
    );
  }

  const transitionStudy = (
    status: 'under_review' | 'approved' | 'published' | 'rejected',
    message: string
  ) => {
    const now = new Date();
    updateStudy({
      ...study,
      status,
      updatedAt: now,
      approvedBy: status === 'approved' || status === 'published' ? user?.id : study.approvedBy,
      approvedAt: status === 'approved' || status === 'published' ? now : study.approvedAt,
      publishedAt: status === 'published' ? now : study.publishedAt,
      rejectionReason: status === 'rejected' ? 'Commercial readiness needs stronger IP and market validation.' : undefined,
    });

    addNotification({
      id: `notif_${Date.now()}`,
      userId: study.researcherId,
      type:
        status === 'published'
          ? 'study_published'
          : status === 'rejected'
            ? 'study_rejected'
            : 'study_approved',
      title:
        status === 'published'
          ? 'Study Published'
          : status === 'rejected'
            ? 'Study Rejected'
            : 'Study Approved',
      message,
      relatedId: study.id,
      relatedType: 'study',
      read: false,
      createdAt: now,
    });

    navigate('/admin/review-queue');
  };

  return (
    <div>
      <Link to="/admin/review-queue" className="flex items-center gap-2 text-sm text-neutral-600 mb-6 hover:underline">
        <ArrowLeft size={16} />
        Back to Review Queue
      </Link>

      <div className="mb-6 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl text-neutral-800">{study.title}</h1>
            <StatusBadge status={toBadgeStatus(study.status)} />
          </div>
          <p className="text-sm text-neutral-600">
            Study ID: {study.id} | Submitted: {new Date(study.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <WireframeButton
            label="Approve"
            variant="primary"
            onClick={() => transitionStudy('approved', `NRDC approved "${study.title}" for marketplace preparation.`)}
          />
          <WireframeButton
            label="Publish"
            variant="secondary"
            onClick={() => transitionStudy('published', `NRDC published "${study.title}" to the marketplace.`)}
          />
          <WireframeButton
            label="Reject"
            variant="ghost"
            onClick={() => transitionStudy('rejected', `NRDC rejected "${study.title}" and added review guidance.`)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <WireframeCard title="Study Information">
            <div className="space-y-4">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Abstract</div>
                <div className="text-sm text-neutral-700">{study.abstract}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Domain</div>
                  <div className="text-sm text-neutral-700">{study.domain}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">TRL</div>
                  <div className="text-sm text-neutral-700">TRL {study.trl}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-1">IP Status</div>
                  <div className="text-sm text-neutral-700">{study.ipStatus || 'Pending'}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Keywords</div>
                <div className="flex flex-wrap gap-2">
                  {(study.keywords || []).map((keyword) => (
                    <span key={keyword} className="px-2 py-1 border border-neutral-400 bg-white text-xs">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </WireframeCard>

          <WireframeCard title="AI Commercial Assessment">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-neutral-700">Commercial Readiness Score</span>
                  <span className="text-lg text-neutral-800">{study.readinessScore || 60}/100</span>
                </div>
                <div className="w-full h-3 bg-neutral-300">
                  <div className="h-3 bg-neutral-700" style={{ width: `${study.readinessScore || 60}%` }} />
                </div>
              </div>
              <div>
                <div className="text-sm text-neutral-700 mb-2">Key Strengths</div>
                <ul className="space-y-1 text-sm text-neutral-600">
                  <li>Clear domain fit in {study.domain}</li>
                  <li>{study.commercialPotential || 'Commercial application appears credible.'}</li>
                  <li>Market opportunity: {study.marketSize || 'To be validated'}</li>
                  <li>IP status: {study.ipStatus || 'Requires NRDC confirmation'}</li>
                </ul>
              </div>
            </div>
          </WireframeCard>

          <WireframeCard title="Documents">
            <div className="flex items-center justify-between p-3 border-2 border-neutral-300 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-neutral-200 flex items-center justify-center">PDF</div>
                <div>
                  <div className="text-sm text-neutral-800">Research Summary.pdf</div>
                  <div className="text-xs text-neutral-500">AI-generated demo document</div>
                </div>
              </div>
              <Download size={16} className="text-neutral-500" />
            </div>
          </WireframeCard>
        </div>

        <div className="space-y-6">
          <WireframeCard title="Researcher">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-16 h-16 bg-neutral-400 rounded-full" />
              <div>
                <div className="text-sm text-neutral-800">{study.researcherName}</div>
                <div className="text-xs text-neutral-500">Research Lead</div>
                <div className="text-xs text-neutral-500">Research Institution</div>
              </div>
            </div>
          </WireframeCard>

          <WireframeCard title="Review Notes">
            <div className="border-2 border-neutral-400 bg-white p-3 h-32 mb-3 text-sm text-neutral-700">
              AI recommendation: {study.readinessScore && study.readinessScore >= 70 ? 'Approve for marketplace publication.' : 'Request stronger commercialization evidence.'}
            </div>
            <WireframeButton label="Save Notes" variant="secondary" size="sm" className="w-full" />
          </WireframeCard>

          <WireframeCard title="Decision Actions">
            <div className="space-y-2">
              <WireframeButton
                label="Approve & Publish"
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => transitionStudy('published', `NRDC approved and published "${study.title}".`)}
              />
              <WireframeButton
                label="Request Changes"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => transitionStudy('under_review', `NRDC requested changes for "${study.title}".`)}
              />
              <WireframeButton
                label="Reject Study"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => transitionStudy('rejected', `NRDC rejected "${study.title}" and added review guidance.`)}
              />
            </div>
          </WireframeCard>
        </div>
      </div>
    </div>
  );
}
