"use client";
import {useMemo,useState} from "react";
import {ArrowRight,Braces,CheckCircle2,CircleAlert,Code2,GitCompareArrows,Play,ShieldCheck,Sparkles,TestTube2} from "lucide-react";

type Rule={id:string;source:string;authority:number;specificity:number;effective:string;jurisdiction:string;subject:string;effect:"ALLOW"|"DENY"|"REVIEW";condition:string;citation:string};
type Scenario={jurisdiction:string;subject:string;amount:number;crossBorder:boolean;customerType:string};

const baseRules:Rule[]=[
{id:"RBI-KYC-01",source:"Regulation",authority:5,specificity:4,effective:"2026-01-01",jurisdiction:"IN",subject:"payment",effect:"REVIEW",condition:"crossBorder == true",citation:"Illustrative RBI/KYC control capsule"},
{id:"BANK-POL-17",source:"Internal Policy",authority:3,specificity:5,effective:"2026-04-01",jurisdiction:"IN",subject:"payment",effect:"DENY",condition:"crossBorder == true && amount > 500000",citation:"Illustrative internal risk policy"},
{id:"PARTNER-MSA-09",source:"Contract",authority:2,specificity:5,effective:"2026-02-01",jurisdiction:"IN",subject:"payment",effect:"ALLOW",condition:"customerType == 'enterprise'",citation:"Illustrative contractual permission"},
{id:"BOARD-EXC-02",source:"Approved Exception",authority:4,specificity:6,effective:"2026-09-15",jurisdiction:"IN",subject:"payment",effect:"ALLOW",condition:"crossBorder == true && amount <= 100000",citation:"Illustrative approved exception"}
];

function matches(c:string,s:Scenario){
 const x=c.replace(/crossBorder/g,String(s.crossBorder)).replace(/amount/g,String(s.amount)).replace(/customerType/g,JSON.stringify(s.customerType));
 try{return Function("return ("+x+")")()}catch{return false}
}
function evaluate(rules:Rule[],s:Scenario){
 const applicable=rules.filter(r=>r.jurisdiction===s.jurisdiction&&r.subject===s.subject&&matches(r.condition,s))
  .sort((a,b)=>(b.authority-a.authority)||(b.specificity-a.specificity)||(Date.parse(b.effective)-Date.parse(a.effective)));
 const winner=applicable[0];
 return {applicable,winner};
}

export default function Compiler(){
 const [rules,setRules]=useState(baseRules);
 const [scenario,setScenario]=useState<Scenario>({jurisdiction:"IN",subject:"payment",amount:650000,crossBorder:true,customerType:"enterprise"});
 const [changed,setChanged]=useState(false);
 const result=useMemo(()=>evaluate(rules,scenario),[rules,scenario]);
 const regressions=useMemo(()=>{
   const tests=[
    {name:"Retail low-value domestic",s:{...scenario,amount:30000,crossBorder:false,customerType:"retail"}},
    {name:"Enterprise cross-border 75k",s:{...scenario,amount:75000,crossBorder:true,customerType:"enterprise"}},
    {name:"Enterprise cross-border 650k",s:{...scenario,amount:650000,crossBorder:true,customerType:"enterprise"}},
    {name:"Retail cross-border 650k",s:{...scenario,amount:650000,crossBorder:true,customerType:"retail"}}
   ];
   return tests.map(t=>({...t,out:evaluate(rules,t.s).winner?.effect||"NO RULE"}));
 },[rules,scenario]);

 function simulateChange(){
   setRules(rs=>rs.map(r=>r.id==="RBI-KYC-01"?{...r,effect:"DENY",condition:"crossBorder == true && amount > 250000",effective:"2026-10-04",citation:"Illustrative regulator change: threshold lowered"}:r));
   setChanged(true);
 }

 return <main style={{minHeight:"100vh",background:"#07111f",color:"#e8eef7",padding:"28px",fontFamily:"Inter,system-ui,sans-serif"}}>
  <div style={{maxWidth:1480,margin:"0 auto"}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"end",marginBottom:20}}>
    <div><div style={{fontSize:10,letterSpacing:2,color:"#8398af"}}>SYNESIS COMPLIANCE COMPILER</div><h1 style={{fontSize:34,margin:"6px 0"}}>Compile law into executable decisions — then regression-test change.</h1><p style={{color:"#91a5bb",maxWidth:900,lineHeight:1.6}}>This lab resolves competing norms for one real-world action, produces the controlling-rule path, and reruns boundary scenarios when a source changes.</p></div>
    <a href="/" style={{color:"#c7bdff",textDecoration:"none"}}>← Executive pilot</a>
   </div>

   <div style={{display:"grid",gridTemplateColumns:"1.1fr .9fr",gap:14}}>
    <section style={card}><h3 style={head}><Braces size={18}/> 1. Action context</h3><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
     <label style={label}>Amount<input style={input} type="number" value={scenario.amount} onChange={e=>setScenario({...scenario,amount:Number(e.target.value)})}/></label>
     <label style={label}>Customer<select style={input} value={scenario.customerType} onChange={e=>setScenario({...scenario,customerType:e.target.value})}><option value="enterprise">Enterprise</option><option value="retail">Retail</option></select></label>
     <label style={label}>Cross-border<select style={input} value={String(scenario.crossBorder)} onChange={e=>setScenario({...scenario,crossBorder:e.target.value==="true"})}><option value="true">Yes</option><option value="false">No</option></select></label>
     <label style={label}>Jurisdiction<input style={input} value={scenario.jurisdiction} onChange={e=>setScenario({...scenario,jurisdiction:e.target.value})}/></label>
    </div></section>

    <section style={card}><h3 style={head}><ShieldCheck size={18}/> Effective rule</h3>
      {result.winner?<><div style={{fontSize:42,fontWeight:800,color:result.winner.effect==="DENY"?"#ff9ca5":result.winner.effect==="ALLOW"?"#77e0b3":"#ffd486"}}>{result.winner.effect}</div>
      <p style={{color:"#a8b8ca"}}>{result.winner.id} wins because the compiler ranks legal authority, specificity and temporal validity before lower-order contractual permissions.</p>
      <div style={{fontSize:11,color:"#7f95ac"}}>{result.winner.citation}</div></>:<p>No applicable rule.</p>}
    </section>
   </div>

   <section style={{...card,marginTop:14}}><h3 style={head}><GitCompareArrows size={18}/> 2. Normative precedence proof</h3>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
      {result.applicable.map((r,i)=><div key={r.id} style={{background:"#0a1623",border:"1px solid "+(i===0?"#7565df":"#20364d"),borderRadius:12,padding:13}}>
       <div style={{fontSize:10,color:"#8b7ff0",fontWeight:800}}>{i===0?"CONTROLLING":"DEFEATED"} · {r.source}</div>
       <h4 style={{margin:"7px 0"}}>{r.id}</h4><div style={{fontSize:11,color:"#91a4b8"}}>{r.effect} when {r.condition}</div>
       <div style={{fontSize:9,color:"#627990",marginTop:8}}>Authority {r.authority} · Specificity {r.specificity} · {r.effective}</div>
      </div>)}
    </div>
   </section>

   <section style={{...card,marginTop:14}}><div style={{display:"flex",justifyContent:"space-between",gap:15,alignItems:"center"}}><h3 style={head}><TestTube2 size={18}/> 3. Legal regression suite</h3>
    <button onClick={simulateChange} style={button}><Play size={16}/> Simulate regulatory change</button></div>
    <p style={{fontSize:11,color:"#8398af"}}>A rule change should not merely create an alert. Synesis reruns known decision scenarios and exposes which previously valid outcomes have changed.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:12}}>
    {regressions.map((t,i)=><div key={i} style={{background:"#091522",border:"1px solid #21364a",borderRadius:10,padding:12}}>
      <div style={{fontSize:10,color:"#7e93aa"}}>{t.name}</div><b style={{display:"block",fontSize:22,marginTop:6,color:t.out==="DENY"?"#ff9ca5":t.out==="ALLOW"?"#79dfb5":"#ffd486"}}>{t.out}</b>
      <span style={{fontSize:9,color:"#63788f"}}>₹{t.s.amount.toLocaleString("en-IN")} · {t.s.crossBorder?"cross-border":"domestic"}</span>
    </div>)}
    </div>
    {changed&&<div style={{marginTop:12,padding:12,borderRadius:10,background:"#281b13",border:"1px solid #5a3c1f",fontSize:11,color:"#f2c38b"}}><CircleAlert size={15} style={{verticalAlign:"middle",marginRight:6}}/>Regulatory bundle changed. Regression results were recomputed immediately against the new effective rule set.</div>}
   </section>

   <section style={{...card,marginTop:14}}><h3 style={head}><Code2 size={18}/> 4. Rule Capsule — the licensable unit</h3>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
     <Feature title="Executable semantics" text="Source text is not the product. The capsule contains applicability, hierarchy, exceptions, effective dates, machine tests and evidence requirements."/>
     <Feature title="Adversarial legal tests" text="Every capsule ships with boundary and contradiction tests so customers can verify the rule against their own workflows before deployment."/>
     <Feature title="Versioned proof" text="Every decision records the exact capsule version, governing inputs and precedence path so the outcome can be independently reproduced."/>
    </div>
   </section>

   <section style={{...card,marginTop:14,background:"linear-gradient(135deg,#111c31,#15162d)"}}><h3 style={head}><Sparkles size={18}/> Product thesis</h3>
    <p style={{fontSize:18,lineHeight:1.55,maxWidth:1100}}>Synesis should not sell answers. It should sell <b>validated executable legal infrastructure</b>: customers license jurisdiction/product-specific Rule Capsules, embed them into workflows through an API, and automatically receive regression-tested updates when the governing law changes.</p>
   </section>
  </div>
 </main>
}
const card={background:"#0d1927",border:"1px solid #1f3144",borderRadius:14,padding:16} as const;
const head={display:"flex",alignItems:"center",gap:8,margin:"0 0 13px",fontSize:14} as const;
const label={display:"flex",flexDirection:"column",gap:6,fontSize:10,color:"#8297ad"} as const;
const input={background:"#08131f",border:"1px solid #273b50",borderRadius:8,color:"#e4edf6",padding:"10px"} as const;
const button={background:"linear-gradient(135deg,#745ef0,#5b8def)",border:0,borderRadius:9,color:"white",padding:"9px 12px",display:"flex",alignItems:"center",gap:7,fontWeight:700} as const;
function Feature({title,text}:{title:string,text:string}){return <div style={{background:"#091522",border:"1px solid #20364a",borderRadius:11,padding:13}}><CheckCircle2 size={16} color="#62d4aa"/><h4 style={{margin:"8px 0 5px"}}>{title}</h4><p style={{fontSize:10,color:"#8fa3b9",lineHeight:1.55,margin:0}}>{text}</p></div>}
