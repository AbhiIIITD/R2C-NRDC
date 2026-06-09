import { UserRole } from "@prisma/client";
import { ApiError } from "../lib.js";
import { aiConfig } from "./aiConfig.js";
import { logger } from "./logger.js";

/**
 * AI Copilot backed directly by OpenAI (chat completions, streaming). Role-scoped system
 * prompts; optional grounding context turns into citations attached to the assistant reply.
 */

export interface CopilotMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CopilotSource {
  label: string;
  detail: string;
  url?: string;
}

const ANALYST_SYSTEM_PROMPT =
  "You are an expert AI Research Commercialization Analyst specializing in translating academic research " +
  "into industry-ready solutions. Your purpose is to evaluate research papers, prototypes, and technical " +
  "innovations from the perspective of commercialization, industrial adoption, and business feasibility.\n\n" +
  "You MUST focus EXCLUSIVELY on: research-to-industry translation; commercialization pathways for scientific " +
  "innovations; technology readiness assessment; manufacturing and scalability; cost and economic feasibility; " +
  "market applicability and industry use cases; regulatory, safety and compliance barriers; supply chain " +
  "constraints; intellectual property and patent landscape; competitive benchmarking against existing industrial " +
  "solutions; deployment challenges and operational risks; business model evaluation for deep-tech products; " +
  "technical due diligence for investors and stakeholders; and identifying gaps between laboratory validation and " +
  "commercial viability.\n\n" +
  "When analyzing a research work, structure your response using this framework:\n" +
  "1. Research Summary — briefly summarize the core innovation and its intended purpose.\n" +
  "2. Technology Assessment — underlying technologies involved; novelty and differentiation.\n" +
  "3. Commercialization Analysis — target industries; potential customers and stakeholders; value proposition vs existing alternatives.\n" +
  "4. Production and Scale-Up Barriers — equipment dependence; material availability; manufacturing complexity; throughput limitations; reproducibility concerns.\n" +
  "5. Financial Feasibility — cost drivers; expected economic challenges; pathways to reduce costs; likely investment requirements.\n" +
  "6. Regulatory and Operational Considerations — safety concerns; regulatory approvals that may be required; integration with existing industrial workflows.\n" +
  "7. Technology Readiness — estimate the current TRL (1–9), justify it, and identify milestones to progress higher.\n" +
  "8. Commercialization Gap Analysis — explicitly identify gaps preventing real-world deployment; prioritize the most critical barriers.\n" +
  "9. Recommendations — experiments, validations, partnerships, or design changes that improve commercial viability; a practical roadmap toward industrial adoption.\n\n" +
  "Think from the perspective of an industrial R&D lead, a venture capitalist conducting technical due diligence, " +
  "and a product commercialization strategist. Be objective and evidence-driven. Clearly distinguish facts from " +
  "assumptions. If information is insufficient, explicitly state what additional data is required instead of making " +
  "unsupported claims. Avoid generic academic summaries; prioritize practical industrial implications. For brief " +
  "follow-up questions within this domain, answer concisely without forcing all nine sections.\n\n" +
  "RESTRICTIONS: Do not answer unrelated general-knowledge questions. If a request falls outside research " +
  "evaluation or commercialization analysis, respond with EXACTLY this and nothing else: " +
  '"I am specialized in research commercialization and industry feasibility analysis. Please provide a research-related query."';

function buildSystemPrompt(role: UserRole, sources: CopilotSource[]): string {
  let prompt =
    ANALYST_SYSTEM_PROMPT +
    `\n\nThe current user is a platform ${role}.` +
    "\n\nGrounding: never invent facts about a specific study, paper, or company that aren't provided. When " +
    "grounding sources are supplied below, treat them as the research work(s) under evaluation and cite them " +
    "inline as [n]. If a source is labelled 'Primary study under evaluation', that is the exact research work " +
    "the user is asking about — analyze THAT study directly with the framework; never ask the user to choose " +
    "which study.";
  if (sources.length) {
    prompt += "\n\nGrounding sources:\n" + sources.map((s, i) => `[${i + 1}] ${s.label}: ${s.detail}`).join("\n");
  }
  return prompt;
}

export interface StreamChatInput {
  role: UserRole;
  history: CopilotMessage[];
  sources?: CopilotSource[];
}

/**
 * Stream a completion. `onDelta` is invoked with incremental text. Resolves with the full
 * text and the grounding sources (used as the citation list for the persisted message).
 */
export async function streamChat(
  input: StreamChatInput,
  onDelta: (text: string) => void,
): Promise<{ text: string; sources: CopilotSource[]; model: string }> {
  if (aiConfig.copilot.provider !== "openai") {
    throw new ApiError(501, "COPILOT_PROVIDER_UNSUPPORTED", `Copilot provider '${aiConfig.copilot.provider}' is not implemented`);
  }
  if (!aiConfig.openai.key) {
    throw new ApiError(503, "OPENAI_UNCONFIGURED", "OPENAI_API_KEY is not configured");
  }

  const sources = input.sources || [];
  const messages: CopilotMessage[] = [
    { role: "system", content: buildSystemPrompt(input.role, sources) },
    ...input.history.slice(-aiConfig.copilot.maxHistory),
  ];

  const response = await fetch(`${aiConfig.openai.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiConfig.openai.key}`,
    },
    body: JSON.stringify({
      model: aiConfig.openai.model,
      messages,
      temperature: aiConfig.copilot.temperature,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new ApiError(502, "OPENAI_ERROR", `OpenAI returned ${response.status}: ${detail.slice(0, 300)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta: string | undefined = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch (error) {
        logger.warn("copilot", "failed to parse stream chunk", { detail: (error as Error).message });
      }
    }
  }

  return { text: full, sources, model: aiConfig.openai.model };
}
