const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'frontend','public');
const file=path.join(dir,'index.html');
if(!fs.existsSync(dir)){fs.mkdirSync(dir,{recursive:true});console.log('Created: frontend/public/');}
if(fs.existsSync(file)){console.log('Already exists: frontend/public/index.html\nRun: npm run server');process.exit(0);}

// Download from GitHub and save locally
const https=require('https');
const url='https://raw.githubusercontent.com/wtaanu/angelquant/main/frontend/public/index.html';
https.get(url,res=>{
  let data='';
  res.on('data',c=>data+=c);
  res.on('end',()=>{
    if(res.statusCode!==200){
      console.error('Could not download from GitHub. Using offline fallback.');
      // Write minimal working page
      fs.writeFileSync(file,'<!DOCTYPE html><html><head><title>AngelQuant</title></head><body style="background:#0a0e1a;color:#e2e8f0;font-family:sans-serif;padding:40px"><h1 style="color:#3b82f6">AngelQuant</h1><p>Server is running! API endpoints:</p><ul><li><a href="/api/status" style="color:#60a5fa">/api/status</a></li><li><a href="/api/scanner" style="color:#60a5fa">/api/scanner</a></li><li><a href="/api/trades" style="color:#60a5fa">/api/trades</a></li><li><a href="/api/backtest" style="color:#60a5fa">/api/backtest</a></li></ul><p style="color:#f59e0b">Run <code>node fix_frontend.js</code> again after internet is available for full dashboard.</p></body></html>');
      console.log('Created minimal index.html');
    } else {
      fs.writeFileSync(file,data);
      console.log('Downloaded and saved: frontend/public/index.html');
    }
    console.log('\nDone! Run: npm run server');
    console.log('Open:      http://localhost:3000');
  });
}).on('error',e=>{
  console.error('Network error:',e.message);
  process.exit(1);
});