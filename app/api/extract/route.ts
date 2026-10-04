import { NextResponse } from "next/server";

export const runtime="nodejs";
export const maxDuration=60;

export async function POST(req:Request){
  try{
    const form=await req.formData();
    const file=form.get("file");
    if(!(file instanceof File)) return NextResponse.json({error:"File required"},{status:400});
    if(file.size>12*1024*1024) return NextResponse.json({error:"Pilot file limit is 12 MB"},{status:413});
    const name=file.name.toLowerCase();
    const ab=await file.arrayBuffer();
    let text="";
    if(name.endsWith(".txt")||name.endsWith(".md")||name.endsWith(".csv")||name.endsWith(".json")){
      text=new TextDecoder().decode(ab);
    } else if(name.endsWith(".docx")){
      const mammoth=await import("mammoth");
      const result=await mammoth.extractRawText({buffer:Buffer.from(ab)});
      text=result.value;
    } else if(name.endsWith(".pdf")){
      const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");
      const pdf=await pdfjs.getDocument({data:new Uint8Array(ab),isEvalSupported:false,useSystemFonts:true}).promise;
      const pages:string[]=[];
      for(let i=1;i<=Math.min(pdf.numPages,120);i++){
        const page=await pdf.getPage(i);
        const tc=await page.getTextContent();
        pages.push(tc.items.map((x:any)=>("str" in x?x.str:"")).join(" "));
      }
      text=pages.join("\n\n");
    } else {
      return NextResponse.json({error:"Use PDF, DOCX, TXT, MD, CSV or JSON."},{status:415});
    }
    text=text.replace(/\u0000/g,"").trim();
    if(!text) return NextResponse.json({error:"No extractable text found. Scanned-image PDFs need OCR; paste the relevant text for this pilot."},{status:422});
    return NextResponse.json({name:file.name,text:text.slice(0,120000),characters:text.length});
  }catch(e:any){
    return NextResponse.json({error:e?.message||"Could not extract document"},{status:500});
  }
}
