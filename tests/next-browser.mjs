import { chromium } from "playwright";
import { WebSocket } from "ws";
import assert from "node:assert/strict";
import { mkdtempSync,rmSync,readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "../server/app.js";
import { normalizeProject } from "../shared/project.js";
import { openDefault } from "./browser-helpers.mjs";
const version=JSON.parse(readFileSync(new URL("../package.json",import.meta.url))).version;
const directory=mkdtempSync(tmpdir()+"/gordo-next-");
const {app}=await createServer({directory});let browser;
try {
  const document=normalizeProject({band:"Montaje",event:"Festival",description:"Prueba de red",notes:"",width:10,depth:8,items:[],channels:["Bombo","Caja","Bajo","Voz"].map((source,n)=>({source,mic:"",stand:"",notes:"",c_patch:`A${n+1}`}))});
  document.columns.push({id:"c_patch",label:"Patch"});
  await app.inject({method:"PUT",url:"/api/project",payload:{revision:0,document}});
  await app.listen({port:0,host:"0.0.0.0"});
  const port=app.server.address().port,host=`http://127.0.0.1:${port}`,remote="http://stage.test";
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium"});
  const a=await browser.newContext({viewport:{width:1600,height:1100}}),b=await browser.newContext({viewport:{width:1600,height:1100}});
  for(const context of [a,b]){context.setDefaultTimeout(15000);await context.route("https://fonts.googleapis.com/**",r=>r.abort());await context.addInitScript(()=>localStorage.setItem("gordostage-chat-minimized","true"));}
  // An insecure HTTP origin exercises the LAN-only browser failure. Serve it through
  // the same Fastify routes with a remote address; bridge live updates to the real server.
  await b.route("http://stage.test/**",async route=>{
    const request=route.request(),url=new URL(request.url());
    const response=await app.inject({method:request.method(),url:url.pathname+url.search,headers:{...request.headers(),host:"stage.test"},payload:request.postDataBuffer()||undefined,remoteAddress:"192.0.2.20"});
    await route.fulfill({status:response.statusCode,headers:response.headers,body:response.rawPayload});
  });
  await b.routeWebSocket("ws://stage.test/live",ws=>{
    const peer=new WebSocket(`ws://127.0.0.1:${port}/live`);
    peer.on("message",data=>ws.send(data.toString()));
    peer.on("error",()=>ws.close());
    ws.onClose(()=>peer.terminate());
  });
  const p=await a.newPage(),q=await b.newPage(),errors=[];
  for(const page of [p,q])page.on("pageerror",e=>errors.push(e.message));
  const saved=page=>page.waitForFunction(()=>document.querySelector("#save-status")?.textContent==="● Conectado · edición");
  const stored=async()=>(await (await fetch(host+"/api/project")).json()).document;
  await p.goto(host);await p.locator("#home-security").waitFor();
  assert.equal(await p.locator("#header-network code").first().isVisible(),false);
  await p.locator("#header-network summary").click();assert.equal(await p.locator("#header-network code").first().isVisible(),true);
  await p.keyboard.press("Escape");assert.equal(await p.locator("#header-network code").first().isVisible(),false);
  await p.locator("#home-security").click();await p.locator("#server-port").fill("80");
  await p.locator("#server-port-form button").click();await p.waitForFunction(()=>document.querySelector("#server-port-status")?.textContent.includes("Reinicia"));
  assert.equal((await (await fetch(host+"/api/server-settings")).json()).port,80);
  assert.equal((await (await fetch(host+"/api/network")).json()).port,port);
  await p.locator("#workspace-dialog [data-dismiss]").click();await openDefault(p);await saved(p);
  for(const [id,label] of [["band","Nombre nuevo"],["event","Bajada nueva"],["project-description","Descripción nueva"]]) {
    await p.locator(`[data-focus-field="${id}"]`).click();assert.equal(await p.locator(`#${id}`).evaluate(el=>el===document.activeElement),true);
    await p.locator(`#${id}`).fill(label);await saved(p);
  }
  assert.equal(await p.locator(".heading .eyebrow").count(),0);
  assert.equal(await p.locator("#project-session #network-controls").count(),1);
  assert.equal(await p.locator(".brand-copy span").innerText(),"LOGÍSTICA DE ESCENARIO");
  const footer=p.locator("main .app-footer");
  assert.match(await footer.innerText(),new RegExp(`v${version.replaceAll(".","\\.")}`));
  for(const href of ["https://www.instagram.com/don_xuru/","https://www.instagram.com/soyellalo/","https://lechuga.website/"])assert.equal(await footer.locator(`a[href="${href}"]`).count(),1);
  await q.goto(remote);await q.locator("#home-security").waitFor();assert.equal(await q.locator("#home-security").isDisabled(),true);
  assert.deepEqual(await q.evaluate(()=>({secure:isSecureContext,uuid:typeof crypto.randomUUID,random:typeof crypto.getRandomValues})),{secure:false,uuid:"undefined",random:"function"});
  await openDefault(q);await saved(q);await q.locator('[data-tab="channels"]').click();
  await q.locator('[data-row-select="1"]').check();await q.locator('[data-row-select="3"]').check();
  const target=q.locator("tbody tr").first().locator("td").first();
  await q.locator('[data-drag-channel="1"]').first().dragTo(target,{targetPosition:{x:15,y:2}});await saved(q);
  assert.deepEqual((await stored()).channels.map(c=>c.source),["Caja","Voz","Bombo","Bajo"]);
  assert.deepEqual((await stored()).channels.map(c=>c.c_patch),["A2","A4","A1","A3"]);
  await q.locator('[data-row-insert="2"]').click();
  await q.locator('[data-channel="2"][data-field="source"]').fill("Tom insertado");await saved(q);
  assert.deepEqual((await stored()).channels.map(c=>c.source),["Caja","Voz","Tom insertado","Bombo","Bajo"]);
  await p.waitForFunction(()=>[...document.querySelectorAll('tbody [data-field="source"]')].some(input=>input.value==="Tom insertado"));
  assert.equal(await q.evaluate(async()=> (await fetch("/api/server-settings")).status),403);
  assert.deepEqual(errors,[]);
  console.log("OK: editor HTTP sin randomUUID, selección múltiple y patch compartidos, inserción por fila, puerto persistido sin cortar la sesión, acceso compacto, campos con lápiz y créditos/versionado.");
}finally{await browser?.close();await app.close();rmSync(directory,{recursive:true,force:true});}
