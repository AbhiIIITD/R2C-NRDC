import { Link } from 'react-router';
import { useMemo, useState } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeInput } from '../../components/WireframeInput';
import { WireframeTable } from '../../components/WireframeTable';
import { StatusBadge } from '../../components/StatusBadge';

const toBadgeStatus = (status: string) => status.replace(/_/g, '-') as 'draft';

export function ReviewQueue() {
  const { studies } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');

  const reviewable = studies.filter((study) =>
    ['submitted', 'under_review', 'approved', 'published', 'rejected'].includes(study.status)
  );
  const availableDomains = useMemo(
    () => Array.from(new Set(reviewable.map((study) => study.domain))).sort(),
    [reviewable]
  );
  const filteredReviewable = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return reviewable.filter((study) => {
      const matchesSearch =
        !query ||
        study.title.toLowerCase().includes(query) ||
        study.researcherName.toLowerCase().includes(query) ||
        study.domain.toLowerCase().includes(query) ||
        study.keywords?.some((keyword) => keyword.toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'all' || study.status === statusFilter;
      const matchesDomain = domainFilter === 'all' || study.domain === domainFilter;
      return matchesSearch && matchesStatus && matchesDomain;
    });
  }, [reviewable, searchTerm, statusFilter, domainFilter]);
  const pending = studies.filter((study) => study.status === 'submitted');
  const underReview = studies.filter((study) => study.status === 'under_review');
  const approved = studies.filter((study) => ['approved', 'published'].includes(study.status));
  const rejected = studies.filter((study) => study.status === 'rejected');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">Review Queue</h1>
        <p className="text-sm text-neutral-600">Review and approve submitted research studies</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="border-2 border-neutral-400 bg-white p-4">
          <div className="text-2xl text-neutral-800 mb-1">{pending.length}</div>
          <div className="text-sm text-neutral-600">Pending Review</div>
        </div>
        <div className="border-2 border-neutral-400 bg-white p-4">
          <div className="text-2xl text-neutral-800 mb-1">{underReview.length}</div>
          <div className="text-sm text-neutral-600">Under Review</div>
        </div>
        <div className="border-2 border-neutral-400 bg-white p-4">
          <div className="text-2xl text-neutral-800 mb-1">{approved.length}</div>
          <div className="text-sm text-neutral-600">Approved / Published</div>
        </div>
        <div className="border-2 border-neutral-400 bg-white p-4">
          <div className="text-2xl text-neutral-800 mb-1">3.2</div>
          <div className="text-sm text-neutral-600">Avg Review Days</div>
        </div>
      </div>

      <div className="mb-6 border-2 border-neutral-400 bg-white p-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <WireframeInput placeholder="Search studies..." type="search" value={searchTerm} onChange={setSearchTerm} />
          </div>
          <div className="w-48">
            <div className="text-sm mb-1 text-neutral-700">Status</div>
            <select className="w-full border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-600" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="w-48">
            <div className="text-sm mb-1 text-neutral-700">Category</div>
            <select className="w-full border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-600" value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)}>
              <option value="all">All Categories</option>
              {availableDomains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
            </select>
          </div>
          <WireframeButton label="Clear" variant="secondary" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setDomainFilter('all'); }} />
        </div>
      </div>

      <div className="mb-4 border-b-2 border-neutral-400">
        <div className="flex gap-6">
          <button className="px-4 py-3 border-b-2 border-neutral-800 text-sm text-neutral-800">
            Pending ({pending.length})
          </button>
          <button className="px-4 py-3 text-sm text-neutral-600 hover:text-neutral-800">
            In Review ({underReview.length})
          </button>
          <button className="px-4 py-3 text-sm text-neutral-600 hover:text-neutral-800">
            Approved ({approved.length})
          </button>
          <button className="px-4 py-3 text-sm text-neutral-600 hover:text-neutral-800">
            Rejected ({rejected.length})
          </button>
        </div>
      </div>

      <WireframeTable
        headers={['Study Title', 'Researcher', 'Institution', 'Category', 'Submitted', 'Status', 'Priority', 'Actions']}
        rows={filteredReviewable.map((study) => [
          study.title,
          study.researcherName,
          'Research Institution',
          study.domain,
          new Date(study.createdAt).toLocaleDateString(),
          <StatusBadge status={toBadgeStatus(study.status)} />,
          <span className="text-xs text-neutral-700">
            {(study.readinessScore || 0) >= 75 ? 'High' : 'Medium'}
          </span>,
          <div className="flex gap-2">
            <Link to={`/admin/review/${study.id}`}>
              <WireframeButton
                label={study.status === 'submitted' ? 'Review' : 'Open'}
                variant="primary"
                size="sm"
              />
            </Link>
          </div>,
        ])}
      />

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-neutral-600">Showing {filteredReviewable.length} of {reviewable.length} studies</div>
        <div className="flex gap-2">
          <WireframeButton label="Previous" variant="ghost" size="sm" disabled />
          <WireframeButton label="1" variant="primary" size="sm" />
          <WireframeButton label="Next" variant="ghost" size="sm" disabled />
        </div>
      </div>
    </div>
  );
}
