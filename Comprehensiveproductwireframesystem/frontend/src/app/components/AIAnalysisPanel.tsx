import { useState, ReactNode } from 'react';
import { ProblemStatement } from '@/types/index';
import {
  runProblemPipeline,
  mockReport,
  isBackendProblemId,
  ProblemReport,
} from '@/services/ai.service';
import { WireframeButton } from './WireframeButton';
import { Sparkles, FileSearch, BookOpen, Cpu, ShieldCheck, TrendingUp, Loader2 } from 'lucide-react';

interface AIAnalysisPanelProps {
  problem: ProblemStatement;
}

type Status = 'idle' | 'running' | 'done';

const fitColor = (level: string) => {
  const v = (level || '').toUpperCase();
  if (v.includes('HIGH')) return 'text-green-700 border-green-300 bg-green-50';
  if (v.includes('LOW')) return 'text-red-700 border-red-300 bg-red-50';
  return 'text-amber-700 border-amber-300 bg-amber-50';
};

const cosinePct = (cosine: number) => `${Math.round(cosine * 100)}%`;

function AgentSection({
  index,
  title,
  icon,
  children,
}: {
  index: number;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="border-2 border-neutral-300 bg-white">
      <div className="flex items-center gap-2 border-b-2 border-neutral-200 bg-neutral-50 px-4 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-neutral-700 text-xs text-white">{index}</span>
        {icon}
        <span className="text-sm text-neutral-800">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function AIAnalysisPanel({ problem }: AIAnalysisPanelProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [report, setReport] = useState<ProblemReport | null>(null);
  const [mode, setMode] = useState<'live' | 'mock'>('live');

  const runAnalysis = async () => {
    setStatus('running');
    setReport(null);
    // Local-only problems (offline/demo) have no backend record — go straight to mock.
    if (!isBackendProblemId(problem.id)) {
      setReport(mockReport(problem));
      setMode('mock');
      setStatus('done');
      return;
    }
    try {
      // topTech=1 deep-analyzes the top technology (fit+compliance+commercialization).
      // Each compliance call is ~60s (multiple LLM calls + gov-site checks), so higher
      // values multiply the wait; all discovered techs still appear as recommendations.
      const result = await runProblemPipeline(problem.id, { topN: 8, topTech: 1, explain: false });
      // A live run that produced nothing usable (services down) -> show the mock instead.
      const empty =
        !result.requirement &&
        result.paperMatches.length === 0 &&
        result.recommendations.length === 0;
      if (empty) {
        setReport(mockReport(problem));
        setMode('mock');
      } else {
        setReport(result);
        setMode('live');
      }
    } catch {
      setReport(mockReport(problem));
      setMode('mock');
    }
    setStatus('done');
  };

  return (
    <div className="mt-4 border-2 border-neutral-400 bg-neutral-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-neutral-700" />
          <span className="text-sm text-neutral-800">6-Agent AI Analysis</span>
          {status === 'done' && mode === 'mock' && (
            <span className="rounded-sm border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              Demo mode — AI services offline
            </span>
          )}
          {status === 'done' && mode === 'live' && (
            <span className="rounded-sm border border-green-300 bg-green-50 px-2 py-0.5 text-xs text-green-700">
              Live AI result
            </span>
          )}
        </div>
        <WireframeButton
          label={status === 'running' ? 'Running…' : status === 'done' ? 'Re-run Analysis' : 'Run 6-Agent Analysis'}
          variant="primary"
          size="sm"
          disabled={status === 'running'}
          onClick={() => void runAnalysis()}
        />
      </div>

      {status === 'idle' && (
        <p className="text-xs text-neutral-600">
          Runs the full pipeline: requirement extraction → research-paper matchmaking → technology discovery → industry-fit,
          compliance, and commercialization analysis.
        </p>
      )}

      {status === 'running' && (
        <div className="flex items-center gap-2 py-6 text-sm text-neutral-600">
          <Loader2 size={18} className="animate-spin" />
          Running 6 agents across matchmaking + SUTRA… this can take a moment.
        </div>
      )}

      {status === 'done' && report && (
        <div className="space-y-4">
          {/* Agent 1 — Requirement Extractor */}
          <AgentSection index={1} title="Requirement Extractor" icon={<FileSearch size={16} className="text-neutral-600" />}>
            {report.requirement ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Field label="Domain" value={report.requirement.domain} />
                <Field label="Sub-domain" value={report.requirement.subDomain} />
                <Field label="Technology needed" value={report.requirement.technologyNeeded} />
                <Field label="Required TRL" value={report.requirement.requiredTrl?.toString()} />
                <Field label="Deployment scale" value={report.requirement.deploymentScale} />
                <div className="col-span-2">
                  <div className="mb-1 text-xs text-neutral-500">Extracted keywords</div>
                  <div className="flex flex-wrap gap-1">
                    {(report.requirement.keywords || []).map((k) => (
                      <span key={k} className="border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700">{k}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Empty>No structured requirement was extracted.</Empty>
            )}
          </AgentSection>

          {/* Matchmaking — research papers */}
          <AgentSection index={2} title="Research-Paper Matchmaking" icon={<BookOpen size={16} className="text-neutral-600" />}>
            {report.paperMatches.length ? (
              <div className="space-y-2">
                {report.paperMatches.map((p) => (
                  <div key={p.seedRef} className="flex gap-3 border border-neutral-200 p-2">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-neutral-300 bg-neutral-100 text-sm text-neutral-800">
                      {cosinePct(p.cosine)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-neutral-800">{p.title}</div>
                      <div className="text-xs text-neutral-500">
                        {p.seedRef}{p.subDomain ? ` · ${p.subDomain}` : ''}{p.citationCount != null ? ` · ${p.citationCount} citations` : ''}
                      </div>
                      {p.whyItFits && <div className="mt-1 text-xs text-neutral-600">{p.whyItFits}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No paper matches returned.</Empty>
            )}
          </AgentSection>

          {/* Agents 3+4 — Technology Discovery + Industry Fit */}
          <AgentSection index={3} title="Technology Discovery + Industry Fit" icon={<Cpu size={16} className="text-neutral-600" />}>
            {report.recommendations.length ? (
              <div className="space-y-3">
                {report.recommendations.map((tech) => (
                  <div key={tech.id} className="border border-neutral-200 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm text-neutral-800">{tech.name}</span>
                      <div className="flex items-center gap-2">
                        {tech.matchScore != null && (
                          <span className="text-xs text-neutral-600">match {Math.round(tech.matchScore)}</span>
                        )}
                        {tech.fitEvaluation && (
                          <span className={`rounded-sm border px-2 py-0.5 text-xs ${fitColor(tech.fitEvaluation.fitLevel)}`}>
                            Fit: {tech.fitEvaluation.fitLevel} ({Math.round(tech.fitEvaluation.score)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mb-2 flex gap-4 text-xs text-neutral-500">
                      {tech.trl != null && <span>TRL {tech.trl}</span>}
                      {tech.patentStatus && <span>Patent: {tech.patentStatus}</span>}
                      {tech.manufacturingReadiness && <span>Mfg: {tech.manufacturingReadiness}</span>}
                    </div>
                    {tech.fitEvaluation && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <ListBlock label="Strengths" items={tech.fitEvaluation.strengths} tone="text-green-700" />
                        <ListBlock label="Risks" items={tech.fitEvaluation.risks} tone="text-red-700" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No technology recommendations returned.</Empty>
            )}
          </AgentSection>

          {/* Agent 5 — Compliance Advisor */}
          <AgentSection index={4} title="Compliance Advisor (India)" icon={<ShieldCheck size={16} className="text-neutral-600" />}>
            {report.complianceReports.length ? (
              <div className="space-y-3">
                {report.complianceReports.map((c, i) => (
                  <div key={i} className="border border-neutral-200 p-3 text-xs">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-neutral-800">{c.technologyName || 'Technology'}</span>
                      {c.approvalStatus && (
                        <span className="border border-neutral-300 px-2 py-0.5 text-neutral-700">{c.approvalStatus}</span>
                      )}
                    </div>
                    {c.regulators?.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {c.regulators.map((r) => (
                          <span key={r} className="border border-neutral-400 bg-neutral-100 px-2 py-0.5 text-neutral-700">{r}</span>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <ListBlock label="Required certifications" items={c.requiredCerts} tone="text-neutral-700" />
                      <ListBlock label="Missing certifications" items={c.missingCerts} tone="text-red-700" />
                    </div>
                    {c.recommendations?.length > 0 && (
                      <div className="mt-2">
                        <ListBlock label="Recommendations" items={c.recommendations} tone="text-neutral-700" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No compliance analysis returned.</Empty>
            )}
          </AgentSection>

          {/* Agent 6 — Commercialization Advisor */}
          <AgentSection index={5} title="Commercialization Advisor" icon={<TrendingUp size={16} className="text-neutral-600" />}>
            {report.commercializationReports.length ? (
              <div className="space-y-3">
                {report.commercializationReports.map((c, i) => (
                  <div key={i} className="border border-neutral-200 p-3 text-xs">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-neutral-800">{c.technologyName || 'Technology'}</span>
                      <div className="flex gap-1">
                        {c.quickLicense && (
                          <span className="border border-green-300 bg-green-50 px-2 py-0.5 text-green-700">Quick license</span>
                        )}
                        {c.patentBuyout && (
                          <span className="border border-blue-300 bg-blue-50 px-2 py-0.5 text-blue-700">Patent buyout</span>
                        )}
                      </div>
                    </div>
                    <div className="mb-2 grid grid-cols-3 gap-3">
                      <Field label="License type" value={c.licenseType} />
                      <Field label="Tech transfer" value={c.techTransferTimeline} />
                      <Field label="Market readiness" value={c.marketReadiness} />
                    </div>
                    {c.roadmap?.length > 0 && <ListBlock label="Deployment roadmap" items={c.roadmap} tone="text-neutral-700" ordered />}
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No commercialization analysis returned.</Empty>
            )}
          </AgentSection>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-sm text-neutral-800">{value || '—'}</div>
    </div>
  );
}

function ListBlock({
  label,
  items,
  tone,
  ordered,
}: {
  label: string;
  items: string[];
  tone: string;
  ordered?: boolean;
}) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs text-neutral-500">{label}</div>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className={`flex gap-1 ${tone}`}>
            <span className="text-neutral-400">{ordered ? `${i + 1}.` : '•'}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="text-xs text-neutral-500">{children}</div>;
}
