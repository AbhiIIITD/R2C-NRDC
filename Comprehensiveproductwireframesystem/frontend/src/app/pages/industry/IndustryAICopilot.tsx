import { useSearchParams } from 'react-router';
import { CopilotPanel } from '../../components/CopilotPanel';

export function IndustryAICopilot() {
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get('studyId') || undefined;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">AI Copilot</h1>
        <p className="text-sm text-neutral-600">Get intelligent assistance for technology discovery and licensing</p>
      </div>
      <CopilotPanel
        role="industry"
        title="Technology Discovery Assistant"
        subtitle="Hello. I can help match technologies to your problem statements, compare opportunities, explain readiness scores, and prepare licensing decisions."
        contextStudyId={studyId}
        prompts={[
          'Which technology matches my problem?',
          'Compare technologies.',
          'Show highest potential technologies.',
          'Explain readiness score.',
        ]}
      />
    </div>
  );
}
