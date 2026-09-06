/* eslint-disable @typescript-eslint/no-require-imports */
const {chromium}=require('C:/Users/Dev_Bilal/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage();for(const w of [375,390,430,768,1024,1440]){await p.setViewportSize({width:w,height:1000});await p.goto('https://arabic-quran-academy-demo.vercel.app/',{waitUntil:'networkidle'});const x=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,programs:document.querySelectorAll('.aq-program').length,title:document.title,broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)}));console.log(w,JSON.stringify(x))};await b.close()})()


