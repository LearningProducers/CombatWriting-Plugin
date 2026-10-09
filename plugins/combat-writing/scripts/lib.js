// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// lib.js: what the Combat Writing scripts share. Plain Node, no dependencies.
//
// The run folder (created by new-run.js, in the person's project, never in the plugin):
//   <root>/combat-writing/runs/<run-id>/
//     draft.md                 the draft snapshot, copied once, never changed
//     draft-2.md, draft-3.md   revised drafts added later by add-draft.js; the newest is the default
//     brief.md                 the context brief, when the person gave one
//     seats.json               the crew: id, model, company, and where the name came from
//     log.jsonl                one JSON object per line, timestamped; the source of truth for what was sent
//                              and checked; the first line opens with the credit line
//     record.md                the rendered record, rebuilt by render-record.js after every round
//     rounds/<nn>-<kind>/      one folder per round, nn two digits, kind a word (sparring, debate, battle, final)
//       <seat>.question.md     the focus question or navigation note for that seat, when given
//       <seat>.packet.md       what the seat was sent, built by packet.js from files only
//       <seat>.answer.md       what the seat wrote; its first line is the rating line
//       <seat>.sn.packet.md / <seat>.sn.answer.md             the final mode's S/N read
//       <seat>.redflag.packet.md / <seat>.redflag.answer.md   the final mode's red-flag read
//
// Every record the plugin writes opens with the credit line. A seat's answer is the seat's
// writing and opens with its contract's first line instead.

var fs=require('fs'), path=require('path'), crypto=require('crypto');

var CREDIT='Combat Writing — Learning Producers Inc., Israel Hernandez, founder';
var RUNS_DIR=path.join('combat-writing','runs');
var DEFAULT_WORD_CAP=500;            // a read with no other seats' answers
var DEFAULT_SYNTHESIS_WORD_CAP=600;  // a read that quotes other seats
var DEFAULT_FINAL_WORD_CAP=250;      // the S/N and red-flag reads (the app's S/N prompt says under 250)
var DEFAULT_COMPANY='Anthropic';
var MODEL_UNREPORTED='model unreported';

// The app's two final prompts, verbatim (Battle, step 14).
var SN_PROMPT='Evaluate the signal-to-noise ratio of this final draft. Your first line must be: S/N RATIO: XX%';
var REDFLAG_PROMPT='Check this final draft for red flags. Your first line must be exactly: NO RED FLAGS or RED FLAGS FOUND: X';
var DEFAULT_READ_PROMPT='Read this rough draft and rate it on a scale from 1–10, you cannot use 7. Explain your reasoning with evidence.';
// Battle (ruled 2026-10-09): a battle round asks for no rating unless the person asks with
// `rerate`. The synthesis prompt has one form for each case.
var DEFAULT_SYNTHESIS_PROMPT='Read the other seats\' latest answers. Where do your interpretations overlap and where do they diverge? Give a new critique of the structure and content of the draft.';
var DEFAULT_SYNTHESIS_RERATE_PROMPT='Read the other seats\' latest answers. Where do your interpretations overlap and where do they diverge? Give a new critique and a new rating of the draft.';
// The line a packet carries when the round asks for no rating; the checker and the add-on read it.
var NO_RATING_LINE='No rating this round: do not write a RATING line. Open with your critique.';

function parseArgs(argv){
  var out={_:[]};
  for(var i=0;i<argv.length;i++){
    var a=argv[i];
    if(a.indexOf('--')===0){
      var key=a.slice(2);
      if(i+1<argv.length&&argv[i+1].indexOf('--')!==0){out[key]=argv[++i];}
      else out[key]=true;
    }else out._.push(a);
  }
  return out;
}

function die(msg){ process.stderr.write('error: '+msg+'\n'); process.exit(2); }
function sha256(buf){ return crypto.createHash('sha256').update(buf).digest('hex'); }
function readText(p){ return fs.readFileSync(p,'utf8'); }

function appendLog(runDir,obj){
  var line=JSON.stringify(Object.assign({ts:new Date().toISOString()},obj));
  fs.appendFileSync(path.join(runDir,'log.jsonl'),line+'\n');
}
function readLog(runDir){
  var p=path.join(runDir,'log.jsonl');
  if(!fs.existsSync(p))return [];
  return readText(p).split('\n').filter(Boolean).map(function(l){try{return JSON.parse(l);}catch(e){return null;}}).filter(Boolean);
}

function readSeats(runDir){
  var p=path.join(runDir,'seats.json');
  if(!fs.existsSync(p))die('no seats.json in '+runDir);
  return JSON.parse(readText(p));
}

// A seat's label as it appears in every packet and every result: model and company, never anonymous.
// When the host could not tell the model, the company carries the name; no model name lives in this code.
// An outside seat (from the crew add-on) also names the provider that served it.
function seatLabel(seat){
  if(!seat.model||seat.model===MODEL_UNREPORTED)return seat.company+' model, name not reported, '+seat.id;
  return seat.model+' ('+seat.company+(seat.served_by?', served by '+seat.served_by:'')+'), '+seat.id;
}
// The seat key (ruled 2026-10-09): one line naming every seat by id and a short name, from the
// live crew, for the person to address a seat by id or short name. The short name is derived,
// never pinned: the model id without its maker prefix, cut before its first digit (an id of the
// form maker/name-120b gives "name"); an unreported model falls back to its company.
function seatShortName(seat){
  if(!seat.model||seat.model===MODEL_UNREPORTED)return seat.company;
  var id=String(seat.model).replace(/^[^\/]+\//,'');
  var m=/^[^0-9]+/.exec(id);
  var short=m?m[0].replace(/[\s._-]+$/,''):'';
  return short||id;
}
function seatKey(seats){
  return seats.map(function(s){return s.id+' '+seatShortName(s);}).join(' · ');
}

// Which seats a round was put to, from its packet.built lines. A round built by hand (no
// packet line at all) is taken as put to every seat.
function askedIn(runDir,round,log){
  log=log||readLog(runDir);
  var asked={}, any=false;
  log.forEach(function(e){ if(e.event==='packet.built'&&e.round===round){asked[e.seat]=true;any=true;} });
  return any?asked:null;
}
function wasAsked(runDir,round,seatId,log){
  var asked=askedIn(runDir,round,log);
  return !asked||!!asked[seatId];
}

// Where the seats' names come from, for the crew line: the agent configuration for fresh readers,
// the provider's API response for outside seats, or both.
function nameSources(seats){
  var fresh=seats.some(function(s){return !s.provider;}), outside=seats.some(function(s){return !!s.provider;});
  if(fresh&&outside)return 'Fresh readers are named from the agent configuration; outside seats from the model field their provider\'s API returned.';
  if(outside)return 'Seat names come from the model field each provider\'s API returned.';
  return 'Seat names come from the agent configuration, not from an API field.';
}

// Drafts in order: draft.md, draft-2.md, draft-3.md ... The last is the newest.
function listDrafts(runDir){
  return fs.readdirSync(runDir).filter(function(n){return /^draft(-\d+)?\.md$/.test(n);})
    .sort(function(a,b){return draftNumber(a)-draftNumber(b);});
}
function draftNumber(name){ var m=/^draft-(\d+)\.md$/.exec(name); return m?parseInt(m[1],10):1; }
function latestDraft(runDir){ var d=listDrafts(runDir); return d.length?d[d.length-1]:null; }

// Rounds in order: rounds/01-sparring, rounds/02-debate, ... sorted by their two-digit prefix.
function listRounds(runDir){
  var dir=path.join(runDir,'rounds');
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir).filter(function(n){return /^\d\d-[a-z][a-z0-9-]*$/.test(n)&&fs.statSync(path.join(dir,n)).isDirectory();}).sort();
}
function roundKind(round){ return round.replace(/^\d\d-/,''); }
function isFinalRound(round){ return roundKind(round)==='final'; }

// The round a synthesis packet reads: the latest round before `beforeRound` that holds
// at least one answer (rated or not). Final rounds are never read back; they rate nothing.
function previousRound(runDir,beforeRound){
  var rounds=listRounds(runDir).filter(function(r){return (!beforeRound||r<beforeRound)&&!isFinalRound(r);});
  for(var i=rounds.length-1;i>=0;i--){
    var dir=path.join(runDir,'rounds',rounds[i]);
    if(fs.readdirSync(dir).some(function(n){return /^[^.]+\.answer\.md$/.test(n);}))return rounds[i];
  }
  return null;
}
// Note: previousRound counts any answer file, sound or failed, so a round where every
// seat failed is still the round read; its packets then list every seat as a failed read.

// The packet.built log line for one answer file, if any: the round's line for that packet.
function packetLine(runDir,round,answerFile,log){
  var packetName=path.basename(answerFile).replace(/\.answer\.md$/,'.packet.md');
  var seatId=path.basename(answerFile).replace(/(\.sn|\.redflag)?\.answer\.md$/,'');
  log=log||readLog(runDir);
  for(var i=log.length-1;i>=0;i--){
    var e=log[i];
    if(e.event==='packet.built'&&e.round===round&&e.seat===seatId&&e.file==='rounds/'+round+'/'+packetName)return e;
  }
  return null;
}
function packetPathOf(runDir,round,answerFile){
  return path.join(runDir,'rounds',round,path.basename(answerFile).replace(/\.answer\.md$/,'.packet.md'));
}

// The word cap a seat was sent for one answer file: the round's packet.built log line for
// that packet, else the "Under N words." line of the packet file, else null. check-answer.js
// and roundAnswers use the same lookup, so a live check never applies a cap the seat was not sent.
function capSent(runDir,round,answerFile,log){
  var e=packetLine(runDir,round,answerFile,log);
  if(e&&typeof e.word_cap==='number')return e.word_cap;
  var packetPath=packetPathOf(runDir,round,answerFile);
  if(fs.existsSync(packetPath)){
    var m=/Under (\d+) words\./.exec(readText(packetPath));
    if(m)return parseInt(m[1],10);
  }
  return null;
}

// The first-line contract a seat was sent for one answer file (ruled 2026-10-09: a battle
// round asks for no rating unless the person asks with `rerate`): the packet.built line's
// contract, else the packet file's no-rating line, else the contract the file name implies.
// Every live check of an answer file uses this, so a seat is never held to a contract it
// was not sent.
function contractSent(runDir,round,answerFile,log){
  var e=packetLine(runDir,round,answerFile,log);
  if(e&&e.contract)return e.contract;
  var packetPath=packetPathOf(runDir,round,answerFile);
  if(fs.existsSync(packetPath)&&readText(packetPath).indexOf(NO_RATING_LINE)>=0)return 'critique';
  return contractOf(answerFile);
}

// What one round asked of its seats, from its packet.built lines: 'final', 'critique' or
// 'rating'. With no packet line, 'rating' (the fallback for a round built by hand).
function roundContract(runDir,round,log){
  if(isFinalRound(round))return 'final';
  log=log||readLog(runDir);
  for(var i=0;i<log.length;i++){
    var e=log[i];
    if(e.event==='packet.built'&&e.round===round&&e.contract)return e.contract;
  }
  return 'rating';
}

// Every seat's answer in one round: {seat, file, text, contract} when present and sound,
// {seat, missing:true} when there is no file, {seat, missing:true, notAsked:true} when the
// round was put to other seats only (ruled 2026-10-09: a round of seat lines alone goes to the
// named seats; no packet was built for this one), and {seat, missing:true, failed:true, reasons}
// when the file is there but fails the contract it was sent (contractSent): by the log's last
// check of it, or by a live check at the cap the seat was sent (capSent), falling back to the
// default cap only when neither exists. A failed read is never carried to another seat and
// never cited: nothing stands in for it.
function roundAnswers(runDir,round,seats){
  var log=readLog(runDir);
  var asked=askedIn(runDir,round,log);
  return seats.map(function(seat){
    var p=path.join(runDir,'rounds',round,seat.id+'.answer.md');
    if(!fs.existsSync(p))return {seat:seat,round:round,missing:true,notAsked:!!asked&&!asked[seat.id]};
    var text=readText(p);
    var contract=contractSent(runDir,round,p,log);
    var logged=null;
    for(var i=log.length-1;i>=0;i--){var e=log[i];if(e.event==='answer.checked'&&e.round===round&&e.seat===seat.id&&(!e.contract||e.contract===contract)){logged=e;break;}}
    var cap=logged?logged.word_cap:capSent(runDir,round,p,log);
    var check=checkAnswer(text,cap,contract);
    if(!check.ok)return {seat:seat,round:round,file:p,missing:true,failed:true,reasons:check.reasons,contract:contract};
    return {seat:seat,round:round,file:p,text:text,contract:contract,rating:check.rating};
  });
}

// The seat's own latest sound answer in any earlier non-final round, rated or not: its earlier turn.
function latestOwnAnswer(runDir,seat,beforeRound){
  var rounds=listRounds(runDir).filter(function(r){return (!beforeRound||r<beforeRound)&&!isFinalRound(r);});
  for(var i=rounds.length-1;i>=0;i--){
    var a=roundAnswers(runDir,rounds[i],[seat])[0];
    if(!a.missing)return a;
  }
  return null;
}
// The seat's own latest sound RATED answer in any earlier non-final round: the number a new
// rating is held against or flipped from.
function latestOwnRating(runDir,seat,beforeRound){
  var rounds=listRounds(runDir).filter(function(r){return (!beforeRound||r<beforeRound)&&!isFinalRound(r);});
  for(var i=rounds.length-1;i>=0;i--){
    var a=roundAnswers(runDir,rounds[i],[seat])[0];
    if(!a.missing&&a.contract==='rating')return a;
  }
  return null;
}

// What a seat's packet in `round` read, for the flip check and the record: the round it read
// (from the packet.built log line, else the previous round), the other seats' answers in that
// round, the seat's own earlier turn (from the log line, else its latest earlier answer), and
// the seat's latest earlier rating (from the log line's own_rating, else looked up), which is
// what a flip is measured from when the earlier turn carried no rating.
function flipInputs(runDir,seat,round,seats){
  var reads=null, ownRound=null, ratedRound=null, line=null;
  readLog(runDir).forEach(function(e){ if(e.event==='packet.built'&&e.round===round&&e.seat===seat.id&&e.mode!=='final-sn'&&e.mode!=='final-redflag'){line=e;reads=e.reads_round||null;ownRound=e.own_previous||null;ratedRound=e.own_rating||null;} });
  // A packet that shared no other seat (an N round) gives the flip check nothing to match:
  // the seat never saw those answers. Only a packet with no log line falls back to the previous round.
  var shared=line?line.shares!==false:true;
  if(!reads&&!line)reads=previousRound(runDir,round);
  var prevAnswers=(reads&&shared)?roundAnswers(runDir,reads,seats):[];
  var own=null;
  if(ownRound){var p=path.join(runDir,'rounds',ownRound,seat.id+'.answer.md');if(fs.existsSync(p))own={seat:seat,round:ownRound,file:p,text:readText(p)};}
  if(!own)own=latestOwnAnswer(runDir,seat,round);
  var ownRated=null;
  if(ratedRound){var q=path.join(runDir,'rounds',ratedRound,seat.id+'.answer.md');if(fs.existsSync(q)&&parseRating(readText(q))!==null)ownRated={seat:seat,round:ratedRound,file:q,text:readText(q)};}
  if(!ownRated)ownRated=latestOwnRating(runDir,seat,round);
  return {readsRound:reads,own:own,ownRated:ownRated,prevAnswers:prevAnswers};
}

function wordCount(text){ return text.split(/\s+/).filter(Boolean).length; }

// Which first-line contract an answer file is under, from its name alone. A battle answer
// in a round that asked for no rating is under the 'critique' contract instead; contractSent
// reads that from the packet, since the file name is the same.
function contractOf(file){
  var b=path.basename(file);
  if(/\.sn\.answer\.md$/.test(b))return 'sn';
  if(/\.redflag\.answer\.md$/.test(b))return 'redflag';
  return 'rating';
}

// The first line's number under the rating contract, or null. Trailing whitespace is tolerated.
function parseRating(text){
  var first=((text||'').replace(/^﻿/,'').split(/\r?\n/)[0]||'').replace(/[ \t]+$/,'');
  var m=/^RATING: (\d{1,2})\/10$/.exec(first);
  return m?parseInt(m[1],10):null;
}

// The contracts, checked on a seat's answer. Returns {ok, contract, rating, value, words, reasons}.
//   rating:   RATING: X/10, uppercase, X 1 to 10, never 7, nothing else on the line.
//   critique: a battle round that asked for no rating (ruled 2026-10-09): no RATING line
//             anywhere on the first line; the critique opens the answer.
//   sn:       S/N RATIO: XX%, XX 0 to 100, nothing else on the line. (The app's; no 7 ban.)
//   redflag:  NO RED FLAGS, or RED FLAGS FOUND: X with X 1 or more, nothing else on the line. (The app's.)
//   Trailing spaces or tabs on the first line are tolerated on every contract; trailing text is not.
function checkAnswer(text,wordCap,contract){
  contract=contract||'rating';
  var reasons=[];
  var cap=wordCap||(contract==='rating'||contract==='critique'?DEFAULT_WORD_CAP:DEFAULT_FINAL_WORD_CAP);
  var lines=text.replace(/^﻿/,'').split(/\r?\n/);
  // Trailing spaces or tabs on the first line are tolerated; trailing text is not.
  var first=(lines[0]||'').replace(/[ \t]+$/,'');
  var rating=null, value=null, m;
  if(first.trim()===''){
    reasons.push(contract==='critique'?'first line is empty; open with your critique':'first line is empty; the '+(contract==='rating'?'rating':contract==='sn'?'S/N RATIO':'red-flag')+' line must come first');
  }else if(contract==='critique'){
    if(/^\s*rating\s*:/i.test(first))reasons.push('this round asked for no rating; remove the RATING line and open with your critique');
  }else if(contract==='rating'){
    m=/^RATING: (\d{1,2})\/10$/.exec(first);
    if(!m){
      if(/^\s*rating\s*:/i.test(first))reasons.push('first line is "'+first+'", must be exactly "RATING: X/10" in uppercase with nothing else on the line');
      else reasons.push('first line is not the rating line: "'+first.slice(0,80)+'"');
    }else{
      rating=parseInt(m[1],10);
      if(rating<1||rating>10)reasons.push('rating '+rating+' is outside 1 to 10');
      else if(rating===7)reasons.push('rating is 7; 7 is forbidden, commit to 6 or 8');
    }
  }else if(contract==='sn'){
    m=/^S\/N RATIO: (\d{1,3})%$/.exec(first);
    if(!m)reasons.push('first line is "'+first.slice(0,80)+'", must be exactly "S/N RATIO: XX%" with nothing else on the line');
    else{value=parseInt(m[1],10);if(value>100)reasons.push('S/N '+value+'% is over 100');}
  }else if(contract==='redflag'){
    if(first==='NO RED FLAGS')value=0;
    else if((m=/^RED FLAGS FOUND: (\d+)$/.exec(first))){value=parseInt(m[1],10);if(value<1)reasons.push('RED FLAGS FOUND: 0 is not a count; say NO RED FLAGS');}
    else reasons.push('first line is "'+first.slice(0,80)+'", must be exactly "NO RED FLAGS" or "RED FLAGS FOUND: X"');
  }else die('unknown contract '+contract);
  var body=lines.slice(contract==='critique'?0:1).join('\n');
  if(body.trim()==='')reasons.push(contract==='critique'?'no critique':'no reasoning after the first line');
  var words=wordCount(text);
  if(words>cap)reasons.push(words+' words, over the cap of '+cap);
  return {ok:reasons.length===0,contract:contract,rating:rating,value:value,words:words,reasons:reasons};
}

// Quotes in an answer, each with the other seat it is attributed to. A quote is a span in
// straight or curly double quotes, at least three words long. It is attributed to a seat when
// the same line, or the line before it, names that seat by id ("seat-2", "seat 2" or "seat2",
// any case; "seat-12" never names seat-1) or by its model name when that name belongs to
// exactly one other seat (matched exactly). Nothing else counts as attribution.
function normalizeQuote(s){ return s.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g,' ').replace(/^[\s"'.,;:!?…-]+|[\s"'.,;:!?…-]+$/g,''); }
function seatIdPattern(id){
  var m=/^seat-(\d+)$/.exec(id);
  return m?new RegExp('\\bseat[-\\s]?'+m[1]+'\\b','i'):new RegExp('(^|[^A-Za-z0-9-])'+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^A-Za-z0-9-])');
}
function attributedQuotes(text,self,others){
  var lines=text.split(/\r?\n/), out=[];
  var modelCount={}; others.forEach(function(s){modelCount[s.model]=(modelCount[s.model]||0)+1;});
  function namedIn(line){
    return others.filter(function(s){
      if(seatIdPattern(s.id).test(line))return true;
      return s.model&&s.model!==MODEL_UNREPORTED&&modelCount[s.model]===1&&line.indexOf(s.model)>=0;
    });
  }
  var re=/["“]([^"“”]{8,}?)["”]/g, m;
  lines.forEach(function(line,i){
    while((m=re.exec(line))){
      var q=normalizeQuote(m[1]);
      if(q.split(' ').length<3)continue;
      var named=namedIn(line); if(!named.length&&i>0)named=namedIn(lines[i-1]);
      named.filter(function(s){return s.id!==self.id;}).forEach(function(s){out.push({quote:q,seat:s,line:i+1});});
    }
  });
  return out;
}

// The flip check for one seat's rating answer in one round.
//   previous: the seat's own answer in the round it read (text), or null when it has none.
//   carried:  the other seats' answers in that round (from roundAnswers), the quotes are matched against these.
// Returns {status, from, to, quote, cited, reason}. Statuses: first (no earlier answer), stand (held and says
// Stand), held (held and does not say Stand), flip-valid (changed, quote found in the cited seat's answer),
// flip-invalid (changed, no quote, misattributed, or altered), unrated (first line not a rating).
function checkFlip(text,self,previousText,carried){
  var to=parseRating(text);
  if(to===null)return {status:'unrated',from:null,to:null};
  if(!previousText)return {status:'first',from:null,to:to};
  var from=parseRating(previousText);
  if(from===null)return {status:'first',from:null,to:to};
  if(from===to){
    var stands=/\bStand\b/.test(text);
    return {status:stands?'stand':'held',from:from,to:to,reason:stands?null:'held the rating without saying Stand'};
  }
  var others=carried.filter(function(c){return c.seat.id!==self.id;}).map(function(c){return c.seat;});
  var quotes=attributedQuotes(text,self,others);
  if(!quotes.length)return {status:'flip-invalid',from:from,to:to,reason:'rating changed with no quote attributed to another seat'};
  for(var i=0;i<quotes.length;i++){
    var q=quotes[i];
    var cited=carried.filter(function(c){return c.seat.id===q.seat.id&&!c.missing;})[0];
    if(!cited)continue;
    if(normalizeQuote(cited.text).indexOf(q.quote)>=0)return {status:'flip-valid',from:from,to:to,quote:q.quote,cited:q.seat.id};
  }
  return {status:'flip-invalid',from:from,to:to,quote:quotes[0].quote,cited:quotes[0].seat.id,
    reason:'the quote attributed to '+quotes[0].seat.id+' is not in that seat\'s answer (altered or misattributed)'};
}

module.exports={
  CREDIT:CREDIT,RUNS_DIR:RUNS_DIR,DEFAULT_WORD_CAP:DEFAULT_WORD_CAP,DEFAULT_SYNTHESIS_WORD_CAP:DEFAULT_SYNTHESIS_WORD_CAP,
  DEFAULT_FINAL_WORD_CAP:DEFAULT_FINAL_WORD_CAP,DEFAULT_COMPANY:DEFAULT_COMPANY,MODEL_UNREPORTED:MODEL_UNREPORTED,
  SN_PROMPT:SN_PROMPT,REDFLAG_PROMPT:REDFLAG_PROMPT,DEFAULT_READ_PROMPT:DEFAULT_READ_PROMPT,DEFAULT_SYNTHESIS_PROMPT:DEFAULT_SYNTHESIS_PROMPT,
  DEFAULT_SYNTHESIS_RERATE_PROMPT:DEFAULT_SYNTHESIS_RERATE_PROMPT,NO_RATING_LINE:NO_RATING_LINE,
  parseArgs:parseArgs,die:die,sha256:sha256,readText:readText,appendLog:appendLog,readLog:readLog,readSeats:readSeats,seatLabel:seatLabel,seatShortName:seatShortName,seatKey:seatKey,askedIn:askedIn,wasAsked:wasAsked,nameSources:nameSources,
  listDrafts:listDrafts,latestDraft:latestDraft,listRounds:listRounds,roundKind:roundKind,isFinalRound:isFinalRound,previousRound:previousRound,
  capSent:capSent,contractSent:contractSent,roundContract:roundContract,roundAnswers:roundAnswers,latestOwnAnswer:latestOwnAnswer,latestOwnRating:latestOwnRating,flipInputs:flipInputs,wordCount:wordCount,contractOf:contractOf,parseRating:parseRating,checkAnswer:checkAnswer,
  normalizeQuote:normalizeQuote,attributedQuotes:attributedQuotes,checkFlip:checkFlip
};
