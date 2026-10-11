module.exports=async function(t){
 const key=()=>t.pg.evaluate(()=>N.nav.cur&&N.nav.cur._key||null);
 const inRail=()=>t.pg.evaluate(()=>!!(N.nav.cur&&N.rail.isRail(N.nav.cur)));
 async function toRail(target){
  for(let i=0;i<3&&!(await inRail());i++) await t.key('Back',900);
  const order=['search','home','movies','series','anime','archive','settings'];
  let k=await key();
  while(k!==target){ await t.key(order.indexOf(k)>order.indexOf(target)?'Up':'Down',380); k=await key(); }
  await t.key('Enter',1800);
 }
 await t.real(500);
 await t.reload();
 await t.startVT(); t.rec=true;
 await t.pg.evaluate(()=>{const o=document.getElementById('splash');const n=o.cloneNode(true);n.classList.remove('out');n.style.display='';o.parentNode.replaceChild(n,o);window.__sp=n;});
 await t.wait(2000);
 await t.pg.evaluate(()=>{const n=window.__sp;n.classList.add('out');setTimeout(()=>n.style.display='none',450);});
 await t.wait(3300);
 await t.key('Up',700);
 await t.key('Right',700);
 await t.key('Enter',1700); await t.key('Enter',1900);
 await t.key('Down',650);
 await t.key('Down',800);
 for(let i=0;i<5;i++) await t.key('Right',650);
 await t.key('Down',900);
 await t.key('Right',650);
 t.log('on',await t.focus());
 await t.key('Enter',2300);  // details
 for(let i=0;i<3;i++) await t.key('Down',900);
 await t.key('Back',1800); t.log('afterback',await t.focus());
 await toRail('search'); t.log('search page');
 await t.wait(600);
 await t.type('stranger things',150); await t.wait(2000);
 await toRail('archive'); t.log('archive',await t.focus());
 await t.key('Down',700); t.log(await t.focus());
 for(let i=0;i<2;i++) await t.key('Right',650);
 await t.key('Down',800); await t.key('Right',650);
 await toRail('home'); t.log('home',await t.focus());
 await t.wait(1400);
 t.log('end',t.frames);
};
