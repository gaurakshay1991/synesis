import { ThemeProvider, useCallTool, useToolContext } from "mcp-use/react";
import { useMemo, useState } from "react";
import "./view.css";

const SAMPLE = `Supplier shall indemnify and hold harmless Customer from any and all damages, losses and claims whatsoever. Supplier's liability shall be without limitation. Customer may terminate this Agreement for convenience at its sole discretion on 7 days' notice. The Agreement automatically renews for successive one-year periods. Supplier may process personal data in connection with the Services.`;

export default function SynesisConsole() {
  const view = useToolContext<"open-synesis">();
  const analyze = useCallTool("analyze-contract");
  const impact = useCallTool("map-regulatory-impact");

  const [contractText, setContractText] = useState(SAMPLE);
  const [regChange, setRegChange] = useState("A regulated entity must notify material personal-data breaches promptly, maintain incident records, and ensure third-party service providers support breach response obligations.");

  const result = analyze.data?.structuredContent;
  const impactResult = impact.data?.structuredContent;

  const counts = useMemo(() => {
    const rows = result?.findings ?? [];
    return {
      critical: rows.filter((x) => x.severity === "critical").length,
      high: rows.filter((x) => x.severity === "high").length,
      medium: rows.filter((x) => x.severity === "medium").length,
    };
  }, [result]);

  if (view.status === "error") {
    return <div className="shell"><div className="panel error">{view.error.message}</div></div>;
  }

  return (
    <ThemeProvider>
      <main className="shell">
        <header className="hero">
          <div>
            <div className="eyebrow">PARMA · SYNESIS</div>
            <h1>Risk Intelligence Command Center</h1>
            <p>Explainable contract review and regulatory impact mapping through one MCP App.</p>
          </div>
          <div className="status"><span className="dot" /> MCP v2 · live workspace</div>
        </header>

        <section className="metrics">
          <div className="metric"><span>Risk score</span><strong>{result?.riskScore ?? "—"}</strong><small>{result?.riskBand ?? "Run analysis"}</small></div>
          <div className="metric"><span>Critical</span><strong>{counts.critical}</strong><small>immediate review</small></div>
          <div className="metric"><span>High</span><strong>{counts.high}</strong><small>material findings</small></div>
          <div className="metric"><span>Medium</span><strong>{counts.medium}</strong><small>review points</small></div>
        </section>

        <section className="grid">
          <div className="panel">
            <div className="panelHead">
              <div><span className="kicker">01 · CONTRACT INTELLIGENCE</span><h2>Clause Risk Review</h2></div>
              <button disabled={analyze.isPending || contractText.trim().length < 20} onClick={() => void analyze.callTool({ contractText, contractType: "Commercial Agreement", jurisdiction: "India" })}>
                {analyze.isPending ? "Analyzing…" : "Analyze contract"}
              </button>
            </div>
            <textarea value={contractText} onChange={(e) => setContractText(e.target.value)} aria-label="Contract text" />
            {analyze.error && <p className="errorText">{analyze.error.message}</p>}
          </div>

          <div className="panel">
            <span className="kicker">02 · REGULATORY CHANGE</span>
            <h2>Impact Mapper</h2>
            <textarea className="smallArea" value={regChange} onChange={(e) => setRegChange(e.target.value)} aria-label="Regulatory change" />
            <button className="secondary" disabled={impact.isPending || regChange.trim().length < 10} onClick={() => void impact.callTool({ change: regChange, jurisdiction: "India", industry: "Financial Services" })}>
              {impact.isPending ? "Mapping…" : "Map regulatory impact"}
            </button>
            {impactResult && (
              <div className="impact">
                <div className="priority">{impactResult.priority} priority</div>
                <p>{impactResult.summary}</p>
                {impactResult.impactedDomains.map((x, i) => <div className="domain" key={i}><strong>{x.domain}</strong><span>{x.reason}</span></div>)}
              </div>
            )}
          </div>
        </section>

        {result && (
          <section className="panel results">
            <div className="panelHead">
              <div><span className="kicker">EXPLAINABLE FINDINGS</span><h2>{result.summary}</h2></div>
              <div className={"band " + result.riskBand.toLowerCase()}>{result.riskBand}</div>
            </div>
            <div className="findingList">
              {result.findings.map((f, i) => (
                <article className="finding" key={i}>
                  <div className="findingTop"><span className={"sev " + f.severity}>{f.severity}</span><strong>{f.category}</strong></div>
                  <blockquote>{f.evidence}</blockquote>
                  <div className="cols"><div><label>Why it matters</label><p>{f.whyItMatters}</p></div><div><label>Suggested remediation</label><p>{f.suggestedRevision}</p></div></div>
                </article>
              ))}
            </div>
            {result.obligations.length > 0 && (
              <div className="obligations">
                <h3>Operational obligations</h3>
                {result.obligations.map((o, i) => <div className="obRow" key={i}><strong>{o.party}</strong><span>{o.obligation}</span><em>{o.trigger}</em></div>)}
              </div>
            )}
            <p className="method">{result.methodology}</p>
          </section>
        )}

        <footer>Synesis MVP · explainable by design · human legal review remains authoritative</footer>
      </main>
    </ThemeProvider>
  );
}
