// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// readme_check.js: the plugin README and the repository README say what the directory
// and the rulings require, and nothing they forbid.
//
// What it pins, on plugins/combat-writing/README.md and README.md:
//   - ™ follows the first use of the name "Combat Writing" in the file.
//   - "source-available" appears; "open source" and "open-source" do not.
//   - The plugin README's three example prompts are fenced blocks that begin with
//     /combat-writing:<command>, each naming a command file that exists under
//     plugins/combat-writing/commands/, and each is followed by a fenced block of
//     real output whose first line is the credit line (help, sparring, battle).
//   - The disclosures: what the plugin runs, sends and fetches; that every record opens
//     with the credit line, quoted in full; that the add-on exists, is a local MCP server
//     and calls other providers on the person's own keys; that keys are never stored in
//     a file; that the draft is untrusted content; the run folder and the inbox as the
//     write locations; board.html and record.md.
//   - No endorsement wording: the README says the plugin is not made, reviewed or
//     endorsed by Anthropic, and never says "official", "partner", "certified",
//     "approved by Anthropic" or "in partnership with".
//   - The plugin README has more than 40 words outside code blocks.
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
  check(/not made, reviewed or endorsed by Anthropic/.test(t),rel+': the no-endorsement sentence is missing');
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
var prompts=[]; blocks.forEach(function(b,i){ if(/^\/combat-writing:[a-z]+/.test(b))prompts.push({text:b,index:i}); });
check(prompts.length>=3,'plugin README: expected at least three example prompts, found '+prompts.length);
var commands=fs.readdirSync(path.join(root,'plugins','combat-writing','commands')).filter(function(f){return /\.md$/.test(f);}).map(function(f){return f.replace(/\.md$/,'');});
var named={};
prompts.forEach(function(pr){
  var cmd=/^\/combat-writing:([a-z]+)/.exec(pr.text)[1];
  named[cmd]=true;
  check(commands.indexOf(cmd)>=0,'plugin README: example prompt names /combat-writing:'+cmd+', which has no command file');
  var out=blocks[pr.index+1];
  check(!!out&&out.split('\n')[0]===CREDIT,'plugin README: the output block after "'+pr.text.slice(0,40)+'" does not open with the credit line');
});
['help','sparring','battle'].forEach(function(c){ check(named[c],'plugin README: no example prompt for /combat-writing:'+c); });
var prose=p.replace(/```[\s\S]*?```/g,' ').replace(/<!--[\s\S]*?-->/g,' ');
check(prose.split(/\s+/).filter(Boolean).length>40,'plugin README: 40 words or fewer outside code blocks');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'readme_check: '+failures.length+' failure(s), ':'readme_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
