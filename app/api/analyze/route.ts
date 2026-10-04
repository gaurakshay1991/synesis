import { NextResponse } from "next/server";
import { generateText } from "ai";
import { fallbackAnalysis } from "@/lib/risk-engine";

export const maxDuration = 60;

export async function POST(req:Request){
  const body=await req.json();
  const text=String(body.text||"").slice(0,70000);
  const name=String(body.name||"Uploaded agreement");
  if(!text.trim()) return NextResponse.json({error:"No text supplied"},{status:400});

  const fallback=fallbackAnalysis(text,name);
  try{
    const prompt=`You are Synesis, an explainable legal and regulatory intelligence engine for regulated enterprises in India.
Analyse the contract text below. Return STRICT JSON only, no markdown.
Schema:
{
 "document": string,
 "overallRisk": "High"|"Medium"|"Low",
 "score": number 0-100,
 "summary": string,
 "findings": [{
   "id": string,
   "clause": string,
   "excerpt": string max 320 chars,
   "risk":"Critical"|"High"|"Medium"|"Low",
   "score":number,
   "obligation":string,
   "regulation":string,
   "rationale":string,
   "action":string,
   "owner":string,
   "due":string,
   "confidence":number 0-1
 }]
}
Rules: identify only material issues; separate legal/regulatory risk from commercial preference; explain why each issue matters; do not invent section numbers if uncertain; where applicability depends on facts, say so. Focus on BFSI, outsourcing, privacy, AML/KYC, cyber, audit, termination, liability, data location/transfer, subcontracting, record retention and regulator access.

DOCUMENT NAME: ${name}
TEXT:
${text}`;
    const {text:out}=await generateText({
      model:"openai/gpt-5.6-luna",
      prompt,
      providerOptions:{gateway:{tags:["app:synesis","feature:contract-analysis","env:pilot"]}}
    });
    const cleaned=out.replace(/^```json\s*/i,"").replace(/```$/,"").trim();
    const parsed=JSON.parse(cleaned);
    if(!Array.isArray(parsed.findings)) throw new Error("Invalid AI result");
    return NextResponse.json({...parsed,engine:"AI + rules",generatedAt:new Date().toISOString()});
  }catch{
    return NextResponse.json({...fallback,engine:"Explainable rules fallback",generatedAt:new Date().toISOString()});
  }
}
