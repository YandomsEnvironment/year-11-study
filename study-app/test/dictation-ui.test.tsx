import React,{useState} from 'react';
import {test,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,act,cleanup,waitFor} from '@testing-library/react';
import {StudySession} from '../src/StudySession';
import type {AppState,Session} from '../src/types';

class FakeSpeech{
 static current:FakeSpeech;stops=0;aborts=0;
 onstart:(()=>void)|null=null;onend:(()=>void)|null=null;onresult:((event:any)=>void)|null=null;onerror:((event:any)=>void)|null=null;
 constructor(){FakeSpeech.current=this;}
 start(){this.onstart?.();}stop(){this.stops++;}abort(){this.aborts++;}
 result(text:string,final=true){this.onresult?.({results:[{0:{transcript:text},isFinal:final}]});}
 end(){this.onend?.();}
}
const initial={id:'speech-session',status:'active',budget:30,elapsedSeconds:0,mode:'diagnostic',reason:'Find the next useful skill.',created:'2027-01-01T01:00:00Z',question:{id:'speech-question',skillId:'maths-linear',prompt:'Solve 4x + 7 = 31. Give the value of x.',provenance:'Prepared practice',kind:'numeric'},skill:{id:'maths-linear',subject:'maths',title:'Linear equations',sourceUrl:'https://curriculum.nsw.edu.au'},latest:null,summary:{attempted:0,independent:0,gaps:[]},draft:null} as unknown as Session;
let requests:{url:string;body:any}[]=[];
const mockStorage = (()=>{
 let store: Record<string, string> = {};
 return {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = String(v); },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { store = {}; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
 };
})();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true });
if (typeof window !== 'undefined') {
 Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true, configurable: true });
}
beforeEach(()=>{
 requests=[];
 mockStorage.clear();
 vi.stubGlobal('SpeechRecognition',FakeSpeech);
 vi.stubGlobal('fetch',vi.fn(async(url:string,options:any={})=>{const body=JSON.parse(options.body||'{}');requests.push({url,body});
  const answer=url.endsWith('/answer');const attempt={id:body.submissionId,answer:body.answer,status:'graded',assisted:false,disputed:false,grade:{verdict:'correct',score:1,feedback:'The answer is correct.',criteria:[],misconceptions:[]}};
  const response=answer?{attempt,session:{...initial,latest:attempt,summary:{attempted:1,independent:1,gaps:[]}}}:{ok:true};return {ok:true,json:async()=>response};
 }));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function Harness(){
 const [session,setSession]=useState(initial);const [busy,setBusy]=useState(false);const [visible,setVisible]=useState(true);const [error,setError]=useState('');
 const data={settings:{hasApiKey:false},subjects:[],skills:[]} as unknown as AppState;
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <><button onClick={()=>setVisible(false)}>Leave question</button><p data-testid="error">{error}</p><StudySession visible={visible} data={data} session={session} setSession={setSession} busy={busy} run={run} sync={async s=>setSession(s)} start={()=>{}} action={async()=>{}} remaining={30} onSettings={()=>{}}/></>;
}
test('actual study UI captures the tail on Enter, saves it and submits once',async()=>{
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Dictate',exact:true}));
 const recogniser=FakeSpeech.current;act(()=>recogniser.result('I subtract seven. My answer is',false));
 const box=screen.getByRole('textbox',{name:/Your answer/});expect((box as HTMLTextAreaElement).readOnly).toBe(true);
 fireEvent.keyDown(box,{key:'Enter',code:'Enter'});
 expect(recogniser.stops).toBe(1);expect(requests.filter(r=>r.url.endsWith('/answer'))).toHaveLength(0);
 await act(async()=>{recogniser.result('I subtract seven and divide by four. My final answer is six.',true);recogniser.end();});
 await waitFor(()=>expect(requests.filter(r=>r.url.endsWith('/answer'))).toHaveLength(1));
 const payload=requests.find(r=>r.url.endsWith('/answer'))!.body;
 expect(payload.answer).toBe('I subtract seven and divide by four. My final answer is six.');expect(payload.inputMode).toBe('dictation');
 expect(requests.some(r=>r.url.endsWith('/draft')&&r.body.text===payload.answer)).toBe(true);
 await waitFor(()=>expect(screen.getByText('The answer is correct.')).toBeTruthy());
});
test('Stop allows editing without submitting; Enter checks the edited transcript',async()=>{
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Dictate',exact:true}));const r=FakeSpeech.current;act(()=>r.result('my answer is seven'));
 fireEvent.click(screen.getByRole('button',{name:'Stop dictation',exact:true}));await act(async()=>r.end());
 expect(requests.filter(r=>r.url.endsWith('/answer'))).toHaveLength(0);
 const box=screen.getByRole('textbox',{name:/Your answer/});expect((box as HTMLTextAreaElement).readOnly).toBe(false);
 fireEvent.change(box,{target:{value:'my answer is six'}});fireEvent.keyDown(box,{key:'Enter',code:'Enter'});
 await waitFor(()=>expect(requests.filter(r=>r.url.endsWith('/answer'))).toHaveLength(1));expect(requests.find(r=>r.url.endsWith('/answer'))!.body.answer).toBe('my answer is six');
});
test('Shift+Enter does not submit, and leaving the question stops capture',async()=>{
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Dictate',exact:true}));const r=FakeSpeech.current;act(()=>r.result('working so far'));
 fireEvent.keyDown(screen.getByRole('textbox',{name:/Your answer/}),{key:'Enter',shiftKey:true});expect(r.stops).toBe(0);expect(requests.filter(r=>r.url.endsWith('/answer'))).toHaveLength(0);
 fireEvent.click(screen.getByRole('button',{name:'Leave question',exact:true}));await waitFor(()=>expect(r.stops).toBe(1));await act(async()=>r.end());
});
test('unsupported browsers explain the fallback without requesting a microphone',()=>{
 vi.stubGlobal('SpeechRecognition',undefined);vi.stubGlobal('webkitSpeechRecognition',undefined);render(<Harness/>);
 expect((screen.getByRole('button',{name:'Dictate',exact:true}) as HTMLButtonElement).disabled).toBe(true);expect(screen.getByText(/Dictation needs a supported browser/)).toBeTruthy();
});
