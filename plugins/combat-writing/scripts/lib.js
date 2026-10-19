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
//                              and checked
//     record.md                the rendered record, rebuilt by render-record.js after every round
//     rounds/<nn>-<kind>/      one folder per round, nn two digits, kind a word (sparring, debate, battle, final)
//       <seat>.question.md     the focus question or navigation note for that seat, when given
//       <seat>.packet.md       what the seat was sent, built by packet.js from files only
//       <seat>.answer.md       what the seat wrote; its first line is the rating line
//       <seat>.sn.packet.md / <seat>.sn.answer.md             the final mode's S/N read
//       <seat>.redflag.packet.md / <seat>.redflag.answer.md   the final mode's red-flag read
//
// No file in the run carries the credit line (ruled 2026-10-12): it stands once, at the foot of
// the help guide. A seat's answer is the seat's writing and opens with its contract's first line.

var fs=require('fs'), path=require('path'), crypto=require('crypto');

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
// A battle round on a run nothing has read (2026-10-14: the order of the stages is the person's
// choice): there is no other seat's answer to share and, without `rerate`, no rating to ask for.
var DEFAULT_FIRST_CRITIQUE_PROMPT='Read this rough draft. Give your critique of its structure and content, with specific evidence from it.';
var FIRST_ROUND_LINE='This is the first round of the run: no seat has read the draft yet, so no other seat\'s answer is carried. Answer on the draft alone.';
// Fewer seats than the person expects (ruled 2026-10-13): every result names the reason and the
// exact next command. Three states. The host records `absent` and `down` with crew-state.js (no
// add-on tool is there to do it); the add-on records the third, running with no key, in the
// crew.registered log line it writes, naming the key field to fill. crewStateLines renders
// whichever the log holds, and the record, the board and the short form print it under the crew line.
var ADDON_INSTALL='/plugin install combat-writing-crew --marketplace LearningProducers/CombatWriting-Plugin';
var ADDON_CONFIGURE='/plugin configure combat-writing-crew';
var ADDON_STATE={
  absent:'The crew add-on is not installed, so the crew is one seat. Next: '+ADDON_INSTALL+', then /reload-plugins or a new session, then '+ADDON_CONFIGURE+' to enter a key.',
  down:'The crew add-on is installed but its server is not running in this session (no crew_list tool), so the crew is one seat. Next: /mcp, find combat-writing-crew: if it shows failed or disconnected, reconnect it there and run the command again; if it is not listed, /plugin to check the add-on is enabled, then /reload-plugins.'
};

// The commands, for the lines the record prints (the plugin is `cw`; the commands are /cw:<name>).
var CMD={strategy:'/cw:strategy',sparring:'/cw:sparring',battle:'/cw:battle',help:'/cw:help'};

// Where the run started (2026-10-14: any stage may be skipped, the order is the person's choice).
// new-run.js logs the stage whose command made the run in run.created; the line names it, what
// was stored first, and the first round, so the record and the board say where the run began.
// The caller adds the label ("Started at:").
function startedAtLine(runDir,log,rounds){
  log=log||readLog(runDir); rounds=rounds||listRounds(runDir);
  var created=null, firstDraft=null; log.forEach(function(e){ if(e.event==='run.created'&&!created)created=e; if(e.event==='draft.added'&&e.first&&!firstDraft)firstDraft=e; });
  var stage=created&&created.stage?created.stage:null;
  var s;
  if(stage==='strategy')s='strategy: '+(created.draft?'the draft and '+(created.brief?'the brief':'no brief')+' stored first':'the brief stored first, the draft brought later by '+(firstDraft&&firstDraft.stage?firstDraft.stage:'sparring or battle'));
  else if(stage)s=stage+': the run was made from a pasted draft, with no strategy stage'+(created.brief?' (a brief came with it)':'');
  else s='a stage not recorded (the run was made before the stage was logged)';
  var first=rounds.length?rounds[0]:null;
  s+='. '+(first?'First round: '+first+(roundKind(first)==='battle'?' (battle before sparring)':'')+'.':'No round yet.');
  return s;
}

// The text Next line (2026-10-14): what the person can type after a round. The record keeps it;
// the short form prints it so the host has it for the picker's "Done for now". One line.
function nextLine(seats){
  var one=seats.length<2;
  var s='Next: '+CMD.battle+' fq: <question> (FQ, the same question to every seat, nothing shared) · n: <guidance> (N, the same new guidance to every seat individually) · sn: <prompt> (SN, each seat\'s synthesis shared with the others plus your new prompt) · sfq: <question> (SFQ, the crew\'s answers shared plus a new question) · seat-2: <note> (one seat only) · add rerate to any of them for a new rating · draft: <path> for a revised draft · final for the S/N ratio and red-flag reads on the draft alone · '+CMD.sparring+' debate (the seats read each other and rate again).';
  if(one)s+=' With one seat, SN, SFQ and debate have no other seat to share: use fq: or n:, or seat the add-on.';
  return s;
}

// The line a packet carries when the round asks for no rating; the checker and the add-on read it.
var NO_RATING_LINE='No rating this round: do not write a RATING line. Open with your critique.';

// Every packet carries this line, hardwired, in its Contract section (the founder's words,
// 2026-10-14): a seat that thinks out loud in its answer is the wall of text the person reads.
var SIGNAL_LINE='Do not be verbose. Do not ramble. Only high signal-to-noise responses, no cosplay explanations, no thinking out loud in the answer.';
// The verdict sentence (2026-10-14): the first sentence after the first line is the seat's
// verdict on the draft, the line the board frames. The packet says so in these words.
var VERDICT_SENTENCE_LINE='Your first sentence after it is your verdict on the draft, in one line.';
var VERDICT_SENTENCE_LINE_CRITIQUE='Your first sentence is your verdict on the draft, in one line.';

// The scoreboard legend, one paragraph: record.md carries it, and the short form prints it
// once per run (2026-10-14), the first time it prints, never again in that run.
var SCOREBOARD_LEGEND='Every number is one seat\'s own. Nothing here is averaged. A flip shows the earlier number beside the new one; INVALID means the quote the seat gave does not match the seat it named. Missing means the seat gave no answer in that round. Not asked means the round was put to other seats only. Critique means the round asked for no rating (a battle round rates only on `rerate`). Failed read means the answer broke the contract it was sent, the rating line, the cap, or a number that contradicts the verdict. Truncated means the seat\'s second overrun was cut at the cap, at the last sentence end before it, with its first line kept. The bar is the seat\'s latest rating.';
var BOARD_FILE='board.html';

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
// The crew (ruled 2026-10-09, enforced 2026-10-12): one fresh reader plus one seat per outside
// model the add-on registers, never padded. A fresh reader is a seat with no provider field;
// the first one in seats.json is the crew's. isPaddedSeat says whether a seat is a second fresh
// reader, which packet.js refuses to seat in any round.
function isFreshReader(seat){ return !seat.provider; }
function isPaddedSeat(seats,seat){
  var first=seats.filter(isFreshReader)[0];
  return isFreshReader(seat)&&!!first&&first.id!==seat.id;
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

// The Seats lines for a run: why the crew has fewer seats than the person expects, with the next
// command, from the latest addon.state or crew.registered line in the log. Empty when nothing
// is missing. With no outside seat and nothing recorded, the line says so and points at the help.
function crewStateLines(runDir,seats,log){
  log=log||readLog(runDir);
  var outside=seats.filter(function(s){return !!s.provider;}).length;
  var last=null;
  log.forEach(function(e){ if(e.event==='addon.state'||e.event==='crew.registered')last=e; });
  var lines=[];
  if(last&&last.event==='crew.registered'){
    var un=last.unavailable||[];
    var noKey=un.filter(function(u){return /^no key/.test(u.reason||'');});
    var failed=un.filter(function(u){return !/^(no key|off:|not built)/.test(u.reason||'');});
    if(!outside&&noKey.length){
      var fields=[]; noKey.forEach(function(u){ var f=u.field||'the key field'; if(fields.indexOf(f)<0)fields.push(f); });
      var named=noKey.filter(function(u){return u.field;}).map(function(u){return u.field+' ('+(u.field_title||u.provider_name||u.provider)+')';}).filter(function(v,i,a){return a.indexOf(v)===i;});
      lines.push('The crew add-on is running and no provider has a key, so the crew is one seat: a key was never entered, or an update dropped it (the host rebuilt its credentials store). Next: '+(noKey[0].next||ADDON_CONFIGURE)+', type the key into a key field and save: '+(named.length?named.join(', '):fields.join(', '))+'; a save with nothing typed says No configuration changes and keeps nothing; a free Groq key seats two. Or set the provider\'s environment variable when the prompt is empty.');
    }
    failed.forEach(function(u){
      lines.push('Not seated: '+(u.provider_name||u.provider)+(u.family?' ('+u.family+')':'')+': '+u.reason+'. Next: run the command again; if it repeats, '+(u.next||ADDON_CONFIGURE)+' to check the '+(u.field||'key')+' field.');
    });
  }else if(last&&last.event==='addon.state'&&!outside){
    lines.push(ADDON_STATE[last.state]||('The add-on state recorded, '+last.state+', is not one the record knows.'));
  }else if(!outside){
    lines.push('No outside seat, and the add-on\'s state was not recorded in this run. Next: '+CMD.help+' crew for the three states and the command for each.');
  }
  return lines;
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

// The round's task (2026-10-15: the board and the record show the round's prompt): what the
// round asked every seat, read from the round's first packet, which is what the seats were
// sent, so one source serves runs built before anything about the task was logged. Returns
// {kind, text, contract, rerate, first_round}: kind is SN, SFQ, N or FQ with the person's text;
// 'seat' for a round of seat lines alone (each seat's line is its own <seat>.question.md);
// 'cold' for the cold read; 'final' for the final reads; 'plain' with the default prompt the
// packet sent. A round with no packet at all is 'plain' with no text.
var TASK_LABELS=[['SFQ','Synthesis focus question (SFQ): '],['SN','Synthesis navigation (SN): '],['N','Navigation (N): '],['FQ','Focus question (FQ): ']];
function roundTask(runDir,round,log){
  log=log||readLog(runDir);
  var contract=roundContract(runDir,round,log);
  if(isFinalRound(round))return {kind:'final',text:null,contract:'final',rerate:false,first_round:false};
  var line=null; for(var i=0;i<log.length;i++){ var e=log[i]; if(e.event==='packet.built'&&e.round===round){line=e;break;} }
  var dir=path.join(runDir,'rounds',round);
  var file=line&&line.file?path.join(runDir,line.file):null;
  if(!file||!fs.existsSync(file)){
    var names=fs.existsSync(dir)?fs.readdirSync(dir).filter(function(n){return /^[^.]+\.packet\.md$/.test(n);}).sort():[];
    file=names.length?path.join(dir,names[0]):null;
  }
  var packet=file?readText(file):'';
  var m=/## Your task\n\n([\s\S]*?)\n## Contract/.exec(packet);
  var task=m?m[1].trim():'';
  var out={kind:'plain',text:null,contract:contract,rerate:line?!!line.rerate:contract==='rating',first_round:line?!!line.first_round:false};
  for(var j=0;j<TASK_LABELS.length;j++){
    var lab=TASK_LABELS[j][1];
    if(task.indexOf(lab)===0){ out.kind=TASK_LABELS[j][0]; out.text=task.slice(lab.length).split(/\n\s*\n/)[0].trim(); return out; }
  }
  var mode=line?line.mode:null;
  if(mode==='cold'||/^This is the cold read:/m.test(packet))out.kind='cold';
  else if(mode==='seat')out.kind='seat';
  else if(task)out.text=task.split(/\n\s*\n/)[0].trim();
  return out;
}
// One phrase for the task, for the round strip, the record and the round history:
// `SN: “text”`, `seat lines`, `cold read, the draft alone`, `final reads: S/N ratio and red
// flags`, or `the default prompt: “text”`.
function taskLine(task){
  if(task.kind==='final')return 'final reads: S/N ratio and red flags';
  if(task.kind==='seat')return 'seat lines';
  if(task.kind==='cold')return 'cold read, the draft alone';
  if(task.kind==='plain')return task.text?'the default prompt: “'+task.text+'”':'no task recorded';
  return task.kind+': “'+task.text+'”';
}
// What the round asked for, in three words: no rating, a new rating, or a rating.
function ratingLine(task,round){
  if(task.contract==='final')return '';
  if(task.contract==='critique')return 'no rating asked';
  return task.rerate&&roundKind(round)==='battle'?'a new rating asked':'a rating asked';
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

// The draft's counts (2026-10-15, Part 22): words, lines and paragraphs, measured by code from the
// text as stored. A paragraph is a block separated by a blank line; a single newline inside one
// is a line, not a paragraph, so a paste whose breaks were lost shows as one paragraph of one line.
// draftFactsLine prints them; oneLineWarning says so when a long draft arrived as one line, before
// any seat reads it (the inbox paste, the earliest record, already held it that way on the run of
// 2026-10-15, so the warning is the guard).
// Part 21 (ruled 2026-10-15, no claims checker): the same counter also measures what the seats
// misread on the run of 2026-10-15, and every packet carries the result as facts, not a verdict:
//   sentences: an end mark (. ! ?) followed by a space or a line end ends a sentence; a line with
//     no end mark is not a sentence; addresses are taken out before counting. The count is exact
//     (sentences_exact true) when the text holds no abbreviation or decimal the rule miscounts
//     ("Dr.", "e.g.", "U.S.", "3.5"); else it is given as "about N" with that reason.
//   em_dashes (U+2014), en_dashes (U+2013), double_hyphens (" -- " or "--" inside a line).
//   links: each address with its paragraph and line number, whether it stands alone on its line,
//     whether it is the last thing in the draft, and whether it sits inside a sentence (text
//     follows it on its line or an end mark closes it); the address itself is never in the facts,
//     so no draft text leaves the fence.
var URL_RE=/\bhttps?:\/\/[^\s<>()"']+|\bwww\.[^\s<>()"']+/gi;
var ABBREV_RE=/\b(?:[A-Z][a-z]{0,3}|[A-Za-z]|e\.g|i\.e|etc|vs|cf|No|St|Mr|Mrs|Ms|Dr|Prof|Jr|Sr|Inc|Ltd|Co|Corp|Fig|approx|dept)\.(?=\s+[a-z0-9]|\s*[A-Z]\.|$)|\b[A-Z](?:\.[A-Z])+\.|\d\.\d/m;
function draftFacts(text){
  var src=String(text||'').replace(/\r\n/g,'\n').replace(/^\uFEFF/,'').replace(/\s+$/,'');
  var rawLines=src?src.split('\n'):[];
  var lines=rawLines.filter(function(l){return l.trim()!=='';}).length;
  var blocks=src?src.split(/\n\s*\n/).filter(function(b){return b.trim()!=='';}):[];
  var paragraphs=blocks.length;
  // Links, by position; the address is dropped from the text before sentences are counted.
  var links=[], lineNo=0, paraNo=0, lastNonBlank=-1;
  rawLines.forEach(function(l,i){ if(l.trim()!=='')lastNonBlank=i; });
  var prevBlank=true;
  rawLines.forEach(function(l,i){
    var blank=l.trim()==='';
    if(!blank){ lineNo++; if(prevBlank)paraNo++; }
    prevBlank=blank;
    var m, re=new RegExp(URL_RE.source,'gi');
    while((m=re.exec(l))){
      var before=l.slice(0,m.index).trim(), after=l.slice(m.index+m[0].length).trim();
      var alone=before===''&&(after===''||/^[.,;:!?)]+$/.test(after));
      links.push({paragraph:paraNo,line:lineNo,alone_on_line:alone,last_in_draft:i===lastNonBlank&&(after===''||/^[.,;:!?)]+$/.test(after)),in_sentence:!alone||/^[.!?]/.test(after)});
    }
  });
  var stripped=src.replace(new RegExp(URL_RE.source,'gi'),'LINK');
  var sentences=0;
  stripped.split('\n').forEach(function(l){
    var ms=l.match(/[.!?]+["\u201d\u2019')\]]*(?=\s|$)/g);
    sentences+=ms?ms.length:0;
  });
  var exact=!ABBREV_RE.test(stripped);
  var em=(src.match(/\u2014/g)||[]).length, en=(src.match(/\u2013/g)||[]).length, dh=(src.match(/--/g)||[]).length;
  return {words:wordCount(src),lines:lines,paragraphs:paragraphs,sentences:sentences,sentences_exact:exact,em_dashes:em,en_dashes:en,double_hyphens:dh,links:links};
}
// The facts in one line, for the packet, the record and the board: counts, dashes, and each
// link by position. No draft text.
function draftFactsFull(f){
  var parts=[draftFactsLine(f)];
  parts.push((f.sentences_exact?'':'about ')+f.sentences+' sentence'+(f.sentences===1?'':'s')+(f.sentences_exact?'':' (the rule may miscount abbreviations or decimals)'));
  parts.push(f.em_dashes+' em dash'+(f.em_dashes===1?'':'es')+', '+f.en_dashes+' en dash'+(f.en_dashes===1?'':'es')+', '+f.double_hyphens+' double hyphen'+(f.double_hyphens===1?'':'s'));
  if(!f.links.length)parts.push('no link');
  else parts.push(f.links.length+' link'+(f.links.length===1?'':'s')+': '+f.links.map(function(k,i){
    return 'link '+(i+1)+' in paragraph '+k.paragraph+', line '+k.line+(k.alone_on_line?', alone on its line':', inside a sentence')+(k.last_in_draft?', the last thing in the draft':'');
  }).join('; '));
  return parts.join(' · ');
}
var FACTS_HEADING='Measured by code (facts, not a judgment)';
function draftFactsLine(f){
  return f.words+' word'+(f.words===1?'':'s')+' · '+f.paragraphs+' paragraph'+(f.paragraphs===1?'':'s')+' · '+f.lines+' line'+(f.lines===1?'':'s');
}
var ONE_LINE_WORDS=60;
function oneLineWarning(f){
  if(f.lines===1&&f.words>ONE_LINE_WORDS)return 'The draft arrived as one line of '+f.words+' words; if it had paragraph breaks, paste it again.';
  return null;
}

// The retry target (ruled 2026-10-15): a seat sent back over the cap is asked for a target well
// under it, 80% (400 of 500, 480 of 600, 200 of 250), so the second answer has room; the cap
// itself still holds. The add-on mirrors retryTarget word for word; crew_check.js pins the two equal.
var RETRY_TARGET_RATIO=0.8;
function retryTarget(cap){ return Math.floor(cap*RETRY_TARGET_RATIO); }

// The cut (ruled 2026-10-09 for an outside seat, 2026-10-15 for every seat): on a seat's second
// overrun, the read is truncated at the cap, marked, and its rating kept. The contract's first
// line (RATING: X/10 for a rating read, the S/N or red-flag line for a final read) is pulled out
// of the reply wherever it sits before the cut, so it survives even when the seat put it last;
// the rest is cut at the last sentence end at or before the cap when one falls within the last
// SENTENCE_CUT_WINDOW words, else at the word, so that the whole file counts no more than the
// cap. A critique read has no such line; it is cut at the cap as it stands. Returns null when
// the reply is within the cap. The add-on mirrors this function word for word (it never reaches
// into the listed plugin's folder); crew_check.js pins the two equal.
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

// The verdict in an answer (2026-10-14): a seat's number and its words must agree. 8 to 10 is a
// working document, 1 to 6 a problem document (the seat's own rule); an 8 to 10 that says the
// draft is not send-ready, or a 1 to 6 that says it ships as it is, is a failed read, and the
// seat is sent back once with the reason, like an overrun. The phrases are these and no others;
// the first one found, in reading order, is the verdict. A "ready" phrase with a negation in
// the same clause before it ("is not ready to send") reads as not ready; one in a conditional
// clause ("to make this ready to send", "until it is send-ready") is no verdict at all.
var NOT_READY_RE=/\b(?:not|isn[’']t|never|nowhere near)\s+(?:yet\s+)?send[- ]ready\b|\bnot\s+(?:yet\s+)?ready\s+(?:to\s+(?:send|ship|publish|go)|as\s+(?:it\s+)?is)\b|\b(?:do\s+not|don[’']t)\s+(?:send|ship|publish)\b|\bback\s+to\s+the\s+drawing\s+board\b/i;
var READY_RE=/\bships?\s+as[- ](?:it\s+)?is\b|\b(?:send|ship|publish)\s+(?:it\s+)?as[- ](?:it\s+)?is\b|\bready\s+to\s+(?:send|ship|publish)\b|\b(?:is|it[’']s|is\s+now|now)\s+send[- ]ready\b|\bsend[- ]ready\s+as[- ](?:it\s+)?is\b|\bships\s+(?:today|now)\b/i;
var NEGATION_RE=/\b(?:not|n[’']t|never|nor|far\s+from|hardly|without|isn[’']t|aren[’']t|wasn[’']t)\b|n[’']t\b/i;
var CONDITIONAL_RE=/\b(?:make|makes|making|made|until|before|once|if|unless|would\s+be|to\s+be|to\s+get|get|gets|become|becomes|becoming|so\s+(?:that\s+)?it|needs?\s+to\s+be|should\s+be|could\s+be|must\s+be|what\s+would)\b/i;
function verdictPhrases(text){
  var found=[];
  var flat=String(text||'').replace(/\s+/g,' ');
  function clauseBefore(idx){
    var start=idx;
    while(start>0&&!/[.!?;:\n]/.test(flat[start-1]))start--;
    return flat.slice(Math.max(start,idx-60),idx);
  }
  var re=new RegExp(NOT_READY_RE.source+'|'+READY_RE.source,'gi'), m;
  while((m=re.exec(flat))){
    var phrase=m[0];
    var notReady=NOT_READY_RE.test(phrase);
    NOT_READY_RE.lastIndex=0;
    var before=clauseBefore(m.index);
    if(!notReady){
      if(NEGATION_RE.test(before))notReady=true;
      else if(CONDITIONAL_RE.test(before))continue;
    }
    found.push({verdict:notReady?'not-ready':'ready',phrase:phrase,index:m.index});
  }
  return found;
}
function verdictOf(text){ var f=verdictPhrases(text); return f.length?f[0]:null; }

// HTML escaping for the board: every seat's words and every draft are text, never markup.
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
// A markdown subset for a seat's read on the board (2026-10-15: outside seats write markdown
// and it printed raw). Escaped first, then only: paragraphs (blank-line separated; a single
// newline inside one is a line break), bullet lines (* - •) and numbered lines (1. or 1))
// grouped into lists, **bold**, __bold__, *italic*, `code`, and a # heading line as a bold
// paragraph. No link is rendered (an address stays text, so the page keeps its one href), no
// image, no raw HTML, nothing else. The draft itself is not run through this: it is the
// author's text as pasted.
function renderLite(text){
  function inline(l){
    var e=escapeHtml(l);
    e=e.replace(/`([^`\n]+)`/g,'<code>$1</code>');
    e=e.replace(/\*\*([^\n]+?)\*\*/g,'<strong>$1</strong>').replace(/__([^\n]+?)__/g,'<strong>$1</strong>');
    e=e.replace(/(^|[^*\w])\*(\S(?:[^*\n]*?\S)?)\*(?![\w*])/g,'$1<em>$2</em>');
    return e;
  }
  var src=String(text||'').replace(/\r\n/g,'\n').replace(/^﻿/,'').trim();
  if(!src)return '';
  return src.split(/\n\s*\n/).map(function(block){
    var out=[], para=[], list=null;
    function flushPara(){ if(para.length){out.push('<p>'+para.map(inline).join('<br>')+'</p>');para=[];} }
    function flushList(){ if(list){out.push('<'+list.tag+'>'+list.items.map(function(i){return '<li>'+inline(i)+'</li>';}).join('')+'</'+list.tag+'>');list=null;} }
    block.split('\n').forEach(function(line){
      var bul=/^\s*[*\-•]\s+(.*)$/.exec(line), num=/^\s*\d+[.)]\s+(.*)$/.exec(line), head=/^\s*#{1,6}\s+(.*)$/.exec(line);
      if(bul||num){ var tag=num?'ol':'ul'; flushPara(); if(list&&list.tag!==tag)flushList(); if(!list)list={tag:tag,items:[]}; list.items.push((bul||num)[1]); return; }
      flushList();
      if(head){ flushPara(); out.push('<p><strong>'+inline(head[1])+'</strong></p>'); return; }
      para.push(line);
    });
    flushPara(); flushList();
    return out.join('');
  }).join('');
}

// The one-line verdict the board frames: the first sentence or two of the answer after its
// first line (the whole answer under the critique contract), cut at a sentence end before
// 200 characters, else at a word with an ellipsis. Markdown list and heading marks are dropped.
var VERDICT_MAX=200;
function verdictLine(text,contract){
  var lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/);
  var body=lines.slice(contract==='critique'?0:1);
  var para='';
  for(var i=0;i<body.length;i++){
    var l=body[i].replace(/^[\s#>*\-]+/,'').trim();
    if(!l){ if(para)break; else continue; }
    para+=(para?' ':'')+l;
  }
  para=para.replace(/\*\*|__|`/g,'').replace(/(^|[^*\w])\*(\S(?:[^*\n]*?\S)?)\*(?![\w*])/g,'$1$2').replace(/\s+/g,' ').trim();
  if(para.length<=VERDICT_MAX)return para;
  var head=para.slice(0,VERDICT_MAX+1);
  var cut=Math.max(head.lastIndexOf('. '),head.lastIndexOf('! '),head.lastIndexOf('? '),head.lastIndexOf('." '),head.lastIndexOf('.” '));
  if(cut>=40)return para.slice(0,cut+1).replace(/[”"]$/,'').replace(/\.$/,'.');
  var sp=head.lastIndexOf(' ');
  return para.slice(0,sp>40?sp:VERDICT_MAX).replace(/[\s,;:]+$/,'')+'…';
}

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
      else{
        var v=verdictOf(lines.slice(1).join('\n'));
        if(v&&rating>=8&&v.verdict==='not-ready')reasons.push('rating '+rating+'/10 calls the draft a working document (8 to 10), but the answer says "'+v.phrase+'"; make the number and the verdict agree');
        if(v&&rating<=6&&v.verdict==='ready')reasons.push('rating '+rating+'/10 calls the draft a problem document (1 to 6), but the answer says "'+v.phrase+'"; make the number and the verdict agree');
      }
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
  // The cap reason names the retry target (ruled 2026-10-15); it reaches a fresh reader in its retry
  // task and an outside seat in its retry note, so both get the same number from this one line.
  if(words>cap)reasons.push(words+' words, over the cap of '+cap+'; write it again under '+retryTarget(cap)+' words, counting them; a second answer over '+cap+' is cut at the last sentence before '+cap);
  return {ok:reasons.length===0,contract:contract,rating:rating,value:value,words:words,reasons:reasons};
}

// The record's line for a cut read, for either cutter: the checker (a fresh reader, 2026-10-15)
// or the crew add-on (an outside seat, 2026-10-09). `t` is the truncated object a log line carries.
function truncationLine(t){
  return 'Truncated at '+t.at+' words by '+(t.by==='checker'?'the checker':'the crew add-on')+' on the seat\'s second overrun; the seat returned '+t.words_returned+' words'+(t.cut_at==='sentence'?'; cut at the last sentence end before the cap':'')+(t.first_line_moved?'; its first line was found lower in the reply and moved to the top':'')+'.';
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
  RUNS_DIR:RUNS_DIR,DEFAULT_WORD_CAP:DEFAULT_WORD_CAP,DEFAULT_SYNTHESIS_WORD_CAP:DEFAULT_SYNTHESIS_WORD_CAP,
  DEFAULT_FINAL_WORD_CAP:DEFAULT_FINAL_WORD_CAP,DEFAULT_COMPANY:DEFAULT_COMPANY,MODEL_UNREPORTED:MODEL_UNREPORTED,
  SN_PROMPT:SN_PROMPT,REDFLAG_PROMPT:REDFLAG_PROMPT,DEFAULT_READ_PROMPT:DEFAULT_READ_PROMPT,DEFAULT_SYNTHESIS_PROMPT:DEFAULT_SYNTHESIS_PROMPT,
  DEFAULT_SYNTHESIS_RERATE_PROMPT:DEFAULT_SYNTHESIS_RERATE_PROMPT,DEFAULT_FIRST_CRITIQUE_PROMPT:DEFAULT_FIRST_CRITIQUE_PROMPT,FIRST_ROUND_LINE:FIRST_ROUND_LINE,CMD:CMD,startedAtLine:startedAtLine,nextLine:nextLine,NO_RATING_LINE:NO_RATING_LINE,
  SIGNAL_LINE:SIGNAL_LINE,VERDICT_SENTENCE_LINE:VERDICT_SENTENCE_LINE,VERDICT_SENTENCE_LINE_CRITIQUE:VERDICT_SENTENCE_LINE_CRITIQUE,SCOREBOARD_LEGEND:SCOREBOARD_LEGEND,BOARD_FILE:BOARD_FILE,verdictPhrases:verdictPhrases,verdictOf:verdictOf,verdictLine:verdictLine,escapeHtml:escapeHtml,renderLite:renderLite,ADDON_INSTALL:ADDON_INSTALL,ADDON_CONFIGURE:ADDON_CONFIGURE,ADDON_STATE:ADDON_STATE,crewStateLines:crewStateLines,
  parseArgs:parseArgs,die:die,sha256:sha256,readText:readText,appendLog:appendLog,readLog:readLog,readSeats:readSeats,isFreshReader:isFreshReader,isPaddedSeat:isPaddedSeat,seatLabel:seatLabel,seatShortName:seatShortName,seatKey:seatKey,askedIn:askedIn,wasAsked:wasAsked,nameSources:nameSources,
  listDrafts:listDrafts,latestDraft:latestDraft,listRounds:listRounds,roundKind:roundKind,isFinalRound:isFinalRound,previousRound:previousRound,
  capSent:capSent,contractSent:contractSent,roundContract:roundContract,roundTask:roundTask,taskLine:taskLine,ratingLine:ratingLine,roundAnswers:roundAnswers,latestOwnAnswer:latestOwnAnswer,latestOwnRating:latestOwnRating,flipInputs:flipInputs,wordCount:wordCount,draftFacts:draftFacts,draftFactsLine:draftFactsLine,draftFactsFull:draftFactsFull,FACTS_HEADING:FACTS_HEADING,oneLineWarning:oneLineWarning,ONE_LINE_WORDS:ONE_LINE_WORDS,RETRY_TARGET_RATIO:RETRY_TARGET_RATIO,retryTarget:retryTarget,SENTENCE_CUT_WINDOW:SENTENCE_CUT_WINDOW,truncateAnswer:truncateAnswer,truncationLine:truncationLine,contractOf:contractOf,parseRating:parseRating,checkAnswer:checkAnswer,
  normalizeQuote:normalizeQuote,attributedQuotes:attributedQuotes,checkFlip:checkFlip
};
