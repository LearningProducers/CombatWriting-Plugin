// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// run_all.js: the whole suite in one command, the set CI runs (Part 88, 2026-11-02): every
// tests/*_check.js, then the screen's tests under screen/tests/*_check.py through uv on the
// committed lock, then `claude plugin validate --strict` on both plugin folders and the root
// when the CLI is on the PATH. Origin: pull request 136 passed the 39 plugin tests and the
// watchman locally and went red in CI's screen job, on a screen test nobody had run, because
// nothing local ran the screen's tests beside the plugin's. The founder, 2026-11-02: "we want to
// follow through on what an elite dev would do and measure that we did it".
//
//   node tests/run_all.js [--no-screen] [--no-validate]
//
// Run from the repository root. Exit 0 when every test passed, 1 on any failure, and 1 when the
// screen's tests could not run (uv not on the PATH) unless --no-screen says the skip is meant:
// a local run that silently covers less than CI is the defect this file exists to remove. The
// validate step is skipped with a line, never a failure, when `claude` is not on the PATH: it
// is the CLI's own check, and CI runs it on every pull request. One line per test, the
// failures' own lines under theirs, and a last line with the counts, measured by running.
// Not a *_check.js, so CI's loop does not run it.

var fs=require('fs'), path=require('path'), cp=require('child_process');
var root=path.resolve(__dirname,'..');
var args=process.argv.slice(2);
var noScreen=args.indexOf('--no-screen')>=0, noValidate=args.indexOf('--no-validate')>=0;
var passed=0, failed=0, skipped=[];

function run(cmd,cmdArgs,cwd){ return cp.spawnSync(cmd,cmdArgs,{cwd:cwd,encoding:'utf8',env:process.env}); }
function onPath(cmd){ var r=run(process.platform==='win32'?'where':'which',[cmd],root); return r.status===0; }
function report(name,r){
  if(r.error){ failed+=1; console.log('FAIL '+name+' (could not start: '+r.error.message+')'); return; }
  if(r.status===0){ passed+=1; console.log('ok   '+name); return; }
  failed+=1; console.log('FAIL '+name+' (exit '+r.status+')');
  (r.stdout+'\n'+r.stderr).split('\n').filter(function(l){return /FAIL|fail|rror/.test(l);}).slice(0,12).forEach(function(l){ console.log('     '+l); });
}

// The plugin's tests: every tests/*_check.js, in name order.
fs.readdirSync(path.join(root,'tests')).filter(function(f){return /_check\.js$/.test(f);}).sort().forEach(function(f){
  report('tests/'+f,run(process.execPath,[path.join(root,'tests',f)],root));
});

// The screen's tests: screen/tests/*_check.py on the committed lock, as CI's screen job runs them.
var screenDir=path.join(root,'screen');
if(noScreen)skipped.push('screen/tests: skipped by --no-screen');
else if(!fs.existsSync(path.join(screenDir,'tests')))skipped.push('screen/tests: no such folder');
else if(!onPath('uv')){ failed+=1; console.log('FAIL screen/tests: uv is not on the PATH, so the four screen tests did not run; CI runs them (install uv as screen/README.md says, or pass --no-screen to skip on purpose)'); }
else{
  var sync=run('uv',['sync','--frozen'],screenDir);
  if(sync.status!==0){ failed+=1; console.log('FAIL screen: uv sync --frozen failed\n     '+(sync.stderr||'').split('\n').slice(-3).join('\n     ')); }
  else fs.readdirSync(path.join(screenDir,'tests')).filter(function(f){return /_check\.py$/.test(f);}).sort().forEach(function(f){
    report('screen/tests/'+f,run('uv',['run','--frozen','python',path.join(screenDir,'tests',f)],screenDir));
  });
}

// The CLI's own check, when it is here.
if(noValidate)skipped.push('validate: skipped by --no-validate');
else if(!onPath('claude'))skipped.push('validate: skipped, claude is not on the PATH (CI runs it)');
else ['plugins/combat-writing','plugins/combat-writing-crew','.'].forEach(function(p){
  report('validate '+p,run('claude',['plugin','validate','--strict',path.join(root,p)],root));
});

skipped.forEach(function(s){ console.log('skip '+s); });
console.log('run_all: '+passed+' passed, '+failed+' failed, '+skipped.length+' skipped');
process.exit(failed?1:0);
