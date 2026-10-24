// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// open-board.js: opens a run's board.html in the person's browser (2026-10-14: the board is
// the result). A local file, opened with the system's own opener, never published anywhere.
//
//   node open-board.js --run <run folder> [--opener "<command>"] [--dry-run]
//
// The opener: `open` on macOS, `cmd /c start "" <path>` on Windows, `xdg-open` elsewhere;
// --opener names another command (split on spaces, the path appended), which the tests use
// with a fake. --dry-run prints the command it would run and runs nothing.
//
// The opener's exit is read (issue 54, 2026-10-24). An opener hands the file to the browser and
// exits within a moment (`open` and `cmd /c start` return at once; `xdg-open` when its handler
// returns), so the script waits up to EXIT_WAIT_MS for that exit: 0 is opened; any other code is
// a failure, named with the opener's first stderr line, so a shell with no desktop (Claude Code's
// sandbox has no Launch Services: measured 2026-10-24, macOS `open` exits 1 there with
// kLSNoExecutableErr, and the earlier detached spawn printed "opened" over it) is reported as
// what it is, with the command the person can run by hand outside that shell. An opener still
// running at the deadline is a browser holding the process: it is released and counted as opened.
//
// Prints one line: "Board opened in your browser: <path>" when the opener exited 0 or is still
// running at the deadline; "Board: <path> (the opener failed: <reason>; open it yourself:
// <command>)" when it exited otherwise; "Board: <path> (no browser opener here: <reason>; open it
// in any browser)" when it could not be started at all (ENOENT). Either way the exit code is 0,
// so a host without a browser (a cloud session, a container) still shows the result; only a
// missing --run or a missing board.html exits 2. Appends board.opened to the run's log when the
// run has one: ok true or false, the reason (null on a plain success).

var fs=require('fs'), path=require('path'), cp=require('child_process');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
if(!args.run||args.run===true)lib.die('--run is required');
var runDir=path.resolve(args.run);
var board=path.join(runDir,lib.BOARD_FILE);
if(!fs.existsSync(board))lib.die('no '+lib.BOARD_FILE+' in '+runDir+'; run render-board.js first');

var EXIT_WAIT_MS=3000;
var REASON_MAX=200;

var cmd, argv;
if(args.opener&&args.opener!==true){ var parts=String(args.opener).trim().split(/\s+/); cmd=parts[0]; argv=parts.slice(1).concat([board]); }
else if(process.platform==='darwin'){ cmd='open'; argv=[board]; }
else if(process.platform==='win32'){ cmd='cmd'; argv=['/c','start','',board]; }
else { cmd='xdg-open'; argv=[board]; }
// The command as the person would type it: each word quoted when it carries whitespace or is empty.
var tried=[cmd].concat(argv).map(function(w){return /\s/.test(w)||w===''?'"'+w+'"':w;}).join(' ');

function log(ok,reason){
  if(fs.existsSync(path.join(runDir,'log.jsonl')))lib.appendLog(runDir,{event:'board.opened',file:lib.BOARD_FILE,opener:cmd,ok:ok,reason:reason||null,dry_run:args['dry-run']===true});
}
if(args['dry-run']===true){
  log(true,'dry run');
  process.stdout.write('would run: '+[cmd].concat(argv).join(' ')+'\n');
  process.exit(0);
}
var settled=false, stderr='';
function finish(ok,reason,line){
  if(settled)return;
  settled=true;
  log(ok,reason);
  process.stdout.write(line+'\n');
  process.exit(0);
}
function opened(reason){ finish(true,reason,'Board opened in your browser: '+board); }
function notStarted(reason){ finish(false,reason,'Board: '+board+' (no browser opener here: '+reason+'; open it in any browser)'); }
function failed(reason){ finish(false,reason,'Board: '+board+' (the opener failed: '+reason+'; open it yourself: '+tried+')'); }

var child;
try{
  child=cp.spawn(cmd,argv,{detached:true,stdio:['ignore','ignore','pipe'],windowsHide:true});
}catch(e){ notStarted(e&&e.code?e.code:String(e)); }
if(child){
  child.stderr.setEncoding('utf8');
  child.stderr.on('data',function(d){ if(stderr.length<4096)stderr+=d; });
  child.on('error',function(e){ notStarted(e&&e.code?e.code:String(e)); });
  child.on('exit',function(code,signal){
    if(code===0)return opened(null);
    var first=stderr.split('\n').map(function(l){return l.trim();}).filter(Boolean)[0]||'';
    if(first.length>REASON_MAX)first=first.slice(0,REASON_MAX)+'...';
    var how=code===null?'signal '+signal:'exit '+code;
    failed(first?first+' ('+how+')':how);
  });
  setTimeout(function(){
    try{child.stderr.destroy();}catch(e){}
    child.unref();
    opened('still running after '+EXIT_WAIT_MS+' ms; released');
  },EXIT_WAIT_MS);
}
