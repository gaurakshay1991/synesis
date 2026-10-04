import crypto from "node:crypto";

export type Modality="OBLIGATION"|"PROHIBITION"|"PERMISSION"|"DISCRETION";
export type NormRule={
  id:string; modality:Modality; actor:string; action:string; object:string; trigger:string;
  deadline:string|null; exceptions:string[]; evidence:string[]; jurisdiction:string;
  sourceRef:string; sourceText:string; sourceHash:string; confidence:number;
};
export type EnterpriseAsset={id:string;type:"contract"|"control"|"process"|"system";name:string;facts:string[];cost:number};

const sentenceSplit=(s:string)=>s.replace(/\s+/g," ").split(/(?<=[.;!?])\s+/).map(x=>x.trim()).filter(x=>x.length>20);

function modalityOf(s:string):Modality|null{
  const l=s.toLowerCase();
  if(/\b(shall not|must not|may not|prohibited|is forbidden)\b/.test(l)) return "PROHIBITION";
  if(/\b(shall|must|required to|is required to|has to)\b/.test(l)) return "OBLIGATION";
  if(/\b(may|is permitted to|can)\b/.test(l)) return "PERMISSION";
  if(/\b(should|reasonable steps|appropriate measures|as necessary)\b/.test(l)) return "DISCRETION";
  return null;
}
function actorOf(s:string){
  const m=s.match(/^(.{2,100}?)\s+(?:shall not|must not|may not|shall|must|required to|is required to|has to|may|is permitted to|can|should)\b/i);
  return (m?.[1]||"Regulated entity").replace(/^[\d.()\-\s]+/,"").trim().slice(0,100);
}
function deadlineOf(s:string){
  const m=s.match(/\b(?:within|no later than|not later than)\s+([\w-]+(?:\s+\w+){0,3})\s+(days?|hours?|months?|years?)\b/i);
  return m?m[0]:null;
}
function exceptionsOf(s:string){
  const out:string[]=[];
  for(const re of [/\bunless\s+(.+?)(?:[.;]|$)/ig,/\bexcept(?: where| when| if)?\s+(.+?)(?:[.;]|$)/ig,/\bprovided that\s+(.+?)(?:[.;]|$)/ig]){
    let m; while((m=re.exec(s))) out.push(m[1].trim().slice(0,220));
  }
  return out;
}
function evidenceOf(s:string){
  const l=s.toLowerCase(), out:string[]=[];
  if(/record|document|maintain|retain|log/.test(l)) out.push("Record or retained evidence");
  if(/report|notify|inform/.test(l)) out.push("Notification / reporting evidence");
  if(/audit|inspection|access/.test(l)) out.push("Audit / access evidence");
  if(/consent|approval|authorize/.test(l)) out.push("Consent / approval evidence");
  return [...new Set(out)];
}
function actionObject(s:string){
  const m=s.match(/\b(?:shall not|must not|may not|shall|must|required to|is required to|has to|may|is permitted to|can|should)\s+(.+)/i);
  const tail=(m?.[1]||s).trim();
  const cut=tail.split(/\b(?:unless|except|provided that|within|no later than|not later than)\b/i)[0].trim();
  const first=cut.split(/\s+/).slice(0,8).join(" ");
  return {action:first,object:cut.slice(0,260)};
}
export function compileRegulation(text:string, opts?:{jurisdiction?:string;sourceRef?:string}){
  const jurisdiction=opts?.jurisdiction||"Unspecified";
  const sourceRef=opts?.sourceRef||"Uploaded source";
  const sourceHash=crypto.createHash("sha256").update(text).digest("hex");
  const rules:NormRule[]=[];
  sentenceSplit(text).forEach((s,i)=>{
    const modality=modalityOf(s); if(!modality)return;
    const {action,object}=actionObject(s);
    rules.push({
      id:`R-${String(rules.length+1).padStart(3,"0")}`,modality,actor:actorOf(s),action,object,
      trigger:/\b(if|when|where|upon|in the event)\b/i.test(s)?(s.match(/\b(?:if|when|where|upon|in the event)\b.+?(?=,|;|\bshall\b|\bmust\b)/i)?.[0]||"Context-dependent"):"Always / when applicable",
      deadline:deadlineOf(s),exceptions:exceptionsOf(s),evidence:evidenceOf(s),jurisdiction,sourceRef,sourceText:s,sourceHash,confidence:0.82
    });
  });
  return {sourceHash,jurisdiction,sourceRef,rules,compiledAt:new Date().toISOString()};
}
function sig(r:NormRule){return `${r.modality}|${r.actor.toLowerCase().replace(/\W/g," ")}|${r.action.toLowerCase().split(" ").slice(0,3).join(" ")}`;}
export function diffRules(oldRules:NormRule[],newRules:NormRule[]){
  const oldMap=new Map(oldRules.map(r=>[sig(r),r])), newMap=new Map(newRules.map(r=>[sig(r),r]));
  const added=newRules.filter(r=>!oldMap.has(sig(r)));
  const removed=oldRules.filter(r=>!newMap.has(sig(r)));
  const modified:newRules[0][]=[];
  for(const r of newRules){const o=oldMap.get(sig(r)); if(o&&o.sourceText!==r.sourceText) modified.push(r);}
  return {added,removed,modified};
}
const tokenSet=(s:string)=>new Set(s.toLowerCase().match(/[a-z]{4,}/g)||[]);
function overlap(a:string,b:string){const A=tokenSet(a),B=tokenSet(b);let n=0;A.forEach(x=>{if(B.has(x))n++});return n/Math.max(1,Math.min(A.size,B.size));}
export function impactAndRemediate(changed:NormRule[], assets:EnterpriseAsset[]){
  const impacts=[] as any[];
  for(const r of changed){
    for(const a of assets){
      const score=Math.round(100*Math.max(...a.facts.map(f=>overlap(r.sourceText+" "+r.object,f)),0));
      if(score<10)continue;
      const gap=r.modality==="PROHIBITION"?"Potential prohibited-state exposure":"Potential obligation coverage gap";
      impacts.push({ruleId:r.id,assetId:a.id,asset:a.name,type:a.type,relevance:Math.min(96,score+28),gap,cost:a.cost,
        remediation:a.type==="contract"?"Amend affected clause / add explicit compliance covenant and evidence duty":
        a.type==="control"?"Update control test and required evidence":"Update process/system guardrail and event evidence"});
    }
  }
  impacts.sort((a,b)=>b.relevance-a.relevance);
  const chosen:any[]=[]; const covered=new Set<string>();
  for(const x of impacts.sort((a,b)=>(b.relevance/(b.cost||1))-(a.relevance/(a.cost||1)))){
    if(!covered.has(x.ruleId)){chosen.push(x);covered.add(x.ruleId);}
  }
  return {impacts:impacts.sort((a,b)=>b.relevance-a.relevance),minimumChangeSet:chosen,totalEstimatedEffort:chosen.reduce((s,x)=>s+x.cost,0)};
}
export function decisionReceipt(action:string,facts:string[],rules:NormRule[]){
  const relevant=rules.map(r=>({r,score:overlap(action+" "+facts.join(" "),r.sourceText+" "+r.object)})).filter(x=>x.score>.08).sort((a,b)=>b.score-a.score).slice(0,8);
  let decision:"ALLOW"|"BLOCK"|"REVIEW"="ALLOW";
  if(relevant.some(x=>x.r.modality==="PROHIBITION"&&x.score>.18))decision="BLOCK";
  else if(relevant.some(x=>["OBLIGATION","DISCRETION"].includes(x.r.modality)))decision="REVIEW";
  const payload={decision,action,facts,ruleIds:relevant.map(x=>x.r.id),sourceHashes:[...new Set(relevant.map(x=>x.r.sourceHash))],timestamp:new Date().toISOString()};
  const receiptHash=crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return {...payload,receiptHash,reasoning:relevant.map(x=>({rule:x.r.id,modality:x.r.modality,source:x.r.sourceText,relevance:Math.round(x.score*100)}))};
}
