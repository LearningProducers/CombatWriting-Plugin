// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// open-board.js: opens a run's board.html in the person's browser (2026-10-14: the board is
// the result). A local file, opened with the system's own opener, never published anywhere.
//
//   node open-board.js --run <run folder> [--opener "<command>"] [--dry-run]
//
// The opener: `open` on macOS, `cmd /c start "" <path>` on Windows, `xdg-open` elsewhere;
// --opener names another command (split on spaces, the path appended), which the tests use
// with a fake. --dry-run prints the command it would run and runs nothing. The browser is
// started detached, with no pipe, and this script does not wait for it.
//
// Prints one line: "Board opened in your browser: <path>" when the opener started, else
// "Board: <path> (no browser opener here: <reason>; open it in any browser)". Either way the
// exit code is 0, so a host without a browser (a cloud session, a container) still shows the
// result; only a missing --run or a missing board.html exits 2. Appends board.opened to the
// run's log when the run has one.

var fs=require('fs'), path=require('path'), cp=require('child_process');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
if(!args.run||args.run===true)lib.die('--run is required');
var runDir=path.resolve(args.run);
var board=path.join(runDir,lib.BOARD_FILE);
if(!fs.existsSync(board))lib.die('no '+lib.BOARD_FILE+' in '+runDir+'; run render-board.js first');

var cmd, argv;
if(args.opener&&args.opener!==true){ var parts=String(args.opener).trim().split(/\s+/); cmd=parts[0]; argv=parts.slice(1).concat([board]); }
else if(process.platform==='darwin'){ cmd='open'; argv=[board]; }
else if(process.platform==='win32'){ cmd='cmd'; argv=['/c','start','',board]; }
else { cmd='xdg-open'; argv=[board]; }

function log(ok,reason){
  if(fs.existsSync(path.join(runDir,'log.jsonl')))lib.appendLog(runDir,{event:'board.opened',file:lib.BOARD_FILE,opener:cmd,ok:ok,reason:reason||null,dry_run:args['dry-run']===true});
}
if(args['dry-run']===true){
  log(true,'dry run');
  process.stdout.write('would run: '+[cmd].concat(argv).join(' ')+'\n');
  process.exit(0);
}
var child;
try{
  child=cp.spawn(cmd,argv,{detached:true,stdio:'ignore',windowsHide:true});
}catch(e){ fail(e&&e.code?e.code:String(e)); }
function fail(reason){
  log(false,reason);
  process.stdout.write('Board: '+board+' (no browser opener here: '+reason+'; open it in any browser)\n');
  process.exit(0);
}
if(child){
  child.on('error',function(e){ fail(e&&e.code?e.code:String(e)); });
  child.on('spawn',function(){
    child.unref();
    log(true);
    process.stdout.write('Board opened in your browser: '+board+'\n');
    process.exit(0);
  });
}
