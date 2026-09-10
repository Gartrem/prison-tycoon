/** Continuous cutout gait using the original HD paint, in source-pixel space. */
export function createGuardWalker(frames, createCanvas) {
 const history=new Map();
 const rigs=[24,25].map(index=>{
  const f=frames[index];
  const part=polygon=>{
   const c=createCanvas(f.w,f.h),g=c.getContext('2d');
   g.beginPath();polygon.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();g.drawImage(f.image,0,0);return c;
  };
  const back=index===25,split=back?63:57,left=back?27:24,right=back?95:87;
  return {f,body:part([[0,0],[f.w,0],[f.w,119],[right,119],[right,151],[left,151],[left,119],[0,119]]),
   arms:[part([[0,119],[left,119],[left,158],[0,158]]),part([[right,119],[f.w,119],[f.w,155],[right,155]])],
   // Below the hands keep the complete trouser/boot silhouette. A vertical
   // crop down to the ankle used to shave the outside of the left trouser leg.
   legs:[part([[left,149],[split,149],[split,205],[0,205],[0,160],[left,160]]),part([[split,149],[right,149],[right,157],[back?95:91,164],[98,178],[110,184],[110,205],[split,205]])]};
 });
 function pose(a){
  const [id,seed]=a,x=a[19],y=a[20],room=a[21],tick=a[9];
  let h=history.get(id);
  if(!h||h.seed!==seed||h.room!==room||tick<h.tick){h={seed,room,x,y,tick,phase:0};history.set(id,h);}
  if(Number.isFinite(x)&&Number.isFinite(y)&&tick!==h.tick){
   const dx=(x-h.x)/4096,dy=(y-h.y)/4096;
   const distance=Math.hypot(dx-dy,(dx+dy)/2);
   // Ignore room changes/teleports. Panning never enters these world coordinates.
   if(a[5]&&distance<24)h.phase=(h.phase+distance/16)%1;
   h.x=x;h.y=y;h.tick=tick;
  }
  return h.phase;
 }
 function foot(phase){
  const t=((phase%1)+1)%1;
  if(t<0.6)return {travel:0.5-t/0.6,lift:0,planted:true};
  const swing=(t-0.6)/0.4;
  return {travel:-0.5+(1-Math.cos(Math.PI*swing))/2,lift:Math.sin(Math.PI*swing)*7,planted:false};
 }
 function draw(ctx,back,phase,a,renderFlip=false){
  const rig=rigs[back?1:0],{f}=rig;
  let dx=(a[17]||0)-(a[18]||0),dy=((a[17]||0)+(a[18]||0))/2;
  const length=Math.hypot(dx,dy)||1;dx=dx/length*(renderFlip?-1:1);dy/=length;
  const feet=[foot(phase),foot(phase+0.5)];
  // Draw the more distant foot first, rather than always hiding the left leg.
  const groundY=side=>(back?(side?200:205):(side?205:200))+dy*31*feet[side].travel;
  for(const side of [0,1].sort((l,r)=>groundY(l)-groundY(r))){
   const step=feet[side],ox=dx*31*step.travel,oy=dy*31*step.travel-step.lift,leg=rig.legs[side];
   // Keep hips registered; bend the painted trouser leg towards the ankle.
   for(let y=149;y<178;y+=2){
    const h=Math.min(2,178-y),u=(y-149)/29,v=(y+h-149)/29;
    const bend=t=>t*t*(3-2*t);
    ctx.drawImage(leg,0,y,f.w,h,ox*bend(u),y+oy*bend(u),f.w,h+oy*(bend(v)-bend(u))+0.15);
   }
   // The boot is rigid, stays flat while planted, and clears the floor on recovery.
   ctx.drawImage(leg,0,178,f.w,27,ox,178+oy,f.w,27);
  }
  ctx.drawImage(rig.body,0,0);
  for(const side of [0,1]){
   const pivot=side?100:13,angle=Math.sin((phase+side*0.5)*Math.PI*2)*0.10;
   ctx.save();ctx.translate(pivot,120);ctx.rotate(angle);ctx.drawImage(rig.arms[side],-pivot,-120);ctx.restore();
  }
 }
 return {pose,foot,draw};
}
