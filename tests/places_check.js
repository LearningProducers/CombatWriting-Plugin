// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// places_check.js: the lists of what the plugin writes in a project name every place (issue 217).
// Two lists end on "Nothing is written anywhere else": the help's full section "Where files
// land" (`/cw:help files`) and the listing README's paragraph on what a run leaves. Read on main
// at 787d4a9, the help's left out the two pick files and the README's left out five places, so
// the closing sentence was not true of either. The home of the list is docs/plugin-map.md
// section 4, "What is written where"; a copy is held equal to its home here.
//
// What it pins:
//   - The home: every row of the map's section 4 names at least one place, a code span in its
//     first cell that starts `combat-writing/`, and the table is not empty.
//   - The help: the places named in the section headed "Where files land" equal the map's rows,
//     none missing and none extra, and the section still carries the closing sentence.
//   - The README: the same, for the one paragraph of plugins/combat-writing/README.md that
//     carries the closing sentence.
//   - No third list: the closing sentence stands in no other Markdown file under
//     plugins/combat-writing/, so a new list that makes the claim is read here before it ships.
//   - The comparison itself, both ways, on invented text: a list short one place fails by that
//     place's name, a list with a place the map does not hold fails by that place's name, and a
//     list equal to the map passes.
//
// A place is read as written up to its first placeholder, so `combat-writing/runs/<run-id>/`
// and `combat-writing/runs/<date-time-slug>/` are one place, `combat-writing/runs/`. The bare
// folder, `combat-writing/`, is where the places sit and is no place itself.
//
// Run from the repository root: node tests/places_check.js. Exit 0 on pass, 1 on any failure,
// one printed line per missing or extra place.

var fs=require('fs'), path=require('path');
var root=path.resolve(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var CLOSING='Nothing is written anywhere else';
var fails=[], passes=0;
function fail(s){ fails.push(s); }
function check(cond,msg){ if(cond)passes++; else fail(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }

// The places a text names: every code span that starts `combat-writing/`, cut at its first
// placeholder, less the bare folder; each once, sorted.
function places(text){
  var out=[], re=/`(combat-writing\/[^`]*)`/g, m;
  while((m=re.exec(text))){
    var p=m[1].split('<')[0];
    if(p==='combat-writing/')continue;
    if(out.indexOf(p)<0)out.push(p);
  }
  return out.sort();
}
// One line per place the list lacks and per place the map does not hold.
function differences(label,got,want){
  var lines=[];
  want.forEach(function(w){ if(got.indexOf(w)<0)lines.push(label+': the map names a place this list does not: '+w); });
  got.forEach(function(g){ if(want.indexOf(g)<0)lines.push(label+': this list names a place the map does not: '+g); });
  return lines;
}
function hold(label,text,want){
  var lines=differences(label,places(text),want);
  if(lines.length)lines.forEach(fail); else passes++;
}

// The home: section 4 of the map, its table rows.
var map=read(path.join(root,'docs','plugin-map.md'));
var four=[], inFour=false;
map.split('\n').forEach(function(line){
  var m=/^## (.*)$/.exec(line);
  if(m){ inFour=m[1].indexOf('4.')===0; return; }
  if(inFour)four.push(line);
});
var rows=four.filter(function(l){ return l.charAt(0)==='|'&&!/^\|\s*(Place|-+)\s*\|/.test(l); });
check(rows.length>0,'docs/plugin-map.md: section 4 holds no table row');
var want=[];
rows.forEach(function(row){
  var named=places(row.split('|')[1]||'');
  check(named.length>0,'docs/plugin-map.md: a row of section 4 names no place in its first cell: '+row.slice(0,80));
  named.forEach(function(p){ if(want.indexOf(p)<0)want.push(p); });
});
want.sort();

// The help: the full section "Where files land".
var helpRel='plugins/combat-writing/skills/help/SKILL.md';
var help=read(path.join(root,helpRel));
var landed=[], inLand=false, found=false;
help.split('\n').forEach(function(line){
  var m=/^## (.*)$/.exec(line);
  if(m){ inLand=m[1]==='Where files land'; if(inLand)found=true; return; }
  if(inLand)landed.push(line);
});
check(found,helpRel+': no section headed "Where files land"');
var landText=landed.join('\n');
check(landText.indexOf(CLOSING)>=0,helpRel+': "Where files land" no longer carries "'+CLOSING+'"');
if(found)hold(helpRel+', "Where files land"',landText,want);

// The README: the one paragraph that carries the closing sentence.
var readmeRel='plugins/combat-writing/README.md';
var paras=read(path.join(root,readmeRel)).split(/\n\s*\n/).filter(function(p){ return p.indexOf(CLOSING)>=0; });
check(paras.length===1,readmeRel+': "'+CLOSING+'" stands in '+paras.length+' paragraphs, not one');
if(paras.length===1)hold(readmeRel+', the paragraph on what a run leaves',paras[0],want);

// No third list under the plugin folder.
(function walk(dir){
  fs.readdirSync(dir).forEach(function(f){
    var p=path.join(dir,f), st=fs.statSync(p);
    if(st.isDirectory()){ walk(p); return; }
    if(!/\.md$/.test(f))return;
    var rel=path.relative(root,p).split(path.sep).join('/');
    if(rel===helpRel||rel===readmeRel)return;
    check(read(p).indexOf(CLOSING)<0,rel+': carries "'+CLOSING+'" and is no list this check holds to the map');
  });
})(plugin);

// The comparison, both ways, on invented text.
var invented=['combat-writing/alpha/','combat-writing/beta.json'];
var whole='A list: `combat-writing/alpha/<name>.md`, never `combat-writing/`, and `combat-writing/beta.json`.';
var short=differences('invented',places('A list: `combat-writing/alpha/`.'),invented);
var long=differences('invented',places(whole+' Also `combat-writing/gamma.md`.'),invented);
check(differences('invented',places(whole),invented).length===0,'self-check: a list equal to the map did not pass');
check(short.length===1&&short[0].indexOf('combat-writing/beta.json')>=0,'self-check: a list short one place did not fail by that place');
check(long.length===1&&long[0].indexOf('combat-writing/gamma.md')>=0,'self-check: a list with a place the map does not hold did not fail by that place');

if(fails.length){ fails.forEach(function(f){ console.log('FAIL '+f); }); console.log('places_check: '+fails.length+' failed, '+passes+' passed'); process.exit(1); }
console.log('places_check: pass ('+want.length+' places on the map, the help and the README equal to them, '+passes+' checks)');
