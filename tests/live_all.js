// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// live_all.js: the five live proofs in one command, and the one line that records their pass.
// Not part of CI: each proof needs a running Claude Code on this machine and spends a few short
// model calls. Run it from a plain terminal before a release that changed a hook, and after a
// Claude Code update.
//
// Why it exists: the plugin's hooks are proved against a real session by five files of this
// folder (no_node_live, seat_scope_live, session_start_live, show_result_live, start_model_live),
// and nothing held that they were run before a release was cut: the hooks named the Claude Code
// version they were proved on, and no check compared it. Now tests/proved_check.js, which CI
// runs, fails a pull request whose hook files differ from the ones the last recorded pass ran
// on. This file makes the pass and prints its record.
//
// What it does: runs the five proofs one after another, each as its own process, and prints the
// last line of each. When all five exit 0 on one Claude Code version it prints one line,
//
//   LIVE-PROOFS {"claude":"<version>","hooks":"<sha256>","proofs":[...],"at":"<date>"}
//
// the record. It writes no file: the line is handed to a build session, which writes it to
// tests/live-proofs.json and moves the version constants to it in the same commit;
// tests/proved_check.js then holds the record, the constants and the hook files to each other.
// A proof that fails, or that cannot run here (exit 2), means no record line.
//
// The hash (hooksHash, also used by tests/proved_check.js): sha256 over the files a live proof
// proves against the host, in a fixed order, each as its path and its bytes: the hooks folder's
// hooks.json, no-node.json and three scripts, and agents/seat.md. The lines that hold a version
// constant (PROVED_ON, START_READ_ON, STARTED_READ_ON) are read with the version left out, so
// moving a constant to the version of a new pass does not itself ask for another pass.
//
// Run from the repo root:   node tests/live_all.js      (CLAUDE_BIN=<path> to pick a binary)
// Exit 0 when all five passed; exit 1 when one failed; exit 2 when one could not be run here.

var fs=require('fs'), path=require('path'), cp=require('child_process'), crypto=require('crypto');
var repo=path.join(__dirname,'..'), plugin=path.join(repo,'plugins','combat-writing');
var PROOFS=['no_node_live','seat_scope_live','session_start_live','show_result_live','start_model_live'];
var PROVED_FILES=['hooks/hooks.json','hooks/no-node.json','hooks/seat-scope.js','hooks/session-start.js','hooks/show-result.js','agents/seat.md'];
var VERSION_LINE=/^(var (?:PROVED_ON|START_READ_ON|STARTED_READ_ON)=)'[^'\n]*';$/gm;
// `read` is the reader of a file by its place in the plugin folder; the test hands its own to try the rule on changed text.
function hooksHash(read){
  read=read||function(rel){ return fs.readFileSync(path.join(plugin,rel),'utf8'); };
  var h=crypto.createHash('sha256');
  PROVED_FILES.forEach(function(rel){
    var text=String(read(rel)).replace(VERSION_LINE,"$1'';");
    h.update(rel+'\n'); h.update(String(Buffer.byteLength(text))+'\n'); h.update(text);
  });
  return h.digest('hex');
}
if(require.main!==module){ module.exports={hooksHash:hooksHash,PROOFS:PROOFS,PROVED_FILES:PROVED_FILES}; return; }

var results=[], versions=[];
PROOFS.forEach(function(name){
  var r=cp.spawnSync(process.execPath,[path.join(__dirname,name+'.js')],{cwd:repo,encoding:'utf8',maxBuffer:64*1024*1024});
  var out=String(r.stdout||'')+String(r.stderr||''), lines=out.trim().split('\n'), last=lines[lines.length-1]||'';
  var v=(/on Claude Code (\d+\.\d+\.\d+)/.exec(last)||[])[1]||null;
  if(v)versions.push(v);
  results.push({name:name,status:r.status,version:v});
  lines.filter(function(l){ return /^(FAIL|measured:)/.test(l); }).forEach(function(l){ console.log('  '+l); });
  console.log(last||(name+': no output, exit '+r.status));
});
var passed=results.filter(function(r){ return r.status===0; }), cannot=results.filter(function(r){ return r.status===2; });
var one=versions.filter(function(v,i,a){ return a.indexOf(v)===i; });
console.log('');
if(passed.length===PROOFS.length&&one.length===1&&versions.length===PROOFS.length){
  console.log('LIVE-PROOFS '+JSON.stringify({claude:one[0],hooks:hooksHash(),proofs:PROOFS,at:new Date().toISOString().slice(0,10)}));
  console.log('All five passed. Hand the line above to the build session: it is the record tests/proved_check.js reads.');
  process.exit(0);
}
console.log('live_all: '+passed.length+' of '+PROOFS.length+' passed'+(cannot.length?', '+cannot.length+' could not run here ('+cannot.map(function(r){ return r.name; }).join(', ')+')':'')+(one.length>1?', on more than one Claude Code version ('+one.join(', ')+')':'')+'. No record line: a record is a pass of all five on one version.');
process.exit(cannot.length&&passed.length+cannot.length===PROOFS.length?2:1);
