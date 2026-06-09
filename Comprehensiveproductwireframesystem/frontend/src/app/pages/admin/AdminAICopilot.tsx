import { CopilotPanel } from '../../components/CopilotPanel';

export function AdminAICopilot() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">AI Copilot</h1>
        <p className="text-sm text-neutral-600">Generate review notes, risks, and approval recommendations.</p>
      </div>
      <CopilotPanel
        role="admin"
        title="NRDC Review Assistant"
        subtitle="Hello. I can summarize studies, generate review notes, highlight commercialization risks, and suggest approval recommendations for NRDC workflows."
        prompts={[
          'Summarize study.',
          'Generate review notes.',
          'Highlight risks.',
          'Suggest approval recommendation.',
        ]}
      />
    </div>
  );
}
