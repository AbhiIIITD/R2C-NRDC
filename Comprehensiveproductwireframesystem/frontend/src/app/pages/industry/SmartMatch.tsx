import { Link, useNavigate } from 'react-router';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { Target, BookOpen, Loader2 } from 'lucide-react';
import { runMatchmaking, mockMatchmaking, MatchmakingResult } from '@/services/ai.service';

export function SmartMatch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    studies,
    interests,
    addInterest,
    updateInterest,
    addLicenseRequest,
    addNotification,
    getProblemStatementsByIndustryUser,
  } = useAppData();

  const problems = useMemo(() => {
    if (!user) return [];
    return getProblemStatementsByIndustryUser(user.id);
  }, [user, getProblemStatementsByIndustryUser]);

  // ---- Real matchmaking engine (research papers, cosine similarity) ----
  const [aiResult, setAiResult] = useState<MatchmakingResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState<'live' | 'mock'>('live');

  const matchQuery = useMemo(
    () =>
      problems
        .map((p) => [p.title, p.problemDescription, p.expectedSolution, p.keywords.join(' ')].filter(Boolean).join('. '))
        .join('\n')
        .slice(0, 4000),
    [problems]
  );

  const runAiMatch = useCallback(async () => {
    if (!matchQuery.trim()) {
      setAiResult(null);
      return;
    }
    setAiLoading(true);
    try {
      const result = await runMatchmaking({ problemStatement: matchQuery, topN: 8, explain: true });
      if (!result.matches?.length) throw new Error('empty');
      setAiResult(result);
      setAiMode('live');
    } catch {
      setAiResult(mockMatchmaking(matchQuery));
      setAiMode('mock');
    }
    setAiLoading(false);
  }, [matchQuery]);

  useEffect(() => {
    void runAiMatch();
  }, [runAiMatch]);

  const explanationFor = (seedRef: string) =>
    aiResult?.explanations?.find((e) => e.seed_ref === seedRef)?.why;

  const matches = useMemo(() => {
    const published = studies.filter((study) => study.status === 'published');
    return published
      .map((study) => {
        const studyText = [study.title, study.abstract, study.domain, ...(study.keywords || [])]
          .join(' ')
          .toLowerCase();
        const keywordHits = problems.reduce((sum, problem) => {
          const sectorHit = studyText.includes(problem.industrySector.toLowerCase()) ? 2 : 0;
          const hits = problem.keywords.filter((keyword) => studyText.includes(keyword)).length;
          return sum + sectorHit + hits;
        }, 0);
        const base = problems.length === 0 ? (study.readinessScore || 60) / 2 : 45;
        const score = Math.min(98, Math.round(base + keywordHits * 9 + (study.readinessScore || 60) * 0.25));
        return {
          study,
          score,
          reasons: [
            `${study.domain} aligns with ${problems[0]?.industrySector || 'your discovery profile'}`,
            `${study.readinessScore || 60}% commercial readiness supports near-term evaluation`,
            keywordHits > 0
              ? `${keywordHits} keyword signals matched your problem statements`
              : 'Relevant marketplace technology for strategic scanning',
          ],
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [studies, problems]);

  const expressInterest = (studyId: string) => {
    if (!user) return;
    const study = studies.find((item) => item.id === studyId);
    const exists = interests.find(
      (interest) => interest.studyId === studyId && interest.industryUserId === user.id
    );
    const now = Date.now();
    const interest = exists || {
      id: `interest_${now}`,
      studyId,
      industryUserId: user.id,
      industryName: user.organization || user.name,
      status: 'interested',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as const;
    if (exists) updateInterest({ ...exists, status: 'license_requested', updatedAt: new Date() });
    else addInterest({ ...interest, status: 'license_requested' });
    const licenseId = `license_${now}`;
    addLicenseRequest({
      id: licenseId,
      studyId,
      industryUserId: user.id,
      status: 'pending',
      requestedAt: new Date(),
      licenseFee: 250000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    addNotification({
      id: `notif_${now}`,
      userId: 'admin1',
      type: 'license_requested',
      title: 'License Requested',
      message: `${user.organization || user.name} requested a license for "${study?.title || studyId}".`,
      relatedId: licenseId,
      relatedType: 'license',
      read: false,
      createdAt: new Date(),
    });
    navigate(`/industry/licensing/${licenseId}`);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">Smart Match</h1>
        <p className="text-sm text-neutral-600">
          AI-powered technology recommendations based on your problem statements and marketplace readiness.
        </p>
      </div>

      <WireframeCard className="mb-6" title="Your Match Profile">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-neutral-500 mb-1">Problem Statements</div>
            <div className="text-sm text-neutral-800">{problems.length}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Primary Sector</div>
            <div className="text-sm text-neutral-800">{problems[0]?.industrySector || 'Not set'}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Urgent Needs</div>
            <div className="text-sm text-neutral-800">
              {problems.filter((problem) => ['high', 'critical'].includes(problem.urgency)).length}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Technologies Scanned</div>
            <div className="text-sm text-neutral-800">{studies.filter((study) => study.status === 'published').length}</div>
          </div>
        </div>
        <div className="mt-4">
          <Link to="/industry/problems">
            <WireframeButton label="Edit Problem Statements" variant="ghost" size="sm" />
          </Link>
        </div>
      </WireframeCard>

      <WireframeCard
        className="mb-6"
        title="AI Research Matches"
        actions={
          aiMode === 'mock' && aiResult ? (
            <span className="rounded-sm border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              Demo mode — matchmaking engine offline
            </span>
          ) : aiResult ? (
            <span className="rounded-sm border border-green-300 bg-green-50 px-2 py-0.5 text-xs text-green-700">
              Live matchmaking engine
            </span>
          ) : undefined
        }
      >
        <div className="mb-3 flex items-center gap-2 text-xs text-neutral-600">
          <BookOpen size={14} />
          Semantic matches from the research-paper corpus (cosine similarity over your problem statements).
        </div>
        {aiLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-neutral-600">
            <Loader2 size={16} className="animate-spin" /> Running matchmaking engine…
          </div>
        ) : !matchQuery.trim() ? (
          <div className="py-4 text-sm text-neutral-600">
            Add a problem statement to get AI research-paper matches.{' '}
            <Link to="/industry/problems" className="underline">Create one</Link>.
          </div>
        ) : aiResult && aiResult.matches.length ? (
          <div className="space-y-2">
            {aiResult.matches.map((paper) => (
              <div key={paper.seed_ref} className="flex gap-3 border border-neutral-200 p-2">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-neutral-300 bg-neutral-100 text-sm text-neutral-800">
                  {Math.round(paper.cosine * 100)}%
                </div>
                <div className="flex-1">
                  <div className="text-sm text-neutral-800">{paper.title}</div>
                  <div className="text-xs text-neutral-500">
                    {paper.seed_ref}
                    {paper.sub_domain ? ` · ${paper.sub_domain}` : ''}
                    {paper.citation_count != null ? ` · ${paper.citation_count} citations` : ''}
                  </div>
                  {explanationFor(paper.seed_ref) && (
                    <div className="mt-1 text-xs text-neutral-600">{explanationFor(paper.seed_ref)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-sm text-neutral-600">No research-paper matches found.</div>
        )}
      </WireframeCard>

      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-neutral-700">Marketplace Technologies ({matches.length})</div>
        <div className="flex gap-2">
          <WireframeButton label="Refresh Matches" variant="secondary" size="sm" onClick={() => void runAiMatch()} />
          <Link to="/industry/marketplace">
            <WireframeButton label="Browse Marketplace" variant="ghost" size="sm" />
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {matches.map(({ study, score, reasons }) => (
          <WireframeCard key={study.id}>
            <div className="flex gap-6">
              <div className="flex-shrink-0 text-center">
                <div className="w-24 h-24 border-2 border-neutral-400 bg-neutral-100 flex items-center justify-center mb-2">
                  <div className="text-3xl text-neutral-800">{score}%</div>
                </div>
                <div className="text-xs text-neutral-500">Match Score</div>
              </div>

              <div className="flex-1">
                <Link to={`/industry/technology/${study.id}`} className="text-lg text-neutral-800 hover:underline block mb-2">
                  {study.title}
                </Link>

                <div className="flex gap-4 text-xs text-neutral-500 mb-3">
                  <span>{study.domain}</span>
                  <span>|</span>
                  <span>{study.researcherName}</span>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-neutral-500 mb-2">Why this matches your needs:</div>
                  <ul className="space-y-1">
                    {reasons.map((reason) => (
                      <li key={reason} className="text-sm text-neutral-700 flex items-start gap-2">
                        <span className="text-neutral-500">OK</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-6 mb-4">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Commercial Score</div>
                    <div className="text-sm text-neutral-800">{study.readinessScore || 60}/100</div>
                  </div>
                  <div className="flex-1">
                    <div className="w-full h-2 bg-neutral-300">
                      <div className="h-2 bg-neutral-700" style={{ width: `${study.readinessScore || 60}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link to={`/industry/technology/${study.id}`}>
                    <WireframeButton label="View Full Details" variant="secondary" size="sm" />
                  </Link>
                  <WireframeButton label="Express Interest" variant="primary" size="sm" onClick={() => expressInterest(study.id)} />
                  <Link to={`/industry/technology/${study.id}`}>
                    <WireframeButton label="Request Meeting" variant="secondary" size="sm" />
                  </Link>
                </div>
              </div>
            </div>
          </WireframeCard>
        ))}
      </div>

      <div className="mt-8 border-2 border-neutral-400 bg-neutral-50 p-6 text-center">
        <Target size={48} className="text-neutral-400 mx-auto mb-3" />
        <div className="text-sm text-neutral-700 mb-2">Looking for stronger matches?</div>
        <div className="text-xs text-neutral-600 mb-4">
          Add detailed problem statements so NRDC can match sector, keywords, urgency, and readiness.
        </div>
        <div className="flex gap-2 justify-center">
          <Link to="/industry/problems">
            <WireframeButton label="Create Problem Statement" variant="secondary" />
          </Link>
          <Link to="/industry/marketplace">
            <WireframeButton label="Browse Marketplace" variant="secondary" />
          </Link>
        </div>
      </div>
    </div>
  );
}
