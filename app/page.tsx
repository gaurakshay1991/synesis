"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, BadgeCheck, BarChart3, BrainCircuit, Building2,
  CheckCircle2, ChevronRight, Clock3, Database, FileSearch, FileText, Gauge, GitBranch,
  Landmark, Link2, ListChecks, Loader2, Network, RefreshCw, Search, ShieldCheck, Sparkles,
  UploadCloud, UserRoundCheck, WandSparkles, Download, CircleDot
} from "lucide-react";

type Finding={
  id:string; clause:string; excerpt:string; risk:"Critical"|"High"|"Medium"|"Low"; score:number;
  obligation:string; regulation:string; rationale:string; action:string; owner:string; due:string; confidence:number;
};
type Analysis={document:string;overallRisk:string;score:number;summary:string;findings:Finding[];engine?:string;generatedAt?:string};
type RegItem={source:string;title:string;link:string;date:string;summary:string};

const seedAnalysis:Analysis={
  document:"Sample Technology Services Agreement",
  overallRisk:"High", score:78,
  summary:"Material exposure is concentrated in data processing, subcontracting, audit access and exit mechanics.",
  engine:"Synesis sample reasoning graph",
  findings:[
    {id:"F-01",clause:"Data Protection",excerpt:"Service Provider may process customer and transaction data for performance of the Services...",risk:"High",score:88,obligation:"Map controller/processor roles, purpose, retention, breach and deletion duties.",regulation:"DPDP Act, 2023 + sectoral data governance requirements",rationale:"The agreement permits regulated data processing without a complete allocation of lifecycle controls.",action:"Add a processing schedule with purpose limitation, breach notice, deletion and audit evidence.",owner:"Privacy / Legal",due:"3 business days",confidence:.92},
    {id:"F-02",clause:"Subcontracting",excerpt:"Vendor may appoint subcontractors as it considers appropriate.",risk:"High",score:84,obligation:"Preserve control over material downstream service providers.",regulation:"Applicable outsourcing / third-party risk governance",rationale:"Unrestricted downstream delegation can weaken audit, security and regulator-access rights.",action:"Require prior notice/approval, register of subcontractors and full contractual flow-down.",owner:"Procurement / Risk",due:"5 business days",confidence:.89},
    {id:"F-03",clause:"Audit & Regulatory Access",excerpt:"Audit shall be limited to annual certification reports supplied by Vendor.",risk:"Critical",score:94,obligation:"Ensure institution, auditor and regulator access remains contractually exercisable.",regulation:"Applicable RBI/sectoral outsourcing and supervisory access requirements",rationale:"A certification-only model can prevent direct assurance where regulator access is required.",action:"Add direct audit, information and supervisory-access rights, including subcontractor records.",owner:"Legal / Compliance",due:"Immediate",confidence:.95},
    {id:"F-04",clause:"Termination & Exit",excerpt:"Transition assistance will be provided subject to mutually agreed commercial terms.",risk:"Medium",score:63,obligation:"Ensure operationally usable exit and transition support.",regulation:"Operational resilience / outsourcing exit planning",rationale:"Transition support is not sufficiently certain if price and scope are deferred to future agreement.",action:"Pre-agree assistance scope, period, rates, data return and deletion certification.",owner:"Business / Legal",due:"7 business days",confidence:.83}
  ]
};

const tabs=[
  ["dashboard","Executive",BarChart3],
  ["analyze","Analyse",FileSearch],
  ["graph","Risk Graph",Network],
  ["obligations","Obligations",ListChecks],
  ["radar","Regulatory Radar",Landmark],
  ["evidence","Pilot Evidence",BadgeCheck],
] as const;

function riskClass(r:string){return "risk "+r.toLowerCase();}
function fmtDate(v:string){if(!v)return "—"; const d=new Date(v); return Number.isNaN(d.getTime())?v:d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});}

export default function Home(){
  const [tab,setTab]=useState<(typeof tabs)[number][0]>("dashboard");
  const [analysis,setAnalysis]=useState<Analysis>(seedAnalysis);
  const [workspace,setWorkspace]=useState({name:"Pilot Workspace",organisation:"Prospective Enterprise"});
  const [text,setText]=useState("");
  const [docName,setDocName]=useState("");
  const [busy,setBusy]=useState(false);
  const [extracting,setExtracting]=useState(false);
  const [message,setMessage]=useState("");
  const [regs,setRegs]=useState<RegItem[]>([]);
  const [regTime,setRegTime]=useState("");
  const [regBusy,setRegBusy]=useState(false);
  const [actions,setActions]=useState<Record<string,string>>({});
  const [pilotStart,setPilotStart]=useState("");

  useEffect(()=>{
    try{
      const saved=localStorage.getItem("synesis-pilot-v2");
      if(saved){
        const s=JSON.parse(saved);
        if(s.analysis) setAnalysis(s.analysis);
        if(s.workspace) setWorkspace(s.workspace);
        if(s.actions) setActions(s.actions);
        if(s.pilotStart) setPilotStart(s.pilotStart);
      }else{
        setPilotStart(new Date().toISOString());
      }
    }catch{}
  },[]);
  useEffect(()=>{
    if(!pilotStart)return;
    localStorage.setItem("synesis-pilot-v2",JSON.stringify({analysis,workspace,actions,pilotStart}));
  },[analysis,workspace,actions,pilotStart]);

  const findings=analysis.findings||[];
  const critical=findings.filter(x=>x.risk==="Critical").length;
  const high=findings.filter(x=>x.risk==="High").length;
  const done=Object.values(actions).filter(x=>x==="Closed").length;
  const open=Math.max(findings.length-done,0);
  const top=findings.slice().sort((a,b)=>b.score-a.score)[0];

  async function extractFile(file:File){
    setExtracting(true); setMessage("");
    try{
      const fd=new FormData(); fd.append("file",file);
      const r=await fetch("/api/extract",{method:"POST",body:fd});
      const j=await r.json();
      if(!r.ok) throw new Error(j.error||"Extraction failed");
      setText(j.text); setDocName(j.name);
      setMessage("Document extracted. Run Synesis analysis.");
    }catch(e:any){setMessage(e.message||"Could not extract file");}
    finally{setExtracting(false);}
  }

  async function runAnalysis(){
    if(text.trim().length<80){setMessage("Paste or upload enough agreement text to analyse."); return;}
    setBusy(true); setMessage("");
    try{
      const r=await fetch("/api/analyze",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text,name:docName||"Pilot document"})});
      const j=await r.json();
      if(!r.ok) throw new Error(j.error||"Analysis failed");
      setAnalysis(j); setActions({}); setTab("graph");
      setMessage(`Analysis complete using ${j.engine||"Synesis"}.`);
    }catch(e:any){setMessage(e.message||"Analysis failed");}
    finally{setBusy(false);}
  }

  async function refreshReg(){
    setRegBusy(true);
    try{
      const r=await fetch("/api/regulatory",{cache:"no-store"});
      const j=await r.json();
      setRegs(j.items||[]); setRegTime(j.refreshedAt||new Date().toISOString());
    }finally{setRegBusy(false);}
  }

  function exportEvidence(){
    const payload={product:"Synesis Pilot",workspace,pilotStart,exportedAt:new Date().toISOString(),analysis,actions,regulatorySnapshot:{refreshedAt:regTime,items:regs}};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="synesis-pilot-evidence.json";a.click();URL.revokeObjectURL(a.href);
  }

  const graphRows=useMemo(()=>findings.map(f=>({f,status:actions[f.id]||"Open"})),[findings,actions]);

  return <main className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brandmark"><BrainCircuit size={21}/></div><div><strong>SYNESIS</strong><span>Regulatory Risk Intelligence</span></div></div>
      <div className="pilot-chip"><CircleDot size={13}/> LIVE PILOT</div>
      <nav>{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="side-card">
        <span>Pilot workspace</span>
        <input value={workspace.organisation} onChange={e=>setWorkspace({...workspace,organisation:e.target.value})}/>
        <small>Browser-persistent pilot mode</small>
      </div>
      <div className="side-foot"><ShieldCheck size={16}/><span>Explainable by design<br/>Source-linked decisions</span></div>
    </aside>

    <section className="shell">
      <header className="topbar">
        <div><span className="eyebrow">ENTERPRISE PILOT</span><h1>{tabs.find(x=>x[0]===tab)?.[1]}</h1></div>
        <div className="top-actions"><div className="live"><span/>System operational</div><button className="ghost" onClick={()=>setTab("analyze")}><UploadCloud size={16}/> Analyse agreement</button></div>
      </header>

      {tab==="dashboard"&&<div className="page">
        <div className="hero">
          <div><span className="eyebrow">FROM STATIC CONTRACTS TO LIVE CONTROL</span><h2>Know what changed, what it affects, who owns it, and what must happen next.</h2><p>Synesis links contract language to obligations, regulatory context, risk, ownership and evidence—then keeps the decision trail explainable.</p></div>
          <div className="score-ring"><div><b>{analysis.score}</b><span>Risk score</span></div></div>
        </div>
        <div className="metrics">
          <Metric icon={AlertTriangle} value={String(critical+high)} label="Priority issues" note={critical?critical+" critical":"No critical issues"}/>
          <Metric icon={Link2} value={String(findings.length)} label="Reasoning links" note="Clause → rule → action"/>
          <Metric icon={ListChecks} value={String(open)} label="Open obligations" note={done+" closed in pilot"}/>
          <Metric icon={Activity} value={analysis.engine?.includes("AI")?"AI":"Rules"} label="Active engine" note="Fallback-safe analysis"/>
        </div>
        <div className="grid two">
          <Card title="Decision brief" icon={Sparkles}>
            <div className="brief"><div className={riskClass(analysis.overallRisk)}>{analysis.overallRisk}</div><h3>{analysis.document}</h3><p>{analysis.summary}</p>
            {top&&<div className="callout"><b>Highest priority</b><span>{top.clause}: {top.action}</span></div>}</div>
          </Card>
          <Card title="Why this is different" icon={GitBranch}>
            <div className="chain"><span>Contract clause</span><ArrowRight/><span>Obligation</span><ArrowRight/><span>Regulation</span><ArrowRight/><span>Risk</span><ArrowRight/><span>Action + evidence</span></div>
            <p className="muted">Every recommendation carries an inspectable rationale, owner and source context. Synesis is not merely a repository or clause-search tool.</p>
          </Card>
        </div>
        <Card title="Priority control queue" icon={Gauge}>
          <table><thead><tr><th>Issue</th><th>Risk</th><th>Owner</th><th>Required action</th><th>Status</th></tr></thead>
          <tbody>{findings.slice(0,5).map(f=><tr key={f.id}><td><b>{f.clause}</b><small>{f.regulation}</small></td><td><span className={riskClass(f.risk)}>{f.risk} · {f.score}</span></td><td>{f.owner}</td><td>{f.action}</td><td>{actions[f.id]||"Open"}</td></tr>)}</tbody></table>
        </Card>
      </div>}

      {tab==="analyze"&&<div className="page">
        <div className="section-head"><div><span className="eyebrow">WORKING PRODUCT FLOW</span><h2>Ingest and analyse a real agreement</h2><p>Use PDF, DOCX, TXT, MD, CSV or JSON. Files are extracted for analysis; pilot workspace state stays in this browser.</p></div></div>
        <div className="grid two upload-grid">
          <Card title="1. Add document" icon={UploadCloud}>
            <label className="dropzone">
              {extracting?<Loader2 className="spin"/>:<FileText size={32}/>}
              <b>{extracting?"Extracting document…":"Drop or choose an agreement"}</b>
              <span>PDF / DOCX / text · up to 12 MB</span>
              <input type="file" accept=".pdf,.docx,.txt,.md,.csv,.json" onChange={e=>e.target.files?.[0]&&extractFile(e.target.files[0])}/>
            </label>
            <input className="field" placeholder="Document name" value={docName} onChange={e=>setDocName(e.target.value)}/>
          </Card>
          <Card title="2. Contract text" icon={FileSearch}>
            <textarea className="editor" placeholder="Extracted text appears here. You can also paste clauses or an entire agreement directly." value={text} onChange={e=>setText(e.target.value)}/>
            <div className="editor-foot"><span>{text.length.toLocaleString()} characters</span><button className="primary" disabled={busy||extracting} onClick={runAnalysis}>{busy?<Loader2 className="spin" size={17}/>:<WandSparkles size={17}/>} Run Synesis analysis</button></div>
          </Card>
        </div>
        {message&&<div className="notice">{message}</div>}
        <div className="trust-row"><ShieldCheck/><div><b>Explainability first</b><span>Synesis distinguishes a detected issue from its regulatory context and from the recommended business action.</span></div></div>
      </div>}

      {tab==="graph"&&<div className="page">
        <div className="section-head"><div><span className="eyebrow">NEURO-SYMBOLIC REASONING VIEW</span><h2>{analysis.document}</h2><p>{analysis.summary}</p></div><span className={riskClass(analysis.overallRisk)}>{analysis.overallRisk} · {analysis.score}</span></div>
        <div className="graph-list">{graphRows.map(({f,status})=><div className="graph-card" key={f.id}>
          <div className="graph-top"><div><span className="finding-id">{f.id}</span><h3>{f.clause}</h3></div><span className={riskClass(f.risk)}>{f.risk} · {f.score}</span></div>
          <div className="reasoning-path">
            <Node label="Clause" text={f.excerpt}/><ChevronRight/><Node label="Obligation" text={f.obligation}/><ChevronRight/><Node label="Regulatory context" text={f.regulation}/><ChevronRight/><Node label="Action" text={f.action}/>
          </div>
          <div className="rationale"><BrainCircuit size={16}/><span><b>Why:</b> {f.rationale}</span><em>{Math.round(f.confidence*100)}% confidence</em></div>
          <div className="ownerline"><span><UserRoundCheck size={15}/>{f.owner}</span><span><Clock3 size={15}/>{f.due}</span><select value={status} onChange={e=>setActions({...actions,[f.id]:e.target.value})}><option>Open</option><option>In review</option><option>Accepted risk</option><option>Closed</option></select></div>
        </div>)}</div>
      </div>}

      {tab==="obligations"&&<div className="page">
        <div className="section-head"><div><span className="eyebrow">CONTROL REGISTER</span><h2>Obligations and actions</h2><p>Convert legal analysis into owned work rather than comments trapped inside a document.</p></div></div>
        <Card title="Action register" icon={CheckCircle2}>
          <table><thead><tr><th>Control</th><th>Obligation</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody>
          {findings.map(f=><tr key={f.id}><td><b>{f.clause}</b><small>{f.regulation}</small></td><td>{f.obligation}</td><td>{f.owner}</td><td>{f.due}</td><td><select value={actions[f.id]||"Open"} onChange={e=>setActions({...actions,[f.id]:e.target.value})}><option>Open</option><option>In review</option><option>Accepted risk</option><option>Closed</option></select></td></tr>)}
          </tbody></table>
        </Card>
      </div>}

      {tab==="radar"&&<div className="page">
        <div className="section-head"><div><span className="eyebrow">LIVE SOURCE INGESTION</span><h2>Regulatory radar</h2><p>Pull current RBI and SEBI RSS publications into one review queue. The next layer maps relevant changes into contracts and obligations.</p></div>
          <button className="primary" onClick={refreshReg} disabled={regBusy}>{regBusy?<Loader2 size={17} className="spin"/>:<RefreshCw size={17}/>} Refresh official feeds</button></div>
        <div className="source-strip"><span><Landmark size={16}/> RBI Notifications</span><span><Landmark size={16}/> SEBI Circulars / Releases / Orders</span><span>{regTime?"Last refresh: "+fmtDate(regTime):"Not refreshed in this browser"}</span></div>
        {regs.length===0?<div className="empty"><Database size={36}/><h3>Refresh to pull the latest regulator items</h3><p>This is a live server-side fetch from official RSS endpoints, not a static demo list.</p></div>:
        <div className="reg-list">{regs.map((x,i)=><a key={i} href={x.link} target="_blank" rel="noreferrer"><div className="reg-source">{x.source}</div><div><h3>{x.title}</h3><p>{x.summary||"Open the source publication for details."}</p><span>{fmtDate(x.date)}</span></div><ArrowRight size={18}/></a>)}</div>}
      </div>}

      {tab==="evidence"&&<div className="page">
        <div className="section-head"><div><span className="eyebrow">INVESTOR / DESIGN-PARTNER PROOF</span><h2>Pilot evidence pack</h2><p>Show what happened during the trial: documents analysed, risks surfaced, decisions made, actions closed and regulatory signals reviewed.</p></div><button className="primary" onClick={exportEvidence}><Download size={17}/> Export evidence JSON</button></div>
        <div className="metrics">
          <Metric icon={FileSearch} value={analysis.document===seedAnalysis.document?"1 sample":"1 live"} label="Documents analysed" note={analysis.engine||"Synesis engine"}/>
          <Metric icon={AlertTriangle} value={String(critical+high)} label="Priority risks found" note={critical+" critical"}/>
          <Metric icon={CheckCircle2} value={String(done)} label="Actions closed" note={open+" remain open"}/>
          <Metric icon={Landmark} value={String(regs.length)} label="Regulatory items" note={regTime?"Live refresh completed":"Refresh pending"}/>
        </div>
        <div className="grid two">
          <Card title="What a partner can test" icon={Building2}>
            <ul className="checklist">
              <li><CheckCircle2/>Upload their own agreement and compare Synesis findings with counsel review.</li>
              <li><CheckCircle2/>Inspect the reason chain rather than accepting a black-box risk score.</li>
              <li><CheckCircle2/>Assign and close obligations to test whether analysis becomes workflow.</li>
              <li><CheckCircle2/>Refresh official regulator feeds and assess relevance to their perimeter.</li>
              <li><CheckCircle2/>Export the pilot record for an internal go/no-go discussion.</li>
            </ul>
          </Card>
          <Card title="Pilot success measures" icon={Gauge}>
            <div className="kpi"><b>≥ 80%</b><span>material-issue recall against expert review</span></div>
            <div className="kpi"><b>≥ 40%</b><span>reduction in first-pass review / triage effort</span></div>
            <div className="kpi"><b>100%</b><span>high-risk findings with reason + owner + action</span></div>
            <div className="kpi"><b>&lt; 5 min</b><span>from agreement upload to structured decision brief</span></div>
          </Card>
        </div>
        <Card title="Current pilot trace" icon={Activity}>
          <div className="trace">
            <span><b>Pilot started</b>{pilotStart?fmtDate(pilotStart):"Today"}</span><ArrowRight/><span><b>Analysis</b>{analysis.document}</span><ArrowRight/><span><b>Control actions</b>{done} closed / {open} open</span><ArrowRight/><span><b>Regulatory scan</b>{regs.length} items captured</span>
          </div>
        </Card>
      </div>}

      <footer><span>Synesis Pilot v2.0 · Explainable regulatory intelligence</span><span>Decision-support system — final legal conclusions remain subject to authorised review.</span></footer>
    </section>
  </main>;
}

function Metric({icon:Icon,value,label,note}:{icon:any,value:string,label:string,note:string}){
  return <div className="metric"><div className="metric-icon"><Icon size={19}/></div><div><b>{value}</b><span>{label}</span><small>{note}</small></div></div>;
}
function Card({title,icon:Icon,children}:{title:string,icon:any,children:React.ReactNode}){
  return <section className="card"><div className="card-head"><span><Icon size={17}/>{title}</span></div><div className="card-body">{children}</div></section>;
}
function Node({label,text}:{label:string,text:string}){
  return <div className="node"><span>{label}</span><p>{text}</p></div>;
}
