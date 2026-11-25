// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// readme_check.js: the plugin README and the repository README say what the directory
// and the rulings require, and nothing they forbid.
//
// What it pins, on plugins/combat-writing/README.md and README.md:
//   - ™ follows the first use of the name "Combat Writing" in the file.
//   - "source-available" appears; "open source" and "open-source" do not.
//   - The plugin README's example prompts (one each for help, strategy, sparring, battle and
//     champion) are fenced blocks that begin with /cw:<command>, each naming a skill folder
//     that exists under plugins/combat-writing/skills/<command>/SKILL.md, and each is followed by a
//     fenced block of real output that carries no credit line (ruled 2026-10-12), except the help
//     block, which is the card, the one place the credit line stands (issue 158, 2026-11-04): the
//     strategy, sparring and battle blocks open with the crew line, the help block with the motto,
//     the champion block with its Shipped, Result or Insight line (2026-10-19).
//   - The disclosures: what the plugin runs, sends and fetches; that every record opens
//     the credit line stands at the foot of the help guide, quoted in full; that the add-on exists, is a local MCP server
//     and calls other providers on the person's own keys; that keys are never stored in
//     a file; that the draft is untrusted content; the run folder and the inbox as the
//     write locations; board.html and record.md.
//   - No endorsement wording: the README says the plugin is not made or endorsed by
//     Anthropic (a listing in the directory is read by Anthropic, so "reviewed" would not
//     stay true), and never says "official", "partner", "certified",
//     "approved by Anthropic" or "in partnership with".
//   - The plugin README has more than 40 words outside code blocks.
//   - No Markdown file in the tree says the credit line "stands once" (issue 158: the credit line
//     stands at the foot of the help card and of the help guide; the phrase outlived the change in
//     three READMEs after six other files were cured). PLAN.md, PLAN_ARCHIVE.md (Parts 1 to 90,
//     frozen; issue 166), PLAN_ARCHIVE_2.md (Parts 91 to 140, frozen; issue 249) and
//     .github/release-notes/ keep their history and are not read;
//     node_modules, .git and virtual environments are skipped.
//   - What must be installed: the Install section of both plugin READMEs and the root README's
//     "Run the checks" section name Node, each with the major version CI's workflow sets up
//     (`node-version` in .github/workflows/checks.yml, the place that runs it on every pull
//     request) and no other. The plugin README's first paragraph says "built for Claude Code".
//   - The root README's "Run the checks" section names the command, `node tests/run_all.js`,
//     the `claude` CLI for the validate step, uv for the screen's tests, and the documentation
//     page that names the Claude Code version the one-step install line needs (a version has a
//     home, second_copy_check.js: the root README points, the plugin README carries it beside
//     its install line); every `--flag` the section names is one tests/run_all.js reads, and
//     `--profile directory`, the validator's directory profile, is named there and read there.
//   - The key sentence in the plugin README's "What one install brings": with no key the
//     add-on can find, the crew is its two fresh readers, and where a key is read from is the
//     add-on's README, under a heading that file holds. The paragraph copies no list of routes.
//
// Run from the repo root:   node tests/readme_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path');
var root=path.join(__dirname,'..');
var CREDIT='Combat Writing — Learning Producers Inc., Israel Hernandez, founder';
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(rel){ return fs.readFileSync(path.join(root,rel),'utf8'); }

var files={'plugins/combat-writing/README.md':read('plugins/combat-writing/README.md'),'README.md':read('README.md')};
Object.keys(files).forEach(function(rel){
  var t=files[rel];
  var first=t.indexOf('Combat Writing');
  check(first>=0&&t.slice(first,first+'Combat Writing™'.length)==='Combat Writing™',rel+': the first use of the name does not carry ™');
  check(/source-available/i.test(t),rel+': does not say source-available');
  check(!/open[\s-]source/i.test(t),rel+': says open source');
  check(/not made or endorsed by Anthropic/.test(t)&&!/reviewed or endorsed/.test(t),rel+': must say "not made or endorsed by Anthropic", with no "reviewed": a listing in the directory is read by Anthropic');
  check(!/\b(official|partner(ed|ship)?|certified|approved by Anthropic|in partnership with|Anthropic-backed)\b/i.test(t),rel+': endorsement wording appears');
  check(t.indexOf(CREDIT)>=0,rel+': the credit line is not quoted in full');
  check(/\bruns\b/i.test(t)&&/\bsends\b/i.test(t)&&/\bfetches\b/i.test(t),rel+': the runs/sends/fetches disclosure is incomplete');
  check(/add-on/.test(t)&&/MCP server/.test(t)&&/own (API )?keys/.test(t),rel+': the add-on disclosure is incomplete');
  check(/never stored in a file/.test(t),rel+': does not say keys are never stored in a file');
  check(/untrusted content/.test(t),rel+': does not say the draft is untrusted content');
  check(/combat-writing\/runs\//.test(t)&&/combat-writing\/inbox\//.test(t),rel+': the two write locations are not both named');
  check(/record\.md/.test(t)&&/board\.html/.test(t),rel+': record.md and board.html are not both named');
});

// The plugin README's example prompts, each followed by real output.
var p=files['plugins/combat-writing/README.md'];
var blocks=[]; var re=/```\n([\s\S]*?)```/g, m;
while((m=re.exec(p)))blocks.push(m[1].replace(/\n$/,''));
var prompts=[]; blocks.forEach(function(b,i){ if(/^\/cw:[a-z]+/.test(b))prompts.push({text:b,index:i}); });
check(prompts.length>=3,'plugin README: expected at least three example prompts, found '+prompts.length);
var commands=fs.readdirSync(path.join(root,'plugins','combat-writing','skills')).filter(function(d){return fs.existsSync(path.join(root,'plugins','combat-writing','skills',d,'SKILL.md'));});
var named={};
prompts.forEach(function(pr){
  var cmd=/^\/cw:([a-z]+)/.exec(pr.text)[1];
  named[cmd]=true;
  check(commands.indexOf(cmd)>=0,'plugin README: example prompt names /cw:'+cmd+', which has no command file');
  var out=blocks[pr.index+1];
  if(cmd==='help')check(!!out&&out.indexOf(CREDIT)>=0,'plugin README: the output block after "/cw:help" is the card and closes with the credit line');
  else check(!!out&&out.indexOf(CREDIT)<0,'plugin README: the output block after "'+pr.text.slice(0,40)+'" carries the credit line');
  // The help block opens with the motto, a champion block with its Shipped, Result or Insight line
  // (ruled 2026-10-19; champion is not a round and prints no crew line), every other with the crew line.
  var first=(out||'').split('\n')[0];
  check(!!out&&(cmd==='help'?first==='Reading is Peace. Writing is War.':cmd==='champion'?/^(Shipped|Result recorded|Insight recorded) /.test(first):/^Crew:/.test(first)),'plugin README: the output block after "'+pr.text.slice(0,40)+'" does not open with '+(cmd==='help'?'the motto':cmd==='champion'?'a Shipped, Result or Insight line':'the crew line'));
});
['help','strategy','sparring','battle','champion'].forEach(function(c){ check(named[c],'plugin README: no example prompt for /cw:'+c); });
var prose=p.replace(/```[\s\S]*?```/g,' ').replace(/<!--[\s\S]*?-->/g,' ');
check(prose.split(/\s+/).filter(Boolean).length>40,'plugin README: 40 words or fewer outside code blocks');

// What must be installed, and how the checks are run.
function sectionOf(text,heading){ var m=new RegExp('\\n## '+heading+'\\n([\\s\\S]*?)(?=\\n## |$)').exec(text); return m?m[1]:''; }
var crewReadme=read('plugins/combat-writing-crew/README.md'), rootReadme=files['README.md'];
var ciNode=(/node-version: *['"]?(\d+)/.exec(read('.github/workflows/checks.yml'))||[])[1];
check(!!ciNode,'.github/workflows/checks.yml: no node-version to hold the READMEs to');
[['plugins/combat-writing/README.md',sectionOf(p,'Install'),'Install'],['plugins/combat-writing-crew/README.md',sectionOf(crewReadme,'Install'),'Install'],['README.md',sectionOf(rootReadme,'Run the checks'),'Run the checks']].forEach(function(r){
  var majors=(r[1].match(/\bNode(?:\.js)? (\d+)\b/g)||[]).map(function(x){return /(\d+)$/.exec(x)[1];});
  check(r[1].length>0,r[0]+': no "'+r[2]+'" section');
  check(/\bNode(\.js)?\b/.test(r[1]),r[0]+': the "'+r[2]+'" section does not name Node');
  check(majors.length>0&&majors.every(function(v){return v===ciNode;}),r[0]+': the "'+r[2]+'" section must name Node '+ciNode+', the version the workflow runs, and no other (it names '+(majors.join(', ')||'none')+')');
});
var firstPara=p.split('\n').filter(function(l){ return l.trim()&&!/^(<!--|#|\*\*)/.test(l); })[0]||'';
check(/built for Claude Code/.test(firstPara),'plugins/combat-writing/README.md: the first paragraph does not say "built for Claude Code"');
var runSec=sectionOf(rootReadme,'Run the checks');
check(/`node tests\/run_all\.js`/.test(runSec),'README.md: "Run the checks" does not give the command, `node tests/run_all.js`');
check(/`claude` CLI/.test(runSec)&&/validate/.test(runSec),'README.md: "Run the checks" does not name the `claude` CLI for the validate step');
check(/\buv\b/.test(runSec)&&/screen/.test(runSec),'README.md: "Run the checks" does not name uv for the screen\'s tests');
check(/\]\(https:\/\/code\.claude\.com\/docs\/[^)]+\)/.test(runSec)&&/install line/.test(runSec),'README.md: "Run the checks" does not point at the documentation page for the Claude Code version the install line needs');
var runAll=read('tests/run_all.js');
(runSec.match(/--[a-z][a-z-]+/g)||[]).filter(function(v,i,a){return a.indexOf(v)===i;}).forEach(function(flag){
  check(runAll.indexOf("'"+flag+"'")>=0,'README.md: "Run the checks" names '+flag+', which tests/run_all.js does not read');
});
// The validator's directory profile: named in the section, read by the runner, passed by the
// workflow on the two plugin folders, and on by default in the runner, so the one command is
// the set CI runs. `--no-profile` leaves it out.
check(/`--profile directory`/.test(runSec),'README.md: "Run the checks" does not name `--profile directory`, the flag that adds the validator\'s directory profile');
check(/'--profile'/.test(runAll)&&/'directory'/.test(runAll),'tests/run_all.js: does not read --profile directory');
var folderSteps=read('.github/workflows/checks.yml').split('\n').filter(function(l){ return /claude plugin validate --strict\b.*plugins\/combat-writing/.test(l); });
check(folderSteps.length===2&&folderSteps.every(function(l){ return /--profile directory/.test(l); }),'.github/workflows/checks.yml: the two validate steps on the plugin folders must pass --profile directory ('+folderSteps.length+' such steps, '+folderSteps.filter(function(l){ return /--profile directory/.test(l); }).length+' with the profile)');
check(/noProfile\?null:'directory'/.test(runAll)&&/'--no-profile'/.test(runAll),'tests/run_all.js: the directory profile must be on by default, as in the workflow, and left out by --no-profile');
check(/`--no-profile`/.test(runSec)&&!/off by default/.test(runSec),'README.md: "Run the checks" must name `--no-profile` and must not say the profile is off by default');
// A sentence that says a plugin folder has no icon is false while both hold one.
var bothIcons=['plugins/combat-writing','plugins/combat-writing-crew'].every(function(d){ return fs.existsSync(path.join(root,d,'.claude-plugin','icon.png')); });
check(!bothIcons||!/neither folder has one|has no icon,? and|no icon yet/.test(rootReadme),'README.md: says a plugin folder has no icon; both hold .claude-plugin/icon.png');
// A list of the cw commands in the add-on's README names every command or is no list: the
// commands' home is the skills folder.
var commandSkills=fs.readdirSync(path.join(root,'plugins/combat-writing/skills')).filter(function(n){ return n!=='combat-writing'&&fs.existsSync(path.join(root,'plugins/combat-writing/skills',n,'SKILL.md')); });
crewReadme.split('\n').forEach(function(l,i){
  if(!/its commands are/.test(l))return;
  var missing=commandSkills.filter(function(n){ return l.indexOf('/cw:'+n)<0; });
  check(missing.length===0,'plugins/combat-writing-crew/README.md:'+(i+1)+': lists the cw commands and leaves out /cw:'+missing.join(', /cw:'));
});
// One floor (issue 260). The plugin README named the version its one-step install line needs, and the seat fence
// stops a call on a failed hook through a setting, onFailure, that Claude Code reads from a later version: between
// the two the fence fails open. The Install section names one version, the one the plugin needs, equal to the version
// the fence's own header names for that setting; every "Claude Code X or later" in the file is that version; and the
// add-on's install line needs no later one.
var cwInstall=sectionOf(p,'Install');
var need=function(t){ return (/Claude Code (\d+\.\d+\.\d+) or later/.exec(t)||[])[1]; };
var floor=(/the field is read by Claude Code\s*(?:\/\/\s*)?(\d+\.\d+\.\d+) and later/.exec(read('plugins/combat-writing/hooks/seat-scope.js'))||[])[1];
var newer=function(a,b){ var x=String(a).split('.').map(Number), y=String(b).split('.').map(Number); for(var i=0;i<3;i++){ if(x[i]!==y[i])return x[i]>y[i]; } return false; };
check(!!floor,'hooks/seat-scope.js: its header must name the Claude Code version that reads onFailure ("the field is read by Claude Code X and later")');
check(/--marketplace/.test(cwInstall)&&/The plugin needs Claude Code \d+\.\d+\.\d+ or later/.test(cwInstall)&&need(cwInstall)===floor,'plugins/combat-writing/README.md: the Install section must say "The plugin needs Claude Code '+floor+' or later", the version from which the seat fence stops a call when its hook cannot run; it names '+need(cwInstall));
var laters=(p.match(/Claude Code \d+\.\d+\.\d+ or later/g)||[]).map(need).filter(function(v,i,a){ return a.indexOf(v)===i; });
check(laters.length===1&&laters[0]===floor,'plugins/combat-writing/README.md: names more than one "Claude Code X or later", or one that is not the plugin\'s floor: '+laters.join(', '));
check(/onFailure/.test(cwInstall)&&/lets the call through/.test(cwInstall),'plugins/combat-writing/README.md: the Install section must give the floor\'s reason in a sentence: the setting, onFailure, and that an earlier Claude Code lets the call through');
var crewNeed=need(sectionOf(crewReadme,'Install'));
check(!!crewNeed&&!newer(crewNeed,floor),'the add-on\'s README names a Claude Code version for its install line that is later than the plugin\'s floor: '+crewNeed+' against '+floor);

// The key sentence: no key the add-on can find, and a pointer, never a copied list.
var brings=p.split('\n').filter(function(l){ return l.indexOf('**What one install brings.**')===0; })[0]||'';
check(brings.length>0,'plugins/combat-writing/README.md: no "What one install brings" paragraph');
check(/with no key the add-on can find, the crew is its two fresh readers/.test(brings),'plugins/combat-writing/README.md: "What one install brings" does not say that with no key the add-on can find, the crew is its two fresh readers');
check(!/prompt left empty/.test(brings),'plugins/combat-writing/README.md: "What one install brings" still says a prompt left empty decides the crew');
var pointer=/the add-on's README, under "([^"]+)"/.exec(brings);
check(!!pointer&&new RegExp('^## '+(pointer?pointer[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&'):'x')+'$','m').test(crewReadme),'plugins/combat-writing/README.md: "What one install brings" does not point at a heading the add-on\'s README holds for where a key is read from');
check(!/environment variable|key file/.test(brings),'plugins/combat-writing/README.md: "What one install brings" copies the list of places a key is read from; it points at the add-on\'s README');

// The phrase "stands once" in any Markdown file outside PLAN.md, its two archive files and the release notes.
var SKIP={'node_modules':1,'.git':1,'.venv':1,'results':1};
function mdFiles(dir){ var out=[]; fs.readdirSync(dir).forEach(function(n){ if(SKIP[n])return; var p=path.join(dir,n); var st=fs.statSync(p); if(st.isDirectory()){ if(path.relative(root,p)==='.github/release-notes')return; out=out.concat(mdFiles(p)); } else if(/\.md$/.test(n)&&['PLAN.md','PLAN_ARCHIVE.md','PLAN_ARCHIVE_2.md'].indexOf(path.relative(root,p))<0)out.push(p); }); return out; }
mdFiles(root).forEach(function(p){ read(path.relative(root,p)).split('\n').forEach(function(l,i){ check(l.indexOf('stands once')<0,path.relative(root,p)+':'+(i+1)+': says the credit line "stands once"; it stands at the foot of the help card and of the help guide'); }); });

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'readme_check: '+failures.length+' failure(s), ':'readme_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
