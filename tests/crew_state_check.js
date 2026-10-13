// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// crew_state_check.js: when the crew has fewer seats than the person expects, the record, the
// board and the short form name the reason and the exact next command (ruled 2026-10-13).
//
// Runs the REAL new-run.js, crew-state.js, render-record.js and render-board.js from
// plugins/combat-writing/scripts as child processes in a temporary project (never a
// re-implementation). The third state, running with no key, is pinned by tests/crew_check.js
// against the real add-on server; this check covers the two the host records and the rest.
//
// What it pins:
//   - A run with one fresh reader and nothing recorded: the Seats line says the add-on's state
//     was not recorded and points at /combat-writing:help crew.
//   - crew-state.js --state absent logs addon.state and prints the sentence; the short form,
//     record.md and board.html then carry a Seats line under the crew line with the install
//     command, /reload-plugins and /plugin configure combat-writing-crew.
//   - crew-state.js --state down: the Seats line names /mcp, the server name combat-writing-crew,
//     what to look for (failed or disconnected), /plugin and /reload-plugins; the latest state
//     wins.
//   - crew-state.js refuses any other state (exit 2) and a folder with no seats.json.
//   - A crew.registered line (the shape the add-on logs) after an addon.state line supersedes
//     it: with an outside seat seated and nothing else unavailable, there is no Seats line;
//     with a keyed provider that did not answer, the line names the provider, its reason and
//     the next command; with no outside seat and no-key entries, the line names the command
//     and each field as logged.
//   - The sentences never carry a key value, and the three next commands are the ones the help
//     names.
//
// Run from the repo root:   node tests/crew_state_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.join(__dirname,'..');
var scripts=path.join(root,'plugins','combat-writing','scripts');
var INSTALL='/plugin install combat-writing-crew --marketplace LearningProducers/CombatWriting-Plugin';
var CONF='/plugin configure combat-writing-crew';
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-state-'));
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function seatsLines(text){ return text.split('\n').filter(function(l){return l.indexOf('**Seats:**')===0;}); }
function render(run){ var s=node('render-record.js',['--run',run,'--short']); check(s.status===0,'render-record: exit '+s.status+' '+s.stderr); check(node('render-board.js',['--run',run]).status===0,'render-board failed'); return {short:s.stdout,record:read(path.join(run,'record.md')),board:read(path.join(run,'board.html'))}; }

fs.writeFileSync(path.join(proj,'draft.md'),'Dear board,\n\nA vote this week, please.\n');
var run=node('new-run.js',['--draft','draft.md','--name','state','--model','Test Model']).stdout.trim();
check(fs.existsSync(run),'new-run failed');

// Nothing recorded.
var r0=render(run);
check(seatsLines(r0.short).length===1&&/^\*\*Seats:\*\* No outside seat, and the add-on's state was not recorded in this run\. Next: \/combat-writing:help crew for the three states and the command for each\.$/.test(seatsLines(r0.short)[0]),'unrecorded: the short form must say the state was not recorded and point at help crew, got '+seatsLines(r0.short).join(' | '));
check(seatsLines(r0.record).length===1,'unrecorded: record.md must carry one Seats line');

// State 1: absent.
var a=node('crew-state.js',['--run',run,'--state','absent']);
check(a.status===0&&a.stdout.trim()==='The crew add-on is not installed, so the crew is one seat. Next: '+INSTALL+', then /reload-plugins or a new session, then '+CONF+' to enter a key.','absent: crew-state.js must print the sentence, got '+a.stdout+a.stderr);
var logA=read(path.join(run,'log.jsonl')).trim().split('\n').map(JSON.parse).filter(function(e){return e.event==='addon.state';});
check(logA.length===1&&logA[0].state==='absent'&&logA[0].by==='host'&&logA[0].crew_list_tool===false&&Object.keys(logA[0])[0]==='ts','absent: addon.state must be logged with the state, by host, and the timestamp first');
var r1=render(run);
var l1=seatsLines(r1.short);
check(l1.length===1&&l1[0]==='**Seats:** '+a.stdout.trim(),'absent: the short form must carry the sentence as its Seats line, got '+l1.join(' | '));
var shortLines=r1.short.trim().split('\n');
check(shortLines[0].indexOf('**Crew:**')===0&&shortLines[2]===l1[0],'absent: the Seats line must sit right under the crew line in the short form');
check(r1.record.split('\n')[4]===l1[0],'absent: record.md must carry the Seats line right under the crew line');
check(r1.board.indexOf('<strong>Seats:</strong> The crew add-on is not installed, so the crew is one seat. Next: '+INSTALL)>=0,'absent: board.html must carry the Seats line');
check(shortLines[shortLines.length-1]==='Seat key: seat-1 Test Model','absent: the seat key still closes the short form');

// State 2: down; the latest state wins.
var d=node('crew-state.js',['--run',run,'--state','down']);
check(d.status===0&&/^The crew add-on is installed but its server is not running in this session \(no crew_list tool\), so the crew is one seat\. Next: \/mcp, find combat-writing-crew: if it shows failed or disconnected, reconnect it there and run the command again; if it is not listed, \/plugin to check the add-on is enabled, then \/reload-plugins\.$/.test(d.stdout.trim()),'down: crew-state.js must print the /mcp sentence, got '+d.stdout+d.stderr);
var r2=render(run);
check(seatsLines(r2.short).length===1&&seatsLines(r2.short)[0]==='**Seats:** '+d.stdout.trim(),'down: the latest state must win in the short form, got '+seatsLines(r2.short).join(' | '));
check(r2.board.indexOf('<strong>Seats:</strong> The crew add-on is installed but its server is not running')>=0&&r2.board.indexOf('/mcp, find combat-writing-crew')>=0,'down: board.html must carry the /mcp line');

// Refusals.
var bad=node('crew-state.js',['--run',run,'--state','no-key']);
check(bad.status===2&&/absent or down/.test(bad.stderr)&&!/addon\.state[^\n]*no-key/.test(read(path.join(run,'log.jsonl'))),'crew-state.js must refuse a state it does not know and log nothing');
check(node('crew-state.js',['--run',path.join(proj,'nowhere'),'--state','absent']).status===2,'crew-state.js must refuse a folder with no seats.json');
check(node('crew-state.js',['--run',run]).status===2,'crew-state.js must require --state');

// A crew.registered line after the state, as the add-on logs it: the add-on is running, so it wins.
function registered(entry){ fs.appendFileSync(path.join(run,'log.jsonl'),JSON.stringify(Object.assign({ts:new Date().toISOString(),event:'crew.registered'},entry))+'\n'); }
function seat(id,model,company){ var f=path.join(run,'seats.json'); var sj=JSON.parse(read(f)); sj.seats.push({id:id,model:model,company:company,served_by:'Groq',provider:'groq',slot:'groq-a',source:'test fixture: an outside seat as the add-on would register it'}); fs.writeFileSync(f,JSON.stringify(sj,null,2)+'\n'); }
// No outside seat, no-key entries: the command and the fields, Groq first.
registered({added:[],unavailable:[
  {slot:'groq-a',provider:'groq',provider_name:'Groq',family:"OpenAI's open-weight line",reason:'no key for Groq; next: '+CONF+', the groq_api_key field (Groq API key, the masked prompt); or set GROQ_API_KEY in the environment when the prompt is empty',next:CONF,field:'groq_api_key',field_title:'Groq API key'},
  {slot:'groq-b',provider:'groq',provider_name:'Groq',family:"Alibaba's Qwen line",reason:'no key for Groq; next: '+CONF+', the groq_api_key field (Groq API key, the masked prompt); or set GROQ_API_KEY in the environment when the prompt is empty',next:CONF,field:'groq_api_key',field_title:'Groq API key'},
  {slot:'xai',provider:'xai',provider_name:'xAI',family:"xAI's Grok line",reason:'no key for xAI; next: '+CONF+', the xai_api_key field (xAI API key, the masked prompt); or set XAI_API_KEY in the environment when the prompt is empty',next:CONF,field:'xai_api_key',field_title:'xAI API key'},
  {slot:'ollama',provider:'ollama',provider_name:'Ollama (local)',reason:'off: name the local model in the plugin\'s settings (ollama_model) or in CW_CREW_OLLAMA_MODEL to turn this seat on'},
  {slot:'anthropic',provider:'anthropic',provider_name:'Anthropic',reason:'not built: a stub'}]});
var r3=render(run);
check(seatsLines(r3.short).length===1&&seatsLines(r3.short)[0]==='**Seats:** The crew add-on is running and no provider has a key, so the crew is one seat. Next: '+CONF+' and fill a key field: groq_api_key (Groq API key), xai_api_key (xAI API key); a free Groq key seats two. Or set the provider\'s environment variable when the prompt is empty.','no key: the Seats line must name the command and each field once, got '+seatsLines(r3.short).join(' | '));
check(!/ollama|Anthropic/.test(seatsLines(r3.short)[0]),'no key: an off or not-built entry is not a missing key');
// An outside seat seated, nothing else expected: no Seats line.
seat('seat-2','openai/gpt-oss-120b','OpenAI');
registered({added:[{id:'seat-2',model:'openai/gpt-oss-120b',company:'OpenAI',served_by:'Groq',provider:'groq'}],unavailable:[
  {slot:'xai',provider:'xai',provider_name:'xAI',family:"xAI's Grok line",reason:'no key for xAI; next: '+CONF+', the xai_api_key field (xAI API key, the masked prompt); or set XAI_API_KEY in the environment when the prompt is empty',next:CONF,field:'xai_api_key',field_title:'xAI API key'}]});
var r4=render(run);
check(seatsLines(r4.short).length===0&&seatsLines(r4.record).length===0&&r4.board.indexOf('<strong>Seats:</strong>')<0,'seated: with an outside seat and only unkeyed providers left, there is no Seats line, got '+seatsLines(r4.short).join(' | '));
// A keyed provider that did not answer is always named, with its reason and the next command.
registered({added:[],unavailable:[
  {slot:'groq-b',provider:'groq',provider_name:'Groq',family:"Alibaba's Qwen line",reason:'Groq did not answer: HTTP 503 from /models',next:CONF,field:'groq_api_key',field_title:'Groq API key'}]});
var r5=render(run);
check(seatsLines(r5.short).length===1&&seatsLines(r5.short)[0]==='**Seats:** Not seated: Groq (Alibaba\'s Qwen line): Groq did not answer: HTTP 503 from /models. Next: run the command again; if it repeats, '+CONF+' to check the groq_api_key field.','failed provider: the Seats line must name the provider, the reason and the next command, got '+seatsLines(r5.short).join(' | '));

// No key value anywhere, and the three commands are the help's.
var all=r1.short+r2.short+r3.short+r5.short+read(path.join(run,'record.md'))+read(path.join(run,'board.html'));
check(!/gsk_|sk-[A-Za-z0-9]{8}/.test(all),'a key value appears in the output');
var help=read(path.join(root,'plugins','combat-writing','commands','help.md'));
[INSTALL,CONF,'/mcp','/reload-plugins'].forEach(function(c){ check(help.indexOf(c)>=0,'help.md does not name '+c); });
check(/^## Fewer seats than you expected/m.test(help)&&/not installed/.test(help)&&/not running/.test(help)&&/no key/.test(help),'help.md: the three states section is missing');
var skill=read(path.join(root,'plugins','combat-writing','skills','combat-writing','SKILL.md'));
check(/claude plugin list/.test(skill)&&/crew-state\.js --run <folder> --state down/.test(skill)&&/--state absent/.test(skill)&&/never say only that no crew tools were found/.test(skill),'SKILL.md: the three-state rule is missing');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'crew_state_check: '+failures.length+' failure(s), ':'crew_state_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
