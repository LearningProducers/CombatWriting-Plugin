// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// provenance_check.js: the shipped folders carry the rule, never the ruling (issue 151). Every
// file under plugins/combat-writing/ and plugins/combat-writing-crew/ is installed on a
// stranger's machine and read by the model at run time; the record of who decided a rule, when
// and in which issue belongs in PLAN.md and the pull request that shipped it, never there.
//
// What it pins:
//   - No line of any tracked file under the two plugin folders matches the word "ruled" or the
//     word "founder", case-insensitive, as a whole word, except a line that carries the credit
//     line's name of the company and the person ("Learning Producers Inc., Israel Hernandez,
//     founder"): the credit line in the help skill and the method text, and the Required Notice
//     and the attribution designation in NOTICE. That is the authorship disclosure, not provenance.
//   - CLAUDE.md states the rule under Standing rules.
//
// Run from the repository root:   node tests/provenance_check.js
// Exit 0 on pass; exit 1 on any failure, one printed line per hit, the file and the line.

var fs=require('fs'), path=require('path'), cp=require('child_process');
var root=path.resolve(__dirname,'..');
var FOLDERS=['plugins/combat-writing','plugins/combat-writing-crew'];
var CREDIT='Learning Producers Inc., Israel Hernandez, founder';
var WORDS=/\b(ruled|founder)\b/i;

var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }

// The tracked files, from git; every file under the folders when git cannot answer.
function tracked(folder){
  var r=cp.spawnSync('git',['ls-files','-z','--',folder],{cwd:root,encoding:'utf8'});
  if(r.status===0&&r.stdout)return r.stdout.split('\0').filter(Boolean);
  var out=[]; (function walk(d){ fs.readdirSync(d).forEach(function(n){ var p=path.join(d,n); if(fs.statSync(p).isDirectory())walk(p); else out.push(path.relative(root,p)); }); })(path.join(root,folder));
  return out;
}

var files=[]; FOLDERS.forEach(function(f){ files=files.concat(tracked(f)); });
check(files.length>20,'fewer than 21 tracked files found under the plugin folders: '+files.length);
files.forEach(function(rel){
  var text; try{ text=fs.readFileSync(path.join(root,rel),'utf8'); }catch(e){ return; }
  text.split('\n').forEach(function(line,i){
    if(WORDS.test(line)&&line.indexOf(CREDIT)<0)failures.push(rel+':'+(i+1)+': '+line.trim().slice(0,120));
  });
});
passes+=files.length;

var claude=fs.readFileSync(path.join(root,'CLAUDE.md'),'utf8');
check(/A file under plugins\/ carries the rule, never the ruling/.test(claude)&&/tests\/provenance_check\.js refuses it/.test(claude),'CLAUDE.md: the standing rule is missing');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'provenance_check: '+failures.length+' failure(s), ':'provenance_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
