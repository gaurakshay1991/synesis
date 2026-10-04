import { NextResponse } from "next/server";

type Item={source:string;title:string;link:string;date:string;summary:string};

function decode(s:string){
  return s.replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
}
function tag(xml:string,t:string){return decode(xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`,"i"))?.[1]||"");}
function parse(xml:string,source:string):Item[]{
  return [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].slice(0,12).map(m=>({
    source,title:tag(m[0],"title"),link:tag(m[0],"link"),date:tag(m[0],"pubDate")||tag(m[0],"date"),
    summary:tag(m[0],"description").slice(0,240)
  })).filter(x=>x.title);
}

export async function GET(){
  const feeds=[
    ["RBI","https://rbi.org.in/notifications_rss.xml"],
    ["SEBI","https://www.sebi.gov.in/sebirss.xml"]
  ] as const;
  const results:Item[]=[];
  await Promise.all(feeds.map(async ([source,url])=>{
    try{
      const res=await fetch(url,{next:{revalidate:900},headers:{"User-Agent":"Synesis-Pilot/2.0"}});
      if(res.ok) results.push(...parse(await res.text(),source));
    }catch{}
  }));
  results.sort((a,b)=>Date.parse(b.date||"0")-Date.parse(a.date||"0"));
  return NextResponse.json({items:results.slice(0,18),refreshedAt:new Date().toISOString(),sources:["RBI Notifications RSS","SEBI RSS"]});
}
