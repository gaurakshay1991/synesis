import {NextResponse} from "next/server";import {compileRegulation,diffRules,impactAndRemediate,EnterpriseAsset} from "@/lib/regulatory-kernel";
const defaultAssets:EnterpriseAsset[]=[
{id:"C1",type:"contract",name:"Cloud Outsourcing MSA",facts:["vendor processes customer data and may appoint subcontractors; audit rights and breach notification apply"],cost:3},
{id:"C2",type:"contract",name:"Payment Aggregator Agreement",facts:["customer funds payment processing transaction data incident notification audit access"],cost:4},
{id:"CTRL1",type:"control",name:"Third-Party Risk Control",facts:["due diligence subcontractor register annual audit risk assessment"],cost:2},
{id:"P1",type:"process",name:"Incident Response",facts:["security incident breach notification escalation customer regulator within defined time"],cost:2},
{id:"S1",type:"system",name:"Vendor Access Gateway",facts:["third party privileged access logs approval data access"],cost:5}
];
export async function POST(req:Request){const b=await req.json();const oldC=compileRegulation(String(b.currentText||""),{jurisdiction:b.jurisdiction,sourceRef:"Current law"});const newC=compileRegulation(String(b.proposedText||""),{jurisdiction:b.jurisdiction,sourceRef:"Proposed / amended law"});const delta=diffRules(oldC.rules,newC.rules);const assets=Array.isArray(b.assets)&&b.assets.length?b.assets:defaultAssets;const impact=impactAndRemediate([...delta.added,...delta.modified],assets);return NextResponse.json({current:oldC,proposed:newC,delta,impact,assets,simulatedAt:new Date().toISOString()});}