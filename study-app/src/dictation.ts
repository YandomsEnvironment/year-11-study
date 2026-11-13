/** Browser speech capture, separate from grading and usable with an injected recogniser in tests. */
export type DictationState='idle'|'starting'|'listening'|'stopping';
export type SpeechResult={isFinal:boolean;[index:number]:{transcript:string};length?:number};
export type SpeechEvent={results:ArrayLike<SpeechResult>;resultIndex?:number};
export interface Recogniser {
 lang:string;continuous:boolean;interimResults:boolean;maxAlternatives:number;
 onstart:(()=>void)|null;onresult:((event:SpeechEvent)=>void)|null;
 onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;
 start():void;stop():void;abort():void;
}
export type SpeechConstructor=new()=>Recogniser;
export type DictationCallbacks={text:(value:string)=>void;interim:(value:string)=>void;state:(value:DictationState)=>void;error:(message:string)=>void};
export function speechConstructor(scope:unknown=globalThis):SpeechConstructor|null {
 const host=scope as {SpeechRecognition?:SpeechConstructor;webkitSpeechRecognition?:SpeechConstructor};
 return host.SpeechRecognition||host.webkitSpeechRecognition||null;
}
export const joinTranscript=(a:string,b:string)=>!b.trim()?a:!a.trim()?b.trim():a.replace(/\s+$/,'')+' '+b.trim();
const errorMessage=(error:string)=>({
 'not-allowed':'Microphone access was blocked. Allow the microphone for Recall in your browser, then click Dictate again.',
 'service-not-allowed':'This browser cannot start its speech service. Open Recall in Google Chrome, or keep typing your answer.',
 'audio-capture':'No microphone was found. Connect a microphone and try Dictate again.',
 network:'The speech service could not connect. Check your internet connection; your transcript is saved.',
 'language-not-supported':'This browser’s speech service does not support the selected language. Try Google Chrome or type your answer.',
 aborted:'Dictation stopped. Your transcript is saved.',
}[error]||'Dictation stopped unexpectedly. Your transcript is saved; you can edit it or try again.');

export class DictationController {
 private Ctor:SpeechConstructor;private callbacks:DictationCallbacks;
 private recogniser:Recogniser|null=null;private base='';private final='';private interimText='';
 private wanted=false;private disposed=false;private failed=false;private generation=0;
 private restartTimer:ReturnType<typeof setTimeout>|null=null;private stopTimer:ReturnType<typeof setTimeout>|null=null;
 private pending:Promise<string>|null=null;private resolve:((value:string)=>void)|null=null;private reject:((error:Error)=>void)|null=null;
 constructor(Ctor:SpeechConstructor,callbacks:DictationCallbacks){this.Ctor=Ctor;this.callbacks=callbacks;}
 get active(){return this.wanted||!!this.pending;}
 start(existing:string){
  if(this.disposed)throw new Error('This dictation session has ended.');
  if(this.active)return;
  this.base=existing;this.final='';this.interimText='';this.failed=false;this.wanted=true;
  this.callbacks.error('');this.callbacks.interim('');this.open();
 }
 private open(){
  if(!this.wanted||this.disposed)return;
  const generation=++this.generation;const r=new this.Ctor();this.recogniser=r;this.final='';this.interimText='';
  r.lang='en-AU';r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
  const current=()=>!this.disposed&&generation===this.generation;
  r.onstart=()=>{if(!current())return;if(this.wanted)this.callbacks.state('listening');else{try{r.stop();}catch{r.abort();}}};
  r.onresult=event=>{
   if(!current())return;
   const final:string[]=[];const interim:string[]=[];
   for(let i=0;i<event.results.length;i++){const result=event.results[i];const words=result[0]?.transcript||'';(result.isFinal?final:interim).push(words);}
   this.final=final.join(' ').trim();this.interimText=interim.join(' ').trim();
   this.callbacks.text(joinTranscript(this.base,this.final));this.callbacks.interim(this.interimText);
  };
  r.onerror=event=>{
   if(!current()||event.error==='no-speech')return;
   if(event.error==='aborted'&&!this.wanted)return;
   this.failed=true;this.wanted=false;this.callbacks.error(errorMessage(event.error));
   this.completeRun();this.settle(false);
   try{r.abort();}catch{}
   this.generation++;this.recogniser=null;
  };
  r.onend=()=>{
   if(!current())return;
   this.completeRun();this.recogniser=null;
   if(this.wanted){this.callbacks.state('starting');this.restartTimer=setTimeout(()=>this.open(),350);}
   else this.settle(!this.failed);
  };
  this.callbacks.state('starting');
  try{r.start();}catch{this.failed=true;this.wanted=false;this.callbacks.error('Dictation could not start. Check your microphone permission, or try Google Chrome.');this.recogniser=null;this.callbacks.state('idle');}
 }
 private completeRun(){
  this.base=joinTranscript(joinTranscript(this.base,this.final),this.interimText);
  this.final='';this.interimText='';this.callbacks.text(this.base);this.callbacks.interim('');
 }
 private settle(success:boolean){
  if(this.stopTimer)clearTimeout(this.stopTimer);this.stopTimer=null;this.callbacks.state('idle');
  const resolve=this.resolve;const reject=this.reject;this.pending=null;this.resolve=null;this.reject=null;
  if(success)resolve?.(this.base);else reject?.(new Error('Dictation was interrupted. Check the saved transcript, then click Check answer.'));
 }
 finish():Promise<string>{
  if(this.pending)return this.pending;
  this.wanted=false;if(this.restartTimer)clearTimeout(this.restartTimer);this.restartTimer=null;
  if(!this.recogniser){this.callbacks.state('idle');return Promise.resolve(this.base);}
  this.pending=new Promise<string>((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});
  const pending=this.pending;this.callbacks.state('stopping');
  this.stopTimer=setTimeout(()=>{
   this.completeRun();const r=this.recogniser;this.recogniser=null;this.generation++;
   try{r?.abort();}catch{}
   this.callbacks.error('The speech service took too long to finish. Your words are saved. Check the transcript, then click Check answer.');this.settle(false);
  },2500);
  try{this.recogniser.stop();}catch{const r=this.recogniser;this.completeRun();this.recogniser=null;this.generation++;try{r?.abort();}catch{}this.settle(true);}
  return pending;
 }
 dispose(){
  this.wanted=false;this.disposed=true;this.generation++;
  if(this.restartTimer)clearTimeout(this.restartTimer);if(this.stopTimer)clearTimeout(this.stopTimer);
  const r=this.recogniser;this.recogniser=null;try{r?.abort();}catch{}
  // Resolve waiting stops without emitting to an unmounted or different question.
  this.resolve?.(joinTranscript(joinTranscript(this.base,this.final),this.interimText));this.pending=null;this.resolve=null;this.reject=null;
 }
}
