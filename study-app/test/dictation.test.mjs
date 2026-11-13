import test from 'node:test';
import assert from 'node:assert/strict';
import {DictationController,speechConstructor} from '../src/dictation.ts';
import {spokenFinalValue,spokenNumber} from '../server/spoken-answer.mjs';
import {localGrade} from '../server/engine.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
class FakeSpeech{
 static instances=[];
 constructor(){FakeSpeech.instances.push(this);this.stops=0;this.aborts=0;}
 start(){this.onstart?.();}
 stop(){this.stops++;}
 abort(){this.aborts++;}
 result(...items){this.onresult?.({results:items.map(([text,isFinal])=>({0:{transcript:text},isFinal}))});}
 end(){this.onend?.();}
 error(error){this.onerror?.({error});}
}
function setup(){const output={text:'',interim:'',state:'idle',error:''};const controller=new DictationController(FakeSpeech,{text:t=>output.text=t,interim:t=>output.interim=t,state:t=>output.state=t,error:t=>output.error=t});return {controller,output,current:()=>FakeSpeech.instances.at(-1)};}
test('dictation preserves typed work and replaces evolving interim results without duplication',async()=>{
 const {controller,output,current}=setup();controller.start('First I rearrange.');const r=current();
 assert.equal(r.lang,'en-AU');assert.equal(r.continuous,true);
 r.result(['subtract seven',false]);assert.equal(output.text,'First I rearrange.');assert.equal(output.interim,'subtract seven');
 r.result(['subtract seven from both sides',true],['then divide',false]);assert.equal(output.text,'First I rearrange. subtract seven from both sides');
 r.result(['subtract seven from both sides',true],['then divide by four',true]);
 assert.equal(output.text,'First I rearrange. subtract seven from both sides then divide by four');
 const done=controller.finish();r.end();assert.equal(await done,output.text);controller.dispose();
});
test('Enter-style finish waits for the final words, then resolves exactly once',async()=>{
 const {controller,output,current}=setup();controller.start('');const r=current();r.result(['x equals',false]);
 const one=controller.finish();const two=controller.finish();assert.equal(one,two);assert.equal(r.stops,1);assert.equal(output.state,'stopping');
 let settled=false;one.then(()=>settled=true);await Promise.resolve();assert.equal(settled,false);
 r.result(['x equals six',true]);r.end();assert.equal(await one,'x equals six');assert.equal(output.state,'idle');controller.dispose();
});
test('a long thinking pause restarts recognition without losing earlier speech',async()=>{
 const {controller,output,current}=setup();controller.start('Working:');current().result(['subtract seven',true]);current().end();await sleep(380);const r=current();r.result(['divide by four',true]);assert.equal(output.text,'Working: subtract seven divide by four');const done=controller.finish();r.end();await done;controller.dispose();
});
test('stopping between automatic restarts cancels the restart',async()=>{
 const {controller,current}=setup();controller.start('');current().result(['six',true]);current().end();const count=FakeSpeech.instances.length;assert.equal(await controller.finish(),'six');await sleep(380);assert.equal(FakeSpeech.instances.length,count);controller.dispose();
});
test('permission failures preserve text and do not keep reopening the microphone',()=>{
 const {controller,output,current}=setup();controller.start('Saved working.');const r=current();r.result(['x equals six',true]);r.error('not-allowed');assert.match(output.error,/Microphone access was blocked/);assert.equal(output.text,'Saved working. x equals six');assert.equal(output.state,'idle');assert.equal(controller.active,false);assert.equal(r.aborts,1);controller.dispose();
});
test('service error during Enter never silently submits an incomplete transcript',async()=>{
 const {controller,output,current}=setup();controller.start('');const r=current();r.result(['my answer is',false]);const done=controller.finish();r.error('network');await assert.rejects(done,/interrupted/);assert.equal(output.text,'my answer is');controller.dispose();
});
test('a speech service that never finishes preserves words and aborts safely',async()=>{
 const {controller,output,current}=setup();controller.start('');const r=current();r.result(['six',false]);await assert.rejects(controller.finish(),/interrupted/);assert.equal(output.text,'six');assert.equal(r.aborts,1);assert.equal(output.state,'idle');controller.dispose();
});
test('changing question or leaving capture ignores late results from the old microphone',()=>{
 const {controller,output,current}=setup();controller.start('');const r=current();r.result(['old working',true]);controller.dispose();r.result(['wrong question contamination',true]);r.end();assert.equal(output.text,'old working');assert.equal(r.aborts,1);
});
test('browser constructor detection includes prefixed browsers and an honest unavailable state',()=>{assert.equal(speechConstructor({}),null);assert.equal(speechConstructor({webkitSpeechRecognition:FakeSpeech}),FakeSpeech);assert.equal(speechConstructor({SpeechRecognition:FakeSpeech}),FakeSpeech);});
test('spoken final answers and units can be marked without rewriting the stored reasoning',()=>{
 const reasoning='I subtract seven and divide by four. My final answer is six.';assert.equal(spokenFinalValue(reasoning),'6');assert.equal(spokenFinalValue('The speed equals eight metres per second.'),'8 m/s');assert.equal(spokenNumber('negative two point five'),-2.5);assert.equal(spokenNumber('twenty one'),21);assert.equal(spokenNumber('one hundred and six'),106);assert.equal(spokenNumber('one two'),null);assert.equal(spokenFinalValue('This poem mentions six people'),null);
 assert.equal(localGrade({kind:'numeric',numeric:6,unit:''},reasoning).verdict,'correct');assert.equal(localGrade({kind:'numeric',numeric:8,unit:'m/s'},'The speed equals eight metres per second.').verdict,'correct');
 assert.equal(spokenFinalValue('six?'),null);
});
