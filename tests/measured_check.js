// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// measured_check.js: the model a fresh reader ran on is measured, and every result says what was
// measured (issue 196, measured 2026-11-10 on past rounds: the model name on every result was
// the host's word, written by new-run.js from what the host said, and nothing in the run said
// otherwise). hooks/show-result.js appends a seat.model line to the run's log when the host
// starts a fresh reader, from the start call it is handed and with no transcript read (issue
// 255; tests/show_result_check.js pins the hook); this file pins what the scripts make of those
// lines, and of the lines an older version wrote from a seat's transcript, which a run's log
// keeps and the scripts still read.
//
// Runs the REAL new-run.js, packet.js, check-answer.js, seat-fallback.js, render-record.js,
// render-board.js and render-state.js from plugins/combat-writing/scripts, and the REAL
// hooks/show-result.js on the start call as the host hands it, in a throwaway project under the
// OS temp folder. Invented model names and ids only. Pins:
//   - lib.seatModels: the latest seat.model line per seat per round. lib.measuredModels: null
//     unless a fresh reader has a line in the run's latest round.
//   - lib.modelsLine with no seat.model line, and with lines for an earlier round alone, is the
//     line the records give, compared to the rule as it stood before the measurement (kept here
//     as RECORDED, over several crews and logs).
//   - lib.modelsLine with measured lines for the latest round: every fresh reader on the
//     session's measured id, no sentence, also when the record names another model; one that
//     differs, "Not on this session's model (<session id>): seat-2 answered on <id>."; the two
//     ids compared as written; a fresh reader no round measured still named from its record,
//     "as recorded"; an outside seat never; a seat whose measured id changed between two rounds,
//     "<seat> answered on <id> from round <round> (<YYYY-MM-DD HH:MM UTC>), where it answered on
//     <earlier id> before.", the newest change alone; with no session id on the lines the first
//     sentence is the records' and the change sentence stands; the fallback sentence stays last.
//   - lib.measuredLines, the record and the board's Run details: one line per fresh reader per
//     round with a measured model, in round order, naming the id that answered, the model passed
//     at start or "none passed at start", and "read from the seat's own transcript"; replies
//     carrying two ids list both; an unread meta file says so. The record carries them under
//     "What was sent", the board in its Run details panel, the same lines.
//   - A log a hand has edited: a seat.model line whose model is no model id (lib.MODEL_ID_RE:
//     letters, digits, dot, dash, underscore, slash, colon, square brackets, at most 120), whose
//     seat is no seat id or whose round is no round name is not read, by the Models line or by
//     the measured lines; a session, a start choice or a list of ids outside the class is read as
//     not there; no line break from the log reaches a line. A line marked partial says the end
//     of a long transcript was read. A change whose time is no date is said without a time, and
//     the record, the board and the state still render.
//   - The label is never rewritten: seats.json is byte for byte what it was, lib.seatLabel and
//     the seat key are unchanged, the scoreboard row and a packet built after the measurement
//     carry the recorded label.
//   - A line read at the reader's start (`at: "start"`, what the hook writes now): "started on
//     <id>", the model passed at start or that none was, and that it is the model the host
//     resolved, handed to the hook with the start call; no session id rides on such a line, so
//     the Models line's first sentence is the records' and the change sentence stands, "started
//     on" where the line was read at a start and "answered on" where it was read from a
//     transcript. The note over the lines says each line says where it was read.
//   - End to end: the real hook after a real start call writes the line, and the short form, the
//     record, the board's strip and Run details and the state's models_line carry the sentence.
//   - The rules skill, the sparring and battle skills, both READMEs and the checklist say the
//     model a fresh reader started on is measured from the start call, with no transcript read.
// Run from the repository root:   node tests/measured_check.js
// Exit 0 on pass, 1 on any failure, one line per failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.resolve(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var scripts=path.join(plugin,'scripts');
var hook=path.join(plugin,'hooks','show-result.js');
var lib=require(path.join(scripts,'lib.js'));
var failures=[], checks=0;
function check(ok,msg){ checks+=1; if(!ok)failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cw-measured-'));
var proj=path.join(tmp,'proj'); fs.mkdirSync(proj);
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function logOf(run){ return read(path.join(run,'log.jsonl')).trim().split('\n').map(function(l){return JSON.parse(l);}); }
function seatsOf(run){ return JSON.parse(read(path.join(run,'seats.json'))).seats; }
fs.writeFileSync(path.join(proj,'draft.md'),'Dear board,\n\nBuy the company. The ask lands in the first line.\n');
var SM='Test Session Model';

// lib's parts: a lib without them fails here by name, and every check below still runs.
check(typeof lib.seatModels==='function'&&typeof lib.measuredModels==='function'&&typeof lib.measuredLines==='function'&&typeof lib.modelChangeWords==='function'&&typeof lib.MEASURED_HEADING==='string'&&typeof lib.MEASURED_NOTE==='string'&&typeof lib.MEASURED_SOURCE==='string','lib.js: seatModels, measuredModels, measuredLines, modelChangeWords, MEASURED_HEADING, MEASURED_NOTE and MEASURED_SOURCE should be exported');
var seatModels=typeof lib.seatModels==='function'?lib.seatModels:function(){ return {}; };
var measuredModels=typeof lib.measuredModels==='function'?lib.measuredModels:function(){ return null; };
var measuredLines=typeof lib.measuredLines==='function'?lib.measuredLines:function(){ return []; };
var HEADING=lib.MEASURED_HEADING||'Models measured', NOTE=lib.MEASURED_NOTE||'', SOURCE='read from the seat\'s own transcript';
check(lib.MEASURED_SOURCE===SOURCE,'lib.MEASURED_SOURCE: the line says where it was read from, got '+lib.MEASURED_SOURCE);

// The rule as it stood before the measurement: what the records alone say.
function RECORDED(seats,log){
  var sm=lib.sessionModelOf(log);
  function same(a,b){ return String(a).trim().toLowerCase()===String(b).trim().toLowerCase(); }
  var off=(seats||[]).filter(function(s){ return lib.seatStart(s)==='named'&&!(sm&&same(s.model,sm)); });
  var parts=[];
  if(off.length){
    var names=off.map(function(s){return s.id+' on '+s.model;}).join(', ');
    parts.push(sm?'Not on this session\'s model ('+sm+'): '+names+'.':'Not left on the session\'s own model: '+names+', named at start.');
  }
  lib.seatFallbacks(seats,log).forEach(function(e){ parts.push(lib.fallbackWords(e)); });
  return parts.length?parts.join(' '):null;
}

// Records and log lines written here.
var S1={id:'seat-1',model:SM,company:'Anthropic',start:'session',source:lib.SOURCE_SESSION};
var S2={id:'seat-2',model:'Test Model B',company:'Anthropic',start:'named',source:lib.SOURCE_NAMED};
var S2S={id:'seat-2',model:SM,company:'Anthropic',start:'session',source:lib.SOURCE_SESSION};
var OUT={id:'seat-3',model:'outside-test',company:'Example',provider:'test-fixture',source:'the model field'};
var CREATED={ts:'2026-11-10T13:00:00.000Z',event:'run.created',session_model:SM};
function built(round,seat){ return {ts:'2026-11-10T13:30:00.000Z',event:'packet.built',round:round,seat:seat}; }
function sm(seat,round,model,extra){ return Object.assign({ts:'2026-11-10T14:05:30.000Z',event:'seat.model',seat:seat,round:round,model:model,passed:null,session:'test-id-1',by:'hook'},extra||{}); }
var R1='01-sparring', R2='02-battle', R3='03-battle';

// No measured line: the records speak, exactly as before.
[[[S1,S2],[CREATED]],[[S1,S2S],[CREATED]],[[S1,S2,OUT],[CREATED,built(R1,'seat-1')]],[[S1,S2],[{event:'run.created'}]],[[S1],[]],
 [[S1,S2S],[CREATED,{ts:'2026-11-10T14:02:00.000Z',event:'seat.fallback',seat:'seat-2',round:R1,from:'Test Model B',to:SM,start:'session',reason:'a usage limit was hit'}]]
].forEach(function(c,i){
  check(lib.modelsLine(c[0],c[1])===RECORDED(c[0],c[1]),'no measured line, case '+(i+1)+': the Models line is the records\' line, got '+lib.modelsLine(c[0],c[1])+' for '+RECORDED(c[0],c[1]));
  check(measuredModels(c[0],c[1])===null&&measuredLines(c[0],c[1]).length===0,'no measured line, case '+(i+1)+': nothing measured, no lines');
});
check(RECORDED([S1,S2],[CREATED])==='Not on this session\'s model ('+SM+'): seat-2 on Test Model B.','the records\' line, as it read before');
// Lines for an earlier round alone: the latest round is spoken for by the records.
var earlier=[CREATED,built(R1,'seat-1'),built(R1,'seat-2'),sm('seat-1',R1,'test-id-1'),sm('seat-2',R1,'test-id-2'),built(R2,'seat-1'),built(R2,'seat-2')];
check(measuredModels([S1,S2],earlier)===null&&lib.modelsLine([S1,S2],earlier)===RECORDED([S1,S2],earlier),'lines for an earlier round alone: the latest round has none, so the records\' line, got '+lib.modelsLine([S1,S2],earlier));
check(measuredLines([S1,S2],earlier).length===2,'lines for an earlier round alone: the record still lists what was measured');

// Measured, every fresh reader on the session's id: no sentence, also when the record names another model.
var same=[CREATED,built(R1,'seat-1'),built(R1,'seat-2'),sm('seat-1',R1,'test-id-1'),sm('seat-2',R1,'test-id-1',{passed:'test-b'})];
check(lib.modelsLine([S1,S2],same)===null,'measured, both on the session\'s id: no sentence, got '+lib.modelsLine([S1,S2],same));
var mmSame=measuredModels([S1,S2],same)||{};
check(mmSame.round===R1&&mmSame.session==='test-id-1'&&mmSame.latest&&mmSame.latest['seat-2'].model==='test-id-1'&&mmSame.changes.length===0,'measuredModels: the latest round, the session\'s id, each reader\'s newest line, no change, got '+JSON.stringify(mmSame));
// One differs: the sentence names the measured ids.
var differs=[CREATED,built(R1,'seat-1'),built(R1,'seat-2'),sm('seat-1',R1,'test-id-1'),sm('seat-2',R1,'test-id-2',{passed:'test-b'})];
var DIFF='Not on this session\'s model (test-id-1): seat-2 answered on test-id-2.';
check(lib.modelsLine([S1,S2],differs)===DIFF,'measured, seat-2 differs: the sentence with the measured ids, got '+lib.modelsLine([S1,S2],differs));
// The record says session, the measurement says otherwise: named all the same.
var both=[CREATED,sm('seat-1',R1,'test-id-3'),sm('seat-2',R1,'test-id-2')];
check(lib.modelsLine([S1,S2S],both)==='Not on this session\'s model (test-id-1): seat-1 answered on test-id-3, seat-2 answered on test-id-2.','measured, a reader recorded on the session\'s model that answered on another id is named, got '+lib.modelsLine([S1,S2S],both));
// Compared as written.
check(lib.modelsLine([S1],[CREATED,sm('seat-1',R1,'Test-Id-1')])==='Not on this session\'s model (test-id-1): seat-1 answered on Test-Id-1.','measured: the two ids are compared as written, got '+lib.modelsLine([S1],[CREATED,sm('seat-1',R1,'Test-Id-1')]));
// The latest line per seat per round.
var twice=[CREATED,sm('seat-1',R1,'test-id-1'),sm('seat-2',R1,'test-id-3',{ts:'2026-11-10T14:01:00.000Z'}),sm('seat-2',R1,'test-id-2',{ts:'2026-11-10T14:03:00.000Z'})];
var latestTwice=((seatModels(twice)['seat-2']||{})[R1]||{}).model;
check(latestTwice==='test-id-2'&&lib.modelsLine([S1,S2],twice)===DIFF&&measuredLines([S1,S2],twice).length===2,'seatModels: the latest line per seat per round, got '+JSON.stringify(seatModels(twice)['seat-2']));
// A fresh reader no round measured is named from its record; an outside seat never.
var partial=[CREATED,built(R1,'seat-1'),sm('seat-1',R1,'test-id-1'),sm('seat-3',R1,'test-id-7')];
check(lib.modelsLine([S1,S2,OUT],partial)==='Not on this session\'s model (test-id-1): seat-2 on Test Model B, as recorded.','measured, one reader unmeasured: named from its record and marked, the outside seat never, got '+lib.modelsLine([S1,S2,OUT],partial));
check(measuredLines([S1,S2,OUT],partial).length===1,'measuredLines: an outside seat has no line');
// A change between two rounds: one more sentence, the newest change alone, the line's own time.
var changed=[CREATED,sm('seat-1',R1,'test-id-1'),sm('seat-2',R1,'test-id-2'),built(R2,'seat-1'),sm('seat-1',R2,'test-id-3',{ts:'2026-11-10T15:07:59.000Z'}),sm('seat-2',R2,'test-id-2')];
var CHANGE='seat-1 answered on test-id-3 from round 02-battle (2026-11-10 15:07 UTC), where it answered on test-id-1 before.';
check(lib.modelsLine([S1,S2],changed)==='Not on this session\'s model (test-id-1): seat-1 answered on test-id-3, seat-2 answered on test-id-2. '+CHANGE,'measured, seat-1 changed between rounds: the from-round sentence after the first, got '+lib.modelsLine([S1,S2],changed));
var back=changed.concat([built(R3,'seat-1'),sm('seat-1',R3,'test-id-1',{ts:'2026-11-10T16:20:00.000Z'}),sm('seat-2',R3,'test-id-2')]);
check(lib.modelsLine([S1,S2],back)===DIFF+' seat-1 answered on test-id-1 from round 03-battle (2026-11-10 16:20 UTC), where it answered on test-id-3 before.','measured, seat-1 changed twice: the newest change alone, got '+lib.modelsLine([S1,S2],back));
var held=changed.concat([built(R3,'seat-1'),sm('seat-1',R3,'test-id-3'),sm('seat-2',R3,'test-id-2')]);
check((lib.modelsLine([S1,S2],held)||'').indexOf(CHANGE)>0,'measured, the change stays named in the rounds after it, got '+lib.modelsLine([S1,S2],held));
// A round the seat was not measured in is passed over: the round before is the measured round before.
var gap=[CREATED,sm('seat-1',R1,'test-id-1'),built(R2,'seat-1'),sm('seat-2',R2,'test-id-1'),built(R3,'seat-1'),sm('seat-1',R3,'test-id-3',{ts:'2026-11-10T16:20:00.000Z'})];
check((lib.modelsLine([S1,S2S],gap)||'').indexOf('seat-1 answered on test-id-3 from round 03-battle (2026-11-10 16:20 UTC), where it answered on test-id-1 before.')>0,'measured, a change across a round the seat was not measured in, got '+lib.modelsLine([S1,S2S],gap));
// No session id on the lines: the records' first sentence, the change sentence stands.
var noSession=[CREATED,sm('seat-1',R1,'test-id-1',{session:null}),sm('seat-2',R1,'test-id-2',{session:null}),sm('seat-1',R2,'test-id-3',{session:null,ts:'2026-11-10T15:07:00.000Z'})];
check(lib.modelsLine([S1,S2],noSession)===RECORDED([S1,S2],noSession)+' '+CHANGE,'measured with no session id: the records\' sentence and the change, got '+lib.modelsLine([S1,S2],noSession));
// The fallback sentence stays, last.
var fell=differs.concat([{ts:'2026-11-10T14:02:00.000Z',event:'seat.fallback',seat:'seat-2',round:R1,from:'Test Model C',to:'Test Model B',start:'named',reason:'a usage limit was hit'}]);
check(lib.modelsLine([S1,S2],fell)===DIFF+' seat-2 fell back from Test Model C to Test Model B at 2026-11-10 14:02 UTC: a usage limit was hit.','measured: the fallback sentence stays, last, got '+lib.modelsLine([S1,S2],fell));

// The measured lines, in words.
var worded=[CREATED,sm('seat-1',R1,'test-id-1'),sm('seat-2',R1,'test-id-2',{passed:'test-b'}),sm('seat-2',R2,'test-id-4',{passed:'test-b',models:['test-id-2','test-id-4']}),sm('seat-1',R2,'test-id-1',{meta:false,session:null})];
var ML=measuredLines([S1,S2],worded);
check(ML.length===4&&ML[0]==='seat-1, round 01-sparring: answered on test-id-1; none passed at start; the session on test-id-1; '+SOURCE+'.','measuredLines: the id, none passed, the session, the source, got '+JSON.stringify(ML[0]));
check(ML[1]==='seat-2, round 01-sparring: answered on test-id-2; passed at start: test-b; the session on test-id-1; '+SOURCE+'.','measuredLines: the model passed at start, got '+JSON.stringify(ML[1]));
check(ML[2]==='seat-1, round 02-battle: answered on test-id-1; the start choice could not be read; the session\'s own model could not be read; '+SOURCE+'.','measuredLines: an unread meta file and an unread session say so, round order then seat order, got '+JSON.stringify(ML[2]));
check(ML[3]==='seat-2, round 02-battle: answered on test-id-4 (its replies carry test-id-2, then test-id-4); passed at start: test-b; the session on test-id-1; '+SOURCE+'.','measuredLines: replies carrying two ids list both, got '+JSON.stringify(ML[3]));

// A log a hand has edited: what is no model id is not read, and nothing of it reaches a line.
check(lib.MODEL_ID_RE instanceof RegExp&&typeof lib.isModelId==='function','lib.js: MODEL_ID_RE and isModelId should be exported');
var isModelId=typeof lib.isModelId==='function'?lib.isModelId:function(){ return true; };
check(['test-id-0','test-id-9','maker/name-1.5:x[1m]_y'].every(isModelId)&&!['','a b','a\nb','<synthetic>',null,7,{},new Array(122).join('a')].some(isModelId),'lib.isModelId: letters, digits, dot, dash, underscore, slash, colon and square brackets up to 120, a string, and nothing else');
var BREAK='test-id-2\nINJECTED: a second line';
[['a line break',BREAK],['a space','test id 2'],['a number',7],['an object',{id:'test-id-2'}],['121 characters',new Array(122).join('a')]].forEach(function(c){
  var hand=[CREATED,built(R1,'seat-1'),sm('seat-1',R1,'test-id-1'),sm('seat-2',R1,c[1])];
  var line=lib.modelsLine([S1,S2],hand)||'', lines=measuredLines([S1,S2],hand);
  check(!(seatModels(hand)['seat-2'])&&line==='Not on this session\'s model (test-id-1): seat-2 on Test Model B, as recorded.'&&lines.length===1&&(line+lines.join('')).indexOf('INJECTED')<0&&(line+lines.join('')).indexOf('\n')<0,'a hand-edited log, a model that is '+c[0]+': the line is not read, got '+JSON.stringify(line)+' and '+JSON.stringify(lines));
});
var alone=[CREATED,sm('seat-2',R1,BREAK)];
check(measuredModels([S1,S2],alone)===null&&lib.modelsLine([S1,S2],alone)===RECORDED([S1,S2],alone)&&measuredLines([S1,S2],alone).length===0,'a hand-edited log, the one measured line no model id: the records speak, got '+JSON.stringify(lib.modelsLine([S1,S2],alone)));
check(!seatModels([sm('seat 2\nX',R1,'test-id-2')])['seat 2\nX']&&!seatModels([sm('seat-2','round\nX','test-id-2')])['seat-2'],'a hand-edited log: a seat that is no seat id and a round that is no round name are not read');
var badSession=[CREATED,sm('seat-1',R1,'test-id-1',{session:BREAK}),sm('seat-2',R1,'test-id-2',{session:BREAK,passed:BREAK,models:['test-id-2',BREAK]})];
var lineBS=lib.modelsLine([S1,S2],badSession)||'', linesBS=measuredLines([S1,S2],badSession);
check(lineBS===RECORDED([S1,S2],badSession)&&linesBS[1]==='seat-2, round 01-sparring: answered on test-id-2; the start choice could not be read; the session\'s own model could not be read; '+SOURCE+'.'&&(lineBS+linesBS.join('')).indexOf('INJECTED')<0,'a hand-edited log: a session, a start choice and a list of ids that are no model ids are read as not there, got '+JSON.stringify(lineBS)+' and '+JSON.stringify(linesBS));
// A read from the end of a long transcript says so.
check(measuredLines([S1],[CREATED,sm('seat-1',R1,'test-id-1',{partial:true})])[0]==='seat-1, round 01-sparring: answered on test-id-1; none passed at start; the session on test-id-1; '+SOURCE+', the end of a long one.','measuredLines: a partial read is named, got '+JSON.stringify(measuredLines([S1],[CREATED,sm('seat-1',R1,'test-id-1',{partial:true})])));
// A change whose time is no date: said without a time, never thrown.
var noDate=[CREATED,sm('seat-1',R1,'test-id-1'),sm('seat-2',R1,'test-id-2'),built(R2,'seat-1'),sm('seat-1',R2,'test-id-3',{ts:'not a date'}),sm('seat-2',R2,'test-id-2')];
var lineND=null, threw=null; try{ lineND=lib.modelsLine([S1,S2],noDate); }catch(e){ threw=e.message; }
check(threw===null&&lineND==='Not on this session\'s model (test-id-1): seat-1 answered on test-id-3, seat-2 answered on test-id-2. seat-1 answered on test-id-3 from round 02-battle, where it answered on test-id-1 before.','a change whose time is no date: the sentence without a time, got '+(threw?'thrown: '+threw:JSON.stringify(lineND)));

// A line read at the reader's start (issue 255): what the hook writes now. No session id rides on it.
var SOURCE_START='the model the host resolved when it started the reader, handed to the plugin\'s hook with the start call';
check(lib.MEASURED_SOURCE_START===SOURCE_START,'lib.MEASURED_SOURCE_START: a line read at the start says where it was read, got '+lib.MEASURED_SOURCE_START);
check(/each saying where it was read/.test(NOTE)&&!/replies/.test(NOTE),'lib.MEASURED_NOTE: the note over the lines says each line says where it was read, and speaks of no replies; got '+NOTE);
function st(seat,round,model,extra){ return Object.assign({ts:'2026-11-10T14:05:30.000Z',event:'seat.model',seat:seat,round:round,model:model,passed:null,at:'start',by:'hook'},extra||{}); }
var atStart=[CREATED,st('seat-1',R1,'test-id-1'),st('seat-2',R1,'test-id-2',{passed:'test-b'})];
var MS=measuredLines([S1,S2],atStart.concat([built(R2,'seat-1'),st('seat-1',R2,'test-id-1',{meta:false})]));
check(MS.length===3&&MS[0]==='seat-1, round 01-sparring: started on test-id-1; none passed at start; '+SOURCE_START+'.','measuredLines, a line read at the start: the id, none passed, the source, and no word of the session; got '+JSON.stringify(MS[0]));
check(MS[1]==='seat-2, round 01-sparring: started on test-id-2; passed at start: test-b; '+SOURCE_START+'.','measuredLines, a line read at the start: the model passed, got '+JSON.stringify(MS[1]));
check(MS[2]==='seat-1, round 02-battle: started on test-id-1; the start choice could not be read; '+SOURCE_START+'.','measuredLines, a line read at the start: an unread choice says so, got '+JSON.stringify(MS[2]));
var mmStart=measuredModels([S1,S2],atStart)||{};
check(mmStart.round===R1&&mmStart.session===null&&mmStart.latest&&mmStart.latest['seat-2'].model==='test-id-2','measuredModels, lines read at the start: the latest round, each reader\'s newest line, and no session id; got '+JSON.stringify(mmStart));
check(lib.modelsLine([S1,S2],atStart)===RECORDED([S1,S2],atStart),'the Models line, lines read at the start: the records\' sentence, got '+lib.modelsLine([S1,S2],atStart));
var startChanged=atStart.concat([built(R2,'seat-1'),st('seat-1',R2,'test-id-3',{ts:'2026-11-10T15:07:59.000Z'}),st('seat-2',R2,'test-id-2',{passed:'test-b'})]);
var CHANGE_START='seat-1 started on test-id-3 from round 02-battle (2026-11-10 15:07 UTC), where it started on test-id-1 before.';
check(lib.modelsLine([S1,S2],startChanged)===RECORDED([S1,S2],startChanged)+' '+CHANGE_START,'the Models line, a reader that started on another id in a later round: the records\' sentence and the change, got '+lib.modelsLine([S1,S2],startChanged));
var mixedLog=[CREATED,sm('seat-1',R1,'test-id-1',{session:null}),built(R2,'seat-1'),st('seat-1',R2,'test-id-3',{ts:'2026-11-10T15:07:59.000Z'})];
check((lib.modelsLine([S1],mixedLog)||'')==='seat-1 started on test-id-3 from round 02-battle (2026-11-10 15:07 UTC), where it answered on test-id-1 before.','the Models line, an older line read from a transcript and a newer one read at the start: each said in its own word, got '+lib.modelsLine([S1],mixedLog));

// End to end: a real run, the real hook after the real start call, the four surfaces.
var run=node('new-run.js',['--draft','draft.md','--no-brief','--stage','sparring','--name','measured','--session-model',SM,'--model-2','Test Model B']).stdout.trim();
var seatsBefore=read(path.join(run,'seats.json'));
var labelsBefore=seatsOf(run).map(lib.seatLabel).join('; '), keyBefore=lib.seatKey(seatsOf(run));
// The start call as the host hands it to a PostToolUse hook after a background start (the shape read from a real session).
function started(round,seat,model,passed){
  var packet=path.join(run,'rounds',round,seat+'.packet.md'), answer=path.join(run,'rounds',round,seat+'.answer.md');
  var ti={description:seat,prompt:'Packet: '+packet+'\nAnswer file: '+answer+'\nRead the packet, write your answer to the answer file, reply with one line.',subagent_type:'cw:seat',run_in_background:true};
  if(passed)ti.model=passed;
  var input={session_id:'sess-1',transcript_path:path.join(tmp,'no-such-transcript.jsonl'),cwd:proj,hook_event_name:'PostToolUse',tool_name:'Agent',tool_input:ti,tool_response:{isAsync:true,status:'async_launched',agentId:'a1',description:seat,resolvedModel:model,prompt:ti.prompt,outputFile:path.join(tmp,'a1.output'),canReadOutputFile:true,canContinueAgent:true},tool_use_id:'toolu_x'};
  return cp.spawnSync(process.execPath,[hook],{input:JSON.stringify(input),encoding:'utf8',cwd:proj});
}
['seat-1','seat-2'].forEach(function(s){ node('packet.js',['--run',run,'--round',R1,'--seat',s]); });
fs.writeFileSync(path.join(run,'rounds',R1,'seat-1.answer.md'),'RATING: 8/10\nThe ask lands in the first line.\n');
fs.writeFileSync(path.join(run,'rounds',R1,'seat-2.answer.md'),'RATING: 4/10\nThe close asks for a vote and never says on what.\n');
var h1=started(R1,'seat-1','test-id-1'), h2=started(R1,'seat-2','test-id-2','test-b');
['seat-1','seat-2'].forEach(function(s){ node('check-answer.js',[path.join(run,'rounds',R1,s+'.answer.md'),'--run',run]); });
var lines1=logOf(run).filter(function(e){return e.event==='seat.model';});
check(h1.status===0&&h2.status===0&&h1.stdout===''&&h2.stdout===''&&lines1.length===2&&lines1[1].seat==='seat-2'&&lines1[1].model==='test-id-2'&&lines1[1].passed==='test-b'&&lines1[1].at==='start'&&!('session' in lines1[1]),'end to end: the real hook writes one seat.model line per seat at its start and prints nothing, got '+JSON.stringify(lines1));
var DIFF_E2E='Not on this session\'s model ('+SM+'): seat-2 on Test Model B.';
check(lib.modelsLine(seatsOf(run),logOf(run))===DIFF_E2E,'end to end: with lines read at the start the Models line is the records\' sentence, got '+lib.modelsLine(seatsOf(run),logOf(run)));
var short=node('render-record.js',['--run',run,'--short']).stdout.split('\n');
var iCrew=short.findIndex(function(l){return l.indexOf('**Crew:**')===0;}), iMod=short.indexOf('**Models:** '+DIFF_E2E), iKey=short.findIndex(function(l){return l.indexOf('Seat key:')===0;});
check(iCrew===0&&iMod>iCrew&&iMod<iKey,'short form: the Models line sits between the crew line and the seat key, got '+JSON.stringify({crew:iCrew,models:iMod,key:iKey}));
check(short.join('\n').indexOf(HEADING)<0,'short form: the measured lines stay in the record and on the board, never on the terminal');
var E1='seat-1, round 01-sparring: started on test-id-1; none passed at start; '+SOURCE_START+'.';
var E2='seat-2, round 01-sparring: started on test-id-2; passed at start: test-b; '+SOURCE_START+'.';
var record=read(path.join(run,'record.md'));
var iSent=record.indexOf('## What was sent'), iHead=record.indexOf('**'+HEADING+':** '+NOTE+'\n\n- '+E1+'\n- '+E2+'\n');
check(record.indexOf('**Models:** '+DIFF_E2E)>=0&&iSent>0&&iHead>iSent,'record: the Models line, and under What was sent one line per fresh reader per round, got '+JSON.stringify(record.slice(iSent>0?iSent:0).slice(-700)));
check(record.indexOf('| Test Model B (Anthropic), seat-2 |')>=0&&record.indexOf('| '+SM+' (Anthropic), seat-1 |')>=0,'record: the scoreboard rows carry the recorded labels');
node('render-board.js',['--run',run]);
var board=read(path.join(run,'board.html'));
var iPanel=board.indexOf('id="panel-details"'), iLines=board.indexOf('<p class="meta"><strong>'+lib.escapeHtml(HEADING)+':</strong> '+lib.escapeHtml(NOTE)+'<br>'+lib.escapeHtml(E1)+'<br>'+lib.escapeHtml(E2)+'</p>');
check(iPanel>0&&iLines>iPanel,'board: Run details carries the record\'s measured lines, got '+JSON.stringify(board.slice(board.indexOf(lib.escapeHtml(HEADING))-40,board.indexOf(lib.escapeHtml(HEADING))+200)));
check(board.indexOf('<p class="round models"><b>Models</b> · '+lib.escapeHtml(DIFF_E2E)+'</p>')>=0&&board.indexOf('<strong>Models:</strong> '+lib.escapeHtml(DIFF_E2E))>iPanel,'board: the strip and Run details carry the Models line');
var state=JSON.parse(node('render-state.js',['--run',run]).stdout);
check(state.models_line===DIFF_E2E&&state.session_model===SM,'state: models_line is the Models line and session_model stays the recorded name, got '+JSON.stringify({l:state.models_line,m:state.session_model}));
// The label is never rewritten.
check(read(path.join(run,'seats.json'))===seatsBefore&&seatsOf(run).map(lib.seatLabel).join('; ')===labelsBefore&&lib.seatKey(seatsOf(run))===keyBefore,'the label: seats.json, the labels and the seat key are what they were before the measurement');
['seat-1','seat-2'].forEach(function(s){ node('packet.js',['--run',run,'--round',R2,'--seat',s,'--sn',path.join(proj,'draft.md')]); });
var packet2=read(path.join(run,'rounds',R2,'seat-1.packet.md'));
check(packet2.indexOf('### Test Model B (Anthropic), seat-2')>=0&&packet2.indexOf('test-id-2')<0,'the label: a packet built after the measurement carries the other seat\'s answer under its recorded label and no measured id');
// Round 02: seat-1 answers on another id; the change is said, and the record lists both rounds.
fs.writeFileSync(path.join(run,'rounds',R2,'seat-1.answer.md'),'The ask still lands in the first line.\n');
fs.writeFileSync(path.join(run,'rounds',R2,'seat-2.answer.md'),'The close still asks for a vote and never says on what.\n');
started(R2,'seat-1','test-id-3'); started(R2,'seat-2','test-id-2','test-b');
var line2=lib.modelsLine(seatsOf(run),logOf(run))||'';
check(/^Not on this session's model \(Test Session Model\): seat-2 on Test Model B\. seat-1 started on test-id-3 from round 02-battle \(\d{4}-\d\d-\d\d \d\d:\d\d UTC\), where it started on test-id-1 before\.$/.test(line2),'end to end, round 02: the change between rounds is said with its round and time, got '+line2);
node('render-record.js',['--run',run]);
var record2=read(path.join(run,'record.md'));
check((record2.match(/^- seat-\d, round \d\d-[a-z]+: started on /gm)||[]).length===4&&record2.indexOf('- seat-1, round 02-battle: started on test-id-3; none passed at start; '+SOURCE_START+'.')>0,'record, round 02: four lines, one per fresh reader per round');
// A hand-edited time on the newest change: the record, the board and the state still render, the sentence without a time.
fs.appendFileSync(path.join(run,'log.jsonl'),JSON.stringify({ts:'not a date',event:'seat.model',seat:'seat-2',round:R2,model:'test-id-9',passed:'test-b',at:'start',by:'hook'})+'\n');
var rr=node('render-record.js',['--run',run]), rb=node('render-board.js',['--run',run]), rs=node('render-state.js',['--run',run]);
var SAID='seat-2 started on test-id-9 from round 02-battle, where it started on test-id-2 before.';
check(rr.status===0&&rb.status===0&&rs.status===0&&read(path.join(run,'record.md')).indexOf(SAID)>0&&read(path.join(run,'board.html')).indexOf(lib.escapeHtml(SAID))>0,'a time that is no date: the record, the board and the state render and the change is said without it, got exits '+[rr.status,rb.status,rs.status].join(', ')+' '+String(rr.stderr||rb.stderr||rs.stderr).split('\n')[0].slice(0,160));

// The words in the documents.
function has(rel,re,what){ var text=''; try{ text=read(path.join(root,rel)); }catch(e){} check(re.test(text),rel+': '+what); }
var STARTED=/the model (?:a|each) fresh reader started on is measured[^.]*start call/;
has('plugins/combat-writing/skills/combat-writing/SKILL.md',STARTED,'the rules skill should say the model a fresh reader started on is measured, from the start call');
has('plugins/combat-writing/skills/sparring/SKILL.md',/as measured at the reader's start/,'the sparring skill should say the measured lines speak from the reader\'s start');
has('plugins/combat-writing/skills/battle/SKILL.md',/as measured at the reader's start/,'the battle skill should say the measured lines speak from the reader\'s start');
has('README.md',STARTED,'the root README should say the model a fresh reader started on is measured, from the start call');
has('plugins/combat-writing/README.md',STARTED,'the listing README should say the model a fresh reader started on is measured, from the start call');
has('RULINGS.md',/issue 196, Part 124/,'RULINGS.md, the record behind CLAUDE.md (issue 224), should carry the measurement with its issue and part');
has('RULINGS.md',/issue 255, Part 148/,'RULINGS.md should carry the measurement\'s move to the start call with its issue and part');
has('docs/directory-checklist.md',/reads no transcript/,'the checklist should say the result hook reads no transcript');
has('docs/directory-checklist.md',/the model the host resolved/,'the checklist should say what the result hook reads of the start call');
['skills/combat-writing/SKILL.md','skills/sparring/SKILL.md','skills/battle/SKILL.md','skills/help/SKILL.md'].forEach(function(rel){
  var text=''; try{ text=read(path.join(plugin,rel)); }catch(e){}
  check(!/seat's own transcript|from the seat's transcript/.test(text),'plugins/combat-writing/'+rel+': still says a model is read from the seat\'s transcript; the hook reads none');
});

fs.rmSync(tmp,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'measured_check: '+failures.length+' failure(s), ':'measured_check: all passed, ')+checks+' checks');
process.exit(failures.length?1:0);
