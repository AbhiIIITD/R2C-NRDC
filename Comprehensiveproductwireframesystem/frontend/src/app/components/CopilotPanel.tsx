import { useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { ChatMessage, UserRole } from '@/types/index';
import { WireframeButton } from './WireframeButton';
import { WireframeCard } from './WireframeCard';
import { Sparkles } from 'lucide-react';
import { streamCopilot } from '@/services/ai.service';

interface CopilotPanelProps {
  role: UserRole;
  title: string;
  subtitle: string;
  prompts: string[];
  /** When set, the copilot is automatically grounded on this study (no need to describe it). */
  contextStudyId?: string;
}

// Canned fallback used only when the live copilot endpoint is unreachable
// (backend offline / no OpenAI key). Keeps the demo functional.
const responseFor = (role: UserRole, prompt: string) => {
  const normalized = prompt.toLowerCase();
  if (role === 'researcher') {
    if (normalized.includes('trl')) {
      return 'To improve TRL, add prototype validation evidence, document repeatable performance, and collect partner feedback from one applied use case. NRDC would look for a clearer path from lab result to deployable pilot.';
    }
    if (normalized.includes('industr')) {
      return 'Best-fit target industries are those whose pain point maps directly to your keywords and domain. For a healthcare technology, start with pharma, diagnostics, medical devices, and hospital innovation teams.';
    }
    if (normalized.includes('licens')) {
      return 'A staged non-exclusive license is usually best for early validation. Move to exclusive terms only when the partner commits milestones, territory, sublicensing rules, and commercialization timelines.';
    }
    return 'Your commercialization readiness depends on IP clarity, market urgency, prototype evidence, and buyer fit. I would strengthen the value proposition, target three industry segments, and prepare a one-page commercial summary.';
  }
  if (role === 'industry') {
    if (normalized.includes('compare')) {
      return 'Compare technologies on domain fit, readiness score, IP status, time to pilot, and whether the researcher has evidence for scale. A high-readiness but poor-fit technology should rank below a strong problem match.';
    }
    if (normalized.includes('match')) {
      return 'The strongest matches come from overlap between your problem keywords, industry sector, TRL, and readiness score. Add detailed problem statements to improve match quality.';
    }
    return 'For your discovery workflow, shortlist technologies above 70% readiness, express interest, request a researcher meeting, and move to licensing only after technical fit and IP diligence are clear.';
  }
  if (normalized.includes('risk')) {
    return 'Key risks to review: unclear IP ownership, weak prototype validation, overstated market size, missing regulatory path, and lack of industry pull. Ask for evidence before approval.';
  }
  return 'Admin recommendation: summarize the study, validate IP status, compare readiness with marketplace thresholds, and approve for publication when commercial potential and documentation are credible.';
};

export function CopilotPanel({ role, title, subtitle, prompts, contextStudyId }: CopilotPanelProps) {
  const { user } = useAuth();
  const { getChatSessionsByUser, addChatSession, updateChatSession, studies } = useAppData();
  const contextStudy = contextStudyId ? studies.find((s) => s.id === contextStudyId) : undefined;
  const [draft, setDraft] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [offline, setOffline] = useState(false);
  // Backend copilot session id — threads multi-turn context across messages.
  const backendSessionIdRef = useRef<string | undefined>(undefined);

  const session = useMemo(() => {
    if (!user) return undefined;
    return getChatSessionsByUser(user.id).find((item) => item.title === title);
  }, [user, getChatSessionsByUser, title]);
  const localSessionIdRef = useRef<string | null>(session?.id ?? null);
  if (session?.id) localSessionIdRef.current = session.id;

  const messages = session?.messages || [
    {
      id: 'welcome',
      role: 'assistant' as const,
      content: subtitle,
      createdAt: new Date(),
    },
  ];

  const persist = (nextMessages: ChatMessage[], now: Date) => {
    if (!user) return;
    if (localSessionIdRef.current) {
      updateChatSession({
        id: localSessionIdRef.current,
        userId: user.id,
        title,
        messages: nextMessages,
        createdAt: session?.createdAt || now,
        updatedAt: now,
      });
    } else {
      const id = `chat_${Date.now()}`;
      localSessionIdRef.current = id;
      addChatSession({ id, userId: user.id, title, messages: nextMessages, createdAt: now, updatedAt: now });
    }
  };

  const send = async (content: string) => {
    if (!user || !content.trim() || isStreaming) return;
    const now = new Date();
    const startMessages = session?.messages ?? [];
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      createdAt: now,
    };
    const withUser = [...startMessages, userMessage];
    persist(withUser, now);
    setDraft('');
    setIsStreaming(true);
    setStreamingText('');

    let assistantContent = '';
    try {
      const result = await streamCopilot({ message: content, sessionId: backendSessionIdRef.current, studyId: contextStudyId }, (delta) => {
        setStreamingText((prev) => prev + delta);
      });
      backendSessionIdRef.current = result.sessionId ?? backendSessionIdRef.current;
      assistantContent = result.text;
      setOffline(false);
    } catch {
      // Live AI unavailable — fall back to the canned answer so the demo continues.
      assistantContent = responseFor(role, content);
      setOffline(true);
    }

    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: assistantContent,
      createdAt: new Date(),
    };
    persist([...withUser, assistantMessage], new Date());
    setIsStreaming(false);
    setStreamingText('');
  };

  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="col-span-3">
        <div className="border-2 border-neutral-400 bg-white flex flex-col h-[600px]">
          <div className="border-b-2 border-neutral-400 p-4 bg-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={20} className="text-neutral-600 flex-shrink-0" />
              <span className="text-sm text-neutral-800 flex-shrink-0">{title}</span>
              {contextStudy && (
                <span className="badge-pill badge-info ml-1 max-w-[20rem] truncate" title={contextStudy.title}>
                  <span className="badge-dot" />
                  <span className="truncate">Discussing: {contextStudy.title}</span>
                </span>
              )}
            </div>
            {offline && (
              <span className="text-xs text-amber-700 border border-amber-300 bg-amber-50 px-2 py-0.5 rounded-sm">
                Demo mode — AI service offline
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-neutral-700 rounded flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-white" />
                  </div>
                )}
                <div className="flex-1 max-w-2xl">
                  <div className={`${message.role === 'user' ? 'bg-neutral-800 text-white' : 'bg-neutral-100 border-2 border-neutral-300 text-neutral-800'} p-3 rounded-sm`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  </div>
                  <div className={`text-xs text-neutral-500 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                {message.role === 'user' && <div className="w-8 h-8 bg-neutral-400 rounded flex-shrink-0" />}
              </div>
            ))}

            {isStreaming && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-neutral-700 rounded flex items-center justify-center flex-shrink-0">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div className="flex-1 max-w-2xl">
                  <div className="bg-neutral-100 border-2 border-neutral-300 text-neutral-800 p-3 rounded-sm">
                    <div className="text-sm whitespace-pre-wrap">
                      {streamingText || 'Thinking…'}
                      <span className="inline-block w-2 h-4 ml-0.5 bg-neutral-500 animate-pulse align-middle" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t-2 border-neutral-400 p-4 bg-white">
            <div className="flex gap-3">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !isStreaming) void send(draft);
                }}
                disabled={isStreaming}
                placeholder={isStreaming ? 'Generating response…' : 'Type your message...'}
                className="flex-1 border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-800 disabled:bg-neutral-100"
              />
              <WireframeButton label={isStreaming ? 'Sending…' : 'Send'} variant="primary" disabled={isStreaming} onClick={() => void send(draft)} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <WireframeCard title="Suggested Questions">
          <div className="space-y-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => void send(prompt)}
                disabled={isStreaming}
                className="w-full text-left p-2 border-2 border-neutral-300 bg-white hover:border-neutral-500 text-xs text-neutral-700 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </WireframeCard>
        <WireframeCard title="What I Can Do">
          <div className="space-y-2 text-xs text-neutral-600">
            <div>Analyze commercialization readiness</div>
            <div>Suggest target industries and matches</div>
            <div>Prepare review or meeting notes</div>
            <div>Explain licensing decisions</div>
          </div>
        </WireframeCard>
      </div>
    </div>
  );
}
