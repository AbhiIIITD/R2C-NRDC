import { useSearchParams } from 'react-router';
import { CopilotPanel } from '../../components/CopilotPanel';

export function ResearcherAICopilot() {
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get('studyId') || undefined;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">AI Copilot</h1>
        <p className="text-sm text-neutral-600">Get intelligent assistance for your research commercialization journey</p>
      </div>
      <CopilotPanel
        role="researcher"
        title="Research Commercialization Assistant"
        subtitle="Hello. I can help assess commercialization readiness, target industries, TRL improvement, licensing strategy, and preparation for industry meetings."
        contextStudyId={studyId}
        prompts={[
          'Is my technology commercialization ready?',
          'Which industries should I target?',
          'How do I improve TRL?',
          'What licensing strategy should I use?',
        ]}
      />
    </div>
  );
}
