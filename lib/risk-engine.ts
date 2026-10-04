export type Finding = {
  id: string;
  clause: string;
  excerpt: string;
  risk: "Critical" | "High" | "Medium" | "Low";
  score: number;
  obligation: string;
  regulation: string;
  rationale: string;
  action: string;
  owner: string;
  due: string;
  confidence: number;
};

const rules = [
  {keys:["unlimited liability","indemnify","indemnity"],clause:"Liability & Indemnity",risk:"High" as const,score:82,regulation:"Contract governance / board-approved risk appetite",obligation:"Confirm liability allocation and whether exposure is capped.",action:"Negotiate a defined cap and carve-outs; document approval for residual exposure.",owner:"Legal"},
  {keys:["personal data","data protection","privacy","customer data","aadhaar"],clause:"Data Protection",risk:"High" as const,score:86,regulation:"Digital Personal Data Protection Act, 2023 and applicable rules",obligation:"Identify processing purpose, data flows, processor roles, security and deletion obligations.",action:"Create a data-processing schedule and map notice, consent, security, retention and breach duties.",owner:"Privacy / Legal"},
  {keys:["sanction","aml","anti-money laundering","terrorist financing"],clause:"AML / Sanctions",risk:"Critical" as const,score:93,regulation:"PMLA / RBI KYC framework / applicable sanctions controls",obligation:"Maintain screening, escalation, recordkeeping and exit rights.",action:"Add clear screening responsibility, information rights, suspension and termination triggers.",owner:"Compliance"},
  {keys:["audit","inspection","records"],clause:"Audit & Records",risk:"Medium" as const,score:65,regulation:"Sectoral outsourcing / governance requirements where applicable",obligation:"Preserve access to records and regulator/auditor inspection rights.",action:"Confirm audit scope, retention period, subcontractor flow-down and regulator access.",owner:"Risk"},
  {keys:["subcontract","sub-processor","third party"],clause:"Subcontracting",risk:"High" as const,score:78,regulation:"Outsourcing / third-party risk requirements where applicable",obligation:"Control downstream delegation and preserve equivalent contractual obligations.",action:"Require prior notice/approval, a subcontractor register and full flow-down of security/audit duties.",owner:"Procurement"},
  {keys:["termination","terminate","exit"],clause:"Termination & Exit",risk:"Medium" as const,score:69,regulation:"Operational resilience and outsourcing exit planning",obligation:"Ensure usable termination rights and orderly transition.",action:"Add transition assistance, data return/deletion, continuity and handover obligations.",owner:"Legal"},
  {keys:["service level","sla","uptime","availability"],clause:"Service Levels",risk:"Medium" as const,score:61,regulation:"Operational resilience / service governance",obligation:"Define measurable service levels and consequences for sustained failure.",action:"Set KPIs, severity levels, service credits and chronic-failure termination rights.",owner:"Business"},
  {keys:["governing law","jurisdiction","arbitration"],clause:"Dispute Resolution",risk:"Low" as const,score:38,regulation:"Contract enforceability",obligation:"Confirm forum, seat, governing law and interim-relief mechanics.",action:"Align governing law and dispute mechanics with enforcement strategy.",owner:"Legal"},
  {keys:["confidential","confidentiality","non-disclosure"],clause:"Confidentiality",risk:"Medium" as const,score:55,regulation:"Confidentiality / banking secrecy / data governance as applicable",obligation:"Protect confidential and regulated information throughout the lifecycle.",action:"Verify scope, permitted disclosures, survival, return/destruction and compelled-disclosure process.",owner:"Legal"},
  {keys:["payment","invoice","fees","tax"],clause:"Commercial Terms",risk:"Low" as const,score:34,regulation:"Tax / accounting controls as applicable",obligation:"Ensure payment triggers and deductions are operationally clear.",action:"Tie payment to acceptance criteria and resolve tax, withholding and disputed-invoice treatment.",owner:"Finance"}
];

export function fallbackAnalysis(text:string, name="Uploaded agreement") {
  const lower=text.toLowerCase();
  const sentences=text.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const findings: Finding[]=[];
  rules.forEach((r,i)=>{
    const hit=r.keys.find(k=>lower.includes(k));
    if(!hit) return;
    const excerpt=sentences.find(s=>s.toLowerCase().includes(hit))?.slice(0,320) || `Detected reference to ${hit}.`;
    findings.push({
      id:`F-${i+1}`, clause:r.clause, excerpt, risk:r.risk, score:r.score,
      obligation:r.obligation, regulation:r.regulation, rationale:`Synesis detected language relevant to ${r.clause.toLowerCase()} and mapped it to the associated control domain.`,
      action:r.action, owner:r.owner, due:"Within 5 business days", confidence:0.76
    });
  });
  if(findings.length===0){
    findings.push({
      id:"F-1", clause:"General Contract Governance", excerpt:text.slice(0,320),
      risk:"Medium", score:50, obligation:"Perform structured review against the organisation's clause playbook and regulatory perimeter.",
      regulation:"Applicable contract, sectoral and internal governance requirements",
      rationale:"No high-confidence trigger phrase was detected; a baseline structured review is recommended.",
      action:"Confirm parties, scope, term, liability, data, termination, audit, compliance and dispute provisions.",
      owner:"Legal", due:"Within 5 business days", confidence:0.58
    });
  }
  const overall=Math.round(findings.reduce((a,b)=>a+b.score,0)/findings.length);
  return {
    document:name,
    overallRisk:overall>=80?"High":overall>=55?"Medium":"Low",
    score:overall,
    summary:`${findings.length} material control areas were identified. Highest priority: ${[...findings].sort((a,b)=>b.score-a.score)[0].clause}.`,
    findings
  };
}
