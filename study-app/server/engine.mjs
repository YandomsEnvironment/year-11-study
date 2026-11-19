import { create, all } from 'mathjs';
import { spokenFinalValue } from './spoken-answer.mjs';
const math=create(all,{number:'number'});
export const intervals=[1,3,7,14,30];
export const dayKey=(date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));
const clean=s=>String(s).toLowerCase().replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/\s+/g,'').replace(/[.!]$/,'');
export function localGrade(question,answer){
 const input=String(answer).trim();
 if(question.kind==='rubric'||question.kind==='ai')return {verdict:'uncertain',score:0,feedback:'This response needs contextual marking. Connect the AI tutor in Settings, or use the model answer to reflect. Your progress has not been changed.',misconceptions:[],criteria:question.criteria||[]};
 let correct=false;
 if(question.kind==='numeric'){
  const working=(spokenFinalValue(input)||input).replace(/[−–]/g,'-').replace(/²/g,'^2').replace(/³/g,'^3');
  const final=working.match(/(?:\b[a-z]+\s*=\s*)([-+]?\d*\.?\d+(?:\s*\/\s*[-+]?\d*\.?\d+)?\s*[a-zA-Z/²^\d ]*)\s*$/i);
  const numeric=(final?final[1]:working).replace(/^\s*[a-z]+\s*=\s*/i,'');
  const match=numeric.match(/^([-+]?\d*\.?\d+(?:\s*\/\s*[-+]?\d*\.?\d+)?)\s*(.*)$/);
  if(!match)return {verdict:'uncertain',score:0,feedback:'I could not read that numerical answer. Enter a number or fraction, with a unit when requested.',misconceptions:[],criteria:[]};
  try{
   let value=math.evaluate(match[1]);const unit=match[2].trim();
   if(question.unit&&unit)value=math.unit(value,unit).toNumber(question.unit);
   else if(!question.unit&&unit)return {verdict:'uncertain',score:0,feedback:'Please enter the numerical value only for this question.',misconceptions:[],criteria:[]};
   correct=Math.abs(value-question.numeric)<=Math.max(1e-8,Math.abs(question.numeric)*0.001);
   if(correct&&question.unit&&!unit)return {verdict:'partial',score:0.7,feedback:`The numerical value is right. Include the requested unit (${question.unit}) to make the answer complete.`,misconceptions:['Missing units'],criteria:[]};
  }catch{return {verdict:'uncertain',score:0,feedback:'That unit or number could not be interpreted. Use the unit requested in the question.',misconceptions:[],criteria:[]};}
 }else{
  correct=[question.answer,...(question.aliases||[])].some(a=>clean(a)===clean(input));
  if(!correct&&question.answer.includes('x')&&/^[\dx()+\-*/^ .]+$/.test(clean(input))&&clean(input).length<150){
   try{const parsed=math.parse(clean(input));const allowed=parsed.filter(n=>n.isSymbolNode).every(n=>n.name==='x');
    correct=allowed&&clean(input).includes(')(')&&math.simplify(`(${clean(input).replace(/\)\(/g,')*(')})-(${question.answer.replace(/\)\(/g,')*(')})`).toString()==='0';
   }catch{}
  }
 }
 return {verdict:correct?'correct':'incorrect',score:correct?1:0,feedback:correct?'That’s correct. You applied the idea independently.':'There’s a gap to work through. Try the hint, then compare your approach with the worked example.',misconceptions:correct?[]:['Needs another independent application'],criteria:[]};
}
export function progressFrom(attempts,now=Date.now()){
 const relevant=attempts.filter(a=>a.status==='graded'&&!a.disputed&&a.grade?.verdict!=='uncertain').sort((a,b)=>a.created.localeCompare(b.created));
 if(!relevant.length)return {state:'unknown',level:0,due:null,last:null,successDays:[],misconceptions:[]};
 let level=0;let due=null;let last=null;let failed=false;const days=new Set();const questions=new Set();let misconceptions=[];
 for(const a of relevant){
  last=a.created;
  if(a.grade.verdict==='correct'&&!a.assisted){
   const day=dayKey(a.created);
   if(!days.has(day)){level=Math.min(level+1,intervals.length);days.add(day);}questions.add(a.questionId);
   due=new Date(new Date(a.created).getTime()+intervals[Math.max(0,level-1)]*86400000).toISOString();failed=false;misconceptions=[];
  }else if(a.grade.verdict==='correct'){
   const checkBy=new Date(new Date(a.created).getTime()+86400000).toISOString();
   if(!due||checkBy<due)due=checkBy;
   if(!days.size)failed=true;
  }else{level=Math.max(0,level-1);due=new Date(new Date(a.created).getTime()+86400000).toISOString();failed=true;misconceptions=a.grade.misconceptions||[];}
 }
 return {state:failed?'learning':days.size>=3&&questions.size>=3&&level>=3?'retained':'practising',level,due,last,successDays:[...days],misconceptions};
}
export function rankSkills(skills,states,session,settings,deadlines=[],now=Date.now()){
 const enabled=skills.filter(s=>(session.targetSubject?s.subject===session.targetSubject:settings.enabledSubjects.includes(s.subject))&&!(s.year===12&&!settings.year12Enabled));
 const subjectLast={};
 for(const s of enabled){const last=states[s.id]?.last;if(last&&(!subjectLast[s.subject]||last>subjectLast[s.subject]))subjectLast[s.subject]=last;}
 const focus=new Set(session.focus||[]);
 const reviewsAllowed=(session.reviewCount||0)<4&&(session.reviewSeconds||0)<Math.min(480,session.budget*60*0.3);
 const scored=enabled.filter(s=>!focus.size||focus.has(s.subject)||focus.size<2).map(s=>{
  const state=states[s.id]||{state:'unknown'};
  const blocked=s.prerequisites.some(p=>!['practising','retained'].includes(states[p]?.state));
  const due=reviewsAllowed&&state.due&&new Date(state.due).getTime()<=now;
  const repeated=(session.seen||[]).filter(x=>x===s.id).length;
  let score=due?1000:state.state==='learning'?600:state.state==='unknown'?350:100;
  if(blocked)score-=800;
  if(!subjectLast[s.subject])score+=90;else score+=Math.min(80,(now-new Date(subjectLast[s.subject]).getTime())/86400000*10);
  if(s.foundation)score+=30;
  score-=repeated*250;
  score-=s.order/1000;
  for(const d of deadlines.filter(d=>d.subject===s.subject&&!d.done)){const days=(new Date(d.date+'T23:59:59+11:00').getTime()-now)/86400000;if(days>=0&&days<=14)score+=(14-days)*15;}
  if(session.repair===s.id&&repeated<3)score+=1500;
  if(session.check===s.id)score+=1800;
  return {skill:s,score,mode:session.check===s.id?'check':session.repair===s.id?'retry':due?'review':state.state==='unknown'?'diagnostic':'learn',reason:session.check===s.id?'A fresh question checks whether you can apply this independently.':session.repair===s.id?'Try a different question to check the gap we just worked on.':due?'A spaced review is due. Let’s see what you remember.':blocked?'Checking a prerequisite before moving forward.':state.state==='unknown'?'A short diagnostic finds your starting point.':'Practise this skill before moving further.'};
 });
 return scored.sort((a,b)=>b.score-a.score);
}
