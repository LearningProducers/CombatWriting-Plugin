// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// speak.js: THE MAC SPEAKS THE FILES (Part 81, issue 121, 2026-10-28). Renders each seat's answer of
// a round to a small audio file in that seat's voice with the Mac's own speech engine (`say`), so
// the board plays a recording and no browser has to see the voices. Measured 2026-10-28: Safari
// hands pages 68 voices and none of the downloaded Premium or Enhanced ones, where Chromium hands
// 183 with all three; the founder keeps Safari; `say -v "Ava (Premium)" -o ava.m4a ...` rendered
// Ava on his Mac and `afplay` played it.
//
//   node speak.js --run <run folder> --round <nn-kind>            render the round's answers
//   node speak.js --run <run folder> --set <seat id> "<Voice Name>"  keep a voice for a seat, next rounds on
//   node speak.js --list                                           the installed voices the rule would use
//   [--say "<command>"]  the speech command for the tests (a fake); CW_SAY in the environment does the same
//   [--root <dir>]       the project root for voices.json (default: derived from the run folder)
//
// WHAT IT DOES. On macOS (or whenever a --say command is given), asks the engine for its voice list
// (`say -v ?`), keeps the voices named Premium or Enhanced (the quality floor, Part 76), ranks them
// Premium above Enhanced, then by the founder's order (Ava, Nathan, Allison, then the rest), then by
// name, and gives seat k the k-th distinct one, seat-1 included, wrapping; a voice kept for a seat
// in <project>/combat-writing/voices.json wins when it is installed. For every <seat>.answer.md in
// the round it writes the spoken text (lib.spokenPlain: fences and markdown marks dropped, the
// second pass appended) to a temporary file, runs `say -v "<voice>" -o rounds/<round>/<seat>.m4a -f
// <that file>`, and removes the temporary file. It writes rounds/<round>/voices.json {engine,
// installed, assigned, files} for the board, logs voices.rendered, and prints nothing on success:
// the board shows the voice names, and the measurement is accessible, not presented. A seat whose
// render fails is logged (voices.failed, the first stderr line) and skipped; the board falls back to
// the browser for that seat.
//
// THE VOICE IS THE READER'S TO PICK (Part 82, issue 129, 2026-10-31; the founder: "after the next
// run, i can choose the voice for each model response without telling you, i want this for plugin
// users too"). The board cannot write a file and the host is not to be told, so the recordings a
// pick could choose from exist before the pick is made: after every seat's own voice, the script
// renders the other quality voices for each seat, the ranked pool in order, up to
// MAX_VOICES_PER_SEAT files a seat, as rounds/<round>/<seat>.<voice slug>.m4a ("nathan-enhanced");
// <seat>.m4a stays the seat's own voice, so the record and an older board keep working. voices.json
// gains `renders` {seat: {voice name: {file, seconds, bytes, format}}}, `bytes`, `format` and
// `renders_failed`; `files`, `seconds`, `assigned`, `failed` and `silenced` keep their meaning for
// the seat's own voice; a failed or silent extra voice is recorded and skipped and never fails the
// seat; the seats whose own voice was silenced get no extra voices (the sandbox would only write
// more silent containers). The board's menu lists the rendered voices and keeps the pick in the
// browser by seat id; `--set` still seeds the voice rendered first. The disk cost is the person's
// project's: with three quality voices and three seats, nine files a round.
//
// WHERE IT DOES NOTHING. Off macOS with no --say command: logs voices.skipped {reason} and exits 0
// silently; the board keeps the browser path and says so. No quality voice installed: the same,
// with the reason named, so the person knows what to download. A `say` that cannot start (ENOENT):
// the same.
//
// WHERE THE SHELL SILENCES IT (Part 81.1, issue 123, measured 2026-10-28 on the prospect run of that day):
// inside the Claude Code sandbox `say -o` exits 0 and writes a 520-byte MPEG-4 container with no
// sound (`ftyp` and `moov`, duration 0, no `mdat`), and the first build counted that as rendered.
// A rendered file now counts only when its container holds sound (soundIn: a non-empty `mdat`
// and a movie duration above zero; a file that is no MPEG-4 container, a test's fake, is taken as
// given). Silent files are removed, the seats are listed as `silenced` in voices.json, the log
// gets voices.silenced, and one line goes to stdout naming the seats owed, the round and the run
// folder in full, which hooks/show-result.js reads and answers by running this same script outside
// the sandbox with `--by hook`; `by` rides on the log lines. voices.json carries `seconds` per
// file, read from the container, so the board's record and the hook's line can say how long each
// recording is. The run folder rides on the line since Part 81.2 (measured 2026-10-31: the host
// ran this script with `--run $R`, the hook read the run from the command text, took `$R` for a
// path and reported "not a run folder" for a folder that existed), so the hook never depends on
// the shape of the host's command.
//
// WHAT IT NEVER DOES. No network, no key, nothing outside the run folder and the project's
// voices.json; `child_process` runs the speech engine and nothing else (the one ruled exception
// beside the opener, CLAUDE.md). The spoken text is the seat's answer, untrusted content read
// aloud, never a command.
var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var lib=require('./lib.js');

var args=lib.parseArgs(process.argv.slice(2));
var sayCmd=(args.say&&args.say!==true?String(args.say):'')||process.env.CW_SAY||'';
var VOICES_FILE='voices.json';

function sayArgv(){ return sayCmd?sayCmd.split(/\s+/).filter(Boolean):['say']; }
function runSay(extra,opts){
  var a=sayArgv();
  return cp.spawnSync(a[0],a.slice(1).concat(extra),Object.assign({encoding:'utf8',timeout:120000},opts||{}));
}
function engineHere(){
  if(sayCmd)return {ok:true};
  if(process.platform!=='darwin')return {ok:false,reason:'not macOS: the Mac speech engine is not here; the board keeps the browser voices'};
  return {ok:true};
}
// `say -v ?` prints one voice per line: "Ava (Premium)       en_US    # Hello! My name is Ava."
function installedVoices(){
  var r=runSay(['-v','?']);
  if(r.error)return {error:'the speech command could not start ('+(r.error.code||r.error.message)+')',voices:[]};
  if(r.status!==0)return {error:'the speech command refused its voice list ('+String(r.stderr||'').trim().split('\n')[0]+')',voices:[]};
  var voices=[];
  String(r.stdout||'').split('\n').forEach(function(l){
    var m=/^(.+?)\s{2,}([A-Za-z]{2}[_-][A-Za-z0-9]+)\s+#/.exec(l)||/^(.+?)\s{2,}([A-Za-z]{2}[_-][A-Za-z0-9]+)\s*$/.exec(l);
    if(m)voices.push({name:m[1].trim(),lang:m[2].replace('_','-')});
  });
  return {voices:voices};
}
function qualityVoices(all,lang){
  lang=(lang||'en').slice(0,2).toLowerCase();
  var pool=all.filter(function(v){return lib.voiceTier(v.name)>0&&String(v.lang||'').slice(0,2).toLowerCase()===lang;});
  if(!pool.length)pool=all.filter(function(v){return lib.voiceTier(v.name)>0;});
  pool.sort(function(a,b){return lib.voiceTier(b.name)-lib.voiceTier(a.name)||lib.voiceRank(a.name)-lib.voiceRank(b.name)||a.name.localeCompare(b.name);});
  return pool.map(function(v){return v.name;});
}
function projectRoot(runDir){
  if(args.root&&args.root!==true)return path.resolve(args.root);
  var parent=path.dirname(path.resolve(runDir)), grand=path.dirname(parent);
  if(path.basename(parent)==='runs'&&path.basename(grand)==='combat-writing')return path.dirname(grand);
  return null;
}
function prefsPath(runDir){ var root=projectRoot(runDir); return root?path.join(root,'combat-writing',VOICES_FILE):null; }
function readPrefs(runDir){ var p=prefsPath(runDir); if(!p||!fs.existsSync(p))return {}; try{ return JSON.parse(fs.readFileSync(p,'utf8'))||{}; }catch(e){ return {}; } }
function assign(seats,ranked,prefs){
  var out={}, used={};
  seats.forEach(function(s,i){
    var want=prefs[s.id];
    if(want&&ranked.indexOf(want)>=0){out[s.id]=want;used[want]=true;}
  });
  var k=0;
  seats.forEach(function(s){
    if(out[s.id])return;
    if(!ranked.length)return;
    var free=ranked.filter(function(v){return !used[v];});
    var v=free.length?free[0]:ranked[k%ranked.length];
    out[s.id]=v; used[v]=true; k++;
  });
  return out;
}
function seatNo(id){ return parseInt(String(id).replace(/^seat-/,''),10)||0; }
// The sound in a rendered file: an MPEG-4 container (`ftyp` first) holds sound only when it carries
// a non-empty `mdat` atom and a movie header (`mvhd`, version 0 or 1) with a duration above zero.
// A file that is no MPEG-4 container is taken as given (seconds null).
function soundIn(file){
  var b; try{ b=fs.readFileSync(file); }catch(e){ return {ok:false,seconds:null}; }
  if(b.length<8||b.toString('latin1',4,8)!=='ftyp')return {ok:b.length>0,seconds:null};
  var off=0, mdat=0, seconds=0;
  while(off+8<=b.length){
    var size=b.readUInt32BE(off), type=b.toString('latin1',off+4,off+8);
    if(size===1&&off+16<=b.length)size=Number(b.readBigUInt64BE(off+8)); else if(size===0)size=b.length-off;
    if(size<8)break;
    if(type==='mdat')mdat+=size-8;
    if(type==='moov'){
      var i=b.indexOf('mvhd',off,'latin1');
      if(i>0&&i<off+size){
        if(b[i+4]===0&&i+24<=b.length){ var ts=b.readUInt32BE(i+16), du=b.readUInt32BE(i+20); seconds=ts?du/ts:0; }
        else if(i+36<=b.length){ var ts1=b.readUInt32BE(i+24), du1=Number(b.readBigUInt64BE(i+28)); seconds=ts1?du1/ts1:0; }
      }
    }
    off+=size;
  }
  return {ok:mdat>0&&seconds>0,seconds:Math.round(seconds*10)/10};
}
var SILENCED_LINE='Voices: the speech engine wrote no sound in this shell (a sandbox); ';
// Part 82: every quality voice per seat, up to this many files a seat (the seat's own voice first).
var MAX_VOICES_PER_SEAT=4;
function slugOf(name){ return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
// AAC at 48 kbps when the engine lists `aac` among its MPEG-4 data formats; else the engine's
// default, linear PCM at 352.8 kbps (measured 2026-10-31 on a hook-rendered file: 1 channel,
// 22050 Hz, 16-bit, 3.3 MB for 76 s). Inside the Claude Code sandbox the list reads `lpcm` alone
// and `--data-format=aac` is "unknown" (measured the same day), so the probe runs once per call.
var AAC_BIT_RATE=48000, AAC_ARGS=['--data-format=aac','--bit-rate='+AAC_BIT_RATE], AAC_FORMAT='aac '+(AAC_BIT_RATE/1000)+' kbps';
function aacHere(){
  var r=runSay(['--file-format=m4af','--data-format=?']);
  if(r.error)return false;
  return /^\s*aac\b/m.test(String(r.stdout||'')+'\n'+String(r.stderr||''));
}

if(args.list){
  var e0=engineHere(); if(!e0.ok){process.stdout.write(e0.reason+'\n');process.exit(0);}
  var iv=installedVoices(); if(iv.error){process.stdout.write(iv.error+'\n');process.exit(0);}
  var q=qualityVoices(iv.voices);
  process.stdout.write(q.length?('Voices the board would use, best first: '+q.join(' · ')+'\n'):'No voice named Premium or Enhanced is installed; the board keeps the browser voices.\n');
  process.exit(0);
}

if(!args.run||args.run===true)lib.die('--run is required');
var runDir=path.resolve(args.run);
if(!fs.existsSync(path.join(runDir,'seats.json')))lib.die('not a run folder: '+runDir);

if(args.set){
  var seatId=String(args.set);
  var rest=(args._||[]);
  var voice=rest.length?rest.join(' '):'';
  if(!/^seat-\d+$/.test(seatId)||!voice)lib.die('usage: --set <seat id> "<Voice Name>"');
  var e1=engineHere(); if(!e1.ok)lib.die(e1.reason);
  var iv1=installedVoices(); if(iv1.error)lib.die(iv1.error);
  var q1=qualityVoices(iv1.voices);
  var match=q1.filter(function(n){return n.toLowerCase()===voice.toLowerCase()||n.toLowerCase().indexOf(voice.toLowerCase()+' (')===0;})[0];
  if(!match)lib.die('"'+voice+'" is not an installed Premium or Enhanced voice. Installed: '+(q1.join(', ')||'none'));
  var pp=prefsPath(runDir); if(!pp)lib.die('the run is not under <project>/combat-writing/runs/, so there is no project voices.json to write; pass --root <project>');
  var prefs=readPrefs(runDir); prefs[seatId]=match;
  fs.mkdirSync(path.dirname(pp),{recursive:true});
  fs.writeFileSync(pp,JSON.stringify(prefs,null,2)+'\n');
  lib.appendLog(runDir,{event:'voices.set',seat:seatId,voice:match,file:path.relative(path.dirname(path.dirname(pp)),pp)});
  process.stdout.write('Voice kept: '+seatId+' reads in '+match+' from the next round (combat-writing/'+VOICES_FILE+').\n');
  process.exit(0);
}

if(!args.round||args.round===true)lib.die('--round is required');
var round=String(args.round);
var roundDir=path.join(runDir,'rounds',round);
if(!fs.existsSync(roundDir))lib.die('no such round: '+round);
var t0=Date.now();
var e=engineHere();
if(!e.ok){ lib.appendLog(runDir,{event:'voices.skipped',round:round,reason:e.reason}); process.exit(0); }
var inst=installedVoices();
if(inst.error){ lib.appendLog(runDir,{event:'voices.skipped',round:round,reason:inst.error}); process.exit(0); }
var ranked=qualityVoices(inst.voices);
if(!ranked.length){ lib.appendLog(runDir,{event:'voices.skipped',round:round,reason:'no voice named Premium or Enhanced is installed on this Mac',installed:inst.voices.length}); process.exit(0); }
var seats=lib.readSeats(runDir).seats;
var answered=seats.filter(function(s){return fs.existsSync(path.join(roundDir,s.id+'.answer.md'));});
var assigned=assign(seats,ranked,readPrefs(runDir));
var by=args.by&&args.by!==true?String(args.by):'host';
var aac=aacHere(), aacRefused=null;
var files={}, seconds={}, bytes={}, failed={}, silenced=[], renders={}, rendersFailed={};
var engine=sayCmd?'speech command (given)':'macOS say';
function writeRecord(){
  var record={engine:engine,format:aac?AAC_FORMAT:'lpcm',installed:ranked,assigned:assigned,files:files,seconds:seconds,bytes:bytes,renders:renders,renders_failed:rendersFailed,failed:failed,silenced:silenced};
  if(aacRefused)record.aac_refused=aacRefused;
  fs.writeFileSync(path.join(roundDir,VOICES_FILE),JSON.stringify(record,null,2)+'\n');
  return record;
}
// One render: the voice, the output, the spoken text. AAC first when the engine lists it; a refusal
// of the AAC flags (a non-zero exit) is retried once in the engine's default format and recorded.
function renderOne(voice,outPath,tmp){
  var format=aac?AAC_FORMAT:'lpcm';
  var r=runSay(['-v',voice,'-o',outPath,'-f',tmp].concat(aac?AAC_ARGS:[]));
  if(aac&&(r.error||r.status!==0)){
    if(!aacRefused)aacRefused=r.error?(r.error.code||r.error.message):String(r.stderr||'').trim().split('\n')[0]||('exit '+r.status);
    try{ fs.unlinkSync(outPath); }catch(err){}
    r=runSay(['-v',voice,'-o',outPath,'-f',tmp]); format='lpcm';
  }
  var ran=!r.error&&r.status===0&&fs.existsSync(outPath);
  var snd=ran?soundIn(outPath):null;
  if(ran&&snd.ok)return {ok:true,seconds:snd.seconds,bytes:fs.statSync(outPath).size,format:format};
  try{ fs.unlinkSync(outPath); }catch(err){}
  return {ok:false,silenced:ran,reason:ran?'no sound':(r.error?(r.error.code||r.error.message):String(r.stderr||'').trim().split('\n')[0]||('exit '+r.status))};
}
var tmps={};
answered.forEach(function(s){
  var text=lib.readText(path.join(roundDir,s.id+'.answer.md'));
  var crewPath=path.join(roundDir,s.id+'.crew.answer.md');
  var crew=fs.existsSync(crewPath)?lib.readText(crewPath):null;
  var spoken=lib.spokenPlain(text,crew);
  if(!spoken.trim())return;
  tmps[s.id]=path.join(os.tmpdir(),'cw-speak-'+process.pid+'-'+s.id+'.txt');
  fs.writeFileSync(tmps[s.id],spoken+'\n');
});
// Pass 1: every seat's own voice, so a render stopped early still leaves one file per seat.
answered.forEach(function(s){
  if(!tmps[s.id])return;
  var voice=assigned[s.id], out=s.id+'.m4a';
  var r=renderOne(voice,path.join(roundDir,out),tmps[s.id]);
  if(r.ok){ files[s.id]=out; if(r.seconds!==null)seconds[s.id]=r.seconds; bytes[s.id]=r.bytes; renders[s.id]={}; renders[s.id][voice]={file:out,seconds:r.seconds,bytes:r.bytes,format:r.format}; writeRecord(); return; }
  if(r.silenced)silenced.push(s.id); else failed[s.id]=r.reason;
});
// Pass 2 (Part 82): the other quality voices for every seat whose own voice rendered, the ranked
// pool in order, voice by voice across the seats so a stopped render leaves every seat its second
// voice before any seat gets its third; up to MAX_VOICES_PER_SEAT in all; a voice that fails or
// comes back silent is recorded and skipped, never failing the seat.
for(var k=0;k<MAX_VOICES_PER_SEAT-1;k++){
  answered.forEach(function(s){
    if(!files[s.id])return;
    var others=ranked.filter(function(v){return v!==assigned[s.id];});
    var voice=others[k]; if(!voice)return;
    var out=s.id+'.'+slugOf(voice)+'.m4a';
    var r=renderOne(voice,path.join(roundDir,out),tmps[s.id]);
    if(r.ok){ renders[s.id][voice]={file:out,seconds:r.seconds,bytes:r.bytes,format:r.format}; writeRecord(); return; }
    rendersFailed[s.id]=rendersFailed[s.id]||{}; rendersFailed[s.id][voice]=r.reason;
  });
}
Object.keys(tmps).forEach(function(id){ try{ fs.unlinkSync(tmps[id]); }catch(err){} });
var record=writeRecord();
if(silenced.length){
  lib.appendLog(runDir,{event:'voices.silenced',round:round,engine:record.engine,seats:silenced,files:files,by:by,ms:Date.now()-t0});
  process.stdout.write(SILENCED_LINE+silenced.join(', ')+' owed for round '+round+' of '+runDir+'.\n');
}
if(Object.keys(files).length||Object.keys(failed).length)lib.appendLog(runDir,{event:'voices.rendered',round:round,engine:record.engine,format:record.format,aac_refused:aacRefused,assigned:assigned,files:files,seconds:seconds,bytes:bytes,renders:renders,renders_failed:rendersFailed,failed:failed,silenced:silenced,by:by,ms:Date.now()-t0});
Object.keys(failed).forEach(function(id){ process.stderr.write('voice file for '+id+' not rendered: '+failed[id]+'; the board reads that seat with the browser\n'); });
process.exit(0);
