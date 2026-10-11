const p=require('puppeteer-core');
(async()=>{
const b=await p.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,defaultViewport:null,userDataDir:'./profile',
ignoreDefaultArgs:['--enable-automation'],
args:['--app=http://localhost:8080/','--window-position=0,0','--window-size=1936,1119','--force-device-scale-factor=1','--high-dpi-support=1','--disable-gpu','--disable-infobars','--no-first-run','--autoplay-policy=no-user-gesture-required']});
const pg=(await b.pages())[0];
await new Promise(r=>setTimeout(r,7000));
console.log(await pg.evaluate(()=>JSON.stringify({iw:innerWidth,ih:innerHeight,ow:outerWidth,oh:outerHeight,sx:screenX,sy:screenY,dpr:devicePixelRatio})));
await pg.screenshot({path:'pp.png'});console.log(await pg.evaluate(()=>document.body.innerText.slice(0,200)+'|'+document.visibilityState));await pg.bringToFront();await new Promise(r=>setTimeout(r,500));await new Promise(r=>require('child_process').exec('ffmpeg -y -f lavfi -i ddagrab=0:framerate=30:output_idx=0 -frames:v 1 -vf hwdownload,format=bgra shot.png',()=>r()));await b.close();})();
