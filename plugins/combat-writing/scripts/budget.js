// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// budget.js: measures the price of a round once its packets are built, before any seat starts, and
// warns only when a seat's packet will be refused.
//
//   node budget.js --run <run folder> --round <nn-kind> [--pass crew]
//
// Issue 95 (2026-10-27): "Too long to send" came after the send, and nothing said what a round cost.
// Reads the round's packet.built lines (their `size`, written by packet.js) and the budget
// crew_register wrote on each outside seat (lib.roundBudget), and logs budget.measured with the
// numbers and the line (lib.budgetLine: the largest packet's tokens by part, each provider's wall
// and the room left). The founder's ruling the same day: the measurement is accessible, not
// presented; the user does not need to know how the sausage is made. So the line goes to the
// record's What was sent and the board's Run details, and this script prints NOTHING unless a
// seat's packet is over the room, when it prints the one warning (lib.budgetWarning) that must be
// known before the send. `--pass crew` reads the second pass's packets. Writes nothing but the log
// line. Exit 2 on misuse, 1 when no packet of the round has a size (built before this script
// existed).

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
var line=lib.budgetLine(b), warning=lib.budgetWarning(b);
lib.appendLog(runDir,{event:'budget.measured',round:round,pass:pass,largest:{seat:b.largest.seat,mode:b.largest.mode,tokens:b.largest.size.tokens,chars:b.largest.size.chars,parts:b.largest.size.parts},
  packets:b.packets.map(function(p){return {seat:p.seat,mode:p.mode,tokens:p.size.tokens};}),walls:b.walls,line:line,warning:warning});
if(warning)process.stdout.write(warning+'\n');
