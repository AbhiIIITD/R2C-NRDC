import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { WireframeTable } from '../../components/WireframeTable';
import { StatusBadge } from '../../components/StatusBadge';
import { CheckSquare, Calendar, FileCheck, AlertCircle } from 'lucide-react';
import { api } from '@/services/api';
import { useAppData } from '@/contexts/AppDataContext';

interface DashboardMetrics {
  users: { total: number; researchers: number; industry: number; admins: number };
  studies: { total: number; draft: number; submitted: number; underReview: number; approved: number; published: number };
  pendingReviews: number;
  interests: number;
  meetings: { total: number; pending: number; scheduled: number; completed: number; cancelled: number };
  licenses: { total: number; requested: number; executed: number; commercialized: number; active: number };
  commercializationRate: number;
  domains: { domain: string; count: number }[];
  funnel: { published: number; interests: number; meetings: number; licenses: number; commercialized: number };
  topTechnologies: { id: string; title: string; domain: string; interests: number; meetings: number }[];
}

const fmt = (value: number | undefined) => (value === undefined ? '—' : value.toLocaleString());

export function AdminDashboard() {
  const { studies } = useAppData();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<DashboardMetrics>('/analytics/dashboard')
      .then((data) => active && setMetrics(data))
      .catch(() => active && setMetrics(null));
    return () => {
      active = false;
    };
  }, []);

  // Real review queue: studies awaiting/under admin review.
  const reviewQueue = studies
    .filter((study) => study.status === 'submitted' || study.status === 'under_review')
    .slice(0, 8);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">Admin Dashboard</h1>
        <p className="text-sm text-neutral-600">Platform overview and management</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <WireframeCard>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl text-neutral-800 mb-1">{fmt(metrics?.pendingReviews)}</div>
              <div className="text-sm text-neutral-600">Pending Reviews</div>
            </div>
            <AlertCircle size={24} className="text-neutral-400" />
          </div>
        </WireframeCard>
        <WireframeCard>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl text-neutral-800 mb-1">{fmt(metrics?.studies.published)}</div>
              <div className="text-sm text-neutral-600">Published Studies</div>
            </div>
            <FileCheck size={24} className="text-neutral-400" />
          </div>
        </WireframeCard>
        <WireframeCard>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl text-neutral-800 mb-1">{fmt(metrics?.meetings.scheduled)}</div>
              <div className="text-sm text-neutral-600">Active Meetings</div>
            </div>
            <Calendar size={24} className="text-neutral-400" />
          </div>
        </WireframeCard>
        <WireframeCard>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl text-neutral-800 mb-1">{fmt(metrics?.licenses.active)}</div>
              <div className="text-sm text-neutral-600">Active Licenses</div>
            </div>
            <CheckSquare size={24} className="text-neutral-400" />
          </div>
        </WireframeCard>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <WireframeCard
            title="Pending Review Queue"
            actions={
              <Link to="/admin/review-queue">
                <WireframeButton label="View All" variant="ghost" size="sm" />
              </Link>
            }
          >
            {reviewQueue.length ? (
              <WireframeTable
                headers={['Study Title', 'Researcher', 'Submitted', 'Status', 'Actions']}
                rows={reviewQueue.map((study) => [
                  study.title,
                  study.researcherName,
                  new Date(study.createdAt).toLocaleDateString(),
                  <StatusBadge status={study.status} />,
                  <Link to={`/admin/review/${study.id}`}>
                    <WireframeButton label="Review" variant="primary" size="sm" />
                  </Link>,
                ])}
              />
            ) : (
              <div className="text-sm text-neutral-500 py-8 text-center">No studies awaiting review.</div>
            )}
          </WireframeCard>

          <WireframeCard title="Published Studies by Domain">
            {metrics?.domains.length ? (
              <div className="space-y-2">
                {metrics.domains.map((row) => {
                  const max = metrics.domains[0]?.count || 1;
                  return (
                    <div key={row.domain}>
                      <div className="flex justify-between text-xs text-neutral-700 mb-1">
                        <span>{row.domain}</span>
                        <span>{row.count}</span>
                      </div>
                      <div className="w-full h-2 bg-neutral-300">
                        <div className="h-2 bg-neutral-700" style={{ width: `${Math.round((row.count / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-neutral-500 py-8 text-center">No published studies yet.</div>
            )}
          </WireframeCard>
        </div>

        <div className="space-y-6">
          <WireframeCard title="Platform Stats">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Total Users</div>
                <div className="text-lg text-neutral-800">{fmt(metrics?.users.total)}</div>
              </div>
              <div className="border-t-2 border-neutral-200 pt-3">
                <div className="text-xs text-neutral-500 mb-2">User Breakdown</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Researchers</span>
                    <span className="text-neutral-800">{fmt(metrics?.users.researchers)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Industry</span>
                    <span className="text-neutral-800">{fmt(metrics?.users.industry)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Admins</span>
                    <span className="text-neutral-800">{fmt(metrics?.users.admins)}</span>
                  </div>
                </div>
              </div>
              <div className="border-t-2 border-neutral-200 pt-3">
                <div className="text-xs text-neutral-500 mb-1">Commercialization Rate</div>
                <div className="text-lg text-neutral-800">{metrics ? `${metrics.commercializationRate}%` : '—'}</div>
                <div className="w-full h-2 bg-neutral-300 mt-2">
                  <div className="h-2 bg-neutral-700" style={{ width: `${metrics?.commercializationRate ?? 0}%` }} />
                </div>
              </div>
            </div>
          </WireframeCard>

          <WireframeCard title="Top Technologies">
            {metrics?.topTechnologies.length ? (
              <div className="space-y-3">
                {metrics.topTechnologies.map((tech) => (
                  <div key={tech.id} className="text-xs">
                    <div className="text-neutral-700 line-clamp-2">{tech.title}</div>
                    <div className="text-neutral-500">
                      {tech.interests} interest{tech.interests === 1 ? '' : 's'} · {tech.meetings} meeting
                      {tech.meetings === 1 ? '' : 's'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500 py-4 text-center">No industry interest yet.</div>
            )}
          </WireframeCard>

          <WireframeCard title="Quick Actions">
            <div className="space-y-2">
              <Link to="/admin/review-queue">
                <WireframeButton label="Review Queue" variant="secondary" size="sm" className="w-full" />
              </Link>
              <Link to="/admin/analytics">
                <WireframeButton label="View Analytics" variant="secondary" size="sm" className="w-full" />
              </Link>
            </div>
          </WireframeCard>
        </div>
      </div>
    </div>
  );
}
