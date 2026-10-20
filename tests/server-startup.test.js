import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

test("el lanzador lee el puerto guardado al reiniciar", async () => {
  const directory=mkdtempSync(tmpdir()+"/gordo-startup-");let child;
  const stop=async()=>{if(child?.exitCode===null){const exit=once(child,"exit");child.kill("SIGTERM");await exit;}child=null;};
  const start=async(override)=>{
    const env={...process.env,STAGE_EDIT_CODE:"",GORDOSTAGE_NO_BROWSER:"1"};
    delete env.PORT;if(override!==undefined)env.PORT=override;
    child=spawn(process.execPath,[fileURLToPath(new URL("../server/portable.js",import.meta.url))],{cwd:directory,env,stdio:["ignore","pipe","pipe"]});
    let output="";
    child.stdout.on("data",data=>output+=data);child.stderr.on("data",data=>output+=data);
    for(let i=0;i<100;i++){
      const address=output.match(/En este PC: (http:\/\/127\.0\.0\.1:\d+)/)?.[1];
      if(address)return address;
      if(child.exitCode!==null)throw Error("No arrancó el servidor: "+output);
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw Error("Tiempo de arranque agotado");
  };
  try {
    const probe=createServer();probe.listen({port:0,host:"127.0.0.1"});await once(probe,"listening");
    const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
    const initial=await start("0");
    const response=await fetch(initial+"/api/server-settings",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({port})});
    assert.equal(response.status,200);await stop();
    const restarted=await start();assert.equal(Number(new URL(restarted).port),port);
    assert.equal((await (await fetch(restarted+"/api/network")).json()).port,port);
    assert.equal((await (await fetch(restarted+"/api/server-settings")).json()).environmentOverride,false);
  }finally{await stop();rmSync(directory,{recursive:true,force:true});}
});
