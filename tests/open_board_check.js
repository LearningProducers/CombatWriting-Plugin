// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// open_board_check.js: open-board.js opens a run's board.html with the system's own opener,
// a local file, never published, and never blocks the result (2026-10-14: the board is the
// result).
//
// Runs the REAL new-run.js, render-board.js and open-board.js from plugins/combat-writing/scripts
// as child processes in a temporary project (never a re-implementation). No browser is opened:
// the opener is a fake script or a dry run.
//
// What it pins:
//   - --dry-run prints the command it would run, the platform's opener (open on macOS,
//     cmd /c start on Windows, xdg-open elsewhere) with the board's path last, runs nothing,
//     and logs board.opened with dry_run true.
//   - --opener "<command>" runs that command with the board's path appended: a fake opener
//     (a Node script) receives the path and writes it to a file; the script prints "Board opened
//     in your browser: <path>", exits 0, and logs board.opened with ok true.
//   - An opener that does not exist: the script prints "Board: <path> (no browser opener here:
//     ENOENT; open it in any browser)", still exits 0, and logs ok false with the reason.
//   - The opener gets the local path and nothing else: no URL, no publish, no network.
//   - A run with no board.html exits 2 and names render-board.js; a missing --run exits 2.
//   - The listed plugin's scripts require child_process in open-board.js only, and it spawns
//     no command but the three openers or the --opener given.
//
// Run from the repo root:   node tests/open_board_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var scripts=path.join(__dirname,'..','plugins','combat-writing','scripts');
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-open-'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function node(script,argv,opts){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(argv),Object.assign({cwd:proj,encoding:'utf8'},opts||{})); }
function readLog(run){ return fs.readFileSync(path.join(run,'log.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(function(l){return JSON.parse(l);}); }

fs.writeFileSync(path.join(proj,'draft.md'),'Dear board,\n\nWe should buy the company.\n');
var nr=node('new-run.js',['--draft','draft.md','--name','open','--stage','sparring','--model','Test Model 1.0']);
check(nr.status===0,'new-run: exit '+nr.status+' '+nr.stderr);
var run=nr.stdout.trim();

// No board yet: exit 2, naming render-board.js.
var none=node('open-board.js',['--run',run]);
check(none.status===2&&/render-board\.js/.test(none.stderr),'open-board with no board.html should exit 2 and name render-board.js, got '+none.status+' '+none.stderr);
check(node('open-board.js',[]).status===2,'open-board with no --run should exit 2');

var rb=node('render-board.js',['--run',run]);
check(rb.status===0,'render-board: exit '+rb.status+' '+rb.stderr);
var board=path.join(run,'board.html');

// Dry run: the platform's opener, the path last, nothing run.
var dry=node('open-board.js',['--run',run,'--dry-run']);
var expected=process.platform==='darwin'?'open '+board:process.platform==='win32'?'cmd /c start  '+board:'xdg-open '+board;
check(dry.status===0&&dry.stdout.trim()==='would run: '+expected,'dry run: expected "would run: '+expected+'", got '+JSON.stringify(dry.stdout.trim()));
var e1=readLog(run).filter(function(e){return e.event==='board.opened';}).pop();
check(e1&&e1.dry_run===true&&e1.ok===true&&e1.file==='board.html','dry run: board.opened log line wrong: '+JSON.stringify(e1));

// A fake opener: a Node script that writes its arguments to a file.
var fake=path.join(proj,'fake-opener.js'), got=path.join(proj,'opened.txt');
fs.writeFileSync(fake,'require("fs").writeFileSync('+JSON.stringify(got)+',JSON.stringify(process.argv.slice(2)));\n');
var ok=node('open-board.js',['--run',run,'--opener',process.execPath+' '+fake]);
check(ok.status===0&&ok.stdout.trim()==='Board opened in your browser: '+board,'fake opener: expected the opened line, got exit '+ok.status+' '+JSON.stringify(ok.stdout.trim())+' '+ok.stderr);
var deadline=Date.now()+5000; while(!fs.existsSync(got)&&Date.now()<deadline){ cp.spawnSync(process.execPath,['-e','setTimeout(function(){},50)']); }
var argv=fs.existsSync(got)?JSON.parse(fs.readFileSync(got,'utf8')):null;
check(argv&&argv.length===1&&argv[0]===board,'fake opener: should receive the board path and nothing else, got '+JSON.stringify(argv));
var e2=readLog(run).filter(function(e){return e.event==='board.opened';}).pop();
check(e2&&e2.ok===true&&e2.dry_run===false&&e2.opener===process.execPath,'fake opener: board.opened log line wrong: '+JSON.stringify(e2));

// An opener that does not exist: the fallback line, exit 0.
var missing=node('open-board.js',['--run',run,'--opener',path.join(proj,'no-such-opener')]);
check(missing.status===0&&missing.stdout.trim()==='Board: '+board+' (no browser opener here: ENOENT; open it in any browser)','missing opener: expected the fallback line and exit 0, got '+missing.status+' '+JSON.stringify(missing.stdout.trim()));
var e3=readLog(run).filter(function(e){return e.event==='board.opened';}).pop();
check(e3&&e3.ok===false&&e3.reason==='ENOENT','missing opener: board.opened should log ok false with ENOENT, got '+JSON.stringify(e3));

// The source: child_process in open-board.js alone, no network, no URL, only the three openers.
var src=fs.readFileSync(path.join(scripts,'open-board.js'),'utf8');
check(!/\b(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(src)&&!/require\(['"](https?|net|dgram)['"]\)/.test(src)&&!/\bfetch\(/.test(src),'open-board.js: must make no network call');
check(/cmd='open'/.test(src)&&/cmd='xdg-open'/.test(src)&&/cmd='cmd'/.test(src),'open-board.js: the three openers must be named');
fs.readdirSync(scripts).filter(function(n){return /\.js$/.test(n)&&n!=='open-board.js';}).forEach(function(n){
  check(!/require\(['"]child_process['"]\)/.test(fs.readFileSync(path.join(scripts,n),'utf8')),n+': only open-board.js may require child_process');
});

failures.forEach(function(f){ process.stdout.write('FAIL '+f+'\n'); });
process.stdout.write('open_board_check: '+(failures.length?failures.length+' failure(s), ':'all passed, ')+(passes+failures.length)+' checks\n');
process.exit(failures.length?1:0);
