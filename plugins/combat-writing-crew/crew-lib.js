// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// crew-lib.js: what the Combat Writing crew add-on shares. Plain Node, no dependencies.
//
// The add-on reads the same run folder the listed plugin writes (combat-writing/runs/<run-id>/
// in the person's project): seats.json, log.jsonl, rounds/<nn-kind>/<seat>.packet.md, and it
// writes <seat>.answer.md (or <seat>.sn.answer.md / <seat>.redflag.answer.md) beside the packet
// plus one log line per event. Nothing else is written anywhere. Keys come from the masked
// prompt's value first, the conventional environment variable when the prompt is empty, then
// one NAME=value line in the person's own key file, <home>/.combat-writing/keys, owner-only
// (Part 36.2, stamped 2026-10-20, issue 62); never a file inside a project or the plugin.

var fs=require('fs'), path=require('path'), os=require('os'), http=require('http'), https=require('https'), url=require('url');

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

// The key route (ruled 2026-10-08; the third route stamped 2026-10-20, Part 36.2, issue 62):
// the masked prompt's value first (it reaches the server as the environment variable the
// plugin manifest maps it to); the conventional environment variable only when the prompt's
// value is empty; then the person's own key file, below. Returns {key, source} or null.
//
// The shapes measured on 2026-10-19 (Claude Code 2.1.303): an option the person never set, or
// one the host no longer holds, reaches the server as an empty string. A host that substitutes
// nothing would hand the literal placeholder, ${user_config.<option>}, and that is not a key:
// it is read as unfilled and never sent to a provider (sent, it draws a 401 and names the wrong
// cause). The same reading guards the environment variable.
var PLACEHOLDER=/^\$\{[^}]*\}$/;
function unfilled(value){ return PLACEHOLDER.test(value); }
function keyValue(name){
  var v=name?(process.env[name]||'').trim():'';
  return unfilled(v)?'':v;
}
// The key file (Part 36.2, stamped 2026-10-20, issue 62; the measurement, Part 36.1): the
// host's credentials store, where the masked prompt keeps a key, was rebuilt by the host on
// 2026-10-16 and again on 2026-10-24, each on a Claude Code update, and the key went with it
// both times while the install stood; no rebuild touches a file. So the third route is one
// file the person writes by hand in a Terminal, never through a tool call (a key typed into
// a tool call lands in a transcript): <home>/.combat-writing/keys, NAME=value lines where
// NAME is the provider's environment name (GROQ_API_KEY=...), # comments and blank lines
// allowed. It is read only when it is a regular file (never a symlink) whose mode has no
// group or other bits and whose folder has none either; a file that fails that, or carries
// a line that is not NAME=value, is refused whole, the reason naming the mode or the line
// number and never a line's content, so the file's permissions are the floor. The key file
// is never inside a project or the plugin, and the add-on never writes it. CW_CREW_KEY_FILE
// moves the path for the tests only.
var KEY_FILE='.combat-writing/keys';
function keyFilePath(){ var o=(process.env.CW_CREW_KEY_FILE||'').trim(); return o?o:path.join(os.homedir(),'.combat-writing','keys'); }
function keyFileShown(){ var o=(process.env.CW_CREW_KEY_FILE||'').trim(); return o?o:'~/'+KEY_FILE; }
function modeOf(st){ return (st.mode&0o777).toString(8); }
var KEY_LINE=/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;
function readKeyFile(){
  var p=keyFilePath(), shown=keyFileShown(), st;
  try{ st=fs.lstatSync(p); }catch(e){ return {present:false,keys:{},refused:null}; }
  if(!st.isFile())return {present:true,keys:{},refused:shown+' is not a regular file (a symlink or a folder); nothing is read from it'};
  if(st.mode&0o077)return {present:true,keys:{},refused:shown+' is open to others (mode '+modeOf(st)+'); it must be owner-only: chmod 600 '+shown+'; nothing is read from it'};
  var dst;
  try{ dst=fs.statSync(path.dirname(p)); }catch(e){ return {present:true,keys:{},refused:'the folder of '+shown+' cannot be read; nothing is read from it'}; }
  if(dst.mode&0o077)return {present:true,keys:{},refused:'the folder of '+shown+' is open to others (mode '+modeOf(dst)+'); it must be owner-only: chmod 700 '+path.dirname(shown)+'; nothing is read from it'};
  var text;
  try{ text=fs.readFileSync(p,'utf8'); }catch(e){ return {present:true,keys:{},refused:shown+' could not be read ('+(e.code||'error')+'); nothing is read from it'}; }
  var keys={}, lines=text.split('\n');
  for(var i=0;i<lines.length;i++){
    var l=lines[i].replace(/\r$/,'').trim();
    if(!l||l.charAt(0)==='#')continue;
    var m=KEY_LINE.exec(l);
    if(!m)return {present:true,keys:{},refused:shown+' line '+(i+1)+' is not a NAME=value line; nothing is read from it'};
    var v=m[2].trim();
    if(/^".*"$/.test(v)||/^'.*'$/.test(v))v=v.slice(1,-1);
    keys[m[1]]=v;
  }
  return {present:true,keys:keys,refused:null};
}
function keyFor(provider){
  if(provider.keyless)return {key:null,source:'none needed'};
  var fromPrompt=keyValue(provider.key_prompt_env);
  if(fromPrompt)return {key:fromPrompt,source:'prompt'};
  var fromEnv=keyValue(provider.key_env);
  if(fromEnv)return {key:fromEnv,source:'environment'};
  if(provider.key_env){
    var f=readKeyFile();
    var fromFile=!f.refused&&typeof f.keys[provider.key_env]==='string'?f.keys[provider.key_env].trim():'';
    if(fromFile&&!unfilled(fromFile))return {key:fromFile,source:'file'};
  }
  return null;
}
// How the missing key arrived: 'placeholder' when the prompt's variable holds the literal
// ${user_config.<option>} (the host handed the option unfilled); 'file-refused' when a key
// file is there and was refused (its permissions or a malformed line); else 'empty'.
function keyShape(provider){
  var v=provider.key_prompt_env?(process.env[provider.key_prompt_env]||'').trim():'';
  if(unfilled(v))return 'placeholder';
  if(readKeyFile().refused)return 'file-refused';
  return 'empty';
}
// What to tell the person when a key is missing (ruled 2026-10-13: the exact next command and the
// key field, never a value; 2026-10-19: the two causes a person can hit and the one next step).
// The causes: the key was never entered, or an update dropped it. Measured 2026-10-19 on this
// machine: a key entered through the masked prompt lives in the host's credentials store, keyed
// by plugin id, so a plugin version bump keeps it; but the host rebuilt that store on 2026-10-16
// (a new item, created at a session start on Claude Code 2.1.301, after an update), and the key
// went with it while the install and the manifest stood unchanged. The next step is one command:
// the configure dialog, the field typed in and saved; a save with nothing typed says
// "No configuration changes" and keeps nothing, which is what a person sees who expects the
// dropped key to still be there. The environment variable and the key file are the standing
// alternative routes; the file is the one that survives the host (Part 36.2).
var CONFIGURE_COMMAND='/plugin configure combat-writing-crew';
var CAUSES='never entered, or dropped by an update (the host rebuilt its credentials store, where the masked prompt keeps it)';
var manifestOptions=null;
function optionTitle(option){
  if(manifestOptions===null){
    try{manifestOptions=JSON.parse(readText(path.join(__dirname,'.claude-plugin','plugin.json'))).userConfig||{};}catch(e){manifestOptions={};}
  }
  return (manifestOptions[option]&&manifestOptions[option].title)||option;
}
function keyField(provider){
  var option=provider.key_option||(provider.id+'_api_key');
  return {next:CONFIGURE_COMMAND,field:option,field_title:optionTitle(option),env:provider.key_env,file:keyFileShown()};
}
function keyNext(provider){
  var f=keyField(provider);
  return 'Next: '+f.next+', type the key into the '+f.field+' field ('+f.field_title+') and save; a save with nothing typed says No configuration changes and keeps nothing. '+f.env+' in the environment serves when the prompt is empty, and so does a '+f.env+'=<key> line in '+f.file+' (owner-only: chmod 600 the file, chmod 700 its folder; written by hand in a Terminal, never typed into a session).';
}
function keyHint(provider){
  var f=keyField(provider);
  var shape=keyShape(provider);
  var cause=shape==='placeholder'
    ?'the host handed the '+f.field+' option unfilled (the literal ${user_config.'+f.field+'} reached the server and was not sent)'
    :shape==='file-refused'
    ?CAUSES+', and the key file was refused: '+readKeyFile().refused
    :CAUSES;
  return cause+'. '+keyNext(provider);
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

// What a packet asks of the seat, read from the packet file the listed plugin built: the word
// cap from its "Under N words." line, and the contract from its no-rating line (ruled
// 2026-10-09: a battle round asks for no rating unless the person asks with `rerate`). The
// no-rating line is the listed plugin's NO_RATING_LINE, mirrored here word for word because
// the add-on never reaches into the other plugin's folder; crew_check.js pins the two equal.
var NO_RATING_LINE='No rating this round: do not write a RATING line. Open with your answer to the task.';
function packetRules(packetText){
  var m=/Under (\d+) words\./.exec(packetText||'');
  return {cap:m?parseInt(m[1],10):null,contract:(packetText||'').indexOf(NO_RATING_LINE)>=0?'critique':'rating'};
}
function wordCount(text){ return String(text||'').split(/\s+/).filter(Boolean).length; }

// The retry target (ruled 2026-10-15): a seat sent back over the cap is asked for a target well
// under it, 80% (400 of 500, 480 of 600, 200 of 250), so the second answer has room; the cap
// itself still holds. Mirrored word for word from the listed plugin's lib.js; crew_check.js pins the two equal.
var RETRY_TARGET_RATIO=0.8;
function retryTarget(cap){ return Math.floor(cap*RETRY_TARGET_RATIO); }

// The cut (ruled 2026-10-09 for an outside seat, 2026-10-15 for every seat): on a seat's second
// overrun, the read is truncated at the cap, marked, and its rating kept. The contract's first
// line (RATING: X/10 for a rating read, the S/N or red-flag line for a final read) is pulled out
// of the reply wherever it sits before the cut, so it survives even when the seat put it last;
// the rest is cut at the last sentence end at or before the cap when one falls within the last
// SENTENCE_CUT_WINDOW words, else at the word, so that the whole file counts no more than the
// cap. A critique read has no such line; it is cut at the cap as it stands. Returns null when
// the reply is within the cap. Mirrored word for word from the listed plugin's lib.js (the add-on never
// reaches into that folder); crew_check.js pins the two equal.
var SENTENCE_CUT_WINDOW=60;
function truncateAnswer(text,cap,read,contract){
  if(!cap||wordCount(text)<=cap)return null;
  var returned=wordCount(text);
  var re=read==='sn'?/^S\/N RATIO: \d{1,3}%$/:read==='redflag'?/^(NO RED FLAGS|RED FLAGS FOUND: \d+)$/:contract==='critique'?null:/^RATING: \d{1,2}\/10$/;
  var lines=text.split('\n'), head=null, moved=false;
  if(re){
    for(var i=0;i<lines.length;i++){
      if(re.test(lines[i].trim())){head=lines[i].trim();moved=i>0;lines.splice(i,1);break;}
    }
  }
  var body=lines.join('\n').replace(/^\s+/,'');
  var budget=cap-(head?wordCount(head):0);
  var w=/\S+/g, n=0, end=0, m, sentenceEnd=0, sentenceWords=0;
  while(budget>0&&(m=w.exec(body))){
    n++;
    if(/[.!?]["\u201d\u2019')\]]*$/.test(m[0])&&!/^(https?:|www\.)/i.test(m[0])){sentenceEnd=w.lastIndex;sentenceWords=n;}
    if(n===budget){end=w.lastIndex;break;}
  }
  var cutAt='word';
  if(sentenceEnd&&budget-sentenceWords<=SENTENCE_CUT_WINDOW){end=sentenceEnd;cutAt='sentence';}
  var cut=body.slice(0,end).replace(/\s+$/,'');
  var out=(head?head+'\n\n':'')+cut;
  return {text:out,truncated:{at:cap,words_returned:returned,words_kept:wordCount(out),first_line_moved:moved,cut_at:cutAt}};
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

// A per-request output cap is not a rate window (measured 2026-10-24 on Groq's free tier,
// issue 56): a 429 reading "on output tokens per minute (OTPM): Limit 1000, Requested 1513"
// caps one request's expected output, so the same body sent again after a minute draws the
// same refusal. parseCapRefusal reads such a message: {kind:'output'|'total', limit,
// requested}, 'total' for the per-minute TPM shape (Groq's "Used N," between the two counts
// tolerated), null for any other text. The cure is a lower max_tokens, and the limit is the
// number to lower it to (issue 78, measured 2026-10-27 on the qwen seat): the same packet
// shape with max_tokens 2800 drew Requested 1513, 2055 and 1039 on three days, so Groq's
// count is not max_tokens scaled, and a resend lowered by the ratio limit/requested landed
// at 1294 and 2560, above the limit both times, refused both times. loweredMaxTokens returns
// the smaller of that ratio and the limit itself, each under a 5% margin, so the resend never
// asks for more than the cap allows; tokensForCap is the floor a reply under a word cap
// needs, 1.6 tokens a word plus 40 for the first line; a lowered value under that floor means
// the seat is missing with the numbers named (capRefusalReason), because no value that fits
// the cap could carry the reply. A reasoning model that spends the lowered budget on thinking
// returns a short or empty reply, which the checker marks as a failed read; that is the next
// measurement, not a rule here.
var CAP_REFUSAL=/on (output )?tokens per minute \((O?TPM)\): Limit (\d+),(?: Used \d+,)? Requested (\d+)/i;
var TOKENS_PER_WORD=1.6, FIRST_LINE_TOKENS=40, CAP_MARGIN=0.95;
function parseCapRefusal(message){
  var m=CAP_REFUSAL.exec(String(message||''));
  if(!m)return null;
  return {kind:/^o/i.test(m[2])?'output':'total',limit:parseInt(m[3],10),requested:parseInt(m[4],10)};
}
function tokensForCap(capWords){ return Math.ceil(capWords*TOKENS_PER_WORD)+FIRST_LINE_TOKENS; }
function loweredMaxTokens(maxTokens,limit,requested){ return Math.min(Math.floor(maxTokens*limit/requested*CAP_MARGIN),Math.floor(limit*CAP_MARGIN)); }
function capRefusalReason(providerName,limit,capWords,needed){
  return providerName+' allows '+limit.toLocaleString()+' output tokens per request on this model\'s tier; '+(capWords?'a '+capWords+'-word reply needs about '+needed.toLocaleString():'a reply needs at least '+needed.toLocaleString())+'; the seat is missing this round (a paid tier, or a smaller cap)';
}

// The id scrub (issue 58, measured 2026-10-24): a provider's error text can name the account the
// key belongs to (Groq's "in organization `org_…`"), and the add-on used to copy that prose as it
// stood into the crew.failed line, the tool result and a crew_list reason. scrubIds runs over
// every provider or thrown message before it reaches a log line, a tool result or stderr. It
// replaces an account-id token, one of org, user, proj, acct, team or key, an underscore and six
// or more letters or digits, with <kind>_[redacted]; the hyphenated form OpenAI's ids take
// (org-…, user-…) the same way, but only when the tail carries a digit, so an English compound
// (user-friendly, org-wide, team-level) stands; and a key-shaped string, sk, gsk, xai or pplx
// followed by a separator and twelve or more key characters, with [key redacted]. The numbers a
// cap refusal carries (Limit, Requested) are untouched, so parseCapRefusal still reads them.
// Named limit: a key with no prefix (Gemini's, Mistral's) is not key-shaped by this rule.
var ID_UNDERSCORE=/\b(org|user|proj|acct|team|key)_[A-Za-z0-9]{6,}\b/g;
var ID_HYPHEN=/\b(org|user|proj|acct|team|key)-(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{6,}\b/g;
var KEY_SHAPE=/\b(sk|gsk|xai|pplx)[-_][A-Za-z0-9_-]{12,}/g;
function scrubIds(text){
  return String(text===undefined||text===null?'':text).replace(KEY_SHAPE,'[key redacted]').replace(ID_UNDERSCORE,'$1_[redacted]').replace(ID_HYPHEN,'$1-[redacted]');
}

module.exports={readText:readText,appendLog:appendLog,readLog:readLog,readSeats:readSeats,writeSeats:writeSeats,
  loadProviders:loadProviders,keyFor:keyFor,keyShape:keyShape,keyHint:keyHint,keyNext:keyNext,keyField:keyField,keyFilePath:keyFilePath,keyFileShown:keyFileShown,readKeyFile:readKeyFile,KEY_FILE:KEY_FILE,CONFIGURE_COMMAND:CONFIGURE_COMMAND,CAUSES:CAUSES,request:request,vendorOf:vendorOf,makerOf:makerOf,sizeOf:sizeOf,
  eligibleCatalog:eligibleCatalog,resolveSeat:resolveSeat,estimateTokens:estimateTokens,budgetFor:budgetFor,makeWindow:makeWindow,
  parseCapRefusal:parseCapRefusal,tokensForCap:tokensForCap,loweredMaxTokens:loweredMaxTokens,capRefusalReason:capRefusalReason,TOKENS_PER_WORD:TOKENS_PER_WORD,FIRST_LINE_TOKENS:FIRST_LINE_TOKENS,CAP_MARGIN:CAP_MARGIN,scrubIds:scrubIds,
  NO_RATING_LINE:NO_RATING_LINE,packetRules:packetRules,wordCount:wordCount,RETRY_TARGET_RATIO:RETRY_TARGET_RATIO,retryTarget:retryTarget,SENTENCE_CUT_WINDOW:SENTENCE_CUT_WINDOW,truncateAnswer:truncateAnswer};
