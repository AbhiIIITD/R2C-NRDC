import { useEffect, useState } from 'react';
import { WireframeCard } from '../../components/WireframeCard';
import { WorkflowDiagram } from '../../components/WorkflowDiagram';
import { api } from '@/services/api';

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
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export function AnalyticsDashboard() {
  const [m, setMetrics] = useState<DashboardMetrics | null>(null);

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

  const licensed = (m?.licenses.executed ?? 0) + (m?.licenses.commercialized ?? 0);
  const domainMax = m?.domains[0]?.count || 1;
  const pipeline = m
    ? [
        { label: 'Draft', value: m.studies.draft },
        { label: 'Submitted', value: m.studies.submitted },
        { label: 'Under Review', value: m.studies.underReview },
        { label: 'Approved', value: m.studies.approved },
        { label: 'Published', value: m.studies.published },
      ]
    : [];
  const pipelineMax = Math.max(1, ...pipeline.map((p) => p.value));

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl text-neutral-800 mb-2">Analytics Dashboard</h1>
          <p className="text-sm text-neutral-600">Platform performance and insights — live data</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{fmt(m?.users.total)}</div>
          <div className="text-sm text-neutral-600 mb-1">Total Users</div>
          <div className="text-xs text-neutral-500">{fmt(m?.users.researchers)} researchers · {fmt(m?.users.industry)} industry</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{fmt(m?.studies.published)}</div>
          <div className="text-sm text-neutral-600 mb-1">Published Studies</div>
          <div className="text-xs text-neutral-500">{fmt(m?.studies.total)} total in pipeline</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{fmt(m?.interests)}</div>
          <div className="text-sm text-neutral-600 mb-1">Active Collaborations</div>
          <div className="text-xs text-neutral-500">industry interests expressed</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{m ? fmt(licensed) : '—'}</div>
          <div className="text-sm text-neutral-600 mb-1">Technologies Licensed</div>
          <div className="text-xs text-neutral-500">{fmt(m?.licenses.total)} license requests</div>
        </WireframeCard>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <WireframeCard title="Commercialization Funnel">
          <WorkflowDiagram
            steps={
              m
                ? [
                    { label: `Published: ${m.funnel.published}`, status: 'completed' },
                    { label: `Industry Interest: ${m.funnel.interests} (${pct(m.funnel.interests, m.funnel.published)}%)`, status: m.funnel.interests ? 'active' : 'pending' },
                    { label: `Meetings: ${m.funnel.meetings} (${pct(m.funnel.meetings, m.funnel.published)}%)`, status: m.funnel.meetings ? 'active' : 'pending' },
                    { label: `Licenses: ${m.funnel.licenses} (${pct(m.funnel.licenses, m.funnel.published)}%)`, status: m.funnel.licenses ? 'active' : 'pending' },
                    { label: `Commercialized: ${m.funnel.commercialized} (${pct(m.funnel.commercialized, m.funnel.published)}%)`, status: m.funnel.commercialized ? 'active' : 'pending' },
                  ]
                : []
            }
          />
          <div className="mt-4 p-3 bg-neutral-50 border-2 border-neutral-300">
            <div className="text-xs text-neutral-700 mb-1">Commercialization Rate</div>
            <div className="text-lg text-neutral-800">{m ? `${m.commercializationRate}%` : '—'}</div>
            <div className="text-xs text-neutral-500">Published studies → Commercialized</div>
          </div>
        </WireframeCard>

        <WireframeCard title="Study Pipeline">
          <div className="space-y-3">
            {pipeline.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between mb-1 text-sm">
                  <span className="text-neutral-600">{p.label}</span>
                  <span className="text-neutral-800">{p.value}</span>
                </div>
                <div className="w-full h-2 bg-neutral-300">
                  <div className="h-2 bg-neutral-700" style={{ width: `${Math.round((p.value / pipelineMax) * 100)}%` }} />
                </div>
              </div>
            ))}
            {!m && <div className="text-sm text-neutral-500 py-8 text-center">Loading…</div>}
          </div>
        </WireframeCard>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <WireframeCard title="Published Studies by Domain">
          <div className="space-y-3">
            {m?.domains.map((row) => (
              <div key={row.domain}>
                <div className="flex justify-between mb-1 text-sm">
                  <span className="text-neutral-600">{row.domain}</span>
                  <span className="text-neutral-800">{row.count} ({pct(row.count, m.studies.published)}%)</span>
                </div>
                <div className="w-full h-2 bg-neutral-300">
                  <div className="h-2 bg-neutral-700" style={{ width: `${Math.round((row.count / domainMax) * 100)}%` }} />
                </div>
              </div>
            ))}
            {m && !m.domains.length && <div className="text-sm text-neutral-500 py-8 text-center">No published studies yet.</div>}
          </div>
        </WireframeCard>

        <WireframeCard title="Meeting Activity">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-neutral-600">Total Meetings</span><span className="text-neutral-800">{fmt(m?.meetings.total)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-600">Scheduled</span><span className="text-neutral-800">{fmt(m?.meetings.scheduled)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-600">Completed</span><span className="text-neutral-800">{fmt(m?.meetings.completed)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-600">Pending</span><span className="text-neutral-800">{fmt(m?.meetings.pending)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-600">Cancelled</span><span className="text-neutral-800">{fmt(m?.meetings.cancelled)}</span></div>
          </div>
        </WireframeCard>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <WireframeCard title="Top Technologies by Interest">
          <div className="space-y-3">
            {m?.topTechnologies.map((tech) => (
              <div key={tech.id} className="border-2 border-neutral-300 p-3">
                <div className="text-sm text-neutral-800 mb-1 line-clamp-2">{tech.title}</div>
                <div className="text-xs text-neutral-600">{tech.interests} interest{tech.interests === 1 ? '' : 's'} • {tech.meetings} meeting{tech.meetings === 1 ? '' : 's'}{tech.domain ? ` • ${tech.domain}` : ''}</div>
              </div>
            ))}
            {m && !m.topTechnologies.length && <div className="text-sm text-neutral-500 py-4 text-center">No industry interest yet.</div>}
          </div>
        </WireframeCard>

        <WireframeCard title="Conversion Metrics">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-600">Interest → Meeting Rate</span>
              <span className="text-neutral-800">{m ? `${pct(m.funnel.meetings, m.funnel.interests)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Meeting → License Rate</span>
              <span className="text-neutral-800">{m ? `${pct(m.funnel.licenses, m.funnel.meetings)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Published → Interest Rate</span>
              <span className="text-neutral-800">{m ? `${pct(m.funnel.interests, m.funnel.published)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Commercialization Rate</span>
              <span className="text-neutral-800">{m ? `${m.commercializationRate}%` : '—'}</span>
            </div>
          </div>
        </WireframeCard>
      </div>
    </div>
  );
}
