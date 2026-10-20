// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// gitignore_check.js: on the first run inside a git repository the plugin writes
// combat-writing/.gitignore with exactly two lines, runs/ and inbox/, says so once in the
// result, never overwrites a file already there, and writes nothing outside a repository
// (issue 36, ruled 2026-10-19).
//
// Runs the REAL new-run.js, champion.js and render-record.js from plugins/combat-writing/scripts
// as child processes in temporary folders (never a re-implementation), one of them made a git
// repository with `git init`. When git is not on PATH the git-status checks are reported as
// skipped; everything else still runs.
//
// What it pins:
//   - In a fresh git repository, new-run.js writes combat-writing/.gitignore holding exactly
//     "runs/\ninbox/\n", logs gitignore.written with the file and the two lines, and prints
//     the run folder alone on stdout.
//   - `git status --porcelain -uall` then shows only combat-writing/.gitignore; after a champion
//     insight it shows that file and combat-writing/insight-vault.md, and nothing else.
//   - The short form of that run carries the ignore-file line once (the first --short), never
//     again (the second), and the log holds gitignore.printed exactly once; the line sits
//     after the crew line and before the scoreboard or the no-rounds line.
//   - A second run in the same repository writes nothing new: the file's bytes and mtime are
//     unchanged, its log holds no gitignore.written, and its short form carries no such line.
//   - A combat-writing/.gitignore already there, with other content, is kept byte for byte,
//     and no log line claims a write.
//   - Outside a git repository nothing is written and nothing is logged.
//   - The help, the plugin README and the repository README carry the gitignore rule in one
//     wording and the first-run sentence in one wording.
//   - new-run.js and lib.js run no command: no child_process (pinned by open_board_check.js
//     too), and the repository is found by a .git entry.
//
// Run from the repo root:   node tests/gitignore_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.join(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var scripts=path.join(plugin,'scripts');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
function node(script,args,cwd){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:cwd,encoding:'utf8'}); }
function logOf(run){ return read(path.join(run,'log.jsonl')).split('\n').filter(Boolean).map(function(l){return JSON.parse(l);}); }
var git=cp.spawnSync('git',['--version'],{encoding:'utf8'}).status===0;
function status(cwd){ return cp.spawnSync('git',['status','--porcelain','-uall'],{cwd:cwd,encoding:'utf8'}).stdout.split('\n').filter(Boolean).sort(); }
var IGNORE_LINE='Wrote combat-writing/.gitignore with two lines, runs/ and inbox/, so the runs and the inbox stay out of git and the vault stays with the project; a file already there is never overwritten.';

function project(name){ var p=fs.mkdtempSync(path.join(os.tmpdir(),'cw-gitignore-'+name+'-')); fs.writeFileSync(path.join(p,'draft.md'),'Dear board,\n\nBuy the company.\n'); fs.writeFileSync(path.join(p,'brief.md'),'CEO. Get a yes.\n'); return p; }

// A fresh git repository.
var repo=project('repo');
if(git){
  var init=cp.spawnSync('git',['init','-q'],{cwd:repo,encoding:'utf8'});
  check(init.status===0,'git init: exit '+init.status+' '+init.stderr);
  // The fixture's draft and brief are committed first, so the status after a run shows the plugin's writes alone.
  cp.spawnSync('git',['add','-A'],{cwd:repo});
  var c=cp.spawnSync('git',['-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','-q','-m','fixture'],{cwd:repo,encoding:'utf8'});
  check(c.status===0&&status(repo).length===0,'git commit of the fixture: exit '+c.status+' '+c.stderr+'; status '+JSON.stringify(status(repo)));
}else fs.mkdirSync(path.join(repo,'.git'));
var r1=node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','first','--stage','strategy','--model','Test Model'],repo);
check(r1.status===0&&r1.stdout.trim().split('\n').length===1&&fs.existsSync(r1.stdout.trim()),'new-run (repo): must print the run folder alone; got '+r1.status+' '+JSON.stringify(r1.stdout)+r1.stderr);
var run1=r1.stdout.trim();
var ignoreFile=path.join(repo,'combat-writing','.gitignore');
check(fs.existsSync(ignoreFile)&&read(ignoreFile)==='runs/\ninbox/\n','gitignore: must hold exactly "runs/\\ninbox/\\n"; got '+JSON.stringify(fs.existsSync(ignoreFile)?read(ignoreFile):null));
var w=logOf(run1).filter(function(e){return e.event==='gitignore.written';});
check(w.length===1&&w[0].file==='combat-writing/.gitignore'&&JSON.stringify(w[0].lines)==='["runs/","inbox/"]','gitignore: one gitignore.written line with the file and the two lines; got '+JSON.stringify(w));
if(git)check(JSON.stringify(status(repo))==='["?? combat-writing/.gitignore"]','git status after the first run: must show only combat-writing/.gitignore; got '+JSON.stringify(status(repo)));
else console.log('note: git not on PATH; the git status checks were skipped here (CI runs them)');

// The short form says so once.
var s1=node('render-record.js',['--run',run1,'--short'],repo);
var lines1=s1.stdout.split('\n');
check(s1.status===0&&lines1.indexOf(IGNORE_LINE)>0&&lines1.indexOf(IGNORE_LINE)<lines1.findIndex(function(l){return /^No rounds yet/.test(l);})&&lines1.indexOf(IGNORE_LINE)>lines1.findIndex(function(l){return l.indexOf('**Crew:**')===0;}),'short form (first): must carry the ignore-file line after the crew line and before the no-rounds line; got\n'+s1.stdout);
var s2=node('render-record.js',['--run',run1,'--short'],repo);
check(s2.status===0&&s2.stdout.indexOf(IGNORE_LINE)<0,'short form (second): must not carry the ignore-file line again');
check(logOf(run1).filter(function(e){return e.event==='gitignore.printed';}).length===1,'log: gitignore.printed exactly once');
check(!/\.gitignore/.test(read(path.join(run1,'record.md'))),'record.md: carries no ignore-file line (it is said in the terminal once)');

// After an insight: the vault beside the ignore file, nothing else.
fs.mkdirSync(path.join(repo,'combat-writing','inbox'),{recursive:true});
fs.writeFileSync(path.join(repo,'combat-writing','inbox','i.insight.md'),'Lead with the ask.\n');
var ins=node('champion.js',['--run',run1,'--kind','insight','--file','combat-writing/inbox/i.insight.md'],repo);
check(ins.status===0&&fs.existsSync(path.join(repo,'combat-writing','insight-vault.md')),'champion insight: exit '+ins.status+' '+ins.stderr);
if(git)check(JSON.stringify(status(repo))==='["?? combat-writing/.gitignore","?? combat-writing/insight-vault.md"]','git status after an insight: must show the ignore file and the vault only; got '+JSON.stringify(status(repo)));

// A second run writes nothing new.
var st=fs.statSync(ignoreFile);
var r2=node('new-run.js',['--draft','draft.md','--name','second','--stage','sparring','--model','Test Model'],repo);
check(r2.status===0,'new-run (second): exit '+r2.status+' '+r2.stderr);
var run2=r2.stdout.trim();
var st2=fs.statSync(ignoreFile);
check(read(ignoreFile)==='runs/\ninbox/\n'&&st2.mtimeMs===st.mtimeMs,'second run: the ignore file must be untouched');
check(!logOf(run2).some(function(e){return /^gitignore\./.test(e.event);}),'second run: its log must hold no gitignore line');
var s3=node('render-record.js',['--run',run2,'--short'],repo);
check(s3.status===0&&s3.stdout.indexOf(IGNORE_LINE)<0,'second run: its short form must carry no ignore-file line');
if(git)check(JSON.stringify(status(repo))==='["?? combat-writing/.gitignore","?? combat-writing/insight-vault.md"]','git status after the second run: unchanged; got '+JSON.stringify(status(repo)));

// A file already there is kept.
var kept=project('kept');
if(git)cp.spawnSync('git',['init','-q'],{cwd:kept}); else fs.mkdirSync(path.join(kept,'.git'));
fs.mkdirSync(path.join(kept,'combat-writing'),{recursive:true});
var mine='# mine\nruns/\n';
fs.writeFileSync(path.join(kept,'combat-writing','.gitignore'),mine);
var rk=node('new-run.js',['--draft','draft.md','--name','kept','--stage','battle','--model','Test Model'],kept);
check(rk.status===0&&read(path.join(kept,'combat-writing','.gitignore'))===mine,'kept: a file already there must be byte-identical after the run');
check(!logOf(rk.stdout.trim()).some(function(e){return e.event==='gitignore.written';}),'kept: no gitignore.written line');
check(node('render-record.js',['--run',rk.stdout.trim(),'--short'],kept).stdout.indexOf(IGNORE_LINE)<0,'kept: the short form must not claim a write');

// Outside a repository: nothing.
var none=project('none');
var lib=require(path.join(scripts,'lib.js'));
if(lib.inGitRepo(none))console.log('note: the temporary folder sits inside a git repository; the outside-a-repository checks were skipped here');
else{
  var rn=node('new-run.js',['--draft','draft.md','--name','none','--stage','sparring','--model','Test Model'],none);
  check(rn.status===0&&!fs.existsSync(path.join(none,'combat-writing','.gitignore')),'outside a repository: no ignore file may be written');
  check(!logOf(rn.stdout.trim()).some(function(e){return /^gitignore\./.test(e.event);}),'outside a repository: no gitignore line in the log');
}
check(lib.inGitRepo(root)===true&&lib.GITIGNORE_LINES.join(',')==='runs/,inbox/','lib: inGitRepo finds this repository and the two lines are runs/ and inbox/');

// The text: one wording for the rule and for the first-run sentence, in three places.
var RULE='ignore `combat-writing/runs/` and `combat-writing/inbox/`, never `combat-writing/`, so the vault stays with the project';
var FIRST='On the first run inside a git repository, the plugin writes `combat-writing/.gitignore` with exactly two lines, `runs/` and `inbox/`, and says so once in the result; a file already there is never overwritten.';
[['help',path.join(plugin,'skills','help','SKILL.md')],['plugin README',path.join(plugin,'README.md')],['repository README',path.join(root,'README.md')]].forEach(function(p){
  var t=read(p[1]);
  check(t.indexOf(RULE)>=0,p[0]+': must carry the gitignore rule in its one wording');
  check(t.indexOf(FIRST)>=0,p[0]+': must carry the first-run sentence in its one wording');
});
// The source: no command run.
['new-run.js','lib.js'].forEach(function(n){ check(!/require\(['"]child_process['"]\)/.test(read(path.join(scripts,n))),n+': must run no command'); });

[repo,kept,none].forEach(function(d){ fs.rmSync(d,{recursive:true,force:true}); });
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'gitignore_check: '+failures.length+' failure(s), ':'gitignore_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
