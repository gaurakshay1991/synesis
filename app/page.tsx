"use client";

import {useEffect,useMemo,useState} from "react";
import {
  Activity, AlertTriangle, ArrowRight, BadgeCheck, BookOpenCheck, Building2, CheckCircle2,
  ChevronRight, CircleDot, Database, Download, FileSearch, FileText, Fingerprint, FlaskConical,
  GitBranch, Landmark, Layers3, ListChecks, Loader2, Network, Plus, RefreshCw, Search,
  ShieldCheck, Sparkles, UploadCloud, UserCheck, X
} from "lucide-react";

type AssetType="contract"|"control"|"policy"|"process"|"system"|"vendor"|"product"|"entity"|"person"|"authority"|"evidence";
type Asset={id:string;type:AssetType;name:string;facts:string[];cost:number;status:"verified"|"partial"|"stale"};
type WorkItem={id:string;title:string;kind:string;priority:"Critical"|"High"|"Medium"|"Low";owner:string;status:"Open"|"In review"|"Waiting"|"Closed";context:string};
type Audit={id:string;time:string;type:string;title:string;detail:string};
type Finding={id:string;clause:string;excerpt:string;risk:"Critical"|"High"|"Medium"|"Low";score:number;obligation:string;regulation:string;rationale:string;action:string;owner:string;due:string;confidence:number};
type Analysis={document:string;overallRisk:string;score:number;summary:string;findings:Finding[];engine?:string;generatedAt?:string};
type RegItem={source:string;title:string;link:string;date:string;summary:string};
type Decision={compiledRules:any[];receipt:{decision:"ALLOW"|"BLOCK"|"REVIEW";stateStatus?:"SUFFICIENT"|"INSUFFICIENT_STATE"|"ASSUMPTION_DEPENDENT";action:string;facts:string[];assertions?:Array<{status:string;text:string}>;blockingFacts?:string[];assumptionFacts?:string[];missingEvidence?:string[];ruleIds:string[];sourceHashes:string[];timestamp:string;receiptHash:string;reasoning:any[]}};
type Shadow={current:{rules:any[]};proposed:{rules:any[]};delta:{added:any[];removed:any[];modified:any[]};impact:{impacts:any[];minimumChangeSet:any[];totalEstimatedEffort:number;uncoveredRuleIds?:string[]};assets:Asset[];simulatedAt:string};
type Case={id:string;name:string;kind:string;risk:string;issue:string;evidence:string[];status:string};

const seedAssets:Asset[]=[
  {id:"ENT-01",type:"entity",name:"India Regulated Entity",facts:["regulated financial institution in India","board-approved outsourcing policy applies"],cost:1,status:"verified"},
  {id:"AUTH-01",type:"authority",name:"Vendor Approval Authority",facts:["material subcontractors require prior risk assessment and designated approval"],cost:1,status:"verified"},
  {id:"CON-01",type:"contract",name:"Cloud Outsourcing MSA",facts:["vendor processes customer transaction data","subcontractors permitted subject to controls","audit and incident notification clauses apply"],cost:4,status:"verified"},
  {id:"CTRL-01",type:"control",name:"Third-Party Risk Control",facts:["due diligence required before material subcontractor approval","subcontractor register maintained","annual control testing"],cost:2,status:"partial"},
  {id:"PROC-01",type:"process",name:"Incident Response",facts:["security incidents escalated","regulator and customer notification tracked"],cost:2,status:"verified"},
  {id:"SYS-01",type:"system",name:"Vendor Access Gateway",facts:["third-party access approval","privileged access logs","customer data access events"],cost:5,status:"partial"},
  {id:"VEND-01",type:"vendor",name:"Nimbus Cloud Services",facts:["hosts regulated workloads","proposes new analytics subcontractor"],cost:3,status:"partial"},
  {id:"EVID-01",type:"evidence",name:"Subcontractor Risk Assessment",facts:["assessment started","final approval evidence not yet available"],cost:1,status:"stale"}
];

const seedWork:WorkItem[]=[
  {id:"W-101",title:"Resolve missing subcontractor approval evidence",kind:"Decision evidence",priority:"Critical",owner:"Third-Party Risk",status:"Open",context:"VEND-01 · AUTH-01"},
  {id:"W-102",title:"Review proposed 24-hour incident notification requirement",kind:"Regulatory change",priority:"High",owner:"Compliance",status:"In review",context:"PROC-01 · CON-01"},
  {id:"W-103",title:"Validate audit-rights clause against current outsourcing perimeter",kind:"Contract review",priority:"High",owner:"Legal",status:"Open",context:"CON-01"},
  {id:"W-104",title:"Close KYC address mismatch after evidence validation",kind:"Case review",priority:"Medium",owner:"KYC Operations",status:"Waiting",context:"KYC-204"}
];

const seedCases:Case[]=[
  {id:"KYC-204",name:"Aranya Trading Pvt Ltd",kind:"Corporate KYC",risk:"High",issue:"Registered-office address differs across incorporation record and onboarding declaration.",evidence:["Certificate of Incorporation","GST registration","Customer declaration"],status:"Review required"},
  {id:"KYC-219",name:"Nava Export LLP",kind:"Corporate KYC",risk:"Medium",issue:"Beneficial ownership evidence is complete; source-of-funds memo awaits reviewer sign-off.",evidence:["LLP master data","UBO declaration","Bank statement"],status:"Waiting"},
  {id:"KYC-225",name:"Vantage Components Ltd",kind:"Corporate KYC",risk:"Low",issue:"No material mismatch detected. Periodic review evidence is current.",evidence:["MCA record","PAN","Board authorisation"],status:"Ready"}
];

const currentLaw="A regulated entity shall maintain an inventory of material outsourced service providers and shall retain audit records. A service provider must notify the regulated entity of a material security incident within 72 hours. The regulated entity may appoint a material subcontractor where appropriate due diligence has been completed.";
const proposedLaw="A regulated entity shall maintain a continuously updated inventory of material outsourced service providers and shall retain machine-verifiable audit evidence. A service provider must notify the regulated entity of a material security incident within 24 hours. A regulated entity must not permit appointment of a material subcontractor unless prior risk assessment, approval and contractual flow-down controls are recorded. The regulated entity shall test material outsourcing exit arrangements at least annually.";

const navGroups=[
  {label:"Operate",items:[["command","Command Center",Sparkles],["queue","Work Queue",ListChecks]]},
  {label:"Understand",items:[["state","Institutional State",Building2],["changes","Change Intelligence",Landmark],["documents","Document Review",FileSearch],["cases","Cases & KYC",UserCheck]]},
  {label:"Decide",items:[["simulate","Simulate",FlaskConical],["decision","Decision Gate",Fingerprint],["evidence","Evidence Journal",BadgeCheck]]}
] as const;

function riskClass(v:string){return "pill "+v.toLowerCase().replace(/\s+/g,"-");}
function nowId(prefix:string){return prefix+"-"+Date.now().toString(36);}
function fmt(v:string){const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});}

export default function InstitutionalOS(){
  const [tab,setTab]=useState("command");
  const [assets,setAssets]=useState<Asset[]>(seedAssets);
  const [work,setWork]=useState<WorkItem[]>(seedWork);
  const [audit,setAudit]=useState<Audit[]>([]);
  const [query,setQuery]=useState("");
  const [mode,setMode]=useState<"decide"|"simulate"|"review"|"investigate">("decide");
  const [analysis,setAnalysis]=useState<Analysis|null>(null);
  const [docText,setDocText]=useState("");
  const [docName,setDocName]=useState("");
  const [docBusy,setDocBusy]=useState(false);
  const [extractBusy,setExtractBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [regs,setRegs]=useState<RegItem[]>([]);
  const [regBusy,setRegBusy]=useState(false);
  const [selectedCase,setSelectedCase]=useState(seedCases[0].id);
  const [caseStates,setCaseStates]=useState<Record<string,string>>({});
  const [baseLaw,setBaseLaw]=useState(currentLaw);
  const [nextLaw,setNextLaw]=useState(proposedLaw);
  const [shadow,setShadow]=useState<Shadow|null>(null);
  const [simBusy,setSimBusy]=useState(false);
  const [action,setAction]=useState("Approve Nimbus Cloud Services' proposed analytics subcontractor to process customer transaction data.");
  const [facts,setFacts]=useState("[verified] Material outsourcing applies; [verified] Customer transaction data is involved; [missing] Final subcontractor risk assessment approval; [unverified] Contractual flow-down confirmed.");
  const [decision,setDecision]=useState<Decision|null>(null);
  const [decisionBusy,setDecisionBusy]=useState(false);
  const [humanNote,setHumanNote]=useState("");
  const [humanOutcome,setHumanOutcome]=useState("Escalate");

  useEffect(()=>{
    try{
      const raw=localStorage.getItem("institutional-os-v1");
      if(!raw)return;
      const s=JSON.parse(raw);
      if(Array.isArray(s.assets))setAssets(s.assets);
      if(Array.isArray(s.work))setWork(s.work);
      if(Array.isArray(s.audit))setAudit(s.audit);
      if(s.caseStates)setCaseStates(s.caseStates);
    }catch{}
  },[]);
  useEffect(()=>{
    localStorage.setItem("institutional-os-v1",JSON.stringify({assets,work,audit,caseStates}));
  },[assets,work,audit,caseStates]);

  const openWork=work.filter(x=>x.status!=="Closed").length;
  const evidenceGaps=assets.filter(x=>x.type==="evidence"&&x.status!=="verified").length+(decision?.receipt.missingEvidence?.length||0);
  const attention=work.filter(x=>x.status!=="Closed").sort((a,b)=>["Critical","High","Medium","Low"].indexOf(a.priority)-["Critical","High","Medium","Low"].indexOf(b.priority));
  const selected=seedCases.find(x=>x.id===selectedCase)!;

  function log(type:string,title:string,detail:string){
    setAudit(a=>[{id:nowId("AUD"),time:new Date().toISOString(),type,title,detail},...a]);
  }

  function launch(){
    if(!query.trim())return;
    if(mode==="decide"){setAction(query);setTab("decision");}
    if(mode==="simulate"){setNextLaw(query);setTab("simulate");}
    if(mode==="review"){setDocText(query);setTab("documents");}
    if(mode==="investigate"){setTab("state");}
    log("Command","Command routed",mode.toUpperCase()+": "+query.slice(0,180));
  }

  async function extract(file:File){
    setExtractBusy(true);setMessage("");
    try{
      const fd=new FormData();fd.append("file",file);
      const r=await fetch("/api/extract",{method:"POST",body:fd});const j=await r.json();
      if(!r.ok)throw new Error(j.error||"Extraction failed");
      setDocName(j.name);setDocText(j.text);setMessage("Document extracted. Run review.");
      log("Document","Document extracted",j.name);
    }catch(e:any){setMessage(e.message||"Extraction failed");}
    finally{setExtractBusy(false);}
  }

  async function analyze(){
    if(docText.trim().length<80){setMessage("Add enough text to review.");return;}
    setDocBusy(true);setMessage("");
    try{
      const r=await fetch("/api/analyze",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text:docText,name:docName||"Working document"})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"Review failed");
      setAnalysis(j);log("Document","Review completed",(j.document||"Document")+" · "+(j.findings?.length||0)+" findings");
    }catch(e:any){setMessage(e.message||"Review failed");}
    finally{setDocBusy(false);}
  }

  async function refreshRegs(){
    setRegBusy(true);
    try{
      const r=await fetch("/api/regulatory",{cache:"no-store"});const j=await r.json();
      setRegs(j.items||[]);log("Regulation","Official source refresh",String((j.items||[]).length)+" items retrieved");
    }finally{setRegBusy(false);}
  }

  async function simulate(){
    setSimBusy(true);setMessage("");
    try{
      const r=await fetch("/api/shadow",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({currentText:baseLaw,proposedText:nextLaw,jurisdiction:"India / BFSI",assets})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"Simulation failed");
      setShadow(j);log("Simulation","Counterfactual simulation completed",String(j.impact?.impacts?.length||0)+" impacted institutional objects");
    }catch(e:any){setMessage(e.message||"Simulation failed");}
    finally{setSimBusy(false);}
  }

  async function preflight(){
    setDecisionBusy(true);setMessage("");
    try{
      const r=await fetch("/api/decision",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({regulation:nextLaw,jurisdiction:"India / BFSI",sourceRef:"Working rule state",action,facts:facts.split(";").map(x=>x.trim()).filter(Boolean)})});
      const j=await r.json();if(!r.ok)throw new Error(j.error||"Decision failed");
      setDecision(j);log("Decision","Machine preflight "+j.receipt.decision,j.receipt.stateStatus||"SUFFICIENT");
    }catch(e:any){setMessage(e.message||"Decision failed");}
    finally{setDecisionBusy(false);}
  }

  function recordHumanDecision(){
    if(!decision)return;
    const note=humanNote.trim()||"No additional rationale entered.";
    log("Human review",humanOutcome+" recorded",note+" · machine result "+decision.receipt.decision);
    setWork(w=>[{id:nowId("W"),title:"Human decision: "+humanOutcome,kind:"Decision review",priority:humanOutcome==="Approve"?"Low":"High",owner:"Authorised Reviewer",status:"Closed",context:decision.receipt.receiptHash.slice(0,12)},...w]);
    setHumanNote("");
  }

  function recordCase(outcome:string){
    setCaseStates({...caseStates,[selected.id]:outcome});
    log("Case review",selected.id+" · "+outcome,selected.issue);
    setWork(w=>w.map(x=>x.context.includes(selected.id)?{...x,status:outcome==="Approved"?"Closed":"In review"}:x));
  }

  function exportJournal(){
    const payload={product:"Institutional OS",exportedAt:new Date().toISOString(),assets,work,audit,decision,shadow,analysis,caseStates};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="institutional-os-evidence.json";a.click();URL.revokeObjectURL(a.href);
  }

  return <main className="ios">
    <aside className="rail">
      <div className="logo"><div className="logoMark"><Layers3 size={20}/></div><div><b>INSTITUTIONAL OS</b><span>Decision Runtime</span></div></div>
      <div className="sample"><CircleDot size={11}/> SAMPLE WORKSPACE</div>
      <nav>{navGroups.map(g=><div className="navGroup" key={g.label}><label>{g.label}</label>{g.items.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={17}/>{label}</button>)}</div>)}</nav>
      <div className="railFoot"><ShieldCheck size={15}/><span>Evidence-aware<br/>Human-governed</span></div>
    </aside>

    <section className="workspace">
      <header className="bar">
        <div><span className="overline">CONNECTED INSTITUTIONAL INTELLIGENCE</span><h1>{navGroups.flatMap(x=>x.items).find(x=>x[0]===tab)?.[1]}</h1></div>
        <div className="barMeta"><span><Database size={14}/>{assets.length} state objects</span><span><ListChecks size={14}/>{openWork} open</span></div>
      </header>

      {tab==="command"&&<div className="page">
        <section className="commandHero">
          <div><span className="overline">ONE CONTROL PLANE</span><h2>What needs to be decided, simulated, reviewed or investigated?</h2><p>Institutional OS connects rules, contracts, controls, systems, vendors, people, evidence and human authority before producing an outcome.</p></div>
          <div className="modeRow">
            {(["decide","simulate","review","investigate"] as const).map(x=><button key={x} className={mode===x?"on":""} onClick={()=>setMode(x)}>{x}</button>)}
          </div>
          <div className="commandBox"><Search size={20}/><textarea value={query} onChange={e=>setQuery(e.target.value)} placeholder={mode==="decide"?"Example: Can we approve this cloud subcontractor today?":mode==="simulate"?"Paste a proposed rule or describe a future-state change":mode==="review"?"Paste contract, policy or case text":"Describe the issue, entity, vendor, process or evidence to investigate"}/><button onClick={launch}>Route <ArrowRight size={16}/></button></div>
          <div className="truthNote"><BadgeCheck size={15}/><span>This pilot separates seeded examples, deterministic calculations and human decisions. It does not label simulated data as live intelligence.</span></div>
        </section>

        <div className="metricGrid">
          <Metric icon={Building2} value={String(assets.length)} label="Institutional objects" note="Shared decision context"/>
          <Metric icon={AlertTriangle} value={String(attention.filter(x=>x.priority==="Critical"||x.priority==="High").length)} label="Priority items" note="Human attention required"/>
          <Metric icon={Fingerprint} value={decision?.receipt.decision||"—"} label="Latest preflight" note={decision?.receipt.stateStatus||"No decision run"}/>
          <Metric icon={BadgeCheck} value={String(evidenceGaps)} label="Evidence gaps" note="Missing or incomplete state"/>
        </div>

        <div className="two">
          <Panel title="Attention required" icon={AlertTriangle}>
            <div className="queueMini">{attention.slice(0,4).map(x=><button key={x.id} onClick={()=>setTab("queue")}><span className={riskClass(x.priority)}>{x.priority}</span><div><b>{x.title}</b><small>{x.kind} · {x.owner}</small></div><ChevronRight size={15}/></button>)}</div>
          </Panel>
          <Panel title="Institutional picture" icon={Network}>
            <div className="flow"><span>RULE / CHANGE</span><ArrowRight/><span>STATE</span><ArrowRight/><span>EVIDENCE</span><ArrowRight/><span>DECISION</span><ArrowRight/><span>ACTION</span></div>
            <div className="stateSummary">{["verified","partial","stale"].map(s=><div key={s}><b>{assets.filter(a=>a.status===s).length}</b><span>{s} objects</span></div>)}</div>
            <p className="muted">Unlike a document-only copilot, every downstream result is tied back to an explicit institutional object and its evidence quality.</p>
          </Panel>
        </div>

        <Panel title="Recent decision trail" icon={Activity}>
          {audit.length?<div className="auditList">{audit.slice(0,5).map(a=><div key={a.id}><span>{fmt(a.time)}</span><b>{a.title}</b><small>{a.detail}</small></div>)}</div>:<Empty title="No recorded decisions yet" text="Run a simulation, document review, case decision or Decision Gate preflight."/>}
        </Panel>
      </div>}

      {tab==="queue"&&<div className="page">
        <Head eyebrow="HUMAN GOVERNANCE" title="Work Queue" text="Machine intelligence becomes useful only when it produces owned, reviewable work. Every item here can be assigned and progressed."/>
        <div className="queue">{work.map((x,i)=><div className="queueRow" key={x.id}>
          <span className={riskClass(x.priority)}>{x.priority}</span>
          <div className="grow"><b>{x.title}</b><small>{x.kind} · {x.context}</small></div>
          <input value={x.owner} onChange={e=>setWork(w=>w.map((v,n)=>n===i?{...v,owner:e.target.value}:v))}/>
          <select value={x.status} onChange={e=>{const status=e.target.value as WorkItem["status"];setWork(w=>w.map((v,n)=>n===i?{...v,status}:v));log("Workflow",x.id+" → "+status,x.title)}}><option>Open</option><option>In review</option><option>Waiting</option><option>Closed</option></select>
        </div>)}</div>
      </div>}

      {tab==="state"&&<div className="page">
        <Head eyebrow="MACHINE-READABLE ORGANISATION" title="Institutional State" text="The same state powers change impact, case review, contract analysis and pre-action decisions. Edit the sample objects or add your own."/>
        <div className="assetGrid">{assets.map((a,i)=><div className="asset" key={a.id}>
          <div className="assetTop"><select value={a.type} onChange={e=>setAssets(v=>v.map((x,n)=>n===i?{...x,type:e.target.value as AssetType}:x))}>{["contract","control","policy","process","system","vendor","product","entity","person","authority","evidence"].map(t=><option key={t}>{t}</option>)}</select><span className={"state "+a.status}>{a.status}</span></div>
          <input className="nameInput" value={a.name} onChange={e=>setAssets(v=>v.map((x,n)=>n===i?{...x,name:e.target.value}:x))}/>
          <textarea value={a.facts.join("; ")} onChange={e=>setAssets(v=>v.map((x,n)=>n===i?{...x,facts:e.target.value.split(";").map(y=>y.trim()).filter(Boolean)}:x))}/>
          <div className="assetFoot"><code>{a.id}</code><select value={a.status} onChange={e=>setAssets(v=>v.map((x,n)=>n===i?{...x,status:e.target.value as Asset["status"]}:x))}><option>verified</option><option>partial</option><option>stale</option></select><button onClick={()=>setAssets(v=>v.filter((_,n)=>n!==i))}><X size={14}/></button></div>
        </div>)}</div>
        <button className="secondary add" onClick={()=>setAssets(v=>[...v,{id:nowId("OBJ"),type:"control",name:"New institutional object",facts:["Describe the operational fact"],cost:2,status:"partial"}])}><Plus size={15}/> Add object</button>
      </div>}

      {tab==="changes"&&<div className="page">
        <Head eyebrow="SOURCE → IMPACT" title="Change Intelligence" text="Use official publications as source material, then send a relevant change into the simulation layer. Feed retrieval is distinct from impact reasoning." action={<button className="primary" onClick={refreshRegs} disabled={regBusy}>{regBusy?<Loader2 className="spin" size={15}/>:<RefreshCw size={15}/>} Refresh official feeds</button>}/>
        <div className="sourceBanner"><Landmark size={17}/><span>Official-source retrieval currently covers RBI and SEBI RSS endpoints. Relevance and enterprise impact require a separate simulation step.</span></div>
        {regs.length?<div className="regCards">{regs.map((r,i)=><div className="regCard" key={i}><span>{r.source}</span><div><b>{r.title}</b><p>{r.summary||"Open the source publication for details."}</p><small>{r.date||"Date unavailable"}</small></div><button onClick={()=>{setNextLaw((r.title+". "+r.summary).trim());setTab("simulate")}}>Simulate <ArrowRight size={14}/></button></div>)}</div>:<Empty title="No official feed items loaded" text="Refresh the source queue, or use Simulate directly with a proposed rule or policy change."/>}
      </div>}

      {tab==="documents"&&<div className="page">
        <Head eyebrow="OBJECT-FIRST REVIEW" title="Document Review" text="The workbench connects source text to findings, obligations and actions. AI output remains decision support; findings should be verified against authoritative sources."/>
        <div className="two">
          <Panel title="Source document" icon={UploadCloud}>
            <label className="drop">{extractBusy?<Loader2 className="spin"/>:<UploadCloud size={28}/>}<b>{extractBusy?"Extracting…":"Choose PDF, DOCX or text"}</b><small>Up to the pilot file limit supported by the extraction service.</small><input type="file" accept=".pdf,.docx,.txt,.md,.csv,.json" onChange={e=>e.target.files?.[0]&&extract(e.target.files[0])}/></label>
            <input className="wide" placeholder="Document name" value={docName} onChange={e=>setDocName(e.target.value)}/>
          </Panel>
          <Panel title="Working text" icon={FileText}>
            <textarea className="docEditor" value={docText} onChange={e=>setDocText(e.target.value)} placeholder="Extracted text appears here. You can also paste text directly."/>
            <button className="primary right" onClick={analyze} disabled={docBusy}>{docBusy?<Loader2 className="spin" size={15}/>:<FileSearch size={15}/>} Run review</button>
          </Panel>
        </div>
        {message&&<div className="notice">{message}</div>}
        {analysis&&<div className="reviewLayout">
          <div className="findingList">{analysis.findings.map(f=><div className="finding" key={f.id}><div><span className={riskClass(f.risk)}>{f.risk}</span><b>{f.clause}</b></div><p>{f.excerpt}</p><small>{f.regulation}</small></div>)}</div>
          <div className="reviewDetail"><h3>{analysis.document}</h3><p>{analysis.summary}</p>{analysis.findings.slice(0,3).map(f=><div className="evidenceChain" key={f.id}><span>Evidence</span><p>{f.excerpt}</p><span>Why</span><p>{f.rationale}</p><span>Action</span><p>{f.action}</p></div>)}</div>
        </div>}
      </div>}

      {tab==="cases"&&<div className="page">
        <Head eyebrow="CASE → EVIDENCE → HUMAN DECISION" title="Cases & KYC" text="SNEH's strongest pattern is retained here: a review queue beside the evidence and decision workspace, with the outcome written into the evidence journal."/>
        <div className="caseLayout">
          <div className="caseQueue">{seedCases.map(c=><button key={c.id} className={selectedCase===c.id?"active":""} onClick={()=>setSelectedCase(c.id)}><span className={riskClass(c.risk)}>{c.risk}</span><b>{c.name}</b><small>{c.id} · {caseStates[c.id]||c.status}</small></button>)}</div>
          <div className="caseDetail"><div className="caseTitle"><div><span>{selected.kind}</span><h3>{selected.name}</h3></div><span className={riskClass(selected.risk)}>{selected.risk}</span></div><div className="caseIssue"><b>Issue requiring decision</b><p>{selected.issue}</p></div><div className="evidenceTiles">{selected.evidence.map(x=><div key={x}><BadgeCheck size={15}/><span>{x}</span></div>)}</div><div className="caseActions">{["Approved","Hold","Escalated","Rejected"].map(x=><button key={x} onClick={()=>recordCase(x)}>{x}</button>)}</div></div>
        </div>
      </div>}

      {tab==="simulate"&&<div className="page">
        <Head eyebrow="COUNTERFACTUAL INSTITUTIONAL IMPACT" title="Simulate" text="Compare a current rule state with a proposed state and calculate which enterprise objects appear affected before implementation." action={<button className="primary" onClick={simulate} disabled={simBusy}>{simBusy?<Loader2 className="spin" size={15}/>:<FlaskConical size={15}/>} Run simulation</button>}/>
        <div className="two"><Panel title="Current state" icon={BookOpenCheck}><textarea className="law" value={baseLaw} onChange={e=>setBaseLaw(e.target.value)}/></Panel><Panel title="Proposed state" icon={GitBranch}><textarea className="law" value={nextLaw} onChange={e=>setNextLaw(e.target.value)}/></Panel></div>
        <div className="sourceBanner"><Building2 size={17}/><span>{assets.length} institutional objects are in scope for this simulation.</span></div>
        {shadow&&<>
          <div className="metricGrid">
            <Metric icon={Sparkles} value={String(shadow.delta.added.length)} label="New rules" note="Added by proposed state"/>
            <Metric icon={GitBranch} value={String(shadow.delta.modified.length)} label="Modified rules" note="Changed legal function"/>
            <Metric icon={AlertTriangle} value={String(shadow.impact.impacts.length)} label="Affected objects" note="Heuristic impact mapping"/>
            <Metric icon={ListChecks} value={String(shadow.impact.minimumChangeSet.length)} label="Remediation candidates" note={"Effort index "+shadow.impact.totalEstimatedEffort}/>
          </div>
          <div className="two"><Panel title="Impact paths" icon={Network}><div className="impactList">{shadow.impact.impacts.slice(0,8).map((x:any,i:number)=><div key={i}><code>{x.ruleId}</code><ArrowRight size={13}/><b>{x.asset}</b><span>{x.relevance}%</span><small>{x.gap}</small></div>)}</div></Panel><Panel title="Compact remediation candidate" icon={ListChecks}><div className="remediation">{shadow.impact.minimumChangeSet.map((x:any,i:number)=><div key={i}><span>{i+1}</span><div><b>{x.asset}</b><p>{x.remediation}</p><small>{x.type} · effort {x.cost}</small></div></div>)}</div></Panel></div>
        </>}
      </div>}

      {tab==="decision"&&<div className="page">
        <Head eyebrow="PRE-ACTION GOVERNANCE" title="Decision Gate" text="The machine must not invent certainty. Facts carry provenance; critical missing or conflicting facts can force INSUFFICIENT STATE instead of a false automated answer."/>
        <div className="two">
          <Panel title="Proposed action" icon={Fingerprint}><textarea className="law" value={action} onChange={e=>setAction(e.target.value)}/><label className="fieldLabel">Institutional facts · semicolon separated</label><textarea className="facts" value={facts} onChange={e=>setFacts(e.target.value)}/><div className="legend"><span className="verified">verified</span><span className="derived">derived</span><span className="assumed">assumed</span><span className="missing">missing</span><span className="conflicting">conflicting</span><span>unverified</span></div><button className="primary full" onClick={preflight} disabled={decisionBusy}>{decisionBusy?<Loader2 className="spin" size={15}/>:<ShieldCheck size={15}/>} Preflight action</button></Panel>
          <Panel title="Machine outcome" icon={ShieldCheck}>{!decision?<Empty title="No preflight yet" text="Run the proposed action against the working rule state and fact assertions."/>:<div className="decisionBox"><div className={"decision "+decision.receipt.decision.toLowerCase()}>{decision.receipt.decision}</div><span className="stateFlag">{decision.receipt.stateStatus}</span><p>{decision.receipt.stateStatus==="INSUFFICIENT_STATE"?"A final machine determination is withheld because critical institutional state is missing or conflicting.":decision.receipt.decision==="BLOCK"?"A compiled prohibition intersects the proposed action.":"Review the applied obligations and evidence before execution."}</p><div className="receiptStats"><div><b>{decision.receipt.ruleIds.length}</b><span>rules applied</span></div><div><b>{decision.receipt.missingEvidence?.length||0}</b><span>evidence gaps</span></div></div>{decision.receipt.blockingFacts?.length? <div className="blocking"><b>Blocking state gaps</b>{decision.receipt.blockingFacts.map((x,i)=><span key={i}>{x}</span>)}</div>:null}<code className="hash">{decision.receipt.receiptHash}</code></div>}</Panel>
        </div>
        {decision&&<div className="two"><Panel title="Applied reasoning trace" icon={Network}><div className="reasonList">{decision.receipt.reasoning.map((x:any,i:number)=><div key={i}><span className={riskClass(x.modality)}>{x.modality}</span><div><b>{x.rule} · {x.relevance}% relevance</b><p>{x.source}</p></div></div>)}</div></Panel><Panel title="Human authority" icon={UserCheck}><p className="muted">Record the authorised human decision separately from the machine preflight. This creates a durable distinction between system recommendation and institutional approval.</p><select className="wide" value={humanOutcome} onChange={e=>setHumanOutcome(e.target.value)}><option>Approve</option><option>Escalate</option><option>Hold</option><option>Reject</option><option>Override machine result</option></select><textarea className="facts" placeholder="Human rationale / conditions / requested evidence" value={humanNote} onChange={e=>setHumanNote(e.target.value)}/><button className="secondary full" onClick={recordHumanDecision}><UserCheck size={15}/> Record human decision</button></Panel></div>}
      </div>}

      {tab==="evidence"&&<div className="page">
        <Head eyebrow="REPLAYABLE INSTITUTIONAL MEMORY" title="Evidence Journal" text="Every simulation, machine preflight, case action and human decision can be recorded separately. Export produces a pilot evidence package, not a claim of legal proof." action={<button className="primary" onClick={exportJournal}><Download size={15}/> Export JSON</button>}/>
        <div className="journal">{audit.length?audit.map(a=><div key={a.id}><div className="dot"/><span>{fmt(a.time)}</span><div><b>{a.title}</b><p>{a.detail}</p><small>{a.type} · {a.id}</small></div></div>):<Empty title="Journal is empty" text="Use the product and decisions will appear here."/>}</div>
      </div>}

      <footer><span>Institutional OS · fusion pilot</span><span>Separate prototype derived from the strongest SNEH workflow patterns and Synesis decision-runtime architecture.</span></footer>
    </section>
  </main>;
}

function Metric({icon:Icon,value,label,note}:{icon:any,value:string,label:string,note:string}){return <div className="metric"><div className="metricIcon"><Icon size={18}/></div><div><b>{value}</b><span>{label}</span><small>{note}</small></div></div>}
function Panel({title,icon:Icon,children}:{title:string,icon:any,children:React.ReactNode}){return <section className="panel"><header><span><Icon size={16}/>{title}</span></header><div className="panelBody">{children}</div></section>}
function Head({eyebrow,title,text,action}:{eyebrow:string,title:string,text:string,action?:React.ReactNode}){return <div className="head"><div><span className="overline">{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>{action}</div>}
function Empty({title,text}:{title:string;text:string}){return <div className="empty"><Database size={28}/><b>{title}</b><span>{text}</span></div>}
