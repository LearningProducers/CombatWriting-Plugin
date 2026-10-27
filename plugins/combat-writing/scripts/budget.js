// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// budget.js: the price of a round, printed after its packets are built and before any seat starts.
//
//   node budget.js --run <run folder> --round <nn-kind> [--pass crew]
//
// Issue 95 (2026-10-27): "Too long to send" came after the send, and nothing on the screen said what
// a round cost. Reads the round's packet.built lines (their `size`, written by packet.js) and the
// budget crew_register wrote on each outside seat (lib.roundBudget), and prints one line
// (lib.budgetLine): the largest packet's estimated tokens and its parts, then for each provider the
// wall its seats spend from and the room left, or which seat's packet the add-on will refuse and by
// how much. With no outside seat, the sizes alone. `--pass crew` reads the second pass's packets.
// Logs budget.printed with the numbers. Writes nothing but the log line. Exit 2 on misuse, 1 when no
// packet of the round has a size (built before this script existed).

var path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
['run','round'].forEach(function(k){ if(!args[k]||args[k]===true)lib.die('--'+k+' is required'); });
var runDir=path.resolve(args.run);
var round=String(args.round).trim();
if(!/^\d\d-(sparring|debate|battle|final)$/.test(round))lib.die('--round must be <nn>-sparring|debate|battle|final; got '+round);
var pass=args.pass&&args.pass!==true?String(args.pass):null;
if(pass&&pass!=='crew')lib.die('--pass must be crew; got '+pass);
var b=lib.roundBudget(runDir,round,{pass:pass});
if(!b.largest){ process.stderr.write('budget: no packet with a size for round '+round+(pass?' ('+pass+' pass)':'')+'\n'); process.exit(1); }
var line=lib.budgetLine(b);
lib.appendLog(runDir,{event:'budget.printed',round:round,pass:pass,largest:{seat:b.largest.seat,mode:b.largest.mode,tokens:b.largest.size.tokens,chars:b.largest.size.chars,parts:b.largest.size.parts},
  packets:b.packets.map(function(p){return {seat:p.seat,mode:p.mode,tokens:p.size.tokens};}),walls:b.walls,line:line});
process.stdout.write(line+'\n');
