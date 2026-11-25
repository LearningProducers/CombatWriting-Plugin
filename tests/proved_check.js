// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// proved_check.js: the hooks were proved live before this change is released (issue 261).
// The plugin's hooks are proved against a real Claude Code session by the five live proofs of
// this folder, which CI cannot run. Until this check, a hook could change and a release be cut
// with no proof run: the hooks named the version they were last proved on, and nothing compared
// it. Now a pass of the five on one Claude Code version is a record, tests/live-proofs.json, one
// line that tests/live_all.js prints, and this check holds three things to each other: the
// record, the hook files, and the version constants.
//
// What it pins:
//   - tests/live-proofs.json is there and whole: the Claude Code version, the hash of the hook
//     files the pass ran on, the five proofs by name, the date.
//   - The hash in the record is the hash of the hook files as they stand (hooksHash in
//     tests/live_all.js: hooks.json, no-node.json, the three hook scripts and agents/seat.md).
//     A hook file changed since the recorded pass fails this check, with the command to run.
//   - The version constants name the record's version: PROVED_ON and START_READ_ON in
//     hooks/seat-scope.js, PROVED_ON and STARTED_READ_ON in hooks/show-result.js, PROVED_ON in
//     tests/session_start_live.js.
//   - The hash's own rule: a version constant moved changes nothing; any other byte of a hook
//     file changed, a file left out, or two files' text swapped, changes it.
//   - Every *_live.js file of this folder is one of the five the runner runs, and the reverse.
//
// Run from the repo root:   node tests/proved_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path');
var root=path.join(__dirname,'..'), plugin=path.join(root,'plugins','combat-writing');
var live=require('./live_all.js');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
var RUN='run `node tests/live_all.js` from a plain terminal and hand its LIVE-PROOFS line to a build session, which writes it to tests/live-proofs.json and moves the version constants to it';

// The runner and the folder agree on which files are live proofs.
var onDisk=fs.readdirSync(__dirname).filter(function(n){ return /_live\.js$/.test(n); }).map(function(n){ return n.replace(/\.js$/,''); }).sort();
check(onDisk.join(',')===live.PROOFS.slice().sort().join(','),'tests/live_all.js runs '+live.PROOFS.join(', ')+'; the folder holds '+onDisk.join(', ')+': the two must be the same files');

// The hash's own rule, tried on text of the test's own.
function reader(change){ return function(rel){ var t=fs.readFileSync(path.join(plugin,rel),'utf8'); return change?change(rel,t):t; }; }
var now=live.hooksHash();
check(/^[0-9a-f]{64}$/.test(now)&&now===live.hooksHash(reader(null)),'hooksHash: a sha256 in hex, the same on two reads');
check(now===live.hooksHash(reader(function(rel,t){ return t.replace(/^var PROVED_ON='[^']*';$/m,"var PROVED_ON='9.9.9';").replace(/^var START_READ_ON='[^']*';$/m,"var START_READ_ON='9.9.9';").replace(/^var STARTED_READ_ON='[^']*';$/m,"var STARTED_READ_ON='9.9.9';"); })),'hooksHash: moving a version constant must not change the hash');
live.PROVED_FILES.forEach(function(file){
  check(now!==live.hooksHash(reader(function(rel,t){ return rel===file?t+' ':t; })),'hooksHash: one byte added to '+file+' must change the hash');
});
check(now!==live.hooksHash(reader(function(rel,t){ return rel==='hooks/seat-scope.js'?t.replace("var SEAT_TYPE='cw:seat';","var SEAT_TYPE='cw:seat' ;"):t; })),'hooksHash: a change on a line that holds no version constant must change the hash');
var a=live.PROVED_FILES[2], b=live.PROVED_FILES[4];
check(now!==live.hooksHash(reader(function(rel,t){ return rel===a?fs.readFileSync(path.join(plugin,b),'utf8'):rel===b?fs.readFileSync(path.join(plugin,a),'utf8'):t; })),'hooksHash: two files\' text swapped must change the hash');
check(live.PROVED_FILES.join(',')==='hooks/hooks.json,hooks/no-node.json,hooks/seat-scope.js,hooks/session-start.js,hooks/show-result.js,agents/seat.md'&&fs.readdirSync(path.join(plugin,'hooks')).sort().join(',')==='hooks.json,no-node.json,seat-scope.js,session-start.js,show-result.js','hooksHash: the files hashed are every file of the hooks folder and the agent file; the folder holds '+fs.readdirSync(path.join(plugin,'hooks')).sort().join(','));

// The record.
var recordFile=path.join(__dirname,'live-proofs.json'), record=null, raw=null;
try{ raw=fs.readFileSync(recordFile,'utf8'); record=JSON.parse(raw); }catch(e){}
check(raw!==null,'tests/live-proofs.json is not there: no pass of the five live proofs is on record for these hooks; '+RUN);
if(raw!==null){
  var whole=!!record&&typeof record==='object'&&!Array.isArray(record)&&Object.keys(record).sort().join(',')==='at,claude,hooks,proofs'&&/^\d+\.\d+\.\d+$/.test(String(record.claude))&&/^[0-9a-f]{64}$/.test(String(record.hooks))&&Array.isArray(record.proofs)&&record.proofs.join(',')===live.PROOFS.join(',')&&/^\d{4}-\d\d-\d\d$/.test(String(record.at));
  check(whole,'tests/live-proofs.json must be the one line tests/live_all.js prints: the Claude Code version, the hash of the hook files, the five proofs by name and the date; it holds '+String(raw).slice(0,300));
  if(whole){
    check(record.hooks===now,'the hook files changed since the live proofs last passed (on Claude Code '+record.claude+', '+record.at+'): the record holds '+record.hooks.slice(0,12)+', the files hash to '+now.slice(0,12)+'; '+RUN);
    [['plugins/combat-writing/hooks/seat-scope.js','PROVED_ON'],['plugins/combat-writing/hooks/seat-scope.js','START_READ_ON'],['plugins/combat-writing/hooks/show-result.js','PROVED_ON'],['plugins/combat-writing/hooks/show-result.js','STARTED_READ_ON'],['tests/session_start_live.js','PROVED_ON']].forEach(function(c){
      var v=((new RegExp("^var "+c[1]+"='([^']*)';$",'m')).exec(fs.readFileSync(path.join(root,c[0]),'utf8'))||[])[1];
      check(v===record.claude,c[0]+': '+c[1]+' is '+JSON.stringify(v)+'; the live proofs last passed on Claude Code '+record.claude+', and the constant names that version');
    });
  }
}

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'proved_check: '+failures.length+' failure(s), ':'proved_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
