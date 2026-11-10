// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// seats.js: the person's pick of a model for a fresh reader (Part 87).
//
//   node seats.js [--root <dir>] --set <seat-1|seat-2> "<model>"
//   node seats.js [--root <dir>] --clear <seat-1|seat-2>
//   node seats.js [--root <dir>]            (the picks, one line each, or that there is none)
//
// By default seat-1 starts on the session's own model and seat-2 on the second model the host's
// own agent tool lists, so the seats move with the host and no model name lives in the plugin. A
// pick written here wins over that default for the seat it names: the host reads this file before
// new-run.js and starts the reader on the model picked when its tool offers it, else on the
// seat's default, saying so in one line. The file is <root>/combat-writing/seats.json, the seventh write location beside
// voices.json, which it mirrors: the person's own data, kept with the project, never a key, never
// read by any seat. Shape: {"readers": {"seat-2": "<model>"}}. Nothing is validated against a
// model list here, because the list is the host's and changes with it; the name is kept as typed.
// Nothing is logged: there is no run; the run's seats.json records what the host passed.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
var root=path.resolve(args.root&&args.root!==true?args.root:process.cwd());
var file=lib.readersPicksPath(root);
var rel=lib.READERS_REL.split(path.sep).join('/');
var SEAT_RE=/^seat-[12]$/;

function readAll(){
  if(!fs.existsSync(file))return {readers:{}};
  try{ var j=JSON.parse(lib.readText(file)); if(!j||typeof j!=='object')j={}; if(!j.readers||typeof j.readers!=='object')j.readers={}; return j; }
  catch(e){ lib.die(rel+' is not JSON; fix or remove it: '+file); }
}
function writeAll(j){ fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,JSON.stringify(j,null,2)+'\n'); }

if(args.set!==undefined){
  var seatId=String(args.set), model=(args._||[]).join(' ').trim();
  if(args.set===true||!SEAT_RE.test(seatId)||!model)lib.die('usage: --set seat-1|seat-2 "<model>" (a fresh reader\'s seat; the outside seats are the add-on\'s)');
  var j=readAll(); j.readers[seatId]=model; writeAll(j);
  process.stdout.write('Reader kept: '+seatId+' starts on '+model+' from the next run when the host offers it ('+rel+'); --clear '+seatId+' returns it to the host\'s list.\n');
}else if(args.clear!==undefined){
  var cid=String(args.clear);
  if(args.clear===true||!SEAT_RE.test(cid))lib.die('usage: --clear seat-1|seat-2');
  var k=readAll(); var had=k.readers[cid]; delete k.readers[cid]; writeAll(k);
  process.stdout.write(had?('Reader cleared: '+cid+' starts on the host\'s list from the next run ('+rel+').\n'):('No pick kept for '+cid+'.\n'));
}else{
  var picks=readAll().readers;  // a broken file is named here, where the person looks; lib.readReaderPicks reads {} for the host
  var ids=Object.keys(picks).filter(function(id){return SEAT_RE.test(id);}).sort();
  if(!ids.length)process.stdout.write('No reader picked: seat-1 starts on the session\'s own model and seat-2 on the second model the host lists. Pick one with seats.js --set seat-2 "<model>".\n');
  else ids.forEach(function(id){ process.stdout.write(id+': '+picks[id]+' (picked; '+rel+')\n'); });
}
