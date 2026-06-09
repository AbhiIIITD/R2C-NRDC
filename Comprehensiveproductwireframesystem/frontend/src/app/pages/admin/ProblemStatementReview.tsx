import { useAppData } from '@/contexts/AppDataContext';
import { WireframeCard } from '../../components/WireframeCard';
import { WireframeButton } from '../../components/WireframeButton';
import { Link } from 'react-router';

export function ProblemStatementReview() {
  const { problemStatements, studies } = useAppData();

  const countMatches = (keywords: string[], sector: string) => {
    return studies.filter((study) => {
      const text = [study.title, study.abstract, study.domain, ...(study.keywords || [])]
        .join(' ')
        .toLowerCase();
      return (
        study.status === 'published' &&
        (text.includes(sector.toLowerCase()) || keywords.some((keyword) => text.includes(keyword)))
      );
    }).length;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">Industry Problem Statements</h1>
        <p className="text-sm text-neutral-600">
          Review industry demand signals and identify marketplace matching opportunities.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{problemStatements.length}</div>
          <div className="text-sm text-neutral-600">Submitted Problems</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">
            {problemStatements.filter((problem) => ['high', 'critical'].includes(problem.urgency)).length}
          </div>
          <div className="text-sm text-neutral-600">High Urgency</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">
            {problemStatements.reduce(
              (sum, problem) => sum + countMatches(problem.keywords, problem.industrySector),
              0
            )}
          </div>
          <div className="text-sm text-neutral-600">Potential Matches</div>
        </WireframeCard>
      </div>

      <div className="space-y-4">
        {problemStatements.map((problem) => (
          <WireframeCard key={problem.id}>
            <div className="flex justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg text-neutral-800">{problem.title}</h2>
                  <span className="px-2 py-1 bg-neutral-200 text-xs text-neutral-800">
                    {problem.urgency.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 mb-3">
                  {problem.industryName} | {problem.industrySector} | Budget {problem.budgetRange}
                </div>
                <p className="text-sm text-neutral-700 mb-3">{problem.problemDescription}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Current Challenges</div>
                    <div className="text-neutral-700">{problem.currentChallenges || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Expected Solution</div>
                    <div className="text-neutral-700">{problem.expectedSolution || 'Not specified'}</div>
                  </div>
                </div>
              </div>
              <div className="w-48 space-y-2">
                <div className="border-2 border-neutral-400 bg-neutral-50 p-3 text-center">
                  <div className="text-2xl text-neutral-800">
                    {countMatches(problem.keywords, problem.industrySector)}
                  </div>
                  <div className="text-xs text-neutral-600">Matches</div>
                </div>
                <Link to="/admin/review-queue">
                  <WireframeButton label="Review Technologies" variant="secondary" size="sm" className="w-full" />
                </Link>
              </div>
            </div>
          </WireframeCard>
        ))}
      </div>
    </div>
  );
}
