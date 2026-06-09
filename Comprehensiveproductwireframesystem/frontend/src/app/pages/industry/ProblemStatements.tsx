import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { ProblemUrgency } from '@/types/index';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { WireframeInput } from '../../components/WireframeInput';
import { AIAnalysisPanel } from '../../components/AIAnalysisPanel';
import { Target, PlusCircle } from 'lucide-react';

const initialForm = {
  title: '',
  industrySector: 'Healthcare & Pharma',
  problemDescription: '',
  currentChallenges: '',
  expectedSolution: '',
  budgetRange: '$500K - $2M',
  urgency: 'medium' as ProblemUrgency,
  contactPerson: '',
};

export function ProblemStatements() {
  const { user } = useAuth();
  const { getProblemStatementsByIndustryUser, addProblemStatement, updateProblemStatement, deleteProblemStatement, studies } =
    useAppData();
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | ProblemUrgency>('all');
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const problems = useMemo(() => {
    if (!user) return [];
    return getProblemStatementsByIndustryUser(user.id);
  }, [user, getProblemStatementsByIndustryUser]);

  const filteredProblems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return problems.filter((problem) => {
      const matchesUrgency = urgencyFilter === 'all' || problem.urgency === urgencyFilter;
      const searchable = [
        problem.title,
        problem.industrySector,
        problem.problemDescription,
        problem.currentChallenges,
        problem.expectedSolution,
        ...problem.keywords,
      ]
        .join(' ')
        .toLowerCase();
      return matchesUrgency && (!query || searchable.includes(query));
    });
  }, [problems, searchTerm, urgencyFilter]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const saveProblem = () => {
    if (!user || !form.title.trim() || !form.problemDescription.trim()) return;

    const keywordSource = [
      form.title,
      form.industrySector,
      form.problemDescription,
      form.currentChallenges,
      form.expectedSolution,
    ].join(' ');

    const keywords = Array.from(
      new Set(
        keywordSource
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((word) => word.length > 3)
          .slice(0, 12)
      )
    );

    const now = new Date();
    const existing = problems.find((problem) => problem.id === editingId);

    if (existing) {
      updateProblemStatement({
        ...existing,
        ...form,
        keywords,
        updatedAt: now,
      });
    } else {
      addProblemStatement({
        id: `problem_${Date.now()}`,
        industryUserId: user.id,
        industryName: user.organization || user.name,
        ...form,
        keywords,
        createdAt: now,
        updatedAt: now,
      });
    }

    resetForm();
  };

  const editProblem = (problem: (typeof problems)[number]) => {
    setForm({
      title: problem.title,
      industrySector: problem.industrySector,
      problemDescription: problem.problemDescription,
      currentChallenges: problem.currentChallenges,
      expectedSolution: problem.expectedSolution,
      budgetRange: problem.budgetRange,
      urgency: problem.urgency,
      contactPerson: problem.contactPerson,
    });
    setEditingId(problem.id);
    setShowForm(true);
  };

  const matchCount = (keywords: string[], sector: string) => {
    return studies.filter((study) => {
      const haystack = [
        study.title,
        study.abstract,
        study.domain,
        ...(study.keywords || []),
      ]
        .join(' ')
        .toLowerCase();
      return (
        study.status === 'published' &&
        (haystack.includes(sector.toLowerCase()) ||
          keywords.some((keyword) => haystack.includes(keyword)))
      );
    }).length;
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl text-neutral-800 mb-2">Problem Statements</h1>
          <p className="text-sm text-neutral-600">
            Define business problems so NRDC can match relevant technologies.
          </p>
        </div>
        <WireframeButton
          label={showForm ? 'Close Form' : 'Create Problem'}
          variant="primary"
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
        />
      </div>

      {showForm && (
        <WireframeCard title={editingId ? 'Edit Industry Problem' : 'New Industry Problem'} className="mb-6">
          <div className="space-y-4">
            <WireframeInput
              label="Title"
              placeholder="Need biodegradable packaging"
              value={form.title}
              onChange={(value) => updateField('title', value)}
            />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm mb-1 text-neutral-700">Industry Sector</div>
                <select
                  value={form.industrySector}
                  onChange={(event) => updateField('industrySector', event.target.value)}
                  className="w-full border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-800"
                >
                  <option>Agro & Food Tech</option>
                  <option>Healthcare & Pharma</option>
                  <option>Chemicals & Life Sciences</option>
                  <option>Engineering & Eco Materials</option>
                  <option>CleanTech & Energy</option>
                  <option>Aerospace & Deep Tech</option>
                  <option>IoT & Electronics</option>
                </select>
              </div>
              <WireframeInput
                label="Budget Range"
                placeholder="$500K - $2M"
                value={form.budgetRange}
                onChange={(value) => updateField('budgetRange', value)}
              />
              <div>
                <div className="text-sm mb-1 text-neutral-700">Urgency</div>
                <select
                  value={form.urgency}
                  onChange={(event) => updateField('urgency', event.target.value)}
                  className="w-full border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-800"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <textarea
              value={form.problemDescription}
              onChange={(event) => updateField('problemDescription', event.target.value)}
              placeholder="Problem description"
              className="w-full h-24 border-2 border-neutral-400 bg-white p-3 text-sm text-neutral-800"
            />
            <textarea
              value={form.currentChallenges}
              onChange={(event) => updateField('currentChallenges', event.target.value)}
              placeholder="Current challenges"
              className="w-full h-20 border-2 border-neutral-400 bg-white p-3 text-sm text-neutral-800"
            />
            <textarea
              value={form.expectedSolution}
              onChange={(event) => updateField('expectedSolution', event.target.value)}
              placeholder="Expected solution"
              className="w-full h-20 border-2 border-neutral-400 bg-white p-3 text-sm text-neutral-800"
            />
            <WireframeInput
              label="Contact Person"
              placeholder={user?.name || 'Contact person'}
              value={form.contactPerson}
              onChange={(value) => updateField('contactPerson', value)}
            />
            <div className="flex justify-end">
              <WireframeButton
                label={editingId ? 'Update Problem Statement' : 'Save Problem Statement'}
                variant="primary"
                disabled={!form.title.trim() || !form.problemDescription.trim()}
                onClick={saveProblem}
              />
            </div>
          </div>
        </WireframeCard>
      )}

      <WireframeCard className="mb-6">
        <div className="grid grid-cols-3 gap-4">
          <WireframeInput
            label="Search Problems"
            placeholder="Search title, sector, keywords"
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div>
            <div className="text-sm mb-1 text-neutral-700">Urgency Filter</div>
            <select
              value={urgencyFilter}
              onChange={(event) => setUrgencyFilter(event.target.value as 'all' | ProblemUrgency)}
              className="w-full border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-800"
            >
              <option value="all">All Urgency</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="flex items-end">
            <WireframeButton
              label="Clear Filters"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setSearchTerm('');
                setUrgencyFilter('all');
              }}
            />
          </div>
        </div>
      </WireframeCard>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">{problems.length}</div>
          <div className="text-sm text-neutral-600">Active Problems</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">
            {problems.reduce((sum, problem) => sum + matchCount(problem.keywords, problem.industrySector), 0)}
          </div>
          <div className="text-sm text-neutral-600">Potential Matches</div>
        </WireframeCard>
        <WireframeCard>
          <div className="text-2xl text-neutral-800 mb-1">
            {problems.filter((problem) => ['high', 'critical'].includes(problem.urgency)).length}
          </div>
          <div className="text-sm text-neutral-600">High Urgency</div>
        </WireframeCard>
      </div>

      <div className="space-y-4">
        {filteredProblems.length === 0 ? (
          <div className="border-2 border-neutral-400 bg-white p-8 text-center">
            <PlusCircle className="mx-auto mb-3 text-neutral-500" size={40} />
            <div className="text-sm text-neutral-700 mb-3">
              {problems.length === 0 ? 'No problem statements yet.' : 'No problem statements match the current filters.'}
            </div>
            <WireframeButton label="Create First Problem" variant="primary" onClick={() => setShowForm(true)} />
          </div>
        ) : (
          filteredProblems.map((problem) => (
            <WireframeCard key={problem.id}>
              <div className="flex gap-4">
                <div className="w-16 h-16 border-2 border-neutral-400 bg-neutral-100 flex items-center justify-center">
                  <Target size={28} className="text-neutral-700" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between gap-4 mb-2">
                    <div>
                      <h2 className="text-lg text-neutral-800">{problem.title}</h2>
                      <div className="text-xs text-neutral-500">
                        {problem.industrySector} | {problem.budgetRange} | {problem.urgency.toUpperCase()}
                      </div>
                    </div>
                    <Link to="/industry/smart-match">
                      <WireframeButton label={`${matchCount(problem.keywords, problem.industrySector)} Matches`} variant="secondary" size="sm" />
                    </Link>
                  </div>
                  <p className="text-sm text-neutral-700 mb-3">{problem.problemDescription}</p>
                  <div className="flex flex-wrap gap-2">
                    {problem.keywords.slice(0, 8).map((keyword) => (
                      <span key={keyword} className="px-2 py-1 border border-neutral-300 text-xs text-neutral-700">
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <WireframeButton
                      label={analysisId === problem.id ? 'Hide AI Analysis' : 'Run AI Analysis'}
                      variant="primary"
                      size="sm"
                      onClick={() => setAnalysisId((prev) => (prev === problem.id ? null : problem.id))}
                    />
                    <WireframeButton label="Edit" variant="secondary" size="sm" onClick={() => editProblem(problem)} />
                    <WireframeButton label="Delete" variant="ghost" size="sm" onClick={() => deleteProblemStatement(problem.id)} />
                  </div>
                  {analysisId === problem.id && <AIAnalysisPanel problem={problem} />}
                </div>
              </div>
            </WireframeCard>
          ))
        )}
      </div>
    </div>
  );
}
