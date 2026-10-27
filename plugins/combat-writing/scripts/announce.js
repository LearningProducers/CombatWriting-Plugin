// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// announce.js: the line the person sees when a round is chosen, before any packet is built.
//
//   node announce.js --run <run folder> --round <nn-kind> --kind FQ|N|SN|SFQ|seat|plain|cold|debate|final --to <seat ids, comma-separated> [--rerate]
//
// Issue 33 (2026-10-19): nothing showed between a picker selection and the board. Now the host
// prints this line as soon as the kind and the seats are known ("Round 03 forming: N to 3 seats
// (seat-1 claude, seat-2 gpt-oss, seat-3 qwen), rerate"; the second N of a run forms as N2, issue 99), and one line per seat as its check
// runs (check-answer.js prints it first), so every round shows at least two lines before the
// board opens. Logs round.announced with the kind, the seats and whether a rating was asked.
// Prints the line. Writes nothing but the log line. Exit 2 on misuse.

var path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
['run','round','kind','to'].forEach(function(k){ if(!args[k]||args[k]===true)lib.die('--'+k+' is required'); });
var runDir=path.resolve(args.run);
var seats=lib.readSeats(runDir).seats||[];
var round=String(args.round).trim();
if(!/^\d\d-(sparring|debate|battle|final)$/.test(round))lib.die('--round must be <nn>-sparring|debate|battle|final; got '+round);
var KINDS={FQ:'FQ',N:'N',SN:'SN',SFQ:'SFQ',seat:'seat lines',plain:'the default prompt',cold:'a cold read',debate:'debate',final:'the final reads',crew:'the second pass, to the crew'};
var kindKey=Object.keys(KINDS).filter(function(k){return k.toLowerCase()===String(args.kind).trim().toLowerCase();})[0];
if(!kindKey)lib.die('--kind must be one of '+Object.keys(KINDS).join(', ')+'; got '+args.kind);
var ids=String(args.to).split(',').map(function(s){return s.trim();}).filter(Boolean);
if(!ids.length)lib.die('--to names no seat');
var byId={}; seats.forEach(function(s){byId[s.id]=s;});
var unknown=ids.filter(function(id){return !byId[id];});
if(unknown.length)lib.die('--to names a seat not in seats.json: '+unknown.join(', ')+' (the crew is '+seats.map(function(s){return s.id;}).join(', ')+')');
var rerate=!!args.rerate&&kindKey!=='final';
// The kind with its count in the run (issue 99): the second SFQ of a run forms as SFQ2, read from
// the rounds announced before this one (lib.announcedOrdinal); the record counts from the packets.
var ordinal=lib.announcedOrdinal(lib.readLog(runDir),kindKey,round);
var kindWord=kindKey==='seat'?(ids.length===1?'a seat line':'seat lines'):KINDS[kindKey]+(ordinal>1?String(ordinal):'');
// The second pass of a first round (issue 88) has its own line, so the person sees the crew turn to each other.
var line=kindKey==='crew'
  ?'Round '+round.slice(0,2)+', second pass: to the crew, '+ids.length+' seat'+(ids.length===1?'':'s')+' ('+ids.map(function(id){return id+' '+lib.seatShortName(byId[id]);}).join(', ')+')'
  :'Round '+round.slice(0,2)+' forming: '+kindWord+' to '+ids.length+' seat'+(ids.length===1?'':'s')+' ('+ids.map(function(id){return id+' '+lib.seatShortName(byId[id]);}).join(', ')+')'+(rerate?', rerate':'');
lib.appendLog(runDir,{event:'round.announced',round:round,kind:kindKey,to:ids,rerate:rerate,line:line});
process.stdout.write(line+'\n');
