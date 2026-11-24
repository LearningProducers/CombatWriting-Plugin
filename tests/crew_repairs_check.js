// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// crew_repairs_check.js: the add-on's repairs before the directory submission (issue 233), nine
// items, each held here by a check that failed on the code as it stood before its repair.
//
// How it reaches the fake provider. The shipped server reads its provider table from the
// providers.json beside it and from nowhere else, so this test stages the add-on: it copies the
// add-on's files, byte for byte, into a scratch folder and writes beside the copy the shipped
// table with every address moved to a fake server on localhost. The server it starts is the copy,
// started the way the manifest starts it: `node <root>/server.js`, the manifest's own `env` map,
// each option the person never set handed as an empty string (the shape the host hands). No real
// provider is called and every key is invented.
//
// What it pins, by the issue's item:
//   1. The key route is two: the masked prompt, then the person's key file. Each of the six usual
//      variables, set alone and all together, with no prompt key and no key file, seats no
//      provider (crew_list), adds no seat (crew_register), answers no packet (crew_answer) and
//      draws no request at all; a prompt key beside a usual variable is the one sent; a key file
//      line under each of the six names seats its provider with key_source "file"; the no-key
//      reason names the prompt and the file and never the environment; and no document of the
//      listed set states the old route.
//   2. The scrub removes the key in use, whatever its shape: a short key holding marks a regular
//      expression reads (`.`, `+`, `$`, `(`), echoed by the provider twice and after "Bearer ",
//      is in no tool result, log line, stderr, record or board; an empty key replaces nothing; a
//      key from the file is scrubbed too; a thrown error's message that holds the key is scrubbed.
//   3. The three tools carry a title and the annotations, true to what each does.
//   4. The seat id is held to `seat-` and digits before any path is built: five bad ids, each in
//      seats.json with a packet waiting at the path it would join to, are refused with no request,
//      no file written and no log line; a bad id on a folder that is no run is refused for the id.
//   5. No environment variable and no file in the project changes the table: with
//      CW_CREW_PROVIDERS naming a table at a decoy server and a providers.json in the working
//      directory, the decoy receives nothing; the shipped files hold no such switch; and every
//      read of the environment in the shipped files is one of the reads listed here.
//   6. A key the provider refuses at the catalog read (401, 403) says the key was refused and
//      gives the configure command; a 500 and a dead port read "did not answer" as before.
//   7. The size refusal names the add-on's own budget for the provider; the numbers stand.
//   8. The README's "What it sends where" names the reader, the seat's earlier turn, the draft's
//      counts and the retry note, and points at the packet file.
//   9. The table holds no `anthropic` entry and no shipped file reads one.
//
// Run from the repo root:   node tests/crew_repairs_check.js
// Exit 0 on pass; exit 1 on any failure, one printed line per failure, each opened by its item.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process'), http=require('http');
var root=path.join(__dirname,'..');
var crewDir=path.join(root,'plugins','combat-writing-crew');
var scripts=path.join(root,'plugins','combat-writing','scripts');
var failures=[], passes=0;
function check(item,cond,msg){ if(cond)passes++; else failures.push('item '+item+': '+msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cw-repairs-'));
var proj=path.join(tmp,'project'); fs.mkdirSync(proj);
var emptyHome=path.join(tmp,'home-empty'); fs.mkdirSync(emptyHome);

var SIX=['GROQ_API_KEY','XAI_API_KEY','PERPLEXITY_API_KEY','OPENAI_API_KEY','MISTRAL_API_KEY','GEMINI_API_KEY'];
var CONFIGURE='/plugin configure combat-writing-crew';
// Invented keys. The short one is under 12 characters and holds marks a regular expression reads.
var SHORT_KEY='Zq.+$(x)9', FILE_KEY='from-the-file.0001', K401='refused-401-key', K403='refused-403-key', K500='down-500-key';

// ---- the fake provider and the decoy ---------------------------------------------------------
var requests=[], decoyRequests=[];
function serve(sink,handler){
  return http.createServer(function(req,res){
    var chunks=[]; req.on('data',function(c){chunks.push(c);}); req.on('end',function(){
      var body=null; try{ body=chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):null; }catch(e){}
      var auth=req.headers['authorization']||'';
      sink.push({method:req.method,url:req.url,auth:auth,body:body});
      function json(status,obj){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(obj));}
      handler(req,auth,body,json);
    });
  });
}
var CATALOG=[
  {id:'openai/gpt-oss-120b',owned_by:'OpenAI',created:100,context_window:131072,max_completion_tokens:32768,active:true},
  {id:'qwen/qwen-test-27b',owned_by:'Alibaba Cloud',created:300,context_window:131072,max_completion_tokens:40960,active:true},
  {id:'grok-test-1',owned_by:'xAI',created:700},{id:'sonar-test',owned_by:'Perplexity',created:700},{id:'gpt-9-test',owned_by:'OpenAI',created:700},
  {id:'mistral-large-test',owned_by:'Mistral AI',created:700},{id:'gemini-test-1',owned_by:'Google',created:700}
];
var fake=serve(requests,function(req,auth,body,json){
  var key=auth.replace(/^Bearer /,'');
  if(req.method==='GET'&&req.url==='/v1/models'){
    // A provider that refuses the key and echoes it, as some do: after "Bearer " and twice more.
    if(key===K401)return json(401,{error:{message:'Invalid API Key: '+auth+' ('+key+', '+key+')'}});
    if(key===K403)return json(403,{error:{message:'Forbidden for this key'}});
    if(key===K500)return json(500,{error:{message:'catalog down'}});
    return json(200,{data:CATALOG});
  }
  if(req.method==='POST'&&req.url==='/v1/chat/completions'){
    var user=body&&body.messages&&body.messages[1]?body.messages[1].content:'';
    // A provider (or a proxy before it) that answers and repeats the key in the answer's own text.
    if(/ECHOREPLY/.test(user))return json(200,{id:'c2',model:body.model,choices:[{message:{role:'assistant',content:'RATING: 8/10\nYour header was '+auth+'. You sent '+key+'. The draft names user_profile and team_planning, and those stay as written.\n'},finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}});
    if(/ECHOAUTH/.test(user))return json(401,{error:{message:'Incorrect API key provided: '+auth+'. You sent '+key+' and again '+key+'.'}});
    return json(200,{id:'c1',model:body.model,choices:[{message:{role:'assistant',content:'RATING: 8/10\nThe ask lands.\n'},finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}});
  }
  json(404,{error:{message:'no route'}});
});
var decoy=serve(decoyRequests,function(req,auth,body,json){ json(200,{data:CATALOG}); });
function listen(server){ return new Promise(function(resolve){ server.listen(0,'127.0.0.1',function(){ resolve(server.address().port); }); }); }
function closedPort(){ return new Promise(function(resolve){ var s=http.createServer(); s.listen(0,'127.0.0.1',function(){ var p=s.address().port; s.close(function(){ resolve(p); }); }); }); }

// ---- the staged add-on -----------------------------------------------------------------------
var SHIPPED=['server.js','crew-lib.js','providers.json','README.md','LICENSE.md','NOTICE'];
function stage(name,address){
  var dir=path.join(tmp,name); fs.mkdirSync(path.join(dir,'.claude-plugin'),{recursive:true});
  SHIPPED.forEach(function(f){ fs.copyFileSync(path.join(crewDir,f),path.join(dir,f)); });
  fs.copyFileSync(path.join(crewDir,'.claude-plugin','plugin.json'),path.join(dir,'.claude-plugin','plugin.json'));
  var table=JSON.parse(read(path.join(crewDir,'providers.json')));
  table.providers.forEach(function(p){ p.base_url=typeof address==='function'?address(p):address; });
  fs.writeFileSync(path.join(dir,'providers.json'),JSON.stringify(table,null,2));
  return dir;
}
var manifest=JSON.parse(read(path.join(crewDir,'.claude-plugin','plugin.json')));
var realTable=JSON.parse(read(path.join(crewDir,'providers.json')));
// Start the staged server the way the manifest starts it. `options` are the person's settings by
// option name; an option not given reaches the server as an empty string. `extra` is the rest of
// the environment the person's shell would carry.
function start(dir,options,extra){
  var srv=manifest.mcpServers['combat-writing-crew'];
  var env={PATH:process.env.PATH,HOME:emptyHome};
  Object.keys(srv.env).forEach(function(k){ env[k]=srv.env[k].replace(/\$\{user_config\.([a-z_]+)\}/g,function(_,o){ return (options&&options[o])||''; }); });
  Object.assign(env,extra||{});
  var args=srv.args.map(function(a){ return a.replace('${CLAUDE_PLUGIN_ROOT}',dir); });
  var child=cp.spawn(srv.command==='node'?process.execPath:srv.command,args,{cwd:proj,env:env,stdio:['pipe','pipe','pipe']});
  var pending={}, nextId=1, buf='', stderr='';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data',function(d){buf+=d;var lines=buf.split('\n');buf=lines.pop();lines.forEach(function(l){if(!l.trim())return;var m;try{m=JSON.parse(l);}catch(e){return;}if(m.id!==undefined&&pending[m.id]){pending[m.id](m);delete pending[m.id];}});});
  child.stderr.setEncoding('utf8'); child.stderr.on('data',function(d){stderr+=d;});
  function rpc(method,params){ return new Promise(function(resolve){var id=nextId++;pending[id]=resolve;child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:id,method:method,params:params||{}})+'\n');}); }
  function call(name,args){ return rpc('tools/call',{name:name,arguments:args||{}}).then(function(m){var text=m.result&&m.result.content&&m.result.content[0]&&m.result.content[0].text;var obj=null;try{obj=JSON.parse(text);}catch(e){}return {raw:JSON.stringify(m),isError:!!(m.result&&m.result.isError),data:obj||{}};}); }
  function stop(){ return new Promise(function(resolve){ child.on('exit',function(){ resolve(stderr); }); child.stdin.end(); }); }
  return rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'crew_repairs_check',version:'1'}}).then(function(){
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
    return {rpc:rpc,call:call,stop:stop,stderr:function(){return stderr;}};
  });
}
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
var runCount=0;
function newRun(draftText){
  runCount++;
  var d='draft-'+runCount+'.md';
  fs.writeFileSync(path.join(proj,d),draftText||'Dear board, buy the company. The ask lands in the first line.\n');
  return node('new-run.js',['--draft',d,'--name','repairs-'+runCount,'--model','Test Model']).stdout.trim();
}
function seatsOf(run){ return JSON.parse(read(path.join(run,'seats.json'))).seats; }
function tree(dir){ var out=[]; (function walk(d){ fs.readdirSync(d).sort().forEach(function(f){ var p=path.join(d,f); if(fs.statSync(p).isDirectory())walk(p); else out.push(path.relative(dir,p)+':'+fs.statSync(p).size); }); })(dir); return out.join('|'); }
function homeWithKeys(name,text){
  var home=path.join(tmp,name), dir=path.join(home,'.combat-writing');
  fs.mkdirSync(dir,{recursive:true}); fs.chmodSync(dir,0o700);
  fs.writeFileSync(path.join(dir,'keys'),text); fs.chmodSync(path.join(dir,'keys'),0o600);
  return home;
}
function section(text,heading){ var m=new RegExp('^## '+heading+'\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))','m').exec(text); return m?m[1]:''; }

// The sentences of a document that state the old route: one that speaks of the environment and of
// a key (or the old route's own words) without saying no. A sentence ends at a period, a
// semicolon or a colon followed by a space, or at a line's end.
var NEGATION=/\b(no|not|never|nor|neither|none|stops?|stopped|without|nowhere)\b/i;
function oldRoute(text){
  var out=[];
  String(text).split(/\n|(?<=[.;:])\s+/).forEach(function(s){
    var route=/three (key )?routes|all three routes|read in this order|third route/i.test(s);
    var env=/environment/i.test(s)&&/\bkeys?\b|_API_KEY|credential/i.test(s)&&!NEGATION.test(s);
    if(route||env)out.push(s.trim().slice(0,160));
  });
  return out;
}

async function main(){
  var port=await listen(fake), decoyPort=await listen(decoy), dead=await closedPort();
  var base='http://127.0.0.1:'+port+'/v1';
  var main=stage('addon',base);
  ['server.js','crew-lib.js','.claude-plugin/plugin.json'].forEach(function(f){
    check(5,fs.readFileSync(path.join(main,f)).equals(fs.readFileSync(path.join(crewDir,f))),'the staged '+f+' is not the shipped file byte for byte');
  });
  var lib=require(path.join(crewDir,'crew-lib.js'));
  var server=read(path.join(crewDir,'server.js')), libText=read(path.join(crewDir,'crew-lib.js')), readme=read(path.join(crewDir,'README.md'));
  var s, r, run, before, err;

  // ---- item 1: the key route ------------------------------------------------------------------
  check(1,realTable.providers.filter(function(p){return p.key_option;}).map(function(p){return p.key_name;}).join()===SIX.join(),'providers.json: the six key file names should stand under key_name, in order, got '+realTable.providers.filter(function(p){return p.key_option;}).map(function(p){return p.key_name;}).join());
  check(1,realTable.providers.every(function(p){return !('key_env' in p);}),'providers.json: an entry still names a key_env');
  var alone=SIX.map(function(n){ var e={}; e[n]='usual-'+n+'-value'; return {name:n,env:e}; });
  var all={}; SIX.forEach(function(n){ all[n]='usual-'+n+'-value'; });
  alone.push({name:'all six together',env:all});
  for(var i=0;i<alone.length;i++){
    before=requests.length;
    run=newRun();
    s=await start(main,{},alone[i].env);
    r=await s.call('crew_list');
    check(1,r.data.available===0&&(r.data.seats||[]).every(function(x){return !x.available&&x.key_source===undefined;}),alone[i].name+' in the environment, no prompt key, no key file: crew_list should seat no provider, got '+JSON.stringify((r.data.seats||[]).filter(function(x){return x.available;}).map(function(x){return x.slot+' by '+x.key_source;})));
    check(1,r.raw.indexOf('usual-')<0,alone[i].name+': the variable\'s value is in the crew_list result');
    r=await s.call('crew_register',{run:run});
    check(1,!r.isError&&(r.data.added||[]).length===0&&seatsOf(run).length===2&&seatsOf(run).every(function(x){return !x.provider;}),alone[i].name+': crew_register should add no seat, got '+JSON.stringify((r.data.added||[]).map(function(x){return x.id+' '+x.provider;})));
    err=await s.stop();
    check(1,requests.length===before,alone[i].name+': the provider should receive no request at all, got '+(requests.length-before)+' ('+requests.slice(before).map(function(q){return q.method+' '+q.url;}).join(', ')+')');
    check(1,err.indexOf('usual-')<0&&read(path.join(run,'log.jsonl')).indexOf('usual-')<0,alone[i].name+': the variable\'s value reached stderr or the log');
  }
  // A seat already on the run (seated by a prompt key) and then only the usual variable: no packet goes out.
  run=newRun();
  s=await start(main,{groq_api_key:'prompt-groq-key'});
  r=await s.call('crew_register',{run:run});
  await s.stop();
  check(1,(r.data.added||[]).length===2,'a prompt key should still seat Groq\'s two, got '+JSON.stringify(r.data.added));
  node('packet.js',['--run',run,'--round','01-sparring','--seat','seat-2']);
  before=requests.length;
  s=await start(main,{},{GROQ_API_KEY:'usual-GROQ_API_KEY-value'});
  r=await s.call('crew_answer',{run:run,round:'01-sparring',seat:'seat-2'});
  await s.stop();
  check(1,r.data.ok===false&&r.data.missing===true&&/^no key for Groq/.test(r.data.reason||'')&&requests.length===before,'crew_answer with only the usual variable: the seat should be missing with no request, got '+JSON.stringify(r.data).slice(0,200)+' and '+(requests.length-before)+' requests');
  // A prompt key beside usual variables: the prompt's key is the one sent, and the variables seat nothing.
  before=requests.length;
  s=await start(main,{openai_api_key:'prompt-openai-key'},{OPENAI_API_KEY:'usual-OPENAI_API_KEY-value',XAI_API_KEY:'usual-XAI_API_KEY-value'});
  r=await s.call('crew_list');
  await s.stop();
  var seated=(r.data.seats||[]).filter(function(x){return x.available;});
  check(1,seated.length===1&&seated[0].slot==='openai'&&seated[0].key_source==='prompt','a prompt key beside usual variables: only the prompt\'s provider should be seated, got '+JSON.stringify(seated.map(function(x){return x.slot+' by '+x.key_source;})));
  check(1,requests.slice(before).every(function(q){return q.auth==='Bearer prompt-openai-key';})&&requests.length>before,'a prompt key beside a usual variable: every request should carry the prompt\'s key, got '+JSON.stringify(requests.slice(before).map(function(q){return q.auth;})));
  // The key file: a line under each of the six names seats its provider.
  var fileHome=homeWithKeys('home-six',SIX.map(function(n){return n+'=file-'+n+'-value';}).join('\n')+'\n');
  before=requests.length;
  s=await start(main,{},{HOME:fileHome});
  r=await s.call('crew_list');
  await s.stop();
  seated=(r.data.seats||[]).filter(function(x){return x.available;});
  check(1,seated.length===7&&seated.every(function(x){return x.key_source==='file';}),'a key file line under each name: all seven outside seats should be seated by the file, got '+JSON.stringify((r.data.seats||[]).map(function(x){return x.slot+' '+(x.available?x.key_source:'off');})));
  SIX.forEach(function(n){ check(1,requests.slice(before).some(function(q){return q.auth==='Bearer file-'+n+'-value';}),'the key file\'s '+n+' line was not the key sent'); });
  check(1,r.raw.indexOf('file-')<0,'a key file value is in the crew_list result');
  // The prompt still wins over the file.
  before=requests.length;
  s=await start(main,{groq_api_key:'prompt-groq-key'},{HOME:fileHome});
  r=await s.call('crew_list');
  await s.stop();
  var g=(r.data.seats||[]).filter(function(x){return x.slot==='groq-a';})[0]||{};
  check(1,g.key_source==='prompt'&&requests.slice(before).some(function(q){return q.auth==='Bearer prompt-groq-key';})&&!requests.slice(before).some(function(q){return q.auth==='Bearer file-GROQ_API_KEY-value';}),'the prompt should win over the key file, got '+g.key_source);
  // The no-key words: the prompt and the file, never the environment; the field names the file's line.
  s=await start(main,{});
  r=await s.call('crew_list');
  await s.stop();
  g=(r.data.seats||[]).filter(function(x){return x.slot==='groq-a';})[0]||{};
  check(1,/^no key for Groq: never entered, or dropped by an update/.test(g.reason||'')&&(g.reason||'').indexOf(CONFIGURE)>=0&&/GROQ_API_KEY=<key> line in ~\/\.combat-writing\/keys/.test(g.reason||'')&&!/environment/i.test(g.reason||''),'the no-key reason should name the prompt and the key file and never the environment, got '+JSON.stringify(g.reason));
  check(1,g.key_name==='GROQ_API_KEY'&&!('env' in g)&&g.file==='~/.combat-writing/keys'&&g.field==='groq_api_key','the no-key entry should carry key_name, file and field, and no env, got '+JSON.stringify(g).slice(0,300));
  // keyFor itself, in this process: a usual variable is no key.
  var saved={}; SIX.concat(['CW_CREW_KEY_FILE','CW_CREW_OPENAI_KEY']).forEach(function(n){ saved[n]=process.env[n]; delete process.env[n]; });
  process.env.CW_CREW_KEY_FILE=path.join(tmp,'absent','keys');
  var openai=realTable.providers.filter(function(p){return p.id==='openai';})[0];
  process.env.OPENAI_API_KEY='test-key';
  check(1,lib.keyFor(openai)===null,'keyFor: with only OPENAI_API_KEY in the environment there should be no key, got '+JSON.stringify(lib.keyFor(openai)&&lib.keyFor(openai).source));
  process.env.CW_CREW_OPENAI_KEY='prompt-openai-key';
  check(1,(lib.keyFor(openai)||{}).source==='prompt'&&(lib.keyFor(openai)||{}).key==='prompt-openai-key','keyFor: the prompt\'s variable should still serve');
  delete process.env.OPENAI_API_KEY; delete process.env.CW_CREW_OPENAI_KEY;
  // Every statement of the route, in the documents that state it.
  var DOCS=['plugins/combat-writing-crew/README.md','plugins/combat-writing-crew/.claude-plugin/plugin.json','plugins/combat-writing-crew/providers.json','plugins/combat-writing-crew/crew-lib.js','plugins/combat-writing-crew/server.js','README.md','CLAUDE.md','docs/plugin-map.md','docs/directory-checklist-crew.md','docs/directory-checklist.md','plugins/combat-writing/README.md','.claude-plugin/marketplace.json'];
  DOCS.forEach(function(f){ oldRoute(read(path.join(root,f))).forEach(function(sent){ check(1,false,f+' still states the old key route: '+sent); }); });
  check(1,oldRoute('A key comes from the masked prompt, then an environment variable.').length===1&&oldRoute('All three routes are kept.').length===1&&oldRoute('No key is read from an environment variable.').length===0&&oldRoute('The hook reads its data folder from the environment.').length===0,'the old-route reader itself misreads an invented sentence');
  Object.keys(manifest.userConfig).forEach(function(o){ check(1,!/environment/i.test(manifest.userConfig[o].description),'the manifest\'s '+o+' description still speaks of the environment'); });
  check(1,/^## Keys and where the prompt appears$/m.test(readme),'the add-on\'s README lost the heading the listed plugin\'s README points at');

  // ---- item 2: the scrub ----------------------------------------------------------------------
  run=newRun('Dear board, buy the company. ECHOAUTH. The ask lands in the first line.\n');
  s=await start(main,{groq_api_key:SHORT_KEY});
  r=await s.call('crew_register',{run:run});
  node('packet.js',['--run',run,'--round','01-sparring','--seat','seat-2']);
  r=await s.call('crew_answer',{run:run,round:'01-sparring',seat:'seat-2'});
  check(2,r.data.ok===false&&/^HTTP 401: Incorrect API key provided/.test(r.data.reason||''),'the fake should refuse the packet with the key echoed, got '+JSON.stringify(r.data).slice(0,200));
  check(2,r.raw.indexOf(SHORT_KEY)<0,'the key in use is in the tool result: '+(r.data.reason||'').slice(0,160));
  check(2,(r.data.reason||'').split('[key redacted]').length===4,'the key should be replaced each of the three times the provider echoed it (after "Bearer " and twice more), got '+JSON.stringify(r.data.reason));
  // A thrown error's message that holds the key: a run folder named with it, which the error names.
  var thrown=await s.call('crew_register',{run:path.join(tmp,'no-run-'+SHORT_KEY)});
  check(2,thrown.isError&&/no seats\.json in /.test(thrown.raw)&&thrown.raw.indexOf(SHORT_KEY)<0,'a thrown error\'s message holding the key should be scrubbed in the tool result, got '+thrown.raw.slice(0,240));
  // A reply that answers (HTTP 200) and repeats the key (issue 255): the answer is a file the record and the board print,
  // so the key in use is replaced in it before it is written; the seat's other words stay as written.
  var runEcho=newRun('Dear board, buy the company. ECHOREPLY. The ask lands in the first line.\n');
  r=await s.call('crew_register',{run:runEcho});
  node('packet.js',['--run',runEcho,'--round','01-sparring','--seat','seat-2']);
  r=await s.call('crew_answer',{run:runEcho,round:'01-sparring',seat:'seat-2'});
  var echoed=''; try{ echoed=fs.readFileSync(path.join(runEcho,'rounds','01-sparring','seat-2.answer.md'),'utf8'); }catch(e){}
  check(2,r.data.ok===true&&echoed.indexOf('RATING: 8/10')===0,'the fake should answer the packet with the key repeated in its text, got '+JSON.stringify(r.data).slice(0,200));
  check(2,echoed.indexOf(SHORT_KEY)<0&&echoed.split('[key redacted]').length===3,'a reply that repeats the key in use: the answer file must hold it nowhere, replaced each of the two times; the file reads '+JSON.stringify(echoed.split(SHORT_KEY).join('<THE KEY>').slice(0,200)));
  check(2,echoed.indexOf('user_profile and team_planning, and those stay as written')>0,'a reply\'s own words are not changed by the scrub: only the key in use is replaced; the file reads '+JSON.stringify(echoed.split(SHORT_KEY).join('<THE KEY>').slice(0,240)));
  check(2,r.raw.indexOf(SHORT_KEY)<0,'the key in use is in the tool result of an answered packet');
  node('render-record.js',['--run',runEcho]); node('render-board.js',['--run',runEcho]);
  ['record.md','board.html','log.jsonl'].forEach(function(f){ var t=''; try{ t=fs.readFileSync(path.join(runEcho,f),'utf8'); }catch(e){} check(2,t.length>0&&t.indexOf(SHORT_KEY)<0,'a reply that repeats the key in use: '+f+' must hold it nowhere'); });
  var answeredEcho=fs.readFileSync(path.join(runEcho,'log.jsonl'),'utf8').split('\n').filter(Boolean).map(function(l){ return JSON.parse(l); }).filter(function(e){ return e.event==='crew.answered'; })[0]||{};
  check(2,answeredEcho.key_redacted===2,'the log\'s answered line says how many times the key was replaced in the answer (key_redacted), got '+JSON.stringify(answeredEcho.key_redacted));
  err=await s.stop();
  check(2,err.indexOf(SHORT_KEY)<0,'the key in use is in the server\'s stderr');
  check(2,read(path.join(run,'log.jsonl')).indexOf(SHORT_KEY)<0,'the key in use is in the run\'s log');
  check(2,read(path.join(run,'log.jsonl')).indexOf('"event":"crew.failed"')>=0,'the refused call should be logged as crew.failed');
  node('render-record.js',['--run',run]); node('render-board.js',['--run',run]);
  ['record.md','board.html'].forEach(function(f){
    var t=fs.existsSync(path.join(run,f))?read(path.join(run,f)):null;
    check(2,t!==null&&t.indexOf(SHORT_KEY)<0&&t.indexOf('[key redacted]')>=0,f+' rendered from the log should carry the mark and never the key in use'+(t===null?' (not rendered)':''));
  });
  // The catalog read: a refusal that echoes the key, into crew_list, crew.registered and stderr.
  run=newRun();
  s=await start(main,{groq_api_key:K401});
  r=await s.call('crew_list');
  check(2,r.raw.indexOf(K401)<0,'the key in use is in the crew_list result after a refused catalog read');
  r=await s.call('crew_register',{run:run});
  err=await s.stop();
  check(2,r.raw.indexOf(K401)<0&&read(path.join(run,'log.jsonl')).indexOf(K401)<0&&err.indexOf(K401)<0,'the key in use reached the crew_register result, the log or stderr after a refused catalog read');
  // The function, in this process: the prompt's key, the file's key, an empty key.
  process.env.CW_CREW_GROQ_KEY=SHORT_KEY;
  check(2,lib.scrubIds('Bearer '+SHORT_KEY+' then '+SHORT_KEY+SHORT_KEY+'.')==='Bearer [key redacted] then [key redacted][key redacted].','scrubIds: a short key with marks, after "Bearer " and twice in a row, got '+lib.scrubIds('Bearer '+SHORT_KEY+' then '+SHORT_KEY+SHORT_KEY+'.'));
  check(2,lib.scrubIds(new Error('connect failed with '+SHORT_KEY).message)==='connect failed with [key redacted]','scrubIds: a thrown error\'s message');
  check(2,lib.scrubIds(lib.scrubIds('x '+SHORT_KEY))==='x [key redacted]','scrubIds: twice is once');
  process.env.CW_CREW_GROQ_KEY='';
  check(2,lib.scrubIds('abc '+SHORT_KEY)==='abc '+SHORT_KEY&&lib.scrubIds('abc')==='abc','scrubIds: an empty key replaces nothing, got '+lib.scrubIds('abc'));
  process.env.CW_CREW_GROQ_KEY='${user_config.groq_api_key}';
  check(2,lib.scrubIds('the literal ${user_config.groq_api_key} was not sent').indexOf('[key redacted]')<0,'scrubIds: the unfilled placeholder is no key and is not replaced as one, got '+lib.scrubIds('the literal ${user_config.groq_api_key} was not sent'));
  delete process.env.CW_CREW_GROQ_KEY;
  process.env.CW_CREW_KEY_FILE=path.join(homeWithKeys('home-one','MISTRAL_API_KEY='+FILE_KEY+'\n'),'.combat-writing','keys');
  check(2,lib.scrubIds('refused: '+FILE_KEY)==='refused: [key redacted]','scrubIds: a key from the key file, got '+lib.scrubIds('refused: '+FILE_KEY));
  process.env.CW_CREW_KEY_FILE=path.join(tmp,'absent','keys');
  check(2,lib.scrubIds('org_01JTESTORG0000000000000000 gsk_LEAKED_KEY_VALUE_0000 Limit 1000, Requested 1513')==='org_[redacted] [key redacted] Limit 1000, Requested 1513','scrubIds: the account ids and the key shapes are still scrubbed and the numbers stand');
  Object.keys(saved).forEach(function(n){ if(saved[n]===undefined)delete process.env[n]; else process.env[n]=saved[n]; });

  // ---- item 3: the annotations ----------------------------------------------------------------
  s=await start(main,{});
  var tl=await s.rpc('tools/list');
  await s.stop();
  var tools={}; ((tl.result&&tl.result.tools)||[]).forEach(function(t){ tools[t.name]=t; });
  var WANT={crew_list:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true},
    crew_register:{readOnlyHint:false,destructiveHint:true,idempotentHint:false,openWorldHint:true},
    crew_answer:{readOnlyHint:false,destructiveHint:true,idempotentHint:false,openWorldHint:true}};
  Object.keys(WANT).forEach(function(n){
    var t=tools[n]||{}, a=t.annotations||{};
    check(3,typeof t.title==='string'&&t.title.length>3&&a.title===t.title,n+': a title on the tool and the same title in its annotations, got '+JSON.stringify(t.title)+' and '+JSON.stringify(a.title));
    Object.keys(WANT[n]).forEach(function(h){ check(3,a[h]===WANT[n][h],n+': '+h+' should be '+WANT[n][h]+', got '+JSON.stringify(a[h])); });
    check(3,Object.keys(a).sort().join()==='destructiveHint,idempotentHint,openWorldHint,readOnlyHint,title',n+': the annotations should be the five the specification names, got '+Object.keys(a).sort().join());
  });

  // ---- item 4: the seat id --------------------------------------------------------------------
  run=newRun();
  s=await start(main,{groq_api_key:'prompt-groq-key'});
  await s.call('crew_register',{run:run});
  node('packet.js',['--run',run,'--round','01-sparring','--seat','seat-2']);
  var BAD=['../x','seat-1/../../x','seat-2\n','','SEAT-1'];
  var sf=JSON.parse(read(path.join(run,'seats.json'))), model=sf.seats[1];
  BAD.forEach(function(id){ sf.seats.push(Object.assign({},model,{id:id})); });
  fs.writeFileSync(path.join(run,'seats.json'),JSON.stringify(sf,null,2)+'\n');
  var packetText=read(path.join(run,'rounds','01-sparring','seat-2.packet.md'));
  BAD.forEach(function(id){ var p=path.join(run,'rounds','01-sparring',id+'.packet.md'); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,packetText); });
  for(i=0;i<BAD.length;i++){
    before=requests.length; var snap=tree(run);
    r=await s.call('crew_answer',{run:run,round:'01-sparring',seat:BAD[i]});
    check(4,r.isError&&/seat must look like seat-2/.test(r.raw),JSON.stringify(BAD[i])+' should be refused as no seat id, got '+r.raw.slice(0,200));
    check(4,requests.length===before,JSON.stringify(BAD[i])+': a packet was sent for it');
    check(4,tree(run)===snap,JSON.stringify(BAD[i])+': a file was written or the log grew');
    // On a folder that is no run the refusal is still the id's: nothing was looked for first.
    r=await s.call('crew_answer',{run:path.join(tmp,'no-such-run'),round:'01-sparring',seat:BAD[i]});
    check(4,r.isError&&/seat must look like seat-2/.test(r.raw)&&!/run folder not found/.test(r.raw),JSON.stringify(BAD[i])+' on a folder that is no run: the id should be refused before the folder is looked at, got '+r.raw.slice(0,200));
  }
  before=requests.length;
  r=await s.call('crew_answer',{run:run,round:'01-sparring',seat:'seat-2'});
  await s.stop();
  check(4,r.data.ok===true&&requests.length===before+1&&fs.existsSync(path.join(run,'rounds','01-sparring','seat-2.answer.md')),'a sound seat id should still answer, got '+JSON.stringify(r.data).slice(0,200));

  // ---- item 5: the provider table -------------------------------------------------------------
  var decoyTable=JSON.parse(read(path.join(main,'providers.json')));
  decoyTable.providers.forEach(function(p){ p.base_url='http://127.0.0.1:'+decoyPort+'/v1'; });
  var decoyPath=path.join(tmp,'decoy-table.json');
  fs.writeFileSync(decoyPath,JSON.stringify(decoyTable));
  fs.writeFileSync(path.join(proj,'providers.json'),JSON.stringify(decoyTable));
  before=requests.length;
  s=await start(main,{groq_api_key:'prompt-groq-key'},{CW_CREW_PROVIDERS:decoyPath});
  r=await s.call('crew_list');
  await s.stop();
  check(5,decoyRequests.length===0,'with CW_CREW_PROVIDERS naming another table and a providers.json in the project, the key went to the other host ('+decoyRequests.length+' requests, '+JSON.stringify(decoyRequests.map(function(q){return q.auth;}))+')');
  check(5,requests.length===before+1&&requests[before].auth==='Bearer prompt-groq-key','the key should go to the host the table beside the server names, got '+(requests.length-before)+' requests there');
  check(5,server.indexOf('CW_CREW_PROVIDERS')<0&&libText.indexOf('CW_CREW_PROVIDERS')<0&&readme.indexOf('CW_CREW_PROVIDERS')<0,'a shipped file still names CW_CREW_PROVIDERS');
  // Every read of the environment in the shipped code, accounted for: the lines that read it.
  var ENV_READS={'crew-lib.js':['process.env[name]','process.env.CW_CREW_KEY_FILE','process.env.CW_CREW_KEY_FILE'],'server.js':['process.env[provider.model_prompt_env]','process.env[provider.model_env]']};
  Object.keys(ENV_READS).forEach(function(f){
    var got=(read(path.join(crewDir,f)).match(/process\.env(?:\.[A-Za-z_]+|\[[^\]]+\])?/g)||[]);
    check(5,got.join(' ')===ENV_READS[f].join(' '),f+': the reads of the environment should be '+ENV_READS[f].join(' ')+', got '+got.join(' '));
  });
  // What those reads can name: the manifest's own variables, the key file's path, the local model's name.
  var named=[]; realTable.providers.forEach(function(p){ ['key_prompt_env','model_prompt_env','model_env'].forEach(function(k){ if(p[k])named.push(p[k]); }); Object.keys(p).forEach(function(k){ if(/_env$/.test(k)&&['key_prompt_env','model_prompt_env','model_env'].indexOf(k)<0)check(5,false,'providers.json: '+p.id+' names a variable under '+k); }); });
  check(5,named.sort().join()==='CW_CREW_GEMINI_KEY,CW_CREW_GROQ_KEY,CW_CREW_MISTRAL_KEY,CW_CREW_OLLAMA_MODEL,CW_CREW_OPENAI_KEY,CW_CREW_PERPLEXITY_KEY,CW_CREW_XAI_KEY,OLLAMA_MODEL','providers.json: the variables the table names should be the manifest\'s seven and OLLAMA_MODEL, got '+named.sort().join());
  check(5,Object.keys(manifest.mcpServers['combat-writing-crew'].env).sort().join()===named.filter(function(n){return /^CW_CREW_/.test(n);}).sort().join(),'the manifest\'s env map and the table\'s CW_CREW_ variables differ');

  // ---- item 6: the refused key ----------------------------------------------------------------
  var mixed=stage('addon-mixed',function(p){ return p.id==='xai'?'http://127.0.0.1:'+dead+'/v1':base; });
  async function groqReason(dir,options){ var sv=await start(dir,options); var out=await sv.call('crew_list'); await sv.stop(); return function(slot){ return ((out.data.seats||[]).filter(function(x){return x.slot===slot;})[0]||{}).reason||''; }; }
  var why=(await groqReason(main,{groq_api_key:K401}))('groq-a');
  check(6,/^Groq refused the key: catalog read failed: HTTP 401 .*\(the key was refused\)\. Next: \/plugin configure combat-writing-crew, type the key into the groq_api_key field \(Groq API key\) and save/.test(why)&&!/did not answer/.test(why),'a 401 at the catalog read should say the key was refused and give the configure command, got '+JSON.stringify(why));
  why=(await groqReason(main,{groq_api_key:K403}))('groq-b');
  check(6,/^Groq refused the key: catalog read failed: HTTP 403 Forbidden for this key \(the key was refused\)\. Next: \/plugin configure combat-writing-crew/.test(why)&&!/did not answer/.test(why),'a 403 at the catalog read should say the key was refused and give the configure command, got '+JSON.stringify(why));
  why=(await groqReason(main,{groq_api_key:K500}))('groq-a');
  check(6,why==='Groq did not answer: catalog read failed: HTTP 500 catalog down','a 500 at the catalog read should read as before, got '+JSON.stringify(why));
  why=(await groqReason(mixed,{xai_api_key:'prompt-xai-key'}))('xai');
  check(6,/^xAI did not answer: /.test(why)&&/ECONNREFUSED/.test(why)&&!/refused the key/.test(why),'a dead port should read as before, got '+JSON.stringify(why));

  // ---- item 7: the size refusal ---------------------------------------------------------------
  var groq=realTable.providers.filter(function(p){return p.id==='groq';})[0];
  var refusal=lib.budgetFor(groq,'system',new Array(40000).join('x'));
  check(7,refusal.ok===false&&/^Too long to send\. This round needs about [\d,]+ tokens of input and this add-on's budget for Groq is 8,000 tokens per minute, which leaves less than the 1,200-token minimum for a reply\. Cut roughly [\d,]+ tokens \(about [\d,]+ characters\) from the question or the draft and send again\.$/.test(refusal.message),'the size refusal should name the add-on\'s own budget for the provider, got '+JSON.stringify(refusal.message));
  check(7,!/provider allows/.test(libText)&&!/provider's call budget/.test(server),'a shipped file still calls the budget the provider\'s limit');
  check(7,groq.budget.hard_cap===8000&&groq.budget.floor===1200&&groq.budget.ceiling===2800&&groq.budget.tpm_ceiling===7700&&groq.budget.rpm===30,'the budget numbers changed');

  // ---- item 8: what is sent -------------------------------------------------------------------
  var sends=section(readme,'What it sends where');
  var toProvider=(sends.split('\n').filter(function(l){return /^- To each provider/.test(l);})[0])||'';
  check(8,/who the piece is for|the reader/.test(toProvider)&&/earlier turn/.test(toProvider)&&/counts/.test(toProvider)&&/on a retry/.test(toProvider)&&/note/.test(toProvider),'"What it sends where" should name the reader, the seat\'s earlier turn, the draft\'s counts and the retry note, got '+JSON.stringify(toProvider.slice(0,400)));
  check(8,toProvider.indexOf('rounds/<round>/<seat>.packet.md')>=0,'"What it sends where" should point at the packet file a person can read');
  check(8,!/Nothing else\./.test(toProvider),'"What it sends where" still closes its list of what a provider is sent with "Nothing else."');

  // ---- item 9: the dead entry -----------------------------------------------------------------
  check(9,realTable.providers.every(function(p){return p.id!=='anthropic'&&p.api==='openai-chat'&&!('stub' in p);}),'providers.json still holds the anthropic entry, or an entry that is not openai-chat');
  check(9,!/anthropic-messages|\.stub\b|CW_CREW_ANTHROPIC_KEY|ANTHROPIC_API_KEY/.test(server+libText+JSON.stringify(realTable)+JSON.stringify(manifest)),'a shipped file still reads the removed entry');
  check(9,!/An Anthropic API-key seat is a stub/.test(readme),'the README still describes the removed entry');
  s=await start(main,{});
  r=await s.call('crew_list');
  await s.stop();
  check(9,(r.data.seats||[]).length===8&&(r.data.seats||[]).every(function(x){return x.slot!=='anthropic'&&!/not built/.test(x.reason||'');}),'crew_list should list the eight seats the table offers and no stub, got '+(r.data.seats||[]).map(function(x){return x.slot;}).join());
}

main().catch(function(e){ failures.push('the test itself threw: '+(e&&e.stack||e)); }).then(function(){
  fake.close(); decoy.close();
  try{ fs.rmSync(tmp,{recursive:true,force:true}); }catch(e){}
  var only=process.env.CW_ITEM;
  var shown=only?failures.filter(function(f){return f.indexOf('item '+only+':')===0;}):failures;
  shown.forEach(function(f){ console.log('FAIL '+f); });
  if(only){ console.log('crew_repairs_check item '+only+': '+(shown.length?shown.length+' failed':'passes')); process.exit(shown.length?1:0); }
  if(failures.length){ console.log('crew_repairs_check: '+failures.length+' failed, '+passes+' passed'); process.exit(1); }
  console.log('crew_repairs_check: ok ('+passes+' checks)');
  process.exit(0);
});
