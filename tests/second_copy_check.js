// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// second_copy_check.js: a fact with a home is never copied into a document (issue 153). The
// version lives in plugins/combat-writing/.claude-plugin/plugin.json, the help card in
// plugins/combat-writing/skills/help/SKILL.md, a count in the test that measures it; a document
// points at the home, or a test pins the one copy that stays equal to it.
//
// What it pins:
//   - README.md at the repository root and every tracked file under docs/ carry no version
//     string of the form digits.digits.digits. The two license identifiers, "PolyForm Shield
//     1.0.0" and "LicenseRef-PolyForm-Shield-1.0.0", are the license's own name, not a copied
//     fact, and are taken out of a line before it is read.
//   - The card in the listing README, plugins/combat-writing/README.md, between its two marker
//     comments (<!-- THE CARD BEGIN --> and <!-- THE CARD END -->, around one fenced block),
//     equals the card the help skill holds between the same two markers, line for line, with
//     the skill's bold marks and code spans stripped: a fenced block shows those marks as
//     characters, and the terminal shows the card rendered, so the README carries the text the
//     person sees. The same stripping rule as tests/help_check.js.
//   - CLAUDE.md states the rule under Standing rules.
//
// Run from the repository root:   node tests/second_copy_check.js
// Exit 0 on pass; exit 1 on any failure, one printed line per failure.

var fs=require('fs'), path=require('path'), cp=require('child_process');
var root=path.resolve(__dirname,'..');
var BEGIN='<!-- THE CARD BEGIN -->', END='<!-- THE CARD END -->';
var VERSION=/\b\d+\.\d+\.\d+\b/;
var LICENSE_TOKENS=[/LicenseRef-PolyForm-Shield-1\.0\.0/g,/PolyForm Shield 1\.0\.0/g,/PolyForm-Shield-1\.0\.0/g];

var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(rel){ return fs.readFileSync(path.join(root,rel),'utf8'); }
function tracked(folder){
  var r=cp.spawnSync('git',['ls-files','-z','--',folder],{cwd:root,encoding:'utf8'});
  if(r.status===0&&r.stdout)return r.stdout.split('\0').filter(Boolean);
  var out=[]; (function walk(d){ fs.readdirSync(d).forEach(function(n){ var p=path.join(d,n); if(fs.statSync(p).isDirectory())walk(p); else out.push(path.relative(root,p)); }); })(path.join(root,folder));
  return out;
}

// 1. No version string in the root README or under docs/.
var files=['README.md'].concat(tracked('docs'));
check(files.length>=3,'fewer than three files to read: '+files.join(', '));
files.forEach(function(rel){
  var hits=[];
  read(rel).split('\n').forEach(function(line,i){
    var l=line; LICENSE_TOKENS.forEach(function(t){ l=l.replace(t,''); });
    var m=VERSION.exec(l); if(m)hits.push((i+1)+': '+m[0]);
  });
  check(hits.length===0,rel+': a version string has a home in plugin.json, point there instead: '+hits.join('; '));
});

// 2. The listing README's card equals the skill's card, marks stripped.
function between(text,label){
  var a=text.indexOf(BEGIN), b=text.indexOf(END);
  if(a<0||b<a){ failures.push(label+': the two card markers are missing or out of order'); return null; }
  return text.slice(a+BEGIN.length,b).replace(/^\n+|\n+$/g,'');
}
var skill=between(read('plugins/combat-writing/skills/help/SKILL.md'),'help skill');
var readme=between(read('plugins/combat-writing/README.md'),'listing README');
if(skill!==null&&readme!==null){
  var stripped=skill.split('\n').map(function(l){ return l.replace(/\*\*/g,'').replace(/`/g,''); }).join('\n');
  var fence=/^```\n([\s\S]*?)\n```$/.exec(readme);
  check(!!fence,'listing README: the card between its markers must be one fenced block');
  if(fence)check(fence[1]===stripped,'listing README: the card differs from the help skill\'s card with its bold and code marks stripped; the skill is the home, copy it again. README:\n'+fence[1]+'\nskill, stripped:\n'+stripped);
}

// 3. CLAUDE.md states the rule.
var claude=read('CLAUDE.md');
check(/A fact with a home is never copied into a document/.test(claude)&&/tests\/second_copy_check\.js/.test(claude),'CLAUDE.md: the standing rule is missing');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'second_copy_check: '+failures.length+' failure(s), ':'second_copy_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
