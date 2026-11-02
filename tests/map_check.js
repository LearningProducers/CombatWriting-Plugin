// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// map_check.js: docs/plugin-map.md, the plugin on one page (Part 89, 2026-11-02), cannot drift
// from the folders it describes. The founder, 2026-11-02: he could not name everything in the
// plugin nor all its commands; the map is the page he reads, and a list copied by hand rots
// (the living law's Section 8), so every row set on it is compared to its source here.
//
// What it pins (the row sets, never the prose beside them):
//   - section 1: the `/cw:<name>` rows equal the skill folders under plugins/combat-writing/skills/
//     less `combat-writing`, the method skill, which is no command.
//   - section 5: the hook rows equal the script basenames hooks.json runs; the `crew_*` rows equal
//     the tool names server.js registers; the key-field rows equal the add-on's userConfig fields.
//   - section 6: the script rows equal the files in plugins/combat-writing/scripts/.
//   - section 7: the check rows equal the files in tests/ and screen/tests/; the eval names equal
//     the case folders under plugins/combat-writing/evals/.
//   - the map carries the CC header, as every file under docs/ does (license_check.js holds the rule;
//     this check reads the first line so a map without it fails here by name too).
//
// Run from the repository root: node tests/map_check.js. Exit 0 on pass, 1 on any failure, one
// printed line per missing or extra row.

var fs=require('fs'), path=require('path');
var root=path.resolve(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var addon=path.join(root,'plugins','combat-writing-crew');
var mapPath=path.join(root,'docs','plugin-map.md');
var fails=[];
function fail(s){ fails.push(s); }

var map=fs.readFileSync(mapPath,'utf8');
if(map.split('\n')[0]!=='<!-- SPDX-License-Identifier: CC-BY-NC-SA-4.0 -->')fail('docs/plugin-map.md: the first line is not the CC header');

// The sections, by their `## ` heading; each holds its lines.
var sections={}, current=null;
map.split('\n').forEach(function(line){
  var m=/^## (.*)$/.exec(line);
  if(m){ current=m[1]; sections[current]=[]; return; }
  if(current)sections[current].push(line);
});
function section(prefix){
  var key=Object.keys(sections).filter(function(k){ return k.indexOf(prefix)===0; })[0];
  if(!key){ fail('docs/plugin-map.md: no section headed "'+prefix+'"'); return []; }
  return sections[key];
}
// The first code span of every table row in a section, filtered by a pattern.
function rowSpans(lines,pattern){
  var out=[];
  lines.forEach(function(line){
    if(line.charAt(0)!=='|')return;
    var cell=line.split('|')[1]||'';
    var m=/`([^`]+)`/.exec(cell);
    if(m&&pattern.test(m[1]))out.push(m[1]);
  });
  return out;
}
function compare(label,rows,disk){
  var seen={};
  rows.forEach(function(r){ if(seen[r])fail(label+': the map lists '+r+' twice'); seen[r]=true; });
  disk.forEach(function(d){ if(!seen[d])fail(label+': on disk and not on the map: '+d); });
  var ondisk={}; disk.forEach(function(d){ ondisk[d]=true; });
  rows.forEach(function(r){ if(!ondisk[r])fail(label+': on the map and not on disk: '+r); });
}
function listDir(dir,keep){
  return fs.readdirSync(dir).filter(function(f){ return keep(f,path.join(dir,f)); }).sort();
}

// 1. The commands.
var skills=listDir(path.join(plugin,'skills'),function(f,p){ return fs.statSync(p).isDirectory()&&f!=='combat-writing'; });
compare('commands',rowSpans(section('1.'),/^\/cw:/).map(function(s){ return s.replace(/^\/cw:/,''); }),skills);

// 5. The hooks, the add-on's tools, the key fields.
var hooksJson=JSON.parse(fs.readFileSync(path.join(plugin,'hooks','hooks.json'),'utf8'));
var hookFiles=[];
Object.keys(hooksJson.hooks).forEach(function(ev){
  hooksJson.hooks[ev].forEach(function(entry){
    (entry.hooks||[]).forEach(function(h){
      var m=/hooks\/([a-z-]+\.js)/.exec(h.command||'');
      if(m&&hookFiles.indexOf(m[1])<0)hookFiles.push(m[1]);
    });
  });
});
var five=section('5.');
compare('hooks',rowSpans(five,/\.js$/),hookFiles.sort());
var server=fs.readFileSync(path.join(addon,'server.js'),'utf8');
var tools=[], re=/\{name:'(crew_[a-z_]+)'/g, m;
while((m=re.exec(server)))if(tools.indexOf(m[1])<0)tools.push(m[1]);
compare('add-on tools',rowSpans(five,/^crew_/),tools.sort());
var manifest=JSON.parse(fs.readFileSync(path.join(addon,'.claude-plugin','plugin.json'),'utf8'));
var fields=Object.keys(manifest.userConfig||{}).sort();
compare('key fields',rowSpans(five,/_(key|model)$/),fields);

// 6. The scripts.
var scripts=listDir(path.join(plugin,'scripts'),function(f){ return /\.js$/.test(f); });
compare('scripts',rowSpans(section('6.'),/^[a-z-]+\.js$/),scripts);

// 7. The checks and the evals.
var seven=section('7.');
var tests=listDir(path.join(root,'tests'),function(f){ return /\.js$/.test(f); }).map(function(f){ return 'tests/'+f; });
var screenTests=listDir(path.join(root,'screen','tests'),function(f){ return /\.py$/.test(f); }).map(function(f){ return 'screen/tests/'+f; });
compare('checks',rowSpans(seven,/^(tests|screen\/tests)\//),tests.concat(screenTests));
var evalsDir=path.join(plugin,'evals');
var evals=listDir(evalsDir,function(f,p){ return fs.statSync(p).isDirectory()&&f!=='results'; });
var evalLine=seven.filter(function(l){ return l.indexOf('eval cases')>=0; })[0]||'';
var evalNames=[], er=/`([a-z-]+)`/g;
while((m=er.exec(evalLine)))evalNames.push(m[1]);
compare('evals',evalNames,evals);

if(fails.length){ fails.forEach(function(f){ console.log('FAIL '+f); }); process.exit(1); }
console.log('map_check: pass ('+skills.length+' commands, '+hookFiles.length+' hooks, '+tools.length+' tools, '+fields.length+' key fields, '+scripts.length+' scripts, '+(tests.length+screenTests.length)+' checks, '+evals.length+' evals)');
