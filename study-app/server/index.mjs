import { createApp } from './app.mjs';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { appRoot } from './content.mjs';
const {app,store}=createApp(process.env.RECALL_DATA_DIR?{dataDir:process.env.RECALL_DATA_DIR}:{});
const port=Number(process.env.PORT||4317);
if(fs.existsSync(path.join(appRoot,'dist/index.html'))){app.use(express.static(path.join(appRoot,'dist'),{index:false}));app.use((req,res)=>res.sendFile(path.join(appRoot,'dist/index.html')));}
else{const {createServer}=await import('vite');const vite=await createServer({root:appRoot,server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
const server=app.listen(port,'127.0.0.1',()=>console.log(`Recall is ready: http://127.0.0.1:${port}`));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is in use. Recall may already be running at http://127.0.0.1:${port}`:e.message);process.exit(1);});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close();store.close();process.exit(0);});
