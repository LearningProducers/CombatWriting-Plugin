// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// render-state.js: the run as one JSON object (Part 43, 2026-10-21), the one source every
// presentation over a run reads: the screen first, any later one over the same data.
//
//   node render-state.js --run <run folder> [--write]
//
// Built by lib.runState from the files and log.jsonl, with the functions the record and the
// board use (the cells, the latest rating per seat, the band, the final reads, the round task
// in words, the draft's counts, the champion lines): nothing is averaged, a 7 or a number that
// contradicts its words is a failed read and never a rating, and the credit line is nowhere
// (ruled 2026-10-12). The shape (schema 1): run, drafts, brief, reader (Part 84), canons, seats, crew_line,
// seats_lines, seat_key, briefing (null until Part 45), rounds (each with its task, who it was
// put to, who answered, the packets built and one cell per seat), latest, latest_turn, band,
// champion, next_line, legend, and where the board and the record are.
//
// Without --write it prints the JSON and touches nothing: no file, no log line, so a watcher
// that renders on every change never renders itself into a loop. With --write it saves
// state.json in the run folder, appends state.rendered to the log and prints the file's path.
// A folder with no seats.json exits 2.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
if(!args.run||args.run===true)lib.die('--run is required');
var runDir=path.resolve(args.run);
if(!fs.existsSync(path.join(runDir,'seats.json')))lib.die('not a run folder (no seats.json): '+runDir);
var state=lib.runState(runDir);
var text=JSON.stringify(state,null,2)+'\n';
if(args.write===true){
  fs.writeFileSync(path.join(runDir,lib.STATE_FILE),text);
  lib.appendLog(runDir,{event:'state.rendered',file:lib.STATE_FILE,rounds:state.rounds.length});
  process.stdout.write(path.join(runDir,lib.STATE_FILE)+'\n');
}else process.stdout.write(text);
