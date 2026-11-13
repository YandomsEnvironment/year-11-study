import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
export class Store{
 constructor(directory){fs.mkdirSync(directory,{recursive:true});this.directory=directory;this.db=new DatabaseSync(path.join(directory,'recall.sqlite'));this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (type TEXT NOT NULL,id TEXT NOT NULL,json TEXT NOT NULL,PRIMARY KEY(type,id));');}
 get(type,id){const r=this.db.prepare('SELECT json FROM records WHERE type=? AND id=?').get(type,id);return r?JSON.parse(r.json):null;}
 all(type){return this.db.prepare('SELECT json FROM records WHERE type=? ORDER BY rowid').all(type).map(r=>JSON.parse(r.json));}
 put(type,id,value){this.db.prepare('INSERT INTO records(type,id,json) VALUES(?,?,?) ON CONFLICT(type,id) DO UPDATE SET json=excluded.json').run(type,id,JSON.stringify(value));this.scheduleBackup();return value;}
 remove(type,id){this.db.prepare('DELETE FROM records WHERE type=? AND id=?').run(type,id);}
 transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const out=fn();this.db.exec('COMMIT');return out;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 export(){const types=['settings','session','attempt','question','deadline','usage','event','draft','tutoring'];return {format:'recall-backup',version:1,exported:new Date().toISOString(),records:types.flatMap(type=>this.all(type).map(value=>({type,id:value.id||'main',value})))};}
 scheduleBackup(){clearTimeout(this.backupTimer);this.backupTimer=setTimeout(()=>{try{this.backupNow();this.backupError=null;}catch{this.backupError='Automatic backup could not be saved.';}},700);this.backupTimer.unref();}
 backupNow(){const folder=path.join(this.directory,'backups');fs.mkdirSync(folder,{recursive:true});const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const file=path.join(folder,`recall-${day}.json`);fs.writeFileSync(file+'.tmp',JSON.stringify({...this.export(),photos:this.all('photo')}));fs.renameSync(file+'.tmp',file);const older=fs.readdirSync(folder).filter(f=>/^recall-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().slice(0,-7);for(const name of older)fs.unlinkSync(path.join(folder,name));this.lastBackup=new Date().toISOString();}
 close(){clearTimeout(this.backupTimer);try{this.backupNow();}finally{this.db.close();}}
}
