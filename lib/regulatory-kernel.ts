import crypto from "node:crypto";

export type Modality="OBLIGATION"|"PROHIBITION"|"PERMISSION"|"DISCRETION";
export type NormRule={
  id:string; modality:Modality; actor:string; action:string; object:string; trigger:string;
  conditions:string[]; deadline:string|null; exceptions:string[]; evidence:string[];
  jurisdiction:string; sourceRef:string; sourceText:string; sourceHash:string; confidence:number;
  logicalForm:string;
};
export type EnterpriseAsset={id:string;type:"contract"|"control"|"policy"|"process"|"system"|"vendor"|"product"|"entity"|"person"|"authority"|"evidence";name:string;facts:string[];cost:number};

const sentenceSplit=(s:string)=>s.replace(/\s+/g," ").split(/(?<=[.;!?])\s+/).map(x=>x.trim()).filter(x=>x.length>20);
const MODAL=/\b(shall not|must not|may not|is prohibited from|shall|must|required to|is required to|has to|may|is permitted to|can|should)\b/ig;

function modalityOf(s:string):Modality|null{
  const l=s.toLowerCase();
  if(/\b(shall not|must not|may not|prohibited|forbidden)\b/.test(l)) return "PROHIBITION";
  if(/\b(shall|must|required to|is required to|has to)\b/.test(l)) return "OBLIGATION";
  if(/\b(may|is permitted to|can)\b/.test(l)) return "PERMISSION";
  if(/\b(should|reasonable steps|appropriate measures|as necessary)\b/.test(l)) return "DISCRETION";
  return null;
}
function actorOf(s:string){
  const m=s.match(/^(.{2,120}?)\s+(?:shall not|must not|may not|is prohibited from|shall|must|required to|is required to|has to|may|is permitted to|can|should)\b/i);
  return (m?.[1]||"Regulated entity").replace(/^[\d.()\-\s]+/,"").trim().slice(0,120);
}
function splitNormativeClauses(sentence:string){
  const matches=[...sentence.matchAll(new RegExp(MODAL.source,"ig"))];
  if(matches.length<=1) return [sentence];
  const actor=actorOf(sentence);
  const out:string[]=[];
  for(let i=0;i<matches.length;i++){
    const start=matches[i].index||0;
    const end=i+1<matches.length?(matches[i+1].index||sentence.length):sentence.length;
    let seg=sentence.slice(start,end).replace(/^[,;\s]*(?:and|or)?\s*/i,"").trim();
    seg=seg.replace(/[;,\s]+(?:and|or)?\s*$/i,"").trim();
    if(seg.length>8) out.push(`${actor} ${seg}`);
  }
  return out.length?out:[sentence];
}
function deadlineOf(s:string){
  const m=s.match(/\b(?:within|no later than|not later than)\s+([\w-]+(?:\s+\w+){0,3})\s+(days?|hours?|months?|years?)\b/i);
  return m?m[0]:null;
}
function exceptionsOf(s:string){
  const out:string[]=[];
  for(const re of [/\bunless\s+(.+?)(?:[.;]|$)/ig,/\bexcept(?: where| when| if)?\s+(.+?)(?:[.;]|$)/ig,/\bprovided that\s+(.+?)(?:[.;]|$)/ig]){
    let m; while((m=re.exec(s))) out.push(m[1].trim().slice(0,240));
  }
  return out;
}
function conditionsOf(s:string){
  const out:string[]=[];
  for(const re of [/\bif\s+(.+?)(?=,|;|\bshall\b|\bmust\b|$)/ig,/\bwhen\s+(.+?)(?=,|;|\bshall\b|\bmust\b|$)/ig,/\bwhere\s+(.+?)(?=,|;|\bshall\b|\bmust\b|$)/ig,/\bupon\s+(.+?)(?=,|;|\bshall\b|\bmust\b|$)/ig]){
    let m; while((m=re.exec(s))) out.push(m[0].trim().slice(0,240));
  }
  return [...new Set(out)];
}
function evidenceOf(s:string){
  const l=s.toLowerCase(), out:string[]=[];
  if(/record|document|maintain|retain|log|register/.test(l)) out.push("Record / retained evidence");
  if(/report|notify|inform|disclose/.test(l)) out.push("Notification / reporting evidence");
  if(/audit|inspection|access|examine/.test(l)) out.push("Audit / access evidence");
  if(/consent|approval|authori[sz]e|permission/.test(l)) out.push("Approval / authority evidence");
  if(/assess|due diligence|review|test/.test(l)) out.push("Assessment / test evidence");
  return [...new Set(out)];
}
function actionObject(s:string){
  const m=s.match(/\b(?:shall not|must not|may not|is prohibited from|shall|must|required to|is required to|has to|may|is permitted to|can|should)\s+(.+)/i);
  const tail=(m?.[1]||s).trim();
  const cut=tail.split(/\b(?:unless|except|provided that|within|no later than|not later than)\b/i)[0].trim();
  const action=cut.split(/\s+/).slice(0,5).join(" ");
  return {action,object:cut.slice(0,320)};
}
function logicOf(modality:Modality,actor:string,object:string,conditions:string[],exceptions:string[]){
  const cond=conditions.length?` IF ${conditions.join(" AND ")}`:"";
  const exc=exceptions.length?` EXCEPT ${exceptions.join(" OR ")}`:"";
  return `${modality}(${actor} => ${object})${cond}${exc}`;
}
export function compileRegulation(text:string, opts?:{jurisdiction?:string;sourceRef?:string}){
  const jurisdiction=opts?.jurisdiction||"Unspecified";
  const sourceRef=opts?.sourceRef||"Uploaded source";
  const sourceHash=crypto.createHash("sha256").update(text).digest("hex");
  const rules:NormRule[]=[];
  sentenceSplit(text).forEach(sentence=>{
    splitNormativeClauses(sentence).forEach(s=>{
      const modality=modalityOf(s); if(!modality)return;
      const actor=actorOf(s); const {action,object}=actionObject(s);
      const conditions=conditionsOf(s), exceptions=exceptionsOf(s);
      rules.push({
        id:`R-${String(rules.length+1).padStart(3,"0")}`, modality, actor, action, object,
        trigger:conditions.length?conditions.join("; "):"Always / when applicable",
        conditions, deadline:deadlineOf(s), exceptions, evidence:evidenceOf(s), jurisdiction,sourceRef,
        sourceText:s,sourceHash,confidence:0.84,logicalForm:logicOf(modality,actor,object,conditions,exceptions)
      });
    });
  });
  return {sourceHash,jurisdiction,sourceRef,rules,compiledAt:new Date().toISOString(),method:"deterministic normative parser v2"};
}
const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
function sig(r:NormRule){return `${r.modality}|${norm(r.actor)}|${norm(r.action).split(" ").slice(0,4).join(" ")}`;}
export function diffRules(oldRules:NormRule[],newRules:NormRule[]){
  const oldMap=new Map(oldRules.map(r=>[sig(r),r])), newMap=new Map(newRules.map(r=>[sig(r),r]));
  const added=newRules.filter(r=>!oldMap.has(sig(r)));
  const removed=oldRules.filter(r=>!newMap.has(sig(r)));
  const modified:NormRule[]=[];
  for(const r of newRules){const o=oldMap.get(sig(r)); if(o&&norm(o.sourceText)!==norm(r.sourceText)) modified.push(r);}
  return {added,removed,modified};
}
const tokenSet=(s:string)=>new Set((norm(s).match(/[a-z]{4,}/g)||[]).filter(x=>!["shall","must","where","when","with","from","that","this","such"].includes(x)));
function overlap(a:string,b:string){const A=tokenSet(a),B=tokenSet(b);let n=0;A.forEach(x=>{if(B.has(x))n++});return n/Math.max(1,Math.min(A.size,B.size));}

export function impactAndRemediate(changed:NormRule[], assets:EnterpriseAsset[]){
  const impacts:any[]=[];
  for(const r of changed){
    for(const a of assets){
      const raw=Math.max(...a.facts.map(f=>overlap(r.sourceText+" "+r.object,f)),0);
      if(raw<.08)continue;
      const relevance=Math.min(98,Math.round(raw*100)+20);
      impacts.push({
        ruleId:r.id,assetId:a.id,asset:a.name,type:a.type,relevance,
        gap:r.modality==="PROHIBITION"?"Potential prohibited-state exposure":"Potential rule-coverage gap",
        cost:a.cost,
        remediation:a.type==="contract"?"Review and amend the affected clause; add explicit covenant, evidence and flow-down where required":
          a.type==="control"?"Update the control objective, test procedure and required evidence":
          a.type==="policy"?"Update the policy rule, approval authority and implementation evidence":
          a.type==="process"?"Change the operating step, approval gate and retained evidence":
          a.type==="system"?"Update the system guardrail, validation rule and event evidence":
          a.type==="vendor"?"Reassess the vendor, contractual flow-down and monitoring evidence":
          a.type==="product"?"Change product eligibility, disclosures, controls or operating conditions":
          a.type==="entity"?"Review entity-level applicability, licence perimeter and governance approvals":
          a.type==="person"||a.type==="authority"?"Revalidate authority, delegation and approval conditions":
          "Refresh or obtain the evidence required to establish the regulated state"
      });
    }
  }
  const uncovered=new Set(changed.map(r=>r.id));
  const chosen:any[]=[];
  const byAsset=new Map<string,any[]>();
  impacts.forEach(x=>byAsset.set(x.assetId,[...(byAsset.get(x.assetId)||[]),x]));
  while(uncovered.size){
    let best:any=null,bestScore=0;
    for(const [assetId,rows] of byAsset){
      if(chosen.some(x=>x.assetId===assetId))continue;
      const covers=rows.filter(r=>uncovered.has(r.ruleId));
      if(!covers.length)continue;
      const avg=covers.reduce((s,r)=>s+r.relevance,0)/covers.length;
      const score=(covers.length*avg)/Math.max(1,rows[0].cost);
      if(score>bestScore){bestScore=score;best={...rows[0],covers:covers.map(x=>x.ruleId),coverageScore:Math.round(score)};}
    }
    if(!best)break;
    chosen.push(best);best.covers.forEach((id:string)=>uncovered.delete(id));
  }
  return {
    impacts:impacts.sort((a,b)=>b.relevance-a.relevance),
    minimumChangeSet:chosen,
    totalEstimatedEffort:chosen.reduce((s,x)=>s+x.cost,0),
    uncoveredRuleIds:[...uncovered],
    method:"greedy multi-rule set-cover heuristic"
  };
}
type FactStatus="VERIFIED"|"DERIVED"|"ASSUMED"|"MISSING"|"CONFLICTING"|"UNVERIFIED";
function parseFactAssertion(raw:string){
  const m=raw.trim().match(/^\[(verified|derived|assumed|missing|conflicting|unverified)\]\s*(.+)$/i);
  const status=(m?.[1]?.toUpperCase()||"UNVERIFIED") as FactStatus;
  return {status,text:(m?.[2]||raw).trim()};
}
export function decisionReceipt(action:string,facts:string[],rules:NormRule[]){
  const assertions=facts.map(parseFactAssertion).filter(x=>x.text);
  const usableFacts=assertions.filter(x=>!["MISSING","CONFLICTING"].includes(x.status)).map(x=>x.text);
  const context=action+" "+assertions.map(x=>x.text).join(" ");
  const relevant=rules.map(r=>({r,score:overlap(context,r.sourceText+" "+r.object)})).filter(x=>x.score>.07).sort((a,b)=>b.score-a.score).slice(0,10);

  const criticalUncertainty=assertions.filter(a=>["MISSING","CONFLICTING"].includes(a.status)&&relevant.some(x=>overlap(a.text,x.r.sourceText+" "+x.r.object)>.05));
  const assumedRelevant=assertions.filter(a=>a.status==="ASSUMED"&&relevant.some(x=>overlap(a.text,x.r.sourceText+" "+x.r.object)>.05));

  let decision:"ALLOW"|"BLOCK"|"REVIEW"="ALLOW";
  let stateStatus:"SUFFICIENT"|"INSUFFICIENT_STATE"|"ASSUMPTION_DEPENDENT"="SUFFICIENT";
  const blocking=relevant.filter(x=>x.r.modality==="PROHIBITION"&&x.score>.16);

  if(criticalUncertainty.length){
    decision="REVIEW";
    stateStatus="INSUFFICIENT_STATE";
  }else if(blocking.length){
    decision="BLOCK";
  }else if(relevant.some(x=>["OBLIGATION","DISCRETION"].includes(x.r.modality))){
    decision="REVIEW";
  }
  if(stateStatus==="SUFFICIENT"&&assumedRelevant.length) stateStatus="ASSUMPTION_DEPENDENT";

  const missingEvidence=[...new Set(relevant.flatMap(x=>x.r.evidence))].filter(e=>!usableFacts.some(f=>overlap(f,e)>.2));
  const provenanceSummary=assertions.reduce((acc:any,a)=>{acc[a.status]=(acc[a.status]||0)+1;return acc;},{});
  const payload={
    decision,stateStatus,action,facts,assertions,provenanceSummary,
    blockingFacts:criticalUncertainty.map(x=>x.text),
    assumptionFacts:assumedRelevant.map(x=>x.text),
    ruleIds:relevant.map(x=>x.r.id),
    sourceHashes:[...new Set(relevant.map(x=>x.r.sourceHash))],
    missingEvidence,timestamp:new Date().toISOString()
  };
  const receiptHash=crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return {...payload,receiptHash,receiptType:"tamper-evident decision fingerprint",reasoning:relevant.map(x=>({rule:x.r.id,modality:x.r.modality,source:x.r.sourceText,logicalForm:x.r.logicalForm,relevance:Math.round(x.score*100)}))};
}
