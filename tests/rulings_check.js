// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// rulings_check.js: CLAUDE.md is a short wall and RULINGS.md is its record (issue 224). The
// section "What is ruled about the method" had grown to 28 one-line entries, each mixing the rule
// a builder must keep, the test that holds it and the record of how it was ruled, and every build
// session read all of it at its start. The 28 entries moved word for word to RULINGS.md; the
// section keeps one bullet per entry, and each bullet ends by naming what holds it.
//
// What it pins:
//   - No word lost. The first 28 lines of RULINGS.md that start with "- ", in order, hash to the
//     28 values below: the sha256 of the line's bytes in UTF-8, from its "- " to its end, no line
//     ending. They are the 28 entries as CLAUDE.md held them at a7fade2, eight of them changed once
//     since (issue 245: a decision stated in plain words where the entry had quoted the words it
//     was made in), their hashes set again in that commit. A later ruling is a new
//     entry after them and is not hashed here.
//   - The wall names what holds it. Every bullet of the section (a line that starts with "- ",
//     one bullet a line) ends with one of two closing clauses: "Held by: tests/<name>_check.js."
//     (one test or several, separated by commas), each path a file that exists; or "Held by: its
//     words.", and such a bullet, without the clause and the space before it, is byte-equal to an
//     entry of RULINGS.md.
//   - The lead finds the record. Every bullet opens with the lead words of an entry of RULINGS.md
//     (a line's text after its "- " up to its first " (", colon, period or comma), and the
//     bullets stand in the order of the entries, so no two bullets share a lead.
//   - The size. CLAUDE.md is no longer than CEILING characters, one number: the built size
//     rounded up to the next 1,000. Lowering it later is free. Raising it is a change a reviewer
//     sees, with its reason in the pull request.
//   - The comparison itself, both ways, on invented text: an entry with one word changed fails by
//     its number and a missing one by its number; a bullet with no closing clause, one naming a
//     test that is not there, one "held by its words" that differs from every entry by a word and
//     one whose lead is no entry's each fail, and the same bullets written right pass; a text one
//     character over a ceiling fails and one at it passes.
//
// Run from the repository root: node tests/rulings_check.js. Exit 0 on pass, 1 on any failure,
// one printed line per failure.

var fs=require('fs'), path=require('path'), crypto=require('crypto');
var root=path.resolve(__dirname,'..');
var SECTION='What is ruled about the method';
var WORDS='Held by: its words.';
var TESTS=/Held by: (tests\/[a-z0-9_]+_check\.js(?:, tests\/[a-z0-9_]+_check\.js)*)\.$/;
// The ceiling on CLAUDE.md, in characters: the built size rounded up to the next 1,000.
var CEILING=73000;
// The 28 entries as `git show a7fade2:CLAUDE.md` gives them, in the section's order; entries 4, 6,
// 7, 9, 14, 15, 19 and 26 as issue 245 left them.
var HASHES=[
  '71cd02bf6e808e15a440a11eb2fd91604e87663e43e67e5ed543cf1c34536728',
  '567d1c4fe326e6cc55597009581c707046ed612d50f8358abb09017ee33d1417',
  '32b02d7c93a9d6d182ba035224035d6ece743c2ea0bcd49976733949e654420a',
  '747cd6e4820aa0ed323b3cc05ef241d88360f49a09bfdc05d4c914925ded7be1',
  'c78a0bd75a09d98e1b2435405118a27a9da22260e223d72086d34b2ed4e262fe',
  '1d9122c5b54756820176c3b2a977316fca2d0565e8acb3a30805733a8a1847d6',
  '19e8cbe92c80ec61514ff2c2b7c6eff997d3de0afd15be11dc0616778b98e28a',
  'bd8e6bdeac2c7d8ee6dbe219b4a59c241561340038b66033b0627cdbc20f9d65',
  'a25452ce087b6a087e8c2a5d76b6b32d660b8efb8c50696e155af9bb0b9cd2bc',
  'c6a9edc9b396d7ae1e884d797bfc07b533a7a67507a58502e81721772c4ac063',
  '1754f945dff0e799257600a8e98a1f3cc165430287ed9756d9e577fda2859805',
  '468d28fcaa30a534d7b29b4c621155941da9c7c1f2210a1d44b627a528e5eb66',
  'ae2f28a75bf0128aaf57618d60b59417f53fa05f08afe3b2f175ea10473ecbf0',
  'c7a7dae73d65d4f87bbdcae75a09e6e9f30dc239da9efe165f134e2d3be46b92',
  'f56033a488572a5813624d573361113e04cf131d9ce1e390c96f75f8c2ce5105',
  '7b0e806d872b4bd822dc770899ebfcd6a8f6fd110c4b9d46c3f1ca4384f4999e',
  '8a155009e14b8ca989df8a9b03d51a76d9118c81de9768351df4990890db27aa',
  '4a8e78926345be95dac2998363d67082b93a98fd3d918d1c379cbdf2a94f4df4',
  '5b3033bd45322e2b052af26eeac5789dad1aef82c466a446f9e025bac159cc14',
  'b421267782a85b255ea2bf9302e4732980e96aeaeedeb3eaae092d71050f6989',
  '35c200076f5c7a80c4bc1c2a81f2858ea720b8162c1063262deaffcfd56c53fb',
  '1236ff55601778e5c467738fbc07e67af59cc9bd6ad12baf1bb1c97c0f1f1aca',
  'b09e9c859f0020df7c1d3ecd03af51bcbf3ea11fd311f8fc4b7fd7226120e859',
  '22dbedbce569ca45ceac10e75dbfe4a1c0e180064883585cec10bf84ebcd8c39',
  '7ca01762fda16371d3b9b71da6e532fc35f6b52c96f19d4679d1948fffa43514',
  '4f6d1c4e50b700a618c70e50e034c4c78faa05591f17e59d075422c5e229ca35',
  'c7022b0536d7dc947f0f8e3cedeba591707c329d33b8068e52eea4d0fba3f5d7',
  '65cf613bb9245ef15f1e432a443af282c9d34d49c95d353cb61e0e8949ab09a5'
];

var fails=[], passes=0;
function fail(s){ fails.push(s); }
function check(cond,msg){ if(cond)passes++; else fail(msg); }
function hold(lines){ if(lines.length)lines.forEach(fail); else passes++; }
function readOrNull(rel){ try{ return fs.readFileSync(path.join(root,rel),'utf8'); }catch(e){ return null; } }
function sha(line){ return crypto.createHash('sha256').update(line,'utf8').digest('hex'); }
function chars(text){ return Array.from(text).length; }
function thousands(n){ return String(n).replace(/\B(?=(\d{3})+$)/g,','); }
function opening(line){ return line.length>60?line.slice(0,60)+'...':line; }

// The entries of a history text: its lines that start with "- ", in order, each whole.
function entries(text){ return text.split('\n').filter(function(l){ return l.indexOf('- ')===0; }); }
// The bullets of the section headed `name`: the lines that start with "- " between that heading
// and the next heading of its level. Null when the text has no such heading.
function bullets(text,name){
  var out=[], inside=false, found=false;
  text.split('\n').forEach(function(line){
    var m=/^## (.*)$/.exec(line);
    if(m){ inside=m[1]===name; if(inside)found=true; return; }
    if(inside&&line.indexOf('- ')===0)out.push(line);
  });
  return found?out:null;
}
// The lead words of an entry or a bullet: its text after "- " up to the first " (", colon,
// period or comma.
function lead(line){
  var m=/ \(|[:.,]/.exec(line.slice(2));
  return m?line.slice(2,2+m.index):line.slice(2);
}
// How a bullet closes: by tests (the paths it names), by its words (the bullet without the
// clause), or not at all.
function closing(line){
  var m=TESTS.exec(line);
  if(m)return {kind:'tests',tests:m[1].split(', ')};
  if(line.slice(-(WORDS.length+1))===' '+WORDS)return {kind:'words',body:line.slice(0,-(WORDS.length+1))};
  return {kind:'none'};
}
// One line per entry that is not the entry the hash names.
function lost(label,got,hashes){
  var lines=[];
  if(got.length<hashes.length)lines.push(label+': holds '+got.length+' entries, fewer than the '+hashes.length+' hashed');
  hashes.forEach(function(h,i){
    if(i<got.length&&sha(got[i])!==h)lines.push(label+': entry '+(i+1)+' is not the entry as it was moved, a word changed: '+opening(got[i]));
  });
  return lines;
}
// One line per bullet that names nothing that holds it, names a test that is not there, claims
// its words and is no entry, or opens with no entry's lead or out of the entries' order. With no
// record to read (null), the missing file is the one line said of it, and the bullets are held
// to their closing clauses alone.
function wallFaults(label,wall,record,exists){
  var lines=[], leads=(record||[]).map(lead), last=-1;
  wall.forEach(function(b){
    var c=closing(b), at=leads.indexOf(lead(b));
    if(c.kind==='none')lines.push(label+': a bullet ends with neither closing clause: '+opening(b));
    if(c.kind==='tests')c.tests.forEach(function(t){ if(!exists(t))lines.push(label+': a bullet names a test that is not there, '+t+': '+opening(b)); });
    if(record===null)return;
    if(c.kind==='words'&&record.indexOf(c.body)<0)lines.push(label+': a bullet held by its words is byte-equal to no entry of the record: '+opening(b));
    if(at<0)lines.push(label+': a bullet opens with the lead of no entry of the record: '+opening(b));
    else{ if(at<=last)lines.push(label+': a bullet stands out of the entries\' order: '+opening(b)); last=at; }
  });
  return lines;
}
function oversize(label,text,ceiling){
  var n=chars(text);
  return n>ceiling?[label+': '+thousands(n)+' characters, over the ceiling of '+thousands(ceiling)]:[];
}

// The record.
var rulings=readOrNull('RULINGS.md');
check(rulings!==null,'RULINGS.md: no such file at the repository root');
var record=rulings===null?null:entries(rulings);
check(HASHES.length===28,'this check must hold 28 hashes, holds '+HASHES.length);
if(rulings!==null)hold(lost('RULINGS.md',record,HASHES));

// The wall.
var claude=readOrNull('CLAUDE.md');
check(claude!==null,'CLAUDE.md: no such file at the repository root');
var wall=claude===null?null:bullets(claude,SECTION);
check(wall!==null,'CLAUDE.md: no section headed "'+SECTION+'"');
wall=wall||[];
check(wall.length>=HASHES.length,'CLAUDE.md: the section holds '+wall.length+' bullets, fewer than the '+HASHES.length+' entries moved');
hold(wallFaults('CLAUDE.md',wall,record,function(t){ return fs.existsSync(path.join(root,t)); }));
var byTests=wall.filter(function(b){ return closing(b).kind==='tests'; }).length;
var byWords=wall.filter(function(b){ return closing(b).kind==='words'; }).length;

// The size.
if(claude!==null)hold(oversize('CLAUDE.md',claude,CEILING));

// The comparison, both ways, on invented text.
var inv=['- Alpha (invented): the first rule. Its record.','- Beta: the second rule, whole.','- Gamma is the third rule. More.'];
var invHashes=inv.map(sha);
check(lost('invented',inv,invHashes).length===0,'self-check: entries equal to their hashes did not pass');
var changed=lost('invented',[inv[0],inv[1].replace('second','2nd'),inv[2]],invHashes);
check(changed.length===1&&changed[0].indexOf('entry 2')>=0,'self-check: an entry with a word changed did not fail by its number');
var gone=lost('invented',[inv[0],inv[2]],invHashes);
check(gone.length===2&&gone[0].indexOf('fewer than the 3')>=0&&gone[1].indexOf('entry 2')>=0,'self-check: a missing entry did not fail by the count and by its number');
function there(t){ return t==='tests/alpha_check.js'||t==='tests/gamma_check.js'; }
var right=['- Alpha: the first rule. Held by: tests/alpha_check.js, tests/gamma_check.js.',inv[1]+' '+WORDS,'- Gamma is the third rule. Held by: tests/gamma_check.js.'];
check(wallFaults('invented',right,inv,there).length===0,'self-check: a wall written right did not pass');
var noClause=wallFaults('invented',['- Alpha: the first rule.'],inv,there);
check(noClause.length===1&&noClause[0].indexOf('neither closing clause')>=0,'self-check: a bullet with no closing clause did not fail');
var noTest=wallFaults('invented',['- Alpha: the first rule. Held by: tests/alpha_check.js, tests/delta_check.js.'],inv,there);
check(noTest.length===1&&noTest[0].indexOf('tests/delta_check.js')>=0,'self-check: a bullet naming a test that is not there did not fail by that test');
var notWhole=wallFaults('invented',['- Beta: the second rule. '+WORDS],inv,there);
check(notWhole.length===1&&notWhole[0].indexOf('byte-equal to no entry')>=0,'self-check: a bullet held by its words and short of its entry did not fail');
var noLead=wallFaults('invented',['- Delta: a rule with no record. Held by: tests/alpha_check.js.'],inv,there);
check(noLead.length===1&&noLead[0].indexOf('lead of no entry')>=0,'self-check: a bullet whose lead is no entry\'s did not fail');
var swapped=wallFaults('invented',[right[2],right[0]],inv,there);
check(swapped.length===1&&swapped[0].indexOf('out of the entries\' order')>=0,'self-check: bullets out of the entries\' order did not fail');
check(oversize('invented','abcdefghij',10).length===0,'self-check: a text at its ceiling did not pass');
var over=oversize('invented','abcdefghijk',10);
check(over.length===1&&over[0].indexOf('11 characters')>=0,'self-check: a text one character over its ceiling did not fail');

if(fails.length){ fails.forEach(function(f){ console.log('FAIL '+f); }); console.log('rulings_check: '+fails.length+' failed, '+passes+' passed'); process.exit(1); }
console.log('rulings_check: pass ('+HASHES.length+' entries of RULINGS.md equal to their hashes; '+wall.length+' bullets on the wall, '+byTests+' held by tests and '+byWords+' by their words; CLAUDE.md '+thousands(chars(claude))+' characters under the ceiling of '+thousands(CEILING)+'; '+passes+' checks)');
