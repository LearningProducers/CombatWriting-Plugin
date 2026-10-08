// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// lib.js: what the Combat Writing scripts share. Plain Node, no dependencies.
//
// The run folder (created by new-run.js, in the person's project, never in the plugin):
//   <root>/combat-writing/runs/<run-id>/
//     draft.md                 the draft snapshot, copied once, never changed
//     brief.md                 the context brief, when the person gave one
//     seats.json               the crew: id, label, model, company, and where the name came from
//     log.jsonl                one JSON object per line, timestamped; the first line opens with the credit line
//     rounds/<nn>-<kind>/      one folder per round, nn two digits, kind a word (sparring, debate, battle)
//       <seat>.question.md     the focus question or navigation note for that seat, when given
//       <seat>.packet.md       what the seat was sent, built by packet.js from files only
//       <seat>.answer.md       what the seat wrote; its first line is the rating line
//
// Every record the plugin writes opens with the credit line. A seat's answer is the seat's
// writing and opens with its rating line instead.

var fs=require('fs'), path=require('path'), crypto=require('crypto');

var CREDIT='Combat Writing — Learning Producers Inc., Israel Hernandez, founder';
var RUNS_DIR=path.join('combat-writing','runs');
var DEFAULT_WORD_CAP=400;
var DEFAULT_COMPANY='Anthropic';
var MODEL_UNREPORTED='model unreported';

function parseArgs(argv){
  var out={_:[]};
  for(var i=0;i<argv.length;i++){
    var a=argv[i];
    if(a.indexOf('--')===0){
      var key=a.slice(2);
      if(i+1<argv.length&&argv[i+1].indexOf('--')!==0){out[key]=argv[++i];}
      else out[key]=true;
    }else out._.push(a);
  }
  return out;
}

function die(msg){ process.stderr.write('error: '+msg+'\n'); process.exit(2); }

function sha256(buf){ return crypto.createHash('sha256').update(buf).digest('hex'); }

function readText(p){ return fs.readFileSync(p,'utf8'); }

function appendLog(runDir,obj){
  var line=JSON.stringify(Object.assign({ts:new Date().toISOString()},obj));
  fs.appendFileSync(path.join(runDir,'log.jsonl'),line+'\n');
}

function readSeats(runDir){
  var p=path.join(runDir,'seats.json');
  if(!fs.existsSync(p))die('no seats.json in '+runDir);
  return JSON.parse(readText(p));
}

// A seat's label as it appears in every packet and every result: model and company, never anonymous.
function seatLabel(seat){ return seat.model+' ('+seat.company+'), '+seat.id; }

// Rounds in order: rounds/01-sparring, rounds/02-debate, ... sorted by their two-digit prefix.
function listRounds(runDir){
  var dir=path.join(runDir,'rounds');
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir).filter(function(n){return /^\d\d-[a-z][a-z0-9-]*$/.test(n)&&fs.statSync(path.join(dir,n)).isDirectory();}).sort();
}

// For every seat but `exceptId`, the most recent answer file written in a round before `beforeRound`.
function latestAnswers(runDir,seats,exceptId,beforeRound){
  var rounds=listRounds(runDir).filter(function(r){return !beforeRound||r<beforeRound;});
  var out=[];
  seats.forEach(function(seat){
    if(seat.id===exceptId)return;
    for(var i=rounds.length-1;i>=0;i--){
      var p=path.join(runDir,'rounds',rounds[i],seat.id+'.answer.md');
      if(fs.existsSync(p)){out.push({seat:seat,round:rounds[i],file:p,text:readText(p)});break;}
    }
  });
  return out;
}

function wordCount(text){ return text.split(/\s+/).filter(Boolean).length; }

// The rating contract, checked on a seat's answer. Returns {ok, rating, words, reasons}.
function checkAnswer(text,wordCap){
  var reasons=[];
  var cap=wordCap||DEFAULT_WORD_CAP;
  var lines=text.replace(/^﻿/,'').split(/\r?\n/);
  var first=lines[0]||'';
  var rating=null;
  var m=/^RATING: (\d{1,2})\/10$/.exec(first);
  if(!m){
    if(/^\s*rating\s*:/i.test(first))reasons.push('first line is "'+first+'", must be exactly "RATING: X/10" in uppercase with nothing else on the line');
    else if(first.trim()==='')reasons.push('first line is empty; the rating line must come first');
    else reasons.push('first line is not the rating line: "'+first.slice(0,80)+'"');
  }else{
    rating=parseInt(m[1],10);
    if(rating<1||rating>10)reasons.push('rating '+rating+' is outside 1 to 10');
    else if(rating===7)reasons.push('rating is 7; 7 is forbidden, commit to 6 or 8');
  }
  var body=lines.slice(1).join('\n');
  if(body.trim()==='')reasons.push('no reasoning after the rating line');
  var words=wordCount(text);
  if(words>cap)reasons.push(words+' words, over the cap of '+cap);
  return {ok:reasons.length===0,rating:rating,words:words,reasons:reasons};
}

module.exports={
  CREDIT:CREDIT,RUNS_DIR:RUNS_DIR,DEFAULT_WORD_CAP:DEFAULT_WORD_CAP,DEFAULT_COMPANY:DEFAULT_COMPANY,MODEL_UNREPORTED:MODEL_UNREPORTED,
  parseArgs:parseArgs,die:die,sha256:sha256,readText:readText,appendLog:appendLog,readSeats:readSeats,seatLabel:seatLabel,
  listRounds:listRounds,latestAnswers:latestAnswers,wordCount:wordCount,checkAnswer:checkAnswer
};
