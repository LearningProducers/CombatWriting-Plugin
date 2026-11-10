// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// seat-fallback.js: a fresh reader's start fell to another model, and the run says when.
//
//   node seat-fallback.js --run <run folder> --seat <seat-1|seat-2> --to session|"<model name>" --reason "<one line>" [--round <nn-kind>]
//
// A fresh reader starts as its seat record says (start: session, no model passed; start: named,
// the record's model passed). When the host's agent tool refuses that start or does not offer
// the model (the model is not offered, a usage limit is hit), the seat falls to the next most
// capable model the tool offers, else to the session's own model, and the host runs this before
// it starts the seat again. The script appends one line to the run's log, seat.fallback: the
// seat, the round when one is named (else null), from (the model the record named), to (the
// model named, or with --to session the session's model as run.created recorded it), start
// (session or named, how the seat starts from here on) and the reason, kept whole on one line;
// the line's own timestamp, the one every log line carries, is the when. It then rewrites that
// seat's record in the run's seats.json (model, start and the source note, in the wording
// new-run.js writes, so lib.seatStart reads a fallen-back record like any other) and prints one
// line for the host: the fallback in words and how to start the seat now. The seat-scope hook
// holds the next start to the rewritten record. lib.modelsLine reads the log line, so every
// result names the fallback, its time and its reason, and the work after it can be reviewed.
//
// --to that names the session's own model is --to session (no model is passed for it). Refused,
// with nothing written: a seat the run does not hold; an outside seat (a record with a provider:
// the add-on starts it, and one that fails is shown as missing); a fallback to the model the
// record already starts on (a seat on the session's own model has no model under it to fall
// to); a round the run does not hold; a word outside the flags (quote a model name or a reason
// of more than one word). Nothing is validated against a model list, because the models are the
// host's; the name is kept as given. No model name is written in this file.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
var USAGE='usage: seat-fallback.js --run <run folder> --seat <seat-1|seat-2> --to session|"<model name>" --reason "<one line>" [--round <nn-kind>]';

function given(v){ return v&&v!==true&&String(v).trim()?String(v).trim():null; }
function sameModel(a,b){ return !!a&&!!b&&a.toLowerCase()===b.toLowerCase(); }
var runArg=given(args.run), seatId=given(args.seat), to=given(args.to), reason=given(args.reason);
if(reason)reason=reason.replace(/\s+/g,' ');
if(!runArg||!seatId||!to||!reason)lib.die(USAGE);
if(args._.length)lib.die(USAGE+' (a word outside the flags: '+args._.join(' ')+'; quote a model name or a reason of more than one word)');
var runDir=path.resolve(runArg);
var file=path.join(runDir,'seats.json');
var data=lib.readSeats(runDir);
var seats=Array.isArray(data.seats)?data.seats:[];
var seat=seats.filter(function(s){ return s&&s.id===seatId; })[0];
if(!seat)lib.die('no '+seatId+' in this run (it seats '+(seats.map(function(s){return s.id;}).join(', ')||'nobody')+')');
if(!lib.isFreshReader(seat))lib.die(seatId+' is an outside seat: the add-on starts it, and an outside seat that fails is shown as missing; only a fresh reader falls back');
var round=null;
if(args.round!==undefined){
  round=given(args.round);
  if(!round||!/^\d{2}-[a-z]+$/.test(round))lib.die('--round takes a round folder name, as in 02-battle');
  if(!fs.existsSync(path.join(runDir,'rounds',round)))lib.die('no round '+round+' in this run');
}

var log=lib.readLog(runDir);
var sessionModel=lib.sessionModelOf(log);
var toSession=to.toLowerCase()==='session'||sameModel(to,sessionModel);
var start=toSession?'session':'named';
var from=seat.model||lib.MODEL_UNREPORTED;
var was=lib.seatStart(seat);
if(toSession&&was==='session')lib.die(seatId+' already starts on the session\'s own model; there is no model under it to fall to, and a seat that cannot start is shown as missing');
if(!toSession&&was==='named'&&sameModel(to,seat.model))lib.die(seatId+' already starts on '+seat.model+'; name the model it falls to, or session');
var toModel=toSession?sessionModel:to;

// The log line first (the source of truth), then the record the next start is held to.
lib.appendLog(runDir,{event:'seat.fallback',seat:seatId,round:round,from:from,to:toModel,start:start,reason:reason});
seat.model=toModel||lib.MODEL_UNREPORTED;
seat.start=start;
seat.source='fell back from '+from+' (seat-fallback.js; the log\'s seat.fallback line holds when and why); '+(toSession?lib.SOURCE_SESSION:lib.SOURCE_NAMED);
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');

// The line for the host, from the log line as written, so the time printed is the time recorded.
var entry=lib.readLog(runDir).filter(function(e){ return e.event==='seat.fallback'&&e.seat===seatId; }).pop();
process.stdout.write('Fallback recorded: '+lib.fallbackWords(entry)+' Start '+seatId+' again '+(toSession?'with no model choice':'and pass '+toModel+' as the agent tool\'s model choice')+'.\n');
