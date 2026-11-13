import {useEffect,useRef,useState} from 'react';
import {DictationController,speechConstructor} from './dictation';
import type {DictationState} from './dictation';
export function useDictation({enabled,questionId,onText}:{enabled:boolean;questionId?:string;onText:(text:string)=>void}){
 const [status,setStatus]=useState<DictationState>('idle');const [interim,setInterim]=useState('');const [error,setError]=useState('');const [used,setUsed]=useState(false);
 const callbacks=useRef(onText);callbacks.current=onText;
 const controller=useRef<DictationController|null>(null);
 const supported=!!speechConstructor();
 useEffect(()=>{
  setStatus('idle');setInterim('');setError('');setUsed(false);
  return()=>{controller.current?.dispose();controller.current=null;};
 },[questionId]);
 const finish=async()=>{if(!controller.current)return null;return controller.current.finish();};
 useEffect(()=>{if(!enabled&&controller.current?.active)controller.current.finish().catch(()=>{});},[enabled]);
 useEffect(()=>{const stop=()=>{if(document.hidden&&controller.current?.active)controller.current.finish().catch(()=>{});};document.addEventListener('visibilitychange',stop);return()=>document.removeEventListener('visibilitychange',stop);},[]);
 const start=(existing:string)=>{
  if(!enabled)return;
  const Ctor=speechConstructor();if(!Ctor){setError('Dictation isn’t available in this browser. Open Recall in Google Chrome to dictate, or type your answer.');return;}
  // A stopped controller has a stale base after manual edits; recreate for each explicit click.
  controller.current?.dispose();controller.current=new DictationController(Ctor,{text:t=>callbacks.current(t),interim:setInterim,state:setStatus,error:setError});
  setUsed(true);controller.current.start(existing);
 };
 return {supported,status,interim,error,used,active:status!=='idle',start,finish,clearError:()=>setError('')};
}
