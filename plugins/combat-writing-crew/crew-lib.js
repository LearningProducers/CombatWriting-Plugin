// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// crew-lib.js: what the Combat Writing crew add-on shares. Plain Node, no dependencies.
//
// The add-on reads the same run folder the listed plugin writes (combat-writing/runs/<run-id>/
// in the person's project): seats.json, log.jsonl, rounds/<nn-kind>/<seat>.packet.md, and it
// writes <seat>.answer.md (or <seat>.sn.answer.md / <seat>.redflag.answer.md) beside the packet
// plus one log line per event. Nothing else is written anywhere. Keys come from the process
// environment only: the masked prompt's value first, the conventional variable when the
// prompt is empty, never a file.

var fs=require('fs'), path=require('path'), http=require('http'), https=require('https'), url=require('url');

var CREDIT='Combat Writing — Learning Producers Inc., Israel Hernandez, founder';

function readText(p){ return fs.readFileSync(p,'utf8'); }
function appendLog(runDir,obj){
  fs.appendFileSync(path.join(runDir,'log.jsonl'),JSON.stringify(Object.assign({ts:new Date().toISOString()},obj))+'\n');
}
function readLog(runDir){
  var p=path.join(runDir,'log.jsonl');
  if(!fs.existsSync(p))return [];
  return readText(p).split('\n').filter(Boolean).map(function(l){try{return JSON.parse(l);}catch(e){return null;}}).filter(Boolean);
}
function readSeats(runDir){
  var p=path.join(runDir,'seats.json');
  if(!fs.existsSync(p))throw new Error('no seats.json in '+runDir+'; is this a Combat Writing run folder?');
  return JSON.parse(readText(p));
}
function writeSeats(runDir,seatsFile){ fs.writeFileSync(path.join(runDir,'seats.json'),JSON.stringify(seatsFile,null,2)+'\n'); }

// The provider table: providers.json beside this file, or the file CW_CREW_PROVIDERS names
// (the tests point it at a fake server on localhost; it holds addresses and key NAMES, never keys).
function loadProviders(){
  var p=process.env.CW_CREW_PROVIDERS&&process.env.CW_CREW_PROVIDERS.trim()?process.env.CW_CREW_PROVIDERS:path.join(__dirname,'providers.json');
  return JSON.parse(readText(p));
}

// The key route (ruled 2026-10-08): the masked prompt's value first (it reaches the server as
// the environment variable the plugin manifest maps it to); the conventional environment
// variable only when the prompt's value is empty; never a file. Returns {key, source} or null.
function keyFor(provider){
  if(provider.keyless)return {key:null,source:'none needed'};
  var fromPrompt=provider.key_prompt_env?(process.env[provider.key_prompt_env]||'').trim():'';
  if(fromPrompt)return {key:fromPrompt,source:'prompt'};
  var fromEnv=provider.key_env?(process.env[provider.key_env]||'').trim():'';
  if(fromEnv)return {key:fromEnv,source:'environment'};
  return null;
}
// What to tell the person when a key is missing: the prompt's name and the variable's name, never a value.
function keyHint(provider){
  return 'set it in the plugin\'s settings (the masked prompt) or, when that is empty, in the '+provider.key_env+' environment variable';
}

// A small HTTP client: JSON in, JSON out, with the status and the headers. Follows no redirect.
function request(method,fullUrl,headers,body,timeoutMs){
  return new Promise(function(resolve,reject){
    var u=url.parse(fullUrl);
    var mod=u.protocol==='https:'?https:http;
    var data=body?Buffer.from(JSON.stringify(body)):null;
    var h=Object.assign({'Accept':'application/json'},headers||{});
    if(data){h['Content-Type']='application/json';h['Content-Length']=String(data.length);}
    var req=mod.request({method:method,hostname:u.hostname,port:u.port,path:u.path,headers:h},function(res){
      var chunks=[];
      res.on('data',function(c){chunks.push(c);});
      res.on('end',function(){
        var text=Buffer.concat(chunks).toString('utf8'), json=null;
        try{json=JSON.parse(text);}catch(e){}
        resolve({status:res.statusCode,headers:res.headers,json:json,text:text});
      });
    });
    req.on('error',reject);
    req.setTimeout(timeoutMs||120000,function(){req.destroy(new Error('timed out after '+(timeoutMs||120000)+' ms'));});
    if(data)req.write(data);
    req.end();
  });
}

function vendorOf(id){ var s=String(id||''); var i=s.indexOf('/'); return i>0?s.slice(0,i):''; }
function makerOf(id,ownedBy,makers){
  var v=vendorOf(id).toLowerCase();
  if(v&&makers[v])return makers[v];
  var head=String(id||'').toLowerCase().split(/[-_.\/]/)[0];
  if(head&&makers[head])return makers[head];
  if(ownedBy&&makers[String(ownedBy).toLowerCase()])return makers[String(ownedBy).toLowerCase()];
  return ownedBy?String(ownedBy):'maker not reported';
}
// The size token in an id, for the "largest" preference: vendor/name-120b -> 120, no token -> 0.
function sizeOf(id){ var m=/(\d+)b\b/i.exec(String(id)); return m?parseInt(m[1],10):0; }

// The eligible catalog, newest first: chat-capable ids with a working context and output window,
// the way the app filters Groq's catalog. Providers that return no such fields keep every id.
function eligibleCatalog(records,catalogRules){
  var rules=catalogRules||{};
  var exclude=rules.exclude?new RegExp(rules.exclude,'i'):null;
  var out=[];
  (Array.isArray(records)?records:[]).forEach(function(r){
    if(!r||!r.id||r.active===false)return;
    if(exclude&&exclude.test(r.id))return;
    if(rules.min_context&&r.context_window!==undefined&&Number(r.context_window)<rules.min_context)return;
    if(rules.min_output&&r.max_completion_tokens!==undefined&&Number(r.max_completion_tokens)<rules.min_output)return;
    out.push({id:String(r.id),owned_by:String(r.owned_by||''),created:Number(r.created)||0});
  });
  out.sort(function(a,b){return (b.created-a.created)||(a.id<b.id?-1:(a.id>b.id?1:0));});
  return out;
}

// Resolve one family seat against the live catalog: the family's pattern, then the preference
// (largest size, or newest), excluding ids other seats took. Never a pinned id.
function resolveSeat(seatSpec,catalog,taken){
  if(seatSpec.prefer==='named')return null;
  var re=seatSpec.match?new RegExp(seatSpec.match):null;
  var live=catalog.filter(function(r){return !taken[r.id]&&(!re||re.test(r.id));});
  if(!live.length)return null;
  if(seatSpec.prefer==='largest'){
    live.sort(function(a,b){return (sizeOf(b.id)-sizeOf(a.id))||(b.created-a.created)||(a.id<b.id?-1:1);});
  }
  return live[0];
}

// The call budget, the app's two-constraint arithmetic: reservation = ceiling - input clamped into
// [floor, ceiling]; input + reservation never crosses the hard cap; under the floor means refuse.
function estimateTokens(s){ return s?Math.ceil(String(s).length/4):0; }
function budgetFor(provider,systemPrompt,userText){
  var b=provider.budget;
  var input=estimateTokens(systemPrompt)+estimateTokens(userText);
  var reservation=b.tpm_ceiling-input;
  if(reservation<b.floor)reservation=b.floor;
  if(reservation>b.ceiling)reservation=b.ceiling;
  if(input+reservation>b.hard_cap)reservation=b.hard_cap-input;
  var ok=reservation>=b.floor;
  var over=input-b.hard_cap+b.floor;
  return {ok:ok,input:input,reservation:ok?reservation:0,
    message:ok?'':'Too long to send. This round needs about '+input.toLocaleString()+' tokens of input and the provider allows '+b.hard_cap.toLocaleString()+' per minute, which leaves less than the '+b.floor.toLocaleString()+'-token minimum for a reply. Cut roughly '+over.toLocaleString()+' tokens (about '+(over*4).toLocaleString()+' characters) from the question or the draft and send again.'};
}

// The per-minute window, per provider: tokens spent in the window (input plus the reservation,
// which is what Groq counts) and the number of requests. Before a call that would cross the
// wall or the request limit, wait until the oldest entry has aged out. The window is sixty
// seconds unless the provider's budget sets window_ms (the tests set a short one).
function makeWindow(){
  var spent=[];  // {t, tokens}
  return {
    waitFor:function(tokens,budget){
      var now=Date.now(), len=budget.window_ms||60000;
      spent=spent.filter(function(e){return now-e.t<len;});
      var used=spent.reduce(function(a,e){return a+e.tokens;},0);
      var count=spent.length;
      var waitMs=0;
      if(used+tokens>budget.hard_cap||count>=budget.rpm){
        var oldest=spent[0]?spent[0].t:now;
        waitMs=Math.max(0,len-(now-oldest))+250;
      }
      return waitMs;
    },
    record:function(tokens){ spent.push({t:Date.now(),tokens:tokens}); }
  };
}

module.exports={CREDIT:CREDIT,readText:readText,appendLog:appendLog,readLog:readLog,readSeats:readSeats,writeSeats:writeSeats,
  loadProviders:loadProviders,keyFor:keyFor,keyHint:keyHint,request:request,vendorOf:vendorOf,makerOf:makerOf,sizeOf:sizeOf,
  eligibleCatalog:eligibleCatalog,resolveSeat:resolveSeat,estimateTokens:estimateTokens,budgetFor:budgetFor,makeWindow:makeWindow};
