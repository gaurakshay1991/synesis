import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({
  name: "synesis-risk-intelligence",
  title: "Synesis Risk Intelligence",
  version: "1.0.0",
  description: "Neuro-Symbolic Risk Intelligence for contract review and regulatory impact mapping.",
  instructions:
    "Use open-synesis to launch the interactive workspace. Use analyze-contract for explainable clause risk analysis and map-regulatory-impact for regulatory change triage.",
  websiteUrl: "https://github.com/gaurakshay1991/synesis",
});

const severitySchema = z.enum(["low", "medium", "high", "critical"]);

const findingSchema = z.object({
  category: z.string().describe("Risk category"),
  severity: severitySchema.describe("Risk severity"),
  evidence: z.string().describe("Exact or representative contract language triggering the finding"),
  whyItMatters: z.string().describe("Plain-English explanation of the legal or operational consequence"),
  suggestedRevision: z.string().describe("Safer drafting direction or replacement language"),
});

const obligationSchema = z.object({
  party: z.string(),
  obligation: z.string(),
  trigger: z.string(),
});

const analyzeOutputSchema = z.object({
  riskScore: z.number().min(0).max(100),
  riskBand: z.enum(["Low", "Moderate", "High", "Critical"]),
  summary: z.string(),
  findings: z.array(findingSchema),
  obligations: z.array(obligationSchema),
  methodology: z.string(),
});

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

function excerpt(text: string, needle: RegExp, fallback: string) {
  const match = text.match(needle);
  if (!match || match.index === undefined) return fallback;
  return normalize(text.slice(Math.max(0, match.index - 80), Math.min(text.length, match.index + 220)));
}

function analyzeContractText(contractText: string) {
  const text = normalize(contractText);
  const lower = text.toLowerCase();
  const findings: Array<z.infer<typeof findingSchema>> = [];
  const obligations: Array<z.infer<typeof obligationSchema>> = [];

  const add = (
    category: string,
    severity: "low" | "medium" | "high" | "critical",
    needle: RegExp,
    whyItMatters: string,
    suggestedRevision: string,
    fallback: string
  ) => {
    findings.push({
      category,
      severity,
      evidence: excerpt(text, needle, fallback),
      whyItMatters,
      suggestedRevision,
    });
  };

  if (/unlimited liability|without limitation|all losses|any and all damages/i.test(text)) {
    add(
      "Liability",
      "critical",
      /unlimited liability|without limitation|all losses|any and all damages/i,
      "Potentially uncapped exposure can exceed the commercial value of the contract and may bypass ordinary risk allocation.",
      "Introduce an aggregate liability cap linked to fees or a negotiated amount, with narrowly defined carve-outs.",
      "Broad or uncapped liability language detected."
    );
  }

  if (/indemnif(y|ies|ication).{0,160}(all|any|whatsoever)|hold harmless/i.test(text)) {
    add(
      "Indemnity",
      "high",
      /indemnif(y|ies|ication)|hold harmless/i,
      "A broad indemnity may shift third-party and direct-loss exposure beyond risks the indemnifying party controls.",
      "Limit indemnity to specified third-party claims, require causation, notice, defence control, mitigation, and exclusions for the beneficiary's fault.",
      "Broad indemnity language detected."
    );
  }

  if (/sole discretion|absolute discretion|without cause|for convenience/i.test(text)) {
    add(
      "Termination / Discretion",
      "high",
      /sole discretion|absolute discretion|without cause|for convenience/i,
      "One-sided discretion can create abrupt termination, performance, or payment risk.",
      "Add objective triggers, reasonable notice, cure rights where appropriate, and settlement of accrued obligations.",
      "One-sided discretionary right detected."
    );
  }

  if (/auto.?renew|automatically renew|evergreen/i.test(text)) {
    add(
      "Renewal",
      "medium",
      /auto.?renew|automatically renew|evergreen/i,
      "Automatic renewal can extend commitments unless notice is tracked and delivered on time.",
      "Specify a clear renewal term, advance notice window, reminder obligation, and termination option before renewal.",
      "Automatic renewal mechanism detected."
    );
  }

  if (/personal data|personal information|data processor|data fiduciary|privacy/i.test(text)) {
    add(
      "Data Protection",
      "medium",
      /personal data|personal information|data processor|data fiduciary|privacy/i,
      "Data processing creates privacy, security, retention, breach-response, and cross-border transfer obligations.",
      "Define roles, purpose limitation, security controls, breach notification, retention/deletion, subprocessors, and transfer conditions.",
      "Personal-data processing language detected."
    );
  }

  if (/exclusive jurisdiction|governing law|arbitration/i.test(text)) {
    const foreign = /(new york|england|singapore|delaware|california|switzerland)/i.test(text);
    add(
      "Dispute Resolution",
      foreign ? "high" : "medium",
      /exclusive jurisdiction|governing law|arbitration/i,
      foreign
        ? "Foreign governing law or forum can materially increase enforcement cost and procedural complexity."
        : "Dispute-resolution wording should be checked for consistency across governing law, forum, seat, rules, and enforcement.",
      "Align governing law, forum/seat, arbitration rules, language, interim relief, and service mechanics with the transaction's risk position.",
      "Dispute-resolution provision detected."
    );
  }

  if (/confidential/i.test(text) && !/surviv(e|al).{0,80}confidential|confidential.{0,80}surviv/i.test(text)) {
    add(
      "Confidentiality",
      "medium",
      /confidential/i,
      "Confidentiality duties without a defined survival period may become unclear after termination.",
      "Add a defined survival period, with longer protection for trade secrets and legally protected data where appropriate.",
      "Confidentiality language without clear survival wording detected."
    );
  }

  if (/shall pay|must pay|payment within|invoice/i.test(text)) {
    obligations.push({
      party: "Payment obligor",
      obligation: excerpt(text, /shall pay|must pay|payment within|invoice/i, "Payment obligation detected."),
      trigger: "Invoice, milestone, acceptance, or contractual due date.",
    });
  }
  if (/deliver|provide services|perform the services|service levels?/i.test(text)) {
    obligations.push({
      party: "Service provider",
      obligation: excerpt(text, /deliver|provide services|perform the services|service levels?/i, "Performance obligation detected."),
      trigger: "Effective date, statement of work, milestone, or service period.",
    });
  }
  if (/notice.{0,60}(days|business days)|within.{0,30}days.{0,60}notice/i.test(text)) {
    obligations.push({
      party: "Relevant notifying party",
      obligation: excerpt(text, /notice.{0,60}(days|business days)|within.{0,30}days.{0,60}notice/i, "Notice obligation detected."),
      trigger: "Specified event requiring contractual notice.",
    });
  }

  if (findings.length === 0) {
    findings.push({
      category: "General",
      severity: "low",
      evidence: text.slice(0, 240) || "No contract text supplied.",
      whyItMatters: "No configured high-signal risk pattern was detected. This does not establish that the document is risk-free.",
      suggestedRevision: "Run a full legal review for transaction-specific risks, defined terms, schedules, regulatory requirements, and commercial alignment.",
    });
  }

  const weights = { low: 8, medium: 18, high: 30, critical: 45 } as const;
  const raw = findings.reduce((sum, f) => sum + weights[f.severity], 0);
  const riskScore = Math.min(100, Math.max(5, raw));
  const riskBand = riskScore >= 80 ? "Critical" : riskScore >= 55 ? "High" : riskScore >= 30 ? "Moderate" : "Low";

  return {
    riskScore,
    riskBand,
    summary: `Synesis identified ${findings.length} material review point(s) and ${obligations.length} operational obligation(s). The score prioritizes review; it is not a legal conclusion.`,
    findings,
    obligations,
    methodology:
      "Explainable rules identify high-signal legal patterns, then map each trigger to a consequence and remediation. The MVP is deterministic and auditable; production versions can add approved regulatory sources, clause libraries, precedent retrieval, and model-assisted reasoning.",
  } as const;
}

export const openSynesis = server.tool(
  {
    name: "open-synesis",
    title: "Open Synesis",
    description: "Open the Synesis interactive risk-intelligence workspace.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      appName: z.string(),
      tagline: z.string(),
      capabilities: z.array(z.string()),
    }),
    view: {
      name: "synesis-console",
      description: "Interactive Synesis contract-risk and regulatory-impact workspace",
      prefersBorder: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async () => {
    const data = {
      appName: "Synesis",
      tagline: "Neuro-Symbolic Risk Intelligence",
      capabilities: [
        "Explainable contract risk analysis",
        "Clause-level remediation suggestions",
        "Operational obligation extraction",
        "Regulatory impact mapping",
      ],
    };
    return {
      content: [{ type: "text", text: "Synesis workspace ready." }],
      structuredContent: data,
    };
  }
);

export const analyzeContract = server.tool(
  {
    name: "analyze-contract",
    title: "Analyze Contract",
    description: "Analyze contract text for explainable legal and operational risk patterns, obligations, and suggested remediation.",
    inputSchema: z.object({
      contractText: z.string().min(20).describe("Contract, clause, or agreement text to analyze"),
      contractType: z.string().optional().describe("Optional contract type, e.g. NDA, vendor agreement, SaaS agreement"),
      jurisdiction: z.string().default("India").describe("Primary jurisdiction for review context"),
    }),
    outputSchema: analyzeOutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async ({ contractText }) => {
    const data = analyzeContractText(contractText);
    return {
      content: [{ type: "text", text: `${data.riskBand} risk (${data.riskScore}/100): ${data.summary}` }],
      structuredContent: data,
    };
  }
);

export const mapRegulatoryImpact = server.tool(
  {
    name: "map-regulatory-impact",
    title: "Map Regulatory Impact",
    description: "Map a regulatory or policy change into potentially affected control domains and an action plan.",
    inputSchema: z.object({
      change: z.string().min(10).describe("Regulatory update, circular, policy change, or compliance requirement"),
      jurisdiction: z.string().default("India"),
      industry: z.string().default("Financial Services"),
    }),
    outputSchema: z.object({
      priority: z.enum(["Low", "Medium", "High", "Critical"]),
      summary: z.string(),
      impactedDomains: z.array(z.object({
        domain: z.string(),
        reason: z.string(),
      })),
      actionPlan: z.array(z.object({
        owner: z.string(),
        action: z.string(),
        timing: z.string(),
      })),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async ({ change, jurisdiction, industry }) => {
    const lower = change.toLowerCase();
    const impactedDomains: Array<{ domain: string; reason: string }> = [];
    const add = (domain: string, reason: string) => impactedDomains.push({ domain, reason });

    if (/data|privacy|consent|personal|breach|security/.test(lower)) add("Data Protection & Information Security", "The change references data, privacy, consent, security, or breach obligations.");
    if (/payment|remittance|forex|foreign exchange|settlement|wallet/.test(lower)) add("Payments & Foreign Exchange", "The change may affect payment flows, settlement, remittance, or FX controls.");
    if (/kyc|aml|money laundering|sanction|customer due diligence/.test(lower)) add("KYC / AML / Sanctions", "The change touches onboarding, due diligence, monitoring, or sanctions controls.");
    if (/outsourc|vendor|third party|service provider|cloud/.test(lower)) add("Third-Party Risk", "The change may require vendor governance, contractual controls, or outsourcing oversight.");
    if (/report|filing|return|disclosure|record/.test(lower)) add("Regulatory Reporting & Records", "The change appears to create or modify reporting, filing, disclosure, or recordkeeping duties.");
    if (/capital|liquidity|prudential|exposure|credit/.test(lower)) add("Prudential / Credit Risk", "The change may affect capital, liquidity, exposure, or credit-risk controls.");
    if (impactedDomains.length === 0) add("Legal & Compliance Governance", "The change requires legal interpretation and ownership mapping before implementation.");

    const criticalSignals = /immediate effect|with immediate effect|penalty|prohibit|must not|suspend|revok/.test(lower);
    const highSignals = /shall|must|required|deadline|effective from|within \d+ days/.test(lower);
    const priority = criticalSignals ? "Critical" : highSignals ? "High" : impactedDomains.length >= 3 ? "Medium" : "Low";

    const data = {
      priority,
      summary: `Synesis mapped this ${jurisdiction} ${industry} change to ${impactedDomains.length} control domain(s). Priority reflects textual urgency and breadth, not a regulator-issued rating.`,
      impactedDomains,
      actionPlan: [
        { owner: "Legal", action: "Interpret scope, applicability, effective date, and legal consequences.", timing: priority === "Critical" ? "Immediate" : "Triage now" },
        { owner: "Compliance / Risk", action: "Map the requirement to existing controls, policies, monitoring, and evidence.", timing: "After applicability confirmation" },
        { owner: "Business / Operations", action: "Identify affected processes, systems, customer journeys, vendors, and implementation dependencies.", timing: "Implementation planning" },
        { owner: "Governance", action: "Record decision, accountable owner, deadline, approvals, and closure evidence.", timing: "Through closure" },
      ],
    } as const;

    return {
      content: [{ type: "text", text: `${data.priority} priority: ${data.summary}` }],
      structuredContent: data,
    };
  }
);

export default server;
