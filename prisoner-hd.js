/** Prisoner artwork: the supplied atlas, independent animation and world anchors. */
const rects=[
 [41,28,109,280],[178,28,109,280],[315,25,112,283],[454,25,115,283],
 [665,29,115,280],[807,28,111,280],[945,28,112,285],[1090,25,115,283],
 [33,331,124,261],[173,333,126,257],[314,330,126,259],[447,330,123,258],
 [690,335,130,256],[832,331,129,258],[975,332,123,258],[1111,332,127,260],
 [41,610,109,263],[180,611,112,262],[318,612,130,257],[469,611,133,262],
 [621,611,183,262],[823,610,110,262],[969,612,100,260],[1110,613,108,259],
 [21,917,132,189],[188,882,130,226],[339,882,130,227],[478,921,170,177],
 [656,999,255,97],[927,883,136,218],[1082,895,158,208],
 [19,1141,240,87],[285,1137,200,94],[492,1129,269,101],[801,1113,223,119],[1065,1109,126,118]
];
export function createPrisonerArt(sheet,createCanvas){
 const frames=rects.map(([x,y,w,h],i)=>{
  const image=createCanvas(w,h),ctx=image.getContext('2d');ctx.drawImage(sheet,x,y,w,h,0,0,w,h);
  return {image,w,h,anchorX:i===20?53:i===19?51:i===18?60:w/2};
 });
 const scale=60/263,history=new Map(),stats={prisoners:0,poses:new Set()};
 // Separate painted hands from the torso for small gestures, without resizing
 // the face, cap or legs when an activity animation starts.
 const gestures=new Map([[19,[[0,105],[36,105],[42,151],[0,151]],18,137],
  [30,[[0,62],[28,35],[63,35],[72,65],[59,94],[40,114],[0,114]],43,103]].map(([index,polygon,px,py])=>{
   const f=frames[index],hand=createCanvas(f.w,f.h),body=createCanvas(f.w,f.h);
   const path=g=>{g.beginPath();polygon.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();};
   const h=hand.getContext('2d');path(h);h.clip();h.drawImage(f.image,0,0);
   const b=body.getContext('2d');b.drawImage(f.image,0,0);b.globalCompositeOperation='destination-out';path(b);b.fill();
   return [index,{hand,body,px,py}];
  }));
 const rigs=[16,23].map(index=>{
  const f=frames[index],{w,h}=f,L=w*.23,R=w*.79,hip=h*.72,shoulder=h*.49,boot=h*.90;
  const part=points=>{const c=createCanvas(w,h),g=c.getContext('2d');g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();g.drawImage(f.image,0,0);return c;};
  return {f,hip,boot,shoulder,
   body:part([[0,0],[w,0],[w,shoulder],[R,shoulder],[R,hip+2],[L,hip+2],[L,shoulder],[0,shoulder]]),
   arms:[part([[0,shoulder],[L,shoulder],[L,h*.80],[0,h*.80]]),part([[R,shoulder],[w,shoulder],[w,h*.80],[R,h*.80]])],
   legs:[part([[L,hip],[w/2,hip],[w/2,h],[0,h],[0,h*.80],[L,h*.80]]),part([[w/2,hip],[R,hip],[R,h*.80],[w,h*.80],[w,h],[w/2,h]])]};
 });
 function motion(a){
  const [id,seed]=a,tick=a[9],x=a[19],y=a[20],room=a[21];
  let m=history.get(id);
  if(!m||m.seed!==seed||m.room!==room||tick<m.tick){m={seed,room,tick,x,y,phase:0,back:false};history.set(id,m);}
  if(tick!==m.tick){
   const dx=(x-m.x)/4096,dy=(y-m.y)/4096,d=Math.hypot(dx-dy,(dx+dy)/2);
   if(a[5]&&Number.isFinite(d)&&d<24)m.phase=(m.phase+d/14)%1;
   m.x=x;m.y=y;m.tick=tick;
  }
  if(a[5]&&(a[17]||a[18]))m.back=a[17]+a[18]<0;
  return m;
 }
 function select(a,m){
  if(a[10])return 16;
  if(a[15]||a[4]===29)return 24;
  if(a[5])return m.back?23:16;
  // 7: workshop, 8: sports, 9: recreation; 27: drinking fountain/coffee.
  if(a[4]===6||[14,15,16].includes(a[4]))return 33;
  if([10,20,40].includes(a[4])||(a[4]===8&&a[13]===2))return [18,19,20,19,18,18,18,18][Math.floor(a[14]/2)%8];
  if(a[4]===8)return a[13]===1?18:34;
  if(a[4]===7)return 19;
  if(a[4]===9)return 25;
  if(a[4]===27)return 30;
  return m.back?23:16;
 }
 function gait(ctx,rig,phase,a){
  const {f,hip,boot}=rig;
  let dx=a[17]-a[18],dy=(a[17]+a[18])/2,len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
  const feet=[0,.5].map(offset=>{
   const t=(phase+offset)%1;
   if(t<.6)return {travel:.5-t/.6,lift:0};
   const s=(t-.6)/.4;return {travel:-.5+(1-Math.cos(Math.PI*s))/2,lift:Math.sin(Math.PI*s)*9};
  });
  for(const side of [0,1].sort((l,r)=>feet[l].travel*dy-feet[r].travel*dy)){
   const p=feet[side],ox=dx*32*p.travel,oy=dy*32*p.travel-p.lift;
   const bend=t=>t*t*(3-2*t);
   for(let y=hip;y<boot;y+=2){const h=Math.min(2,boot-y),u=bend((y-hip)/(boot-hip)),v=bend((y+h-hip)/(boot-hip));ctx.drawImage(rig.legs[side],0,y,f.w,h,ox*u,y+oy*u,f.w,h+oy*(v-u)+.2);}
   ctx.drawImage(rig.legs[side],0,boot,f.w,f.h-boot,ox,boot+oy,f.w,f.h-boot);
  }
  ctx.drawImage(rig.body,0,0);
  rig.arms.forEach((arm,side)=>{const x=f.w*(side?.87:.12);ctx.save();ctx.translate(x,rig.shoulder);ctx.rotate(Math.sin((phase+side*.5)*Math.PI*2)*.11);ctx.drawImage(arm,-x,-rig.shoulder);ctx.restore();});
 }
 return {frames,stats,motion,select,draw(ctx,kind,a){
  if(kind!=='actor'||a[8]||a[4]===33)return false;
  const m=motion(a),index=select(a,m),f=frames[index],walking=a[5]&&!a[10]&&(index===16||index===23);
  stats.prisoners++;stats.poses.add(index);
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(a[10]){
   const [x,y,w,h]=a.slice(22,26),crop=138,s=Math.min(w/f.w,h/crop);
   ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(f.image,0,0,f.w,crop,x+(w-f.w*s)/2,y,f.w*s,crop*s);
  }else{
   if(a[12]){ctx.fillStyle='rgba(8,15,18,.32)';ctx.beginPath();ctx.ellipse(a[2],a[3],index===33?24:12,index===33?4:4.5,0,0,Math.PI*2);ctx.fill();}
   ctx.translate(a[2],a[3]+1);
   // Action frames share source scale. Never stretch sitting/lying to standing height.
   if(!walking&&![16,23,33,34].includes(index)&&a[6])ctx.scale(-1,1);
   ctx.scale(scale,scale);ctx.translate(-f.anchorX,-f.h);
   if(walking)gait(ctx,rigs[index===23?1:0],m.phase,a);
   else if((a[4]===7||a[4]===27)&&gestures.has(index)){
    const g=gestures.get(index),angle=Math.sin(a[14]*(a[4]===7?.5:.18))*(a[4]===7?.12:.035);
    ctx.drawImage(g.body,0,0);ctx.translate(g.px,g.py);ctx.rotate(angle);ctx.drawImage(g.hand,-g.px,-g.py);
   }else if(index===34){
    // A push-up bends the arms while hands stay planted at the ground baseline.
    const dy=(1-Math.cos(a[14]*.25))*3;
    ctx.drawImage(f.image,0,0,f.w,f.h-22,0,dy,f.w,f.h-22-dy);
    ctx.drawImage(f.image,0,f.h-22,f.w,22,0,f.h-22,f.w,22);
   }else ctx.drawImage(f.image,0,0);
  }
  ctx.restore();return true;
 }};
}
