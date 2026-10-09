// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// crew_check.js: the crew add-on's MCP server takes keys from the masked prompt over the
// environment and never from a file, resolves models from the live catalog without a pinned
// id, names each seat from the model field the API returns, refuses a packet too long to
// send, records a failed call as missing, honors the per-minute wait, writes the answer to
// the right file, and logs a complete line.
//
// Runs the REAL server.js from plugins/combat-writing-crew as a child process, speaking
// newline-delimited JSON-RPC over its stdin and stdout, against a fake OpenAI-compatible
// server on localhost that records every request. The run folder comes from the listed
// plugin's REAL new-run.js and packet.js. Never a re-implementation.
//
// What it pins:
//   - initialize answers with a supported protocol version, the server's name and tools; tools/list
//     names crew_list, crew_register and crew_answer.
//   - Key route: with both the prompt value and the environment variable set, the request carries
//     the prompt's value; with the prompt empty, the environment variable; with neither, the seat
//     is unavailable, the reason names the prompt and the variable and never a value, crew_answer
//     records the seat as missing, and the fake server is never called, even though a .env and a
//     key file holding a key sit in the working directory.
//   - crew_list resolves groq-a to the largest live gpt-oss id and groq-b to the newest live
//     qwen id, skips the excluded and small-context records, and names makers; a provider with
//     no key is listed as unavailable; the Anthropic entry is listed as not built; Ollama is off
//     until a model is named.
//   - crew_register appends the available seats to seats.json with provider, served_by, company
//     and a source that names the API response, logs crew.registered, and is idempotent.
//   - crew_answer reads the packet file, sends it with the system line and the resolved id, writes
//     rounds/<round>/<seat>.answer.md with the reply (trailing whitespace stripped from every
//     line), updates the seat's model to the id the API RETURNED (which the fake server makes
//     differ from the request), and logs crew.answered with the timestamp, the id requested and
//     the id returned as two separate fields, the usage, the key route and the file. The read
//     of a final packet writes <seat>.sn.answer.md with the S/N contract in the system line.
//   - A retry with `note` appends the failed check's reasons after the packet in the user
//     message, logs the note, and requests the id the API returned last time; a blank note is
//     no note.
//   - A packet over the provider's budget is refused with "Too long to send" before any request,
//     logged as crew.refused, and the seat is missing.
//   - The per-minute window is honored: the fake Groq keeps the real 8,000-token wall with a
//     1.5-second window, and the third call inside it (which would cross the wall) waits for the
//     window to age out before it is sent; the wait is in the result and the log. A 429 with
//     Retry-After: 1 is waited out and retried once (waited_ms >= 1000). A 500 and an empty
//     reply are recorded as crew.failed and the seat is missing, with no answer file.
//   - The window arithmetic (crew-lib makeWindow) waits when the next call would cross the wall or
//     the request limit, and not otherwise.
//   - The listed plugin's checker, flip check and record then read the outside seat's answer as
//     any seat's, and the record's crew line names two companies and both name sources.
//   - The crew (ruled 2026-10-09) is never padded: new-run.js seats one fresh reader, and with
//     the Groq key alone crew_register makes the crew three (seat-1 fresh, seat-2 and seat-3
//     from Groq); with a second provider's key present it is four. A dry run prints the seats.
//   - The cap for outside seats (ruled 2026-10-09): the system line states the packet's cap as
//     a number and the contract (a rating line, or no rating in a battle round without
//     --rerate); the add-on's no-rating line equals the listed plugin's. On a retry whose
//     reply is over the cap again, the reply is cut at the cap, the RATING line is pulled out
//     of the reply (here placed last) and kept first, the log and the result say truncated with
//     the counts, the listed plugin's checker passes the cut file, and the record and the board
//     mark the read "truncated at N words" (600 there, the cap that packet was sent). A critique read through the add-on carries no
//     RATING line and passes the critique contract.
//
// Run from the repo root:   node tests/crew_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process'), http=require('http');
var root=path.join(__dirname,'..');
var crewDir=path.join(root,'plugins','combat-writing-crew');
var scripts=path.join(root,'plugins','combat-writing','scripts');
var lib=require(path.join(crewDir,'crew-lib.js'));
var CREDIT='Combat Writing — Learning Producers Inc., Israel Hernandez, founder';
var failures=[], passes=0;
function check(cond,msg){ if(process.env.CW_TRACE)process.stderr.write((cond?'ok   ':'FAIL ')+msg.slice(0,90)+'\n'); if(cond)passes++; else failures.push(msg); }
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-crew-'));

// ---- the fake provider ---------------------------------------------------------------------
var requests=[]; var rateLimited=false;
var fake=http.createServer(function(req,res){
  var chunks=[]; req.on('data',function(c){chunks.push(c);}); req.on('end',function(){
    var body=chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):null;
    requests.push({method:req.method,url:req.url,auth:req.headers['authorization']||null,body:body});
    function json(status,obj,headers){res.writeHead(status,Object.assign({'Content-Type':'application/json'},headers||{}));res.end(JSON.stringify(obj));}
    if(req.method==='GET'&&req.url==='/v1/models'){
      if(!req.headers['authorization'])return json(401,{error:{message:'no key'}});
      return json(200,{data:[
        {id:'openai/gpt-oss-20b',owned_by:'OpenAI',created:200,context_window:131072,max_completion_tokens:32768,active:true},
        {id:'openai/gpt-oss-120b',owned_by:'OpenAI',created:100,context_window:131072,max_completion_tokens:32768,active:true},
        {id:'qwen/qwen3-32b',owned_by:'Alibaba Cloud',created:50,context_window:131072,max_completion_tokens:40960,active:true},
        {id:'qwen/qwen3.6-27b',owned_by:'Alibaba Cloud',created:300,context_window:131072,max_completion_tokens:40960,active:true},
        {id:'whisper-large-v3',owned_by:'OpenAI',created:400,context_window:0,max_completion_tokens:0,active:true},
        {id:'meta-llama/llama-guard-4-12b',owned_by:'Meta',created:400,context_window:131072,max_completion_tokens:1024,active:true},
        {id:'openai/gpt-oss-safeguard-20b',owned_by:'OpenAI',created:500,context_window:131072,max_completion_tokens:32768,active:true},
        {id:'qwen/qwen-tiny',owned_by:'Alibaba Cloud',created:900,context_window:8192,max_completion_tokens:4096,active:true},
        {id:'grok-test-1',owned_by:'xAI',created:700,context_window:131072,max_completion_tokens:16384,active:true}
      ]});
    }
    if(req.method==='POST'&&req.url==='/v1/chat/completions'){
      if(!req.headers['authorization'])return json(401,{error:{message:'no key'}});
      var user=body.messages[1].content;
      if(/FAILME/.test(user))return json(500,{error:{message:'boom'}});
      if(/EMPTYME/.test(user))return json(200,{model:body.model,choices:[{message:{role:'assistant',content:''}}]});
      if(/RATELIMIT/.test(user)&&!rateLimited){rateLimited=true;return json(429,{error:{message:'rate limit'}},{'Retry-After':'1'});}
      var sys=body.messages[0].content;
      // The reply pads its lines with trailing spaces, as a real model did; the server must strip them.
      var retried=/Note from the host on this retry/.test(user);
      // On a retry marked TRUNCATEME the reply is 600-odd words with the rating line LAST, as a real seat did twice.
      var content=/S\/N RATIO/.test(sys)?'S/N RATIO: 70%  \nSignal: the ask. Noise: the posture.   \n':/RED FLAGS/.test(sys)?'NO RED FLAGS \nNothing an informed reader would distrust.\n'
        :/asks for no rating/.test(sys)?'The ask lands and the close still apologizes. seat-1 wrote "The ask lands in the first line." and I agree.\n'
        :/TRUNCATEME/.test(user)?'Opening line. The ask lands. '+new Array(350).join('alpha ')+'\n\nSecond paragraph. '+new Array(350).join('beta ')+'\n\nRATING: 8/10  \n'
        :(retried?'RATING: 6/10  \nSecond try, shorter. seat-1 wrote "The ask lands in the first line." and I agree.\n':'RATING: 8/10  \nThe ask lands. seat-1 wrote "The ask lands in the first line." and I agree.  \n');
      // The returned id differs from the requested one by a date suffix, as a real provider's did; the suffix is not stacked on a re-request of the returned id.
      return json(200,{id:'chatcmpl-1',model:body.model.replace(/-0725$/,'')+'-0725',choices:[{message:{role:'assistant',content:content},finish_reason:'stop'}],usage:{prompt_tokens:321,completion_tokens:40,total_tokens:361}});
    }
    json(404,{error:{message:'no route '+req.url}});
  });
});

// ---- an MCP client over stdio -----------------------------------------------------------
function startServer(env){
  var child=cp.spawn(process.execPath,[path.join(crewDir,'server.js')],{cwd:proj,env:env,stdio:['pipe','pipe','pipe']});
  var pending={}, nextId=1, buf='';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data',function(d){buf+=d;var lines=buf.split('\n');buf=lines.pop();lines.forEach(function(l){if(!l.trim())return;var m;try{m=JSON.parse(l);}catch(e){failures.push('server wrote a non-JSON line: '+l.slice(0,80));return;}if(m.id!==undefined&&pending[m.id]){pending[m.id](m);delete pending[m.id];}});});
  var stderr=''; child.stderr.setEncoding('utf8'); child.stderr.on('data',function(d){stderr+=d;});
  function rpc(method,params){ return new Promise(function(resolve){var id=nextId++;pending[id]=resolve;child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:id,method:method,params:params||{}})+'\n');}); }
  function notify(method){ child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:method})+'\n'); }
  function call(name,args){ return rpc('tools/call',{name:name,arguments:args||{}}).then(function(m){var text=m.result&&m.result.content&&m.result.content[0]&&m.result.content[0].text;var obj=null;try{obj=JSON.parse(text);}catch(e){}return {raw:m,isError:m.result&&m.result.isError,data:obj};}); }
  return {child:child,rpc:rpc,notify:notify,call:call,stderr:function(){return stderr;},stop:function(){child.stdin.end();}};
}
function node(script,args,cwd){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:cwd||proj,encoding:'utf8'}); }
function logOf(run){ return fs.readFileSync(path.join(run,'log.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(function(l){return JSON.parse(l);}); }

fake.listen(0,'127.0.0.1',function(){
  var port=fake.address().port;
  var base='http://127.0.0.1:'+port+'/v1';
  // The test provider table: Groq's shape at the fake address, plus a keyless Ollama entry and the stub.
  var real=JSON.parse(fs.readFileSync(path.join(crewDir,'providers.json'),'utf8'));
  var groq=real.providers.filter(function(p){return p.id==='groq';})[0];
  var ollama=real.providers.filter(function(p){return p.id==='ollama';})[0];
  var anthropic=real.providers.filter(function(p){return p.id==='anthropic';})[0];
  var xai=real.providers.filter(function(p){return p.id==='xai';})[0];
  // The fake Groq keeps the real budget but a 1.5-second window, so the per-minute wait is exercised in seconds.
  var table={credit:real.credit,makers:real.makers,providers:[Object.assign({},groq,{base_url:base,budget:Object.assign({},groq.budget,{window_ms:1500})}),Object.assign({},xai,{base_url:base}),Object.assign({},ollama,{base_url:base}),anthropic]};
  var tablePath=path.join(proj,'providers-test.json');
  fs.writeFileSync(tablePath,JSON.stringify(table));
  // Key-looking files in the working directory, which the server must never read.
  fs.writeFileSync(path.join(proj,'.env'),'GROQ_API_KEY=gsk_FROM_A_FILE_NEVER_READ\n');
  fs.writeFileSync(path.join(proj,'groq.key'),'gsk_FROM_A_FILE_NEVER_READ\n');
  var baseEnv={PATH:process.env.PATH,HOME:proj,CW_CREW_PROVIDERS:tablePath};

  // A run from the listed plugin's own scripts.
  fs.writeFileSync(path.join(proj,'draft.md'),'Dear board, buy the company. The ask lands in the first line.\n');
  var run=node('new-run.js',['--draft','draft.md','--name','crew','--model','Test Model']).stdout.trim();
  check(!!run&&fs.existsSync(run),'new-run failed');
  check(JSON.parse(fs.readFileSync(path.join(run,'seats.json'),'utf8')).seats.length===1,'new-run: the default crew should be one fresh reader');
  check(lib.NO_RATING_LINE===require(path.join(scripts,'lib.js')).NO_RATING_LINE,'the add-on\'s no-rating line must equal the listed plugin\'s');

  var s1=startServer(Object.assign({},baseEnv,{CW_CREW_GROQ_KEY:'gsk_FROM_THE_PROMPT',GROQ_API_KEY:'gsk_FROM_THE_ENVIRONMENT'}));
  s1.rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'crew_check',version:'1'}}).then(function(m){
    check(m.result&&m.result.protocolVersion==='2025-06-18'&&m.result.serverInfo&&m.result.serverInfo.name==='combat-writing-crew'&&m.result.capabilities&&m.result.capabilities.tools,'initialize: wrong result '+JSON.stringify(m.result||m.error));
    check(m.result&&/^Combat Writing — Learning Producers Inc\./.test(m.result.instructions||''),'initialize: instructions do not open with the credit line');
    s1.notify('notifications/initialized');
    return s1.rpc('tools/list');
  }).then(function(m){
    var names=(m.result&&m.result.tools||[]).map(function(t){return t.name;}).sort();
    check(names.join(',')==='crew_answer,crew_list,crew_register','tools/list: '+names.join(','));
    check((m.result.tools||[]).every(function(t){return t.description&&t.inputSchema&&t.inputSchema.type==='object';}),'tools/list: a tool lacks a description or schema');
    return s1.call('crew_list');
  }).then(function(r){
    check(!r.isError&&r.data&&r.data.credit===CREDIT,'crew_list: error or no credit line '+JSON.stringify(r.raw.result).slice(0,200));
    var seats=r.data.seats||[];
    var a=seats.filter(function(s){return s.slot==='groq-a';})[0]||{};
    var b=seats.filter(function(s){return s.slot==='groq-b';})[0]||{};
    check(a.available===true&&a.model==='openai/gpt-oss-120b'&&a.maker==='OpenAI'&&a.served_by==='Groq'&&a.key_source==='prompt','crew_list: groq-a wrong '+JSON.stringify(a));
    check(b.available===true&&b.model==='qwen/qwen3.6-27b'&&b.maker==='Alibaba'&&b.served_by==='Groq','crew_list: groq-b should be the newest live qwen id, got '+JSON.stringify(b));
    check(a.catalog_size===5,'crew_list: expected 5 eligible catalog records after excluding whisper, guard, safeguard and the small-context id, got '+a.catalog_size);
    var x=seats.filter(function(s){return s.slot==='xai';})[0]||{};
    check(x.available===false&&/no key/.test(x.reason)&&/XAI_API_KEY/.test(x.reason)&&!/gsk_/.test(JSON.stringify(seats)),'crew_list: xai with no key should be unavailable with names only, got '+JSON.stringify(x));
    var o=seats.filter(function(s){return s.slot==='ollama';})[0]||{};
    check(o.available===false&&/ollama_model/.test(o.reason),'crew_list: ollama should be off until named, got '+JSON.stringify(o));
    var an=seats.filter(function(s){return s.slot==='anthropic';})[0]||{};
    check(an.available===false&&/not built/.test(an.reason),'crew_list: anthropic should be a stub, got '+JSON.stringify(an));
    var catalogReq=requests.filter(function(q){return q.url==='/v1/models';})[0];
    check(!!catalogReq&&catalogReq.auth==='Bearer gsk_FROM_THE_PROMPT','key route: the catalog read should carry the prompt\'s key over the environment\'s, got '+(catalogReq&&catalogReq.auth));
    return s1.call('crew_register',{run:run});
  }).then(function(r){
    check(!r.isError&&r.data.added&&r.data.added.length===2,'crew_register: expected 2 seats added, got '+JSON.stringify(r.data&&r.data.added));
    var seats=JSON.parse(fs.readFileSync(path.join(run,'seats.json'),'utf8')).seats;
    check(seats.length===3&&seats[0].id==='seat-1'&&!seats[0].provider&&seats[1].id==='seat-2'&&seats[1].provider==='groq'&&seats[1].served_by==='Groq'&&seats[1].company==='OpenAI'&&seats[1].model==='openai/gpt-oss-120b'&&/API returns/.test(seats[1].source),'crew_register: with the Groq key alone the crew should be three, seat-1 the fresh reader; got '+JSON.stringify(seats.map(function(x){return x.id+' '+x.model;})));
    console.log('crew with the Groq key alone: '+seats.map(function(x){return x.id+' = '+x.model+' ('+x.company+(x.served_by?', served by '+x.served_by:'')+')';}).join('; '));
    check(seats[2].company==='Alibaba'&&seats[2].model==='qwen/qwen3.6-27b','crew_register: seat-3 wrong '+JSON.stringify(seats[2]));
    check(logOf(run).some(function(e){return e.event==='crew.registered'&&e.credit===CREDIT&&e.added.length===2&&e.unavailable.length>=2;}),'crew_register: log line missing');
    return s1.call('crew_register',{run:run});
  }).then(function(r){
    check(!r.isError&&r.data.added.length===0&&JSON.parse(fs.readFileSync(path.join(run,'seats.json'),'utf8')).seats.length===3,'crew_register: not idempotent');
    // Packets for every seat, from the listed plugin; seat-1 (the fresh reader) answers by hand.
    ['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','01-sparring','--seat',s]); });
    fs.writeFileSync(path.join(run,'rounds','01-sparring','seat-1.answer.md'),'RATING: 6/10\nThe ask lands in the first line. The close is weak.\n');
    var p2=fs.readFileSync(path.join(run,'rounds','01-sparring','seat-2.packet.md'),'utf8');
    check(/Packet for openai\/gpt-oss-120b \(OpenAI, served by Groq\), seat-2/.test(p2),'packet: the outside seat is not labeled by model, maker and provider');
    return s1.call('crew_answer',{run:run,round:'01-sparring',seat:'seat-2'});
  }).then(function(r){
    check(!r.isError&&r.data.ok===true,'crew_answer: '+JSON.stringify(r.data));
    var ans=path.join(run,'rounds','01-sparring','seat-2.answer.md');
    var ansText=fs.existsSync(ans)?fs.readFileSync(ans,'utf8'):'';
    check(r.data.file===ans&&/^RATING: 8\/10\n/.test(ansText),'crew_answer: answer file wrong or missing');
    check(!/[ \t]\n/.test(ansText)&&/\n$/.test(ansText)&&!/\n\n$/.test(ansText),'crew_answer: trailing whitespace must be stripped from every line, got '+JSON.stringify(ansText.slice(0,60)));
    check(r.data.model_requested==='openai/gpt-oss-120b','crew_answer: the result should carry the id requested, got '+r.data.model_requested);
    check(r.data.model_returned==='openai/gpt-oss-120b-0725'&&r.data.model_source==='API response model field'&&r.data.served_by==='Groq'&&r.data.company==='OpenAI','crew_answer: model id must come from the response '+JSON.stringify(r.data));
    check(!('text' in r.data)&&!/The ask lands\. seat-1/.test(JSON.stringify(r.data)),'crew_answer: must return the path, never the answer text');
    var seats=JSON.parse(fs.readFileSync(path.join(run,'seats.json'),'utf8')).seats;
    check(seats[1].model==='openai/gpt-oss-120b-0725','crew_answer: seats.json should carry the returned id, got '+seats[1].model);
    var req=requests.filter(function(q){return q.url==='/v1/chat/completions';})[0];
    check(!!req&&req.auth==='Bearer gsk_FROM_THE_PROMPT'&&req.body.model==='openai/gpt-oss-120b'&&req.body.messages.length===2&&req.body.messages[0].role==='system'&&/RATING: X\/10/.test(req.body.messages[0].content)&&req.body.messages[1].content.indexOf('=== DRAFT BEGIN ===')>=0&&req.body.max_tokens>=1200&&req.body.max_tokens<=2800&&req.body.reasoning_effort==='low','crew_answer: request wrong '+JSON.stringify(req&&{auth:req.auth,model:req.body.model,max:req.body.max_tokens,extras:req.body.reasoning_effort}));
    check(!!req&&/Under 500 words in all, the first line included/.test(req.body.messages[0].content)&&/a second overrun is cut at 500 words/.test(req.body.messages[0].content),'system line: the cap must be stated as a number, got '+(req&&req.body.messages[0].content.slice(0,400)));
    console.log('system line (sparring, rating): '+(req?req.body.messages[0].content:''));
    check(req.body.messages[1].content===fs.readFileSync(path.join(run,'rounds','01-sparring','seat-2.packet.md'),'utf8'),'crew_answer: the user message must be the packet file, verbatim');
    var e=logOf(run).filter(function(x){return x.event==='crew.answered';})[0]||{};
    check(e.ts&&e.round==='01-sparring'&&e.seat==='seat-2'&&e.provider==='groq'&&e.served_by==='Groq'&&e.company==='OpenAI'&&e.model_requested==='openai/gpt-oss-120b'&&e.model_returned==='openai/gpt-oss-120b-0725'&&e.model_changed===true&&e.retry_note===null&&e.model_source==='API response model field'&&e.file==='rounds/01-sparring/seat-2.answer.md'&&e.packet==='rounds/01-sparring/seat-2.packet.md'&&e.read==='rating'&&e.usage&&e.usage.total_tokens===361&&typeof e.waited_ms==='number'&&e.key_source==='prompt'&&typeof e.input_tokens_estimated==='number'&&typeof e.reservation==='number','crew_answer: log line incomplete '+JSON.stringify(e));
    check(!/gsk_/.test(fs.readFileSync(path.join(run,'log.jsonl'),'utf8')),'log: a key value leaked into the log');
    // The listed plugin's checks read the outside seat's answer as any seat's.
    var ca=node('check-answer.js',[ans,'--run',run]);
    check(ca.status===0,'check-answer on the outside seat: exit '+ca.status+' '+ca.stdout.split('\n')[0]);
    // A retry with a note: the failed check's reasons ride after the packet, and the log records the note.
    return s1.call('crew_answer',{run:run,round:'01-sparring',seat:'seat-2',note:'rating is 7; 7 is forbidden, commit to 6 or 8; 530 words, over the cap of 500'});
  }).then(function(r){
    check(!r.isError&&r.data.ok&&/^RATING: 6\/10\nSecond try/.test(fs.readFileSync(path.join(run,'rounds','01-sparring','seat-2.answer.md'),'utf8')),'retry note: the second answer should replace the first, got '+JSON.stringify(r.data));
    var req=requests.filter(function(q){return q.url==='/v1/chat/completions';}).pop();
    var packetText=fs.readFileSync(path.join(run,'rounds','01-sparring','seat-2.packet.md'),'utf8');
    check(req.body.messages[1].content.indexOf(packetText.replace(/\s+$/,''))===0&&/## Note from the host on this retry\n\nYour previous answer failed the check: rating is 7; 7 is forbidden, commit to 6 or 8; 530 words, over the cap of 500\nWrite it again, meeting the contract above, within 500 words\./.test(req.body.messages[1].content),'retry note: the note must ride after the packet in the user message, naming the cap');
    check(req.body.model==='openai/gpt-oss-120b-0725','retry note: the retry should request the id the API returned last time, got '+req.body.model);
    var e2=logOf(run).filter(function(x){return x.event==='crew.answered';}).pop()||{};
    check(e2.retry_note&&/7 is forbidden/.test(e2.retry_note)&&e2.model_requested==='openai/gpt-oss-120b-0725'&&e2.model_returned==='openai/gpt-oss-120b-0725'&&e2.model_changed===false,'retry note: log line wrong '+JSON.stringify(e2));
    // A note with only whitespace is no note.
    return s1.call('crew_answer',{run:run,round:'01-sparring',seat:'seat-2',note:'   '});
  }).then(function(r){
    var req=requests.filter(function(q){return q.url==='/v1/chat/completions';}).pop();
    check(!r.isError&&r.data.ok&&req.body.messages[1].content.indexOf('Note from the host')<0&&/^RATING: 8\/10/.test(fs.readFileSync(path.join(run,'rounds','01-sparring','seat-2.answer.md'),'utf8')),'blank note: should send the packet alone');
    return s1.call('crew_answer',{run:run,round:'01-sparring',seat:'seat-3'});
  }).then(function(r){
    check(!r.isError&&r.data.ok&&r.data.model_returned==='qwen/qwen3.6-27b-0725'&&r.data.company==='Alibaba','crew_answer seat-3: '+JSON.stringify(r.data));
    var req=requests.filter(function(q){return q.url==='/v1/chat/completions';}).pop();
    check(req&&req.body.model==='qwen/qwen3.6-27b'&&req.body.reasoning_effort==='none','crew_answer: the qwen request extras were not applied');
    // Battle: packets carry the outside seats' answers; the flip check and the record read them.
    node('check-answer.js',[path.join(run,'rounds','01-sparring','seat-3.answer.md'),'--run',run]);
    ['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','02-battle','--seat',s,'--rerate']); });
    var p1=fs.readFileSync(path.join(run,'rounds','02-battle','seat-1.packet.md'),'utf8');
    check(/### openai\/gpt-oss-120b-0725 \(OpenAI, served by Groq\), seat-2\n\n=== ANSWER BEGIN ===\nRATING: 8\/10/.test(p1),'battle packet: the outside seat\'s answer is not carried under its returned id');
    fs.writeFileSync(path.join(run,'rounds','02-battle','seat-1.answer.md'),'RATING: 8/10\nseat-2 wrote "The ask lands." and that moved me from 6 to 8.\n');
    var cf=node('check-flip.js',['--run',run,'--round','02-battle','--seat','seat-1']);
    check(cf.status===0&&/"status":"flip-valid"/.test(cf.stdout)&&/"cited":"seat-2"/.test(cf.stdout),'check-flip: a quote of the outside seat should validate, got '+cf.stdout.split('\n')[0]);
    var rr=node('render-record.js',['--run',run]);
    var rec=fs.readFileSync(path.join(run,'record.md'),'utf8');
    check(rr.status===0&&/\*\*Crew:\*\*.*3 companies: Anthropic, OpenAI, Alibaba\. Fresh readers are named from the agent configuration; outside seats from the model field their provider's API returned\./.test(rec),'record: crew line should name three companies and both name sources');
    check(/\| openai\/gpt-oss-120b-0725 \(OpenAI, served by Groq\), seat-2 \| 8\/10 \|/.test(rec),'record: outside seat row wrong');
    var rb=node('render-board.js',['--run',run]);
    check(rb.status===0&&/served by Groq/.test(fs.readFileSync(path.join(run,'board.html'),'utf8')),'board: outside seat not named with its provider');
    // The final reads through the add-on.
    node('packet.js',['--run',run,'--round','03-final','--seat','seat-2','--final','sn']);
    node('packet.js',['--run',run,'--round','03-final','--seat','seat-2','--final','redflag']);
    return s1.call('crew_answer',{run:run,round:'03-final',seat:'seat-2',read:'sn'});
  }).then(function(r){
    var f=path.join(run,'rounds','03-final','seat-2.sn.answer.md');
    check(!r.isError&&r.data.ok&&r.data.file===f&&/^S\/N RATIO: 70%/.test(fs.readFileSync(f,'utf8')),'final sn through the add-on: '+JSON.stringify(r.data));
    // Two calls already sit in the window (about 3,600 tokens each, input plus reservation); this third
    // call would cross the 8,000 wall, so the server waited for the window to age out before sending.
    check(r.data.waited_ms>0&&r.data.waited_ms<=1800,'window: the third call in the window should have waited for it to age out, waited_ms '+r.data.waited_ms);
    var req=requests.filter(function(q){return q.url==='/v1/chat/completions';}).pop();
    check(/S\/N RATIO: XX%/.test(req.body.messages[0].content)&&req.body.messages[1].content.indexOf('Evaluate the signal-to-noise ratio')>=0,'final sn: the system line or packet is not the S/N read');
    check(node('check-answer.js',[f,'--run',run]).status===0,'final sn: the listed plugin\'s checker should pass the add-on\'s S/N answer');
    return s1.call('crew_answer',{run:run,round:'03-final',seat:'seat-2',read:'redflag'});
  }).then(function(r){
    check(!r.isError&&r.data.ok&&/^NO RED FLAGS/.test(fs.readFileSync(path.join(run,'rounds','03-final','seat-2.redflag.answer.md'),'utf8')),'final redflag through the add-on: '+JSON.stringify(r.data));
    // The second overrun (ruled 2026-10-09): a rerate packet, a retry note, and a reply over the cap with the
    // rating line placed last. The add-on cuts it at the cap, keeps the rating first, and says so.
    node('packet.js',['--run',run,'--round','04-battle','--seat','seat-2','--rerate']);
    return s1.call('crew_answer',{run:run,round:'04-battle',seat:'seat-2',note:'597 words, over the cap of 500 (TRUNCATEME)'});
  }).then(function(r){
    var f=path.join(run,'rounds','04-battle','seat-2.answer.md');
    var t=fs.existsSync(f)?fs.readFileSync(f,'utf8'):'';
    var words=t.split(/\s+/).filter(Boolean).length;
    // The packet carried the other seats, so the cap it was sent is 600; the cut is at that cap.
    check(!r.isError&&r.data.ok&&r.data.truncated&&r.data.truncated.at===600&&r.data.truncated.words_returned>600&&r.data.truncated.first_line_moved===true&&/cut at 600 words/.test(r.data.next),'truncation: the result should say the reply was cut at the cap sent, got '+JSON.stringify(r.data));
    check(/^RATING: 8\/10\n/.test(t)&&words===600&&t.indexOf('The ask lands.')>=0&&(t.match(/RATING:/g)||[]).length===1,'truncation: the file should open with the rating pulled from the end and hold 600 words, got '+words+' words, first line '+JSON.stringify(t.split('\n')[0]));
    var req=requests.filter(function(q){return q.url==='/v1/chat/completions';}).pop();
    check(/Under 600 words in all/.test(req.body.messages[0].content),'truncation: the system line should state the cap sent, 600');
    var e=logOf(run).filter(function(x){return x.event==='crew.answered'&&x.round==='04-battle';}).pop()||{};
    check(e.truncated&&e.truncated.at===e.word_cap&&e.truncated.words_returned>e.word_cap&&e.truncated.words_kept===e.word_cap&&e.truncated.first_line_moved===true&&e.contract==='rating','truncation: log line wrong '+JSON.stringify(e.truncated)+' cap '+e.word_cap);
    var ca=node('check-answer.js',[f,'--run',run]);
    check(ca.status===0&&/OK rating 8\/10/.test(ca.stdout),'truncation: the listed plugin\'s checker should pass the cut file, got '+ca.stdout.split('\n')[0]);
    node('check-flip.js',['--run',run,'--round','04-battle','--seat','seat-2']);
    node('render-record.js',['--run',run]); node('render-board.js',['--run',run]);
    var rec=fs.readFileSync(path.join(run,'record.md'),'utf8'), html=fs.readFileSync(path.join(run,'board.html'),'utf8');
    check(/\| 04-battle \|/.test(rec.split('\n').filter(function(l){return l.indexOf('| Seat |')===0;})[0]||'')&&/seat-2 \|[^\n]*\| 8\/10[^|]*truncated at 600 words/.test(rec),'record: the truncated read should be marked in the scoreboard with the rating shown');
    check(/\*Truncated at 600 words by the crew add-on on the seat's second overrun; the seat returned \d+ words; its first line was found lower in the reply and moved to the top\.\*/.test(rec),'record: the answer should carry the truncation note');
    check(/8\/10<br><span class="mark"[^>]*>[^<]*truncated at 600 words<\/span>/.test(html),'board: the truncated read should be marked with the rating shown');
    var sc=(rec.match(/\| openai\/gpt-oss-120b-0725 \(OpenAI, served by Groq\), seat-2 \|[^\n]*/)||[''])[0];
    console.log('scoreboard row after the cut: '+sc);
    // A battle round without --rerate through the add-on: the system line says no rating, the reply has none,
    // and the listed plugin's checker holds the seat to the critique contract.
    node('packet.js',['--run',run,'--round','05-battle','--seat','seat-2']);
    return s1.call('crew_answer',{run:run,round:'05-battle',seat:'seat-2'});
  }).then(function(r){
    var f=path.join(run,'rounds','05-battle','seat-2.answer.md');
    var req=requests.filter(function(q){return q.url==='/v1/chat/completions';}).pop();
    check(!r.isError&&r.data.ok&&/This round asks for no rating: do not write a RATING line/.test(req.body.messages[0].content)&&!/RATING: X\/10/.test(req.body.messages[0].content),'critique read: the system line should ask for no rating, got '+req.body.messages[0].content.slice(0,300));
    console.log('system line (battle, no rerate): '+req.body.messages[0].content);
    check(fs.existsSync(f)&&!/^RATING/.test(fs.readFileSync(f,'utf8'))&&/The ask lands and the close still apologizes/.test(fs.readFileSync(f,'utf8')),'critique read: the answer should carry no RATING line');
    var ca=node('check-answer.js',[f,'--run',run]);
    check(ca.status===0&&/OK critique, no rating this round/.test(ca.stdout),'critique read: the checker should pass it under the critique contract, got '+ca.stdout.split('\n')[0]);
    var e=logOf(run).filter(function(x){return x.event==='crew.answered'&&x.round==='05-battle';}).pop()||{};
    check(e.contract==='critique'&&e.truncated===null&&e.word_cap===600,'critique read: log line wrong '+JSON.stringify({contract:e.contract,truncated:e.truncated,cap:e.word_cap}));
    // Too long to send: a packet that leaves less than the floor for a reply is refused before any request.
    fs.mkdirSync(path.join(run,'rounds','06-battle'),{recursive:true});
    fs.writeFileSync(path.join(run,'rounds','06-battle','seat-2.packet.md'),CREDIT+'\n\n'+new Array(7200).join('word ')+'\n');
    var before=requests.length;
    return s1.call('crew_answer',{run:run,round:'06-battle',seat:'seat-2'}).then(function(r2){
      check(r2.isError&&r2.data.ok===false&&r2.data.missing===true&&/^Too long to send\. This round needs about [\d,]+ tokens of input and the provider allows 8,000 per minute, which leaves less than the 1,200-token minimum for a reply\. Cut roughly [\d,]+ tokens/.test(r2.data.reason),'too long: '+JSON.stringify(r2.data));
      check(requests.length===before,'too long: a request was sent anyway');
      check(!fs.existsSync(path.join(run,'rounds','06-battle','seat-2.answer.md')),'too long: an answer file appeared');
      check(logOf(run).some(function(e){return e.event==='crew.refused'&&e.round==='06-battle'&&e.seat==='seat-2'&&/Too long to send/.test(e.reason)&&e.input_tokens>8000;}),'too long: crew.refused not logged');
    });
  }).then(function(){
    // A 429 with Retry-After: 1 is waited out and retried once.
    fs.mkdirSync(path.join(run,'rounds','07-battle'),{recursive:true});
    fs.writeFileSync(path.join(run,'rounds','07-battle','seat-2.packet.md'),CREDIT+'\n\nRATELIMIT please rate this.\n');
    var t0=Date.now();
    return s1.call('crew_answer',{run:run,round:'07-battle',seat:'seat-2'}).then(function(r){
      check(!r.isError&&r.data.ok&&r.data.waited_ms>=1000&&Date.now()-t0>=1000,'rate limit: expected a wait of at least 1 s and a retry, got '+JSON.stringify(r.data));
      var calls=requests.filter(function(q){return q.url==='/v1/chat/completions'&&/RATELIMIT/.test(q.body.messages[1].content);});
      check(calls.length===2,'rate limit: expected exactly two attempts, got '+calls.length);
      check(logOf(run).some(function(e){return e.event==='crew.answered'&&e.round==='07-battle'&&e.waited_ms>=1000;}),'rate limit: the wait is not in the log');
    });
  }).then(function(){
    // A failed call and an empty reply are missing, with no answer file.
    fs.mkdirSync(path.join(run,'rounds','08-battle'),{recursive:true});
    fs.writeFileSync(path.join(run,'rounds','08-battle','seat-2.packet.md'),CREDIT+'\n\nFAILME\n');
    fs.writeFileSync(path.join(run,'rounds','08-battle','seat-3.packet.md'),CREDIT+'\n\nEMPTYME\n');
    return s1.call('crew_answer',{run:run,round:'08-battle',seat:'seat-2'}).then(function(r){
      check(r.isError&&r.data.missing===true&&/HTTP 500/.test(r.data.reason)&&/missing this round/.test(r.data.reason),'failed call: '+JSON.stringify(r.data));
      check(!fs.existsSync(path.join(run,'rounds','08-battle','seat-2.answer.md')),'failed call: an answer file appeared');
      check(logOf(run).some(function(e){return e.event==='crew.failed'&&e.round==='08-battle'&&e.seat==='seat-2'&&e.status===500;}),'failed call: crew.failed not logged');
      return s1.call('crew_answer',{run:run,round:'08-battle',seat:'seat-3'});
    }).then(function(r){
      check(r.isError&&r.data.missing===true&&/empty reply/.test(r.data.reason)&&!fs.existsSync(path.join(run,'rounds','08-battle','seat-3.answer.md')),'empty reply: '+JSON.stringify(r.data));
      // Round 08 holds no sound answer, so the next packet reads the latest round that does (07-battle, where
      // only seat-2 answered): seat-2 carried from there, seat-3 listed as missing, nothing standing in.
      ['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','09-battle','--seat',s]); });
      var p3=fs.readFileSync(path.join(run,'rounds','09-battle','seat-1.packet.md'),'utf8');
      check(/## The other seats' answers \(round 07-battle\)/.test(p3)&&/seat-2\n\n=== ANSWER BEGIN ===/.test(p3)&&/seat-3 — missing/.test(p3),'after failures: the next packet should read the latest round with a sound answer and list seat-3 as missing');
    });
  }).then(function(){
    // Misuse.
    return s1.call('crew_answer',{run:run,round:'01-sparring',seat:'seat-1'}).then(function(r){
      check(r.isError&&/not an outside seat/.test(r.data.error||r.data.reason||''),'crew_answer on a fresh reader should refuse: '+JSON.stringify(r.data));
      return s1.call('crew_answer',{run:run,round:'99-battle',seat:'seat-2'});
    }).then(function(r){
      check(r.isError&&/no packet/.test(r.data.error||r.data.reason||''),'crew_answer with no packet should refuse: '+JSON.stringify(r.data));
      return s1.call('crew_answer',{run:run,round:'bad',seat:'seat-2'});
    }).then(function(r){
      check(r.isError&&/round must look like/.test(r.data.error||''),'crew_answer with a malformed round should refuse');
      return s1.rpc('nope/method');
    }).then(function(m){
      check(m.error&&m.error.code===-32601,'an unknown method should get a -32601 error');
      s1.stop();
    });
  }).then(function(){
    // Key route, second server: the prompt empty, the environment variable set.
    requests.length=0;
    var s2=startServer(Object.assign({},baseEnv,{CW_CREW_GROQ_KEY:'',GROQ_API_KEY:'gsk_FROM_THE_ENVIRONMENT'}));
    return s2.rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'t',version:'1'}}).then(function(m){
      check(m.result.protocolVersion==='2024-11-05','initialize: should echo a supported older version');
      return s2.call('crew_list');
    }).then(function(r){
      var a=(r.data.seats||[]).filter(function(s){return s.slot==='groq-a';})[0]||{};
      check(a.available===true&&a.key_source==='environment','key route: with the prompt empty the environment variable should serve, got '+JSON.stringify(a));
      check(requests[0]&&requests[0].auth==='Bearer gsk_FROM_THE_ENVIRONMENT','key route: the request should carry the environment\'s key, got '+(requests[0]&&requests[0].auth));
      s2.stop();
    });
  }).then(function(){
    // Key route, third server: neither set; files holding keys sit in cwd and are never read.
    requests.length=0;
    var s3=startServer(Object.assign({},baseEnv,{CW_CREW_GROQ_KEY:'',GROQ_API_KEY:''}));
    return s3.rpc('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'t',version:'1'}}).then(function(m){
      check(m.result.protocolVersion==='2025-11-25','initialize: should accept the newest version');
      return s3.call('crew_list');
    }).then(function(r){
      var a=(r.data.seats||[]).filter(function(s){return s.slot==='groq-a';})[0]||{};
      check(a.available===false&&/no key/.test(a.reason)&&/masked prompt/.test(a.reason)&&/GROQ_API_KEY/.test(a.reason)&&!/NEVER_READ/.test(JSON.stringify(r.data)),'key route: with neither set the seat should be unavailable, naming the prompt and the variable, got '+JSON.stringify(a));
      check(r.data.available===0&&requests.length===0,'key route: with no key the provider must not be called');
      return s3.call('crew_answer',{run:run,round:'01-sparring',seat:'seat-2'});
    }).then(function(r){
      check(r.isError&&r.data.missing===true&&/no key/.test(r.data.reason)&&!/NEVER_READ/.test(JSON.stringify(r.data))&&requests.length===0,'key route: crew_answer with no key should be missing without a request, got '+JSON.stringify(r.data));
      check(!/NEVER_READ/.test(fs.readFileSync(path.join(run,'log.jsonl'),'utf8')),'key route: a key from a file reached the log');
      s3.stop();
    });
  }).then(function(){
    // The crew scales by key (ruled 2026-10-09): with a second provider's key present, crew_register seats
    // one more, and the crew is four. A dry run: new-run.js and crew_register only, no packet sent.
    requests.length=0;
    var s4=startServer(Object.assign({},baseEnv,{CW_CREW_GROQ_KEY:'gsk_FROM_THE_PROMPT',CW_CREW_XAI_KEY:'xai_FROM_THE_PROMPT'}));
    var run4=node('new-run.js',['--draft','draft.md','--name','four','--model','Test Model']).stdout.trim();
    return s4.rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'t',version:'1'}}).then(function(){
      return s4.call('crew_list');
    }).then(function(r){
      var x=(r.data.seats||[]).filter(function(s){return s.slot==='xai';})[0]||{};
      check(x.available===true&&x.model==='grok-test-1'&&x.maker==='xAI'&&x.served_by==='xAI','scaling: the xai seat should resolve with its key present, got '+JSON.stringify(x));
      check(r.data.available===3,'scaling: expected 3 outside seats available with two keys, got '+r.data.available);
      return s4.call('crew_register',{run:run4});
    }).then(function(r){
      var seats=JSON.parse(fs.readFileSync(path.join(run4,'seats.json'),'utf8')).seats;
      check(!r.isError&&r.data.added.length===3&&seats.length===4&&seats[0].id==='seat-1'&&!seats[0].provider&&seats[3].provider==='xai'&&seats[3].model==='grok-test-1','scaling: with Groq and xAI keys the crew should be four, got '+JSON.stringify(seats.map(function(x){return x.id+' '+x.model;})));
      check(!requests.some(function(q){return q.url==='/v1/chat/completions';}),'scaling: the dry run must send no packet');
      console.log('crew with the Groq and xAI keys: '+seats.map(function(x){return x.id+' = '+x.model+' ('+x.company+(x.served_by?', served by '+x.served_by:'')+')';}).join('; '));
      s4.stop();
    });
  }).then(function(){
    // The window arithmetic.
    var w=lib.makeWindow(), b={hard_cap:8000,rpm:3};
    check(w.waitFor(3000,b)===0,'window: an empty window should not wait');
    w.record(3000); w.record(3000);
    check(w.waitFor(1500,b)===0,'window: 7,500 of 8,000 should not wait');
    check(w.waitFor(2500,b)>0&&w.waitFor(2500,b)<=60250,'window: crossing the wall should wait up to a minute');
    w.record(1000);
    check(w.waitFor(10,b)>0,'window: the request limit should wait');
    // The budget arithmetic, the app's two constraints.
    var p={budget:{tpm_ceiling:7700,hard_cap:8000,floor:1200,ceiling:2800}};
    var small=lib.budgetFor(p,'s',new Array(401).join('word'));
    check(small.ok&&small.reservation===2800,'budget: a small packet should get the ceiling, got '+JSON.stringify(small));
    var mid=lib.budgetFor(p,'',new Array(24001).join('x'));
    check(mid.ok&&mid.reservation===1700,'budget: 6,000 in should leave 1,700, got '+JSON.stringify(mid));
    var edge=lib.budgetFor(p,'',new Array(27201).join('x'));
    check(edge.ok&&edge.reservation===1200,'budget: 6,800 in should hit the floor exactly, got '+JSON.stringify(edge));
    var over=lib.budgetFor(p,'',new Array(27205).join('x'));
    check(!over.ok&&/Too long to send/.test(over.message),'budget: 6,801 in should refuse, got '+JSON.stringify(over));
    // Resolution without a pin.
    var cat=lib.eligibleCatalog([{id:'openai/gpt-oss-20b',created:9},{id:'openai/gpt-oss-120b',created:1},{id:'qwen/a',created:1},{id:'qwen/b',created:5}],{});
    check(lib.resolveSeat({match:'^openai/gpt-oss-\\d+b$',prefer:'largest'},cat,{}).id==='openai/gpt-oss-120b','resolve: largest should win over newest in the gpt-oss family');
    check(lib.resolveSeat({match:'^qwen/',prefer:'newest'},cat,{}).id==='qwen/b','resolve: newest qwen');
    check(lib.resolveSeat({match:'^qwen/',prefer:'newest'},cat,{'qwen/b':1}).id==='qwen/a','resolve: a taken id is skipped');
    check(lib.resolveSeat({match:'^nope/',prefer:'newest'},cat,{})===null,'resolve: no match is null');
    var src=fs.readFileSync(path.join(crewDir,'server.js'),'utf8')+fs.readFileSync(path.join(crewDir,'crew-lib.js'),'utf8')+fs.readFileSync(path.join(crewDir,'providers.json'),'utf8');
    check(!/gpt-oss-120b|qwen3|grok-\d|sonar-[a-z]|gpt-4|gpt-5|mistral-large-\d|gemini-\d/.test(src),'a model id is pinned in the add-on');
  }).catch(function(err){
    failures.push('unexpected: '+(err&&err.stack||err));
  }).then(function(){
    fake.close();
    fs.rmSync(proj,{recursive:true,force:true});
    failures.forEach(function(f){console.log('FAIL '+f);});
    console.log((failures.length?'crew_check: '+failures.length+' failure(s), ':'crew_check: all passed, ')+passes+' checks');
    process.exit(failures.length?1:0);
  });
});
