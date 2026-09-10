import {createMetalButtons} from './metal-buttons.js';
import {drawGuardPanel} from './guard-panel.js';
import {createGuardWalker} from './guard-walk.js';
/** HD guard-only sprite renderer. Original world and prisoners are unchanged. */
function decodeFrames(sheet, createCanvas, expected, rows) {
 const c=createCanvas(sheet.width,sheet.height),g=c.getContext('2d');g.drawImage(sheet,0,0);
 const im=g.getImageData(0,0,c.width,c.height),p=im.data,W=c.width,H=c.height;
 for(let i=0;i<p.length;i+=4)if(Math.min(p[i],p[i+2])-p[i+1]>75&&p[i]>150&&p[i+2]>150)p[i+3]=0;
 const seen=new Uint8Array(W*H),components=[];
 for(let start=0;start<W*H;start++){
  if(seen[start]||!p[start*4+3])continue;
  const queue=[start];seen[start]=1;let x0=W,y0=H,x1=0,y1=0;
  for(let q=0;q<queue.length;q++){
   const i=queue[q],x=i%W,y=Math.floor(i/W);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(const n of [x?i-1:-1,x<W-1?i+1:-1,i-W,i+W])if(n>=0&&n<W*H&&!seen[n]&&p[n*4+3]){seen[n]=1;queue.push(n);}
  }
  if(queue.length>1500)components.push({x:x0,y:y0,w:x1-x0+1,h:y1-y0+1,pixels:queue});
 }
 if(components.length!==expected)throw new Error(`Guard atlas: expected ${expected} sprites, found ${components.length}`);
 components.sort((a,b)=>Math.round(a.y/(H/rows))-Math.round(b.y/(H/rows))||a.x-b.x);
 const frames=components.map(f=>{
  // Bounding boxes overlap where a neighbour's baton reaches into this frame.
  // Copy only this connected sprite, not every pixel inside its bounding box.
  const image=createCanvas(f.w,f.h),ctx=image.getContext('2d'),isolated=ctx.createImageData(f.w,f.h);
  let sum=0,count=0;
  for(const pixel of f.pixels){
   const x=pixel%W-f.x,y=Math.floor(pixel/W)-f.y,i=pixel*4;
   isolated.data.set(p.subarray(i,i+4),(y*f.w+x)*4);
   if(y<30&&p[i+2]>p[i]*1.15&&p[i+2]>p[i+1]){sum+=x;count++;}
  }
  ctx.putImageData(isolated,0,0);
  return {x:0,y:0,w:f.w,h:f.h,image,anchorX:count?sum/count:f.w/2};
 });
 return frames;
}
export function createGuardArt(sheet, createCanvas, radioSheet=null, faceSheets={}) {
 const buttons=createMetalButtons(createCanvas,faceSheets.buttonsImage,faceSheets.buttonTexture,faceSheets.approvedPlay);
 const frames=decodeFrames(sheet,createCanvas,32,4);
 // Keep the original limb pixels, registration, and rig. Only replace heads.
 const replaceHeads=(targets,sources,skip=new Set())=>targets.forEach((f,index)=>{
  if(skip.has(index))return;
  const next=sources[index],ctx=f.image.getContext('2d');
  const bottom=Math.round(f.h*(index===27?0.62:(index>=17&&index<=22)||index===26?0.58:0.48));
  ctx.save();ctx.beginPath();ctx.rect(0,0,f.w,bottom);ctx.clip();
  ctx.clearRect(0,0,f.w,bottom);
  ctx.drawImage(next.image,0,0,next.w,next.h,0,0,f.w,f.h);ctx.restore();
 });
 if(faceSheets.faces)replaceHeads(frames,decodeFrames(faceSheets.faces,createCanvas,32,4),new Set([8,9,10,11,12,13,14,15,25,28,29]));
 const walker=createGuardWalker(frames,createCanvas);
 const radio=radioSheet?decodeFrames(radioSheet,createCanvas,24,3).slice(16):null;
 if(radio&&faceSheets.radioFaces)replaceHeads(radio,decodeFrames(faceSheets.radioFaces,createCanvas,24,3).slice(16));
 // Match the painted character's head, not the differently posed full-body box.
 const capWidth=f=>{
  const data=f.image.getContext('2d').getImageData(0,0,f.w,f.h).data;
  let widest=1;
  for(let y=Math.floor(f.h*0.03);y<f.h*0.17;y++){
   let left=f.w,right=-1;
   for(let x=0;x<f.w;x++){
    const i=(y*f.w+x)*4;
    if(data[i+3]>128&&data[i+2]>data[i]*1.15){left=Math.min(left,x);right=x;}
   }
   widest=Math.max(widest,right-left+1);
  }
  return widest;
 };
 const baseScale=64/frames[24].h;
 const radioScale=radio?baseScale*capWidth(frames[24])/capWidth(radio[0]):baseScale;
 const stats={guards:0,frames:new Set()};
 // Badge bounds in the isolated source frames, including their white borders.
 const badges={8:[55,95,43,24],10:[52,95,46,25],13:[50,95,48,25],14:[49,94,46,25],25:[45,92,51,25],28:[43,88,54,28],29:[10,62,56,28]};
 function frameFor(a){
  const [id,seed,x,y,activity,moving,flip,,guard,tick,portrait,,inWorld]=a;
  // World velocity projects to screen Y as (dx + dy) / 2; camera pans
  // cannot affect facing. Keep the last travel direction when standing still.
  const back=!portrait&&!!inWorld&&((a[17]??0)+(a[18]??0)<0);
  let index=back?25:24;
  if(portrait)index=24;
  else if(a[15]||activity===29)index=(back?28:26)+(Math.floor((a[14]||0)/3)%2);
  else if(moving)index=back?25:24;
  else if([10,20,40].includes(activity))index=16+Math.floor((a[14]??tick)/3)%8;
  else if(activity===27)index=31;
  else if(activity===30&&(tick+seed)%200<50)index=30;
  const screenDx=(a[17]??0)-(a[18]??0);
  const facingRight=moving&&screenDx!==0?screenDx>0:!flip;
  // Legacy flag 128 means left-facing. Most HD poses natively face left;
  // the middle baton poses natively face right.
  const nativeRight=index>=17&&index<=22;
  return {index,flip:portrait?false:nativeRight?!facingRight:facingRight,bob:0};
 }
 return {frames,stats,frameFor,draw(ctx,kind,a){
  if(kind==='button')return buttons(ctx,a);
  if(kind==='guard-panel'){
   drawGuardPanel(ctx,a[2],a[3],frames[24],faceSheets.panelImage);
   stats.guards++;stats.frames.add(24);return true;
  }
  if(kind!=='actor'||!a[8]||a[4]===33)return false;
  if(a[10]){
   // The information panel has its own portrait aperture, not a world anchor.
   const f=frames[24],x=a[22]??a[2]-72,y=a[23]??a[3]-51,w=a[24]??53,h=a[25]??22;
   const cropHeight=116,portraitScale=Math.min(w/f.w,h/cropHeight);
   ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   ctx.drawImage(f.image,0,0,f.w,cropHeight,x+(w-f.w*portraitScale)/2,y,f.w*portraitScale,cropHeight*portraitScale);
   ctx.restore();stats.guards++;stats.frames.add(24);return true;
  }
  const {index,flip,bob}=frameFor(a);
  const walkPhase=walker.pose(a),walking=!!a[5]&&!a[10]&&(index===24||index===25);
  const talking=index===30&&radio;
  const f=talking?radio[[0,1,3,4,4,5,6,7][Math.floor((a[9]+a[1])/4)%8]]:frames[index];
  // Radio art has different body proportions. Match cap width horizontally
  // without increasing the standing character's 64-pixel crown-to-floor height.
  const scale=talking?radioScale:baseScale;
  const scaleY=talking?64/f.h:baseScale;
  if(a[12]&&!a[10]){
   // Ground contact stays fixed while the body rises and falls during a step.
   const feetX=(f.w/2-f.anchorX)*scale*(flip?-1:1);
   ctx.save();ctx.translate(a[2]+feetX,a[3]);
   ctx.fillStyle='rgba(12,20,23,0.32)';ctx.beginPath();ctx.ellipse(0,0,14,5.5,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='rgba(8,14,17,0.24)';ctx.beginPath();ctx.ellipse(0,-0.5,10,3.5,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.translate(a[2],a[3]+1+bob);if(flip)ctx.scale(-1,1);
  // Work in source pixels so details follow the character at every resolution.
  ctx.translate(-f.anchorX*scale,-f.h*scaleY);ctx.scale(scale,scaleY);
  if(walking)walker.draw(ctx,index===25,walkPhase,a,flip);
  else ctx.drawImage(f.image,0,0);
  if(flip&&badges[index]){
   const [x,y,w,h]=badges[index];
   ctx.save();ctx.translate(x+w,y);ctx.scale(-1,1);
   ctx.drawImage(f.image,x,y,w,h,0,0,w,h);ctx.restore();
  }
  ctx.restore();stats.guards++;stats.frames.add(index);return true;
 }};
}
