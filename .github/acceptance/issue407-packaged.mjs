import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, renameSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "@playwright/test";

const root = path.resolve("acceptance-evidence");
const workspace = path.join(root, "workspace");
const userData = path.join(root, "user-data");
const appData = path.join(root, "app-data");
const screenshots = path.join(root, "screenshots");
const providerLog = path.join(root, "provider-requests.jsonl");
const providerInfo = path.join(root, "provider-info.json");
const cert = path.join(process.env.RUNNER_TEMP, "aaaat-provider-cert.pem");
const key = path.join(process.env.RUNNER_TEMP, "aaaat-provider-key.pem");
const timeoutTool = path.join(process.env.RUNNER_TEMP, "aaaat-timeout-tool");
const timeoutChildPidFile = path.join(root, "timeout-child.pid");
const exe = path.resolve("out", "AAAAT-win32-x64", "aaaat.exe");
const candidatureId = "00000000-0000-4000-8000-000000000407";
const identityId = "00000000-0000-4000-8000-000000000408";
const contactId = "00000000-0000-4000-8000-000000000409";
const experienceId = "00000000-0000-4000-8000-000000000410";
const secretOriginal = "issue407-secret";
const secretReplacement = "issue407-replacement-secret";
const observations = {
  base: "fc04616543e3746970437e120458ab50046a1c32",
  environment: { platform: process.platform, arch: process.arch, packagedExe: exe },
  documentRuntime: {}, documentUx: {}, aiRuntime: {}, aiUx: {}, shell: {}, harness: []
};

function save() {
  writeFileSync(path.join(root, "observations.json"), JSON.stringify(observations, null, 2) + "\n");
}
function note(section, key, value) {
  observations[section][key] = value;
  save();
}
function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else out.push(full);
  }
  return out;
}
async function port() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const a = s.address();
      const p = typeof a === "object" && a ? a.port : 0;
      s.close((e) => e ? reject(e) : resolve(p));
    });
  });
}
function remember(dir) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "workspace-settings.json"), JSON.stringify({ lastWorkspacePath: workspace }, null, 2) + "\n");
}
function initWorkspace() {
  mkdirSync(workspace, { recursive: true });
  const db = new DatabaseSync(path.join(workspace, "workspace.sqlite"));
  const schema = readFileSync(path.resolve("src/main/schema.sql"), "utf8");
  const now = new Date().toISOString();
  db.exec("PRAGMA foreign_keys=ON; BEGIN IMMEDIATE");
  try {
    db.exec(schema);
    db.prepare("INSERT INTO workspace_metadata(key,value) VALUES (?,?)").run("workspace.initialized_at", now);
    db.prepare("INSERT INTO candidatures(id, archived, opportunity_research_selected, created_at, updated_at) VALUES (?,0,0,?,?)").run(candidatureId, now, now);
    const insert = db.prepare("INSERT INTO profile_items(id, kind, title, subtitle, description, start_date, end_date, url, sort_order, ai_use_allowed, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
    insert.run(identityId, "identity", "Alex Acceptance", "Platform engineer", null, null, null, "https://alex.example.test", 0, 1, now, now);
    insert.run(contactId, "contact", "alex@example.test", "Email", null, null, null, null, 1, 1, now, now);
    insert.run(experienceId, "experience", "Senior Platform Engineer", "Example Systems", "Built reliable provider-agnostic developer tooling and desktop workflows.", "2022", "2026", "https://example.com/work", 2, 1, now, now);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  } finally {
    db.close();
  }
  remember(userData);
  remember(path.join(appData, "AAAAT"));
  remember(path.join(appData, "aaaat"));
}
function providerSource() {
  return [
    'import http from "node:http";',
    'import https from "node:https";',
    'import fs from "node:fs";',
    'const log=process.argv[2], info=process.argv[3], cert=process.argv[4], key=process.argv[5];',
    'function append(x){fs.appendFileSync(log,JSON.stringify(x)+"\\n");}',
    'function handler(requireAuth){return async (req,res)=>{let raw=""; req.on("data",c=>raw+=c); req.on("end",async()=>{',
    'const auth=req.headers.authorization||""; const started=Date.now(); let sent=false;',
    'res.on("close",()=>append({event:"close",url:req.url,auth,elapsed:Date.now()-started,sent}));',
    'if(requireAuth && auth!=="Bearer issue407-secret" && auth!=="Bearer issue407-replacement-secret"){res.writeHead(401,{"content-type":"application/json"});sent=true;res.end(JSON.stringify({error:"auth"}));append({event:"request",url:req.url,auth,accepted:false});return;}',
    'if(req.url.endsWith("/models")){res.writeHead(200,{"content-type":"application/json"});sent=true;res.end(JSON.stringify({data:[{id:"acceptance-model"}]}));append({event:"request",url:req.url,auth,accepted:true,kind:"models"});return;}',
    'let body={};try{body=JSON.parse(raw||"{}")}catch{}; const system=String(body.messages?.[0]?.content||""); const user=String(body.messages?.[1]?.content||"");',
    'let payload={}; if(system.includes("Review one opportunity")) payload={summary:"Relevant opportunity evidence is available.",relevantEvidence:["Synthetic acceptance evidence"],uncertainties:[],questions:[]};',
    'else if(system.includes("Recommend the strongest supplied CV items")){let itemRef="aaaat_validation_item";try{itemRef=JSON.parse(user).items?.[0]?.itemRef||itemRef}catch{};payload={recommendations:[{itemRef,rationale:"Relevant supplied experience."}]};}',
    'else if(system.includes("Draft a concise cover letter")) payload={recipient:"Hiring team",subject:"Application",bodyParagraphs:["I am applying based on the supplied professional evidence."],closing:"Regards"};',
    'else payload={proposals:[],newFields:[],existingTags:[],newTags:[]};',
    'const slow=String(body.model||"").includes("slow") || raw.includes("SLOW_ACCEPTANCE"); if(slow) await new Promise(r=>setTimeout(r,5000)); else await new Promise(r=>setTimeout(r,350));',
    'if(res.destroyed) return; res.writeHead(200,{"content-type":"application/json"}); sent=true; res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(payload)}}]})); append({event:"request",url:req.url,auth,accepted:true,kind:"chat",system:system.slice(0,80),model:body.model||""});',
    '});};}',
    'const hs=http.createServer(handler(false)); const ahs=http.createServer(handler(true)); const ss=https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},handler(true));',
    'hs.listen(0,"127.0.0.1",()=>ahs.listen(0,"127.0.0.1",()=>ss.listen(0,"127.0.0.1",()=>{const data={http:hs.address().port,authHttp:ahs.address().port,https:ss.address().port};fs.writeFileSync(info,JSON.stringify(data));})));',
    'process.on("SIGTERM",()=>{hs.close();ahs.close();ss.close();});'
  ].join("\n");
}
async function startProvider() {
  const file = path.join(root, "provider.mjs");
  writeFileSync(file, providerSource());
  const child = spawn(process.execPath, [file, providerLog, providerInfo, cert, key], { stdio: ["ignore","ignore","pipe"] });
  let err = "";
  child.stderr.on("data", c => err += c.toString());
  for (let i=0;i<100;i++) {
    if (existsSync(providerInfo)) return { child, info: JSON.parse(readFileSync(providerInfo,"utf8")), error: () => err };
    if (child.exitCode !== null) throw new Error("Provider exited: " + err);
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error("Provider did not start: " + err);
}
async function startTunnel(localPort) {
  const cloudflared = path.join(process.env.RUNNER_TEMP, "cloudflared.exe");
  if (!existsSync(cloudflared)) throw new Error("cloudflared fixture is missing");
  const child = spawn(cloudflared, ["tunnel","--no-autoupdate","--url","http://127.0.0.1:"+localPort], { stdio:["ignore","pipe","pipe"] });
  let output="";
  const append=(chunk)=>{output+=chunk.toString();};
  child.stdout.on("data",append); child.stderr.on("data",append);
  for(let i=0;i<300;i++){
    const match=output.match(/https:\/\/[-a-z0-9]+\.trycloudflare\.com/iu);
    if(match) return {child,url:match[0],output:()=>output};
    if(child.exitCode!==null) throw new Error("cloudflared exited "+child.exitCode+": "+output);
    await new Promise(r=>setTimeout(r,100));
  }
  child.kill();
  throw new Error("cloudflared did not expose the authenticated provider: "+output);
}
async function waitDebugger(endpoint, child, err) {
  for (let i=0;i<160;i++) {
    if (child.exitCode !== null) throw new Error("AAAAT exited " + child.exitCode + ": " + err());
    try { const r=await fetch(endpoint+"/json/version"); if(r.ok) return; } catch {}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error("AAAAT debugger did not start: " + err());
}
async function startApp(extraEnv={}) {
  const p = await port();
  const endpoint = "http://127.0.0.1:" + p;
  const env = { ...process.env, NODE_EXTRA_CA_CERTS: cert, ...extraEnv };
  const child = spawn(exe, ["--user-data-dir="+userData, "--remote-debugging-port="+p], { env, stdio:["ignore","ignore","pipe"] });
  let err="";
  child.stderr.on("data", c=>err+=c.toString());
  await waitDebugger(endpoint, child, ()=>err);
  const browser = await chromium.connectOverCDP(endpoint);
  const page = browser.contexts()[0]?.pages()[0];
  if (!page) throw new Error("AAAAT opened no renderer");
  await page.waitForFunction(() => Boolean(window.aaaat));
  return { child, browser, page, error:()=>err };
}
async function stopApp(r) {
  if (!r) return;
  await r.page.close().catch(()=>{});
  await r.browser.close().catch(()=>{});
  if (r.child.exitCode===null) r.child.kill();
  await new Promise(resolve=>{const t=setTimeout(resolve,3000);r.child.once("exit",()=>{clearTimeout(t);resolve();});});
  if (r.child.exitCode===null) spawnSync("taskkill",["/PID",String(r.child.pid),"/T","/F"]);
}
async function screenshot(page,name,width=1280,height=800) {
  await page.setViewportSize({width,height});
  await page.screenshot({path:path.join(screenshots,name),fullPage:false});
  return {
    horizontalOverflow: await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),
    bodyText: (await page.locator("body").innerText()).slice(0,12000)
  };
}
async function clickNav(page,name) {
  await page.getByRole("button",{name,exact:true}).click();
  await page.waitForTimeout(250);
}
async function waitText(locator,text,ms=30000) {
  const start=Date.now();
  while(Date.now()-start<ms){if((await locator.innerText().catch(()=>"" )).includes(text))return true;await new Promise(r=>setTimeout(r,250));}
  return false;
}

mkdirSync(root,{recursive:true}); mkdirSync(screenshots,{recursive:true});
initWorkspace();
note("environment","harnessPdflatex",{path:process.env.PATH ?? "",where:spawnSync("where.exe",["pdflatex"],{encoding:"utf8"}).stdout?.trim() ?? "",version:spawnSync("pdflatex",["--version"],{encoding:"utf8"}).stdout?.split(/\\r?\\n/u).slice(0,2).join(" | ") ?? ""});
const provider = await startProvider();
const tunnel = await startTunnel(provider.info.authHttp);
note("aiRuntime","providerEndpoints",{http:"http://127.0.0.1:"+provider.info.http+"/v1",https:tunnel.url+"/v1",localSelfSignedHttps:"https://localhost:"+provider.info.https+"/v1"});
let app;
try {
  app = await startApp();
  const page = app.page;
  await page.waitForTimeout(1200);
  note("documentRuntime","packagedAppStarted",true);

  const setupReads = await page.evaluate(async()=>{
    const a=await window.aaaat.setupEnvironment.current();
    const b=await window.aaaat.setupEnvironment.current();
    const c=await window.aaaat.setupEnvironment.refresh();
    return {a,b,c};
  });
  note("shell","setupEnvironmentSnapshots",setupReads);

  const seeded = await page.evaluate(async ({ candidatureId }) => {
    const field = await window.aaaat.candidatures.createField({
      label:"Organisation",description:"Hiring organisation",valueType:"text",cardinality:"one",choices:[],enabled:true
    });
    await window.aaaat.candidatures.updateFieldPreferences({
      fieldId:field.definition.id,favourite:true,favouriteOrder:0,presentationSize:"wide",aiUseAllowed:true
    });
    await window.aaaat.candidatures.setFieldValue({candidatureId,fieldId:field.definition.id,value:"Example Systems"});
    await window.aaaat.candidatures.addSource({candidatureId,kind:"job_posting",title:"Senior Platform Engineer",url:"https://example.com/job",sourceText:"SLOW_ACCEPTANCE Senior Platform Engineer at Example Systems. Remote role."});
    const tag=await window.aaaat.candidatures.createTag({name:"Platform",definition:"Platform engineering opportunity",aliases:["infra"]});
    await window.aaaat.candidatures.setTags({candidatureId,tagIds:[tag.id]});
    const blueprints=await window.aaaat.documentDomain.blueprints();
    const cv=await window.aaaat.documentDomain.createWorkingCv({title:"Acceptance CV",candidatureId,source:{kind:"profile"}});
    const updated=await window.aaaat.documentDomain.updateWorkingCv({
      id:cv.id,title:cv.title,language:"english",
      pdfMetadata:{title:"Acceptance CV PDF",author:"Alex Acceptance",subject:"Issue 407 packaged acceptance",keywords:"AAAAT, acceptance, platform"},
      parserSummary:"PARSER SUMMARY SENTINEL — provider-agnostic platform engineer",
      sections:cv.sections
    });
    const standalone=await window.aaaat.documentDomain.createLetter({
      candidatureId:null,title:"Acceptance Cover Letter",sender:{name:"Alex Acceptance",headline:"Platform engineer",details:[]},
      recipient:"Hiring Team",subject:"Application",bodyParagraphs:["I am applying for the role.","This letter is rendered independently."],closing:"Regards"
    });
    const appLetter=await window.aaaat.documentDomain.createLetter({
      candidatureId,title:"Application Cover Letter",sender:{name:"Alex Acceptance",headline:"Platform engineer",details:[]},
      recipient:"Example Systems",subject:"Senior Platform Engineer",bodyParagraphs:["I am applying for the platform engineering role."],closing:"Regards"
    });
    const renderedCv=await window.aaaat.documentDomain.renderCv({cvId:updated.id,blueprintId:blueprints[0].id});
    const renderedLetter=await window.aaaat.documentDomain.renderLetter({letterId:standalone.id});
    const packet=await window.aaaat.documentDomain.createPacket({
      candidatureId,workingCvId:updated.id,coverLetterId:appLetter.id,blueprintId:blueprints[0].id,title:"Example Systems Application"
    });
    return {field,tag,blueprints,cv:updated,standalone,appLetter,renderedCv,renderedLetter,packet};
  }, { candidatureId });
  note("documentRuntime","records",seeded);
  const pdfs = filesUnder(workspace).filter(f=>f.toLowerCase().endsWith(".pdf"));
  note("documentRuntime","retainedPdfRelativePaths",pdfs.map(f=>path.relative(workspace,f)));
  note("documentRuntime","retainedHasAaaatSty",filesUnder(workspace).some(f=>path.basename(f).toLowerCase()==="aaaat.sty"));
  note("documentRuntime","retainedHasBlueprint",filesUnder(workspace).some(f=>path.basename(f).toLowerCase()==="blueprint.tex"));

  await page.reload(); await page.waitForFunction(()=>Boolean(window.aaaat)); await page.waitForTimeout(800);
  await clickNav(page,"Applications");
  const appShot=await screenshot(page,"applications-1280x800.png");
  note("documentUx","applications1280",{horizontalOverflow:appShot.horizontalOverflow,text:appShot.bodyText.slice(0,2200)});
  const card=page.locator(".candidature-corpus-card").first();
  if(await card.count()){
    await card.click();
    await page.waitForTimeout(200);
    const openEdit=page.getByRole("button",{name:"Open / Edit",exact:true});
    if(await openEdit.count()) await openEdit.click();
    await page.waitForTimeout(350);
    const sel=await screenshot(page,"application-selected-1280x800.png");
    note("documentUx","applicationSelected",{horizontalOverflow:sel.horizontalOverflow,text:sel.bodyText.slice(0,6500)});
    const materials=page.locator(".application-material-workbench");
    if(await materials.count()){
      await materials.screenshot({path:path.join(screenshots,"application-documents.png")});
      note("documentUx","applicationDocumentsText",(await materials.innerText()).slice(0,5000));
    }
  }
  await clickNav(page,"My information");
  const infoShot=await screenshot(page,"my-information-1280x800.png");
  note("documentUx","myInformation",{horizontalOverflow:infoShot.horizontalOverflow,text:infoShot.bodyText.slice(0,3000)});
  await clickNav(page,"Documents");
  const docShot=await screenshot(page,"documents-1280x800.png");
  note("documentUx","documents",{horizontalOverflow:docShot.horizontalOverflow,text:docShot.bodyText.slice(0,3000)});
  const cvButton=page.getByRole("button",{name:/Acceptance CV/}).first();
  if(await cvButton.count()){
    await cvButton.click();await page.waitForTimeout(400);
    const wide=await screenshot(page,"cv-editor-1280x800.png");
    const small=await screenshot(page,"cv-editor-720x600.png",720,600);
    note("documentUx","cvEditor",{wideOverflow:wide.horizontalOverflow,smallOverflow:small.horizontalOverflow,text:wide.bodyText.slice(0,4500),sourceModeVisible:wide.bodyText.includes("sourceMode")});
  }

  const brokenDir=path.join(userData,"blueprints");mkdirSync(brokenDir,{recursive:true});
  writeFileSync(path.join(brokenDir,"Missing package.tex"),"\\RequirePackage{definitely_missing_aaaat_package}\\n");
  const packageFailure=await page.evaluate(async (cvId)=>{
    const list=await window.aaaat.documentDomain.blueprints();
    const b=list.find(x=>x.name==="Missing package");
    try{await window.aaaat.documentDomain.renderCv({cvId,blueprintId:b.id});return {unexpectedSuccess:true};}
    catch(e){return {message:e instanceof Error?e.message:String(e)};}
  },seeded.cv.id);
  note("documentRuntime","missingPackageFailure",packageFailure);

  const cvRoot=path.join(workspace,"rendered-cvs",seeded.renderedCv.id);
  let cvPdf=filesUnder(cvRoot).find(f=>f.toLowerCase().endsWith(".pdf"));
  if(cvPdf){
    const legacy=path.join(path.dirname(cvPdf),"main.pdf");
    if(path.basename(cvPdf).toLowerCase()!=="main.pdf"){renameSync(cvPdf,legacy);cvPdf=legacy;}
    const before=existsSync(legacy);
    await page.evaluate(()=>window.aaaat.documentDomain.collections());
    const afterCollection=existsSync(legacy);
    let openError=null;
    try{await page.evaluate(id=>window.aaaat.documentDomain.openRenderedCv(id),seeded.renderedCv.id);}catch(e){openError=String(e);}
    await page.waitForTimeout(500);
    const afterFiles=filesUnder(cvRoot).filter(f=>f.toLowerCase().endsWith(".pdf")).map(f=>path.basename(f));
    note("documentRuntime","legacyNormalization",{before,afterCollection,afterFiles,openError});
  }

  const localEndpoint="http://127.0.0.1:"+provider.info.http+"/v1";
  const httpsEndpoint=tunnel.url+"/v1";
  const conns=await page.evaluate(async ({localEndpoint,httpsEndpoint,secretOriginal})=>{
    let c=await window.aaaat.aiConnections.save({name:"Local acceptance",endpoint:localEndpoint,model:"acceptance-model"});
    c=await window.aaaat.aiConnections.save({name:"Authenticated HTTPS",endpoint:httpsEndpoint,model:"acceptance-model",credential:secretOriginal});
    return c;
  },{localEndpoint,httpsEndpoint,secretOriginal});
  note("aiRuntime","savedConnectionProjection",conns);

  const cancellationEvidence=await page.evaluate(async ({candidatureId,cvId,letterId,localEndpoint})=>{
    const slowConnections=await window.aaaat.aiConnections.save({name:"Slow cancellation",endpoint:localEndpoint,model:"slow-acceptance-model"});
    const slow=slowConnections.find(x=>x.name==="Slow cancellation");
    if(!slow) throw new Error("Slow cancellation connection was not saved.");
    const run=async(start,cancel)=>{
      const began=Date.now();
      const promise=start();
      await new Promise(r=>setTimeout(r,450));
      const cancelReturned=await cancel();
      let outcome="resolved";
      let error="";
      try{await promise;}catch(e){outcome="rejected";error=e instanceof Error?e.message:String(e);}
      return {cancelReturned,outcome,error,elapsedMs:Date.now()-began};
    };
    const validation=await run(
      ()=>window.aaaat.aiTasks.validateConnection("cancel-validation",{connectionId:slow.id,operation:"opportunity_review"}),
      ()=>window.aaaat.aiTasks.cancelConnectionValidation("cancel-validation")
    );
    const extraction=await run(
      ()=>window.aaaat.aiTasks.extractJob("cancel-extraction",{sourceTitle:"Slow acceptance",sourceUrl:"",sourceText:"SLOW_ACCEPTANCE platform role"}),
      ()=>window.aaaat.aiTasks.cancelJobExtraction("cancel-extraction")
    );
    const tailoring=await run(
      ()=>window.aaaat.aiTasks.tailorCv("cancel-tailoring",{candidatureId,workingCvId:cvId}),
      ()=>window.aaaat.aiTasks.cancelCvTailoring("cancel-tailoring")
    );
    const drafting=await run(
      ()=>window.aaaat.aiTasks.draftCoverLetter("cancel-drafting",{coverLetterId:letterId}),
      ()=>window.aaaat.aiTasks.cancelCoverLetterDraft("cancel-drafting")
    );
    return {validation,extraction,tailoring,drafting};
  },{candidatureId,cvId:seeded.cv.id,letterId:seeded.appLetter.id,localEndpoint});
  note("aiRuntime","cancellationEvidence",cancellationEvidence);

  await page.reload();await page.waitForFunction(()=>Boolean(window.aaaat));await page.waitForTimeout(700);await clickNav(page,"Settings");
  const aiTab=page.getByRole("button",{name:"AI",exact:true});if(await aiTab.count())await aiTab.click();await page.waitForTimeout(500);
  const aiShot=await screenshot(page,"ai-settings-1280x800.png");
  note("aiUx","settingsText",{containsSecret:aiShot.bodyText.includes(secretOriginal),text:aiShot.bodyText.slice(0,6500),horizontalOverflow:aiShot.horizontalOverflow});

  const localCard=page.locator("article.document-card").filter({has:page.getByRole("heading",{name:"Local acceptance"})});
  const validateButton=localCard.getByRole("button",{name:/Check all AI features|Check remaining AI features/}).first();
  if(await validateButton.count()){
    await validateButton.click();await page.waitForTimeout(150);
    const trail=await screenshot(page,"ai-task-trail-1280x800.png");
    note("aiRuntime","validationTrailVisible",trail.bodyText.includes("Validate Local acceptance"));
    note("shell","tagsBeforeAiTask",trail.bodyText.indexOf("Tags")>=0 && trail.bodyText.indexOf("AI tasks")>trail.bodyText.indexOf("Tags"));
    await clickNav(page,"Documents");
    await page.waitForTimeout(100);
    const away=await screenshot(page,"ai-task-away-from-settings-1280x800.png");
    note("shell","aiTaskVisibleAwayFromSettings",away.bodyText.includes("AI tasks"));
    await clickNav(page,"Settings");
    const aiAgain=page.getByRole("button",{name:"AI",exact:true});
    if(await aiAgain.count()) await aiAgain.click();
    await page.waitForTimeout(100);
    note("aiRuntime","localValidationCompleted",await waitText(localCard,"5/5 checked",30000));
  }

  const authValidation=await page.evaluate(async (name)=>{
    const c=(await window.aaaat.aiConnections.list()).find(x=>x.name===name);
    const ops=["opportunity_review","job_extraction","historical_field_discovery","cv_tailoring","cover_letter_draft"];
    const results=[];
    for(const operation of ops){
      try{await window.aaaat.aiTasks.validateConnection("auth-runtime-"+operation,{connectionId:c.id,operation});results.push({operation,ok:true});}
      catch(e){results.push({operation,ok:false,error:e instanceof Error?e.message:String(e)});}
    }
    return results;
  },"Authenticated HTTPS");
  note("aiRuntime","authenticatedHttpsFiveOperations",authValidation);

  const promptSummary=page.locator("section.ai-prompt-transparency details.document-card").first();
  if(await promptSummary.count()){
    await promptSummary.locator(":scope > summary").click();
    await page.waitForTimeout(150);
    const pshot=await screenshot(page,"ai-instructions-open-1280x800.png");
    note("aiUx","instructionsOpenText",pshot.bodyText.slice(0,4500));
  }

  note("aiRuntime","preRestartDomSecretLeak",(await page.locator("body").innerText()).includes(secretOriginal));
  await stopApp(app); app=null;

  app=await startApp(); const page2=app.page; await page2.waitForTimeout(900);
  const persisted=await page2.evaluate(async(name)=>{
    const c=(await window.aaaat.aiConnections.list()).find(x=>x.name===name);
    return {projection:c,probe:await window.aaaat.aiConnections.probe(c.id)};
  },"Authenticated HTTPS");
  note("aiRuntime","credentialAfterPackagedRestart",persisted);
  const configText=readFileSync(path.join(workspace,"ai-connection.json"),"utf8");
  note("aiRuntime","credentialFile",{containsOriginal:configText.includes(secretOriginal),containsReplacement:configText.includes(secretReplacement),hasCiphertext:configText.includes("credentialCiphertext")});

  await clickNav(page2,"Settings"); const ai2=page2.getByRole("button",{name:"AI",exact:true});if(await ai2.count())await ai2.click();await page2.waitForTimeout(400);
  const authCard=page2.locator("article.document-card").filter({has:page2.getByRole("heading",{name:"Authenticated HTTPS"})});
  const replace=authCard.getByRole("button",{name:"Replace credential",exact:true}).first();
  if(await replace.count()){
    await replace.click();await page2.getByLabel("Replacement credential").fill(secretReplacement);
    await page2.getByRole("button",{name:"Save connection",exact:true}).click();await page2.waitForTimeout(700);
    const replaced=await page2.evaluate(async(name)=>{const c=(await window.aaaat.aiConnections.list()).find(x=>x.name===name);return {hasCredential:c.hasCredential,probe:await window.aaaat.aiConnections.probe(c.id)};},"Authenticated HTTPS");
    note("aiRuntime","replaceCredential",replaced);
    const cardAgain=page2.locator("article.document-card").filter({has:page2.getByRole("heading",{name:"Authenticated HTTPS"})});
    await cardAgain.getByRole("button",{name:"Clear credential",exact:true}).click();
    await page2.getByRole("button",{name:"Save connection",exact:true}).click();await page2.waitForTimeout(700);
    const cleared=await page2.evaluate(async(name)=>{const c=(await window.aaaat.aiConnections.list()).find(x=>x.name===name);return {hasCredential:c.hasCredential,probe:await window.aaaat.aiConnections.probe(c.id)};},"Authenticated HTTPS");
    note("aiRuntime","clearCredential",cleared);
  }
  const body2=await page2.locator("body").innerText();
  note("aiRuntime","postEditDomSecretLeak",body2.includes(secretOriginal)||body2.includes(secretReplacement));

  await stopApp(app);app=null;

  app=await startApp({PATH:"C:\\Windows\\System32;C:\\Windows"});
  const missingTex=await app.page.evaluate(async (cvId)=>{
    try{await window.aaaat.documentDomain.renderCv({cvId,blueprintId:"builtin:default"});return {unexpectedSuccess:true};}
    catch(e){return {message:e instanceof Error?e.message:String(e)};}
  },seeded.cv.id);
  note("documentRuntime","missingTexFailure",missingTex);
  await stopApp(app);app=null;

  app=await startApp({PATH:timeoutTool+";C:\\Windows\\System32;C:\\Windows",AAAT_TIMEOUT_CHILD_PID_FILE:timeoutChildPidFile});
  const started=Date.now();
  const timeoutResult=await app.page.evaluate(async (cvId)=>{
    try{await window.aaaat.documentDomain.renderCv({cvId,blueprintId:"builtin:default"});return {unexpectedSuccess:true};}
    catch(e){return {message:e instanceof Error?e.message:String(e)};}
  },seeded.cv.id);
  const elapsed=Date.now()-started;
  await new Promise(r=>setTimeout(r,700));
  let childAlive=null, childPid=null;
  if(existsSync(timeoutChildPidFile)){
    childPid=Number(readFileSync(timeoutChildPidFile,"utf8").trim());
    const q=spawnSync("powershell.exe",["-NoProfile","-Command","if(Get-Process -Id "+childPid+" -ErrorAction SilentlyContinue){exit 0}else{exit 1}"]);
    childAlive=q.status===0;
  }
  note("documentRuntime","timeoutProcessTree",{elapsedMs:elapsed,result:timeoutResult,childPid,childAlive});
  await stopApp(app);app=null;
} catch (e) {
  observations.harness.push(e instanceof Error ? e.stack || e.message : String(e));
  save();
  throw e;
} finally {
  if(app) await stopApp(app);
  provider.child.kill();
  tunnel.child.kill();
  save();
}
