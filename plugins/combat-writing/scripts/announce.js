// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// announce.js: the line the person sees when a round is chosen, before any packet is built.
//
//   node announce.js --run <run folder> --round <nn-kind> --kind FQ|N|SN|SFQ|seat|plain|cold|debate|final --to <seat ids, comma-separated> [--rerate] [--prompt <prompt files, comma-separated>]
//
// Issue 33: nothing showed between a picker selection and the board. Now the host
// prints this line as soon as the kind and the seats are known ("Round 03 forming: N to 3 seats
// (seat-1 claude, seat-2 gpt-oss, seat-3 qwen), rerate"; the second N of a run forms as N2, issue 99), and one line per seat as its check
// runs (check-answer.js prints it first), so every round shows at least two lines before the
// board opens. Logs round.announced with the kind, the seats and whether a rating was asked.
// --prompt names the round's prompt files as the host cut them (the fq, n, sn or sfq file, the seat
// lines): when one asks for a rewrite (lib.asksRewrite, the rule packet.js builds by), the line ends
// ", a rewrite asked" and the log line carries rewrite true, so the person reads what the round will
// ask before any seat starts (issue 228). A prompt file that is not there is refused.
// Prints the line. Writes nothing but the log line. Exit 2 on misuse.

var fs=require('fs'), path=require('path');
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
if(args.prompt===true)lib.die('--prompt takes one or more file paths, comma-separated');
var promptFiles=args.prompt?String(args.prompt).split(',').map(function(s){return s.trim();}).filter(Boolean):[];
promptFiles.forEach(function(f){ if(!fs.existsSync(path.resolve(f))||!fs.statSync(path.resolve(f)).isFile())lib.die('--prompt names a file that is not there: '+f); });
// A rewrite is asked where packet.js would build the rewrite line: a round with the person's prompt.
var rewrite=['final','crew','cold'].indexOf(kindKey)<0&&promptFiles.some(function(f){return lib.asksRewrite(lib.readText(path.resolve(f)));});
// The kind with its count in the run (issue 99): the second SFQ of a run forms as SFQ2, read from
// the rounds announced before this one (lib.announcedOrdinal); the record counts from the packets.
var ordinal=lib.announcedOrdinal(lib.readLog(runDir),kindKey,round);
var kindWord=kindKey==='seat'?(ids.length===1?'a seat line':'seat lines'):KINDS[kindKey]+(ordinal>1?String(ordinal):'');
// The second pass of a first round (issue 88) has its own line, so the person sees the crew turn to each other.
var line=kindKey==='crew'
  ?'Round '+round.slice(0,2)+', second pass: to the crew, '+ids.length+' seat'+(ids.length===1?'':'s')+' ('+ids.map(function(id){return id+' '+lib.seatShortName(byId[id]);}).join(', ')+')'
  :'Round '+round.slice(0,2)+' forming: '+kindWord+' to '+ids.length+' seat'+(ids.length===1?'':'s')+' ('+ids.map(function(id){return id+' '+lib.seatShortName(byId[id]);}).join(', ')+')'+(rerate?', rerate':'')+(rewrite?', a rewrite asked':'');
lib.appendLog(runDir,{event:'round.announced',round:round,kind:kindKey,to:ids,rerate:rerate,rewrite:rewrite,line:line});
process.stdout.write(line+'\n');
