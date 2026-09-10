import {blockPath} from './block-lettering.js';
/** Stable chipped paint in the glyph alpha, never in the panel underneath. */
export function createWornText(createCanvas){
 const cache=new Map();
 return (ctx,text,x,y,w,h,color='#eee9d9')=>{
  if(!text||w<=0||h<=0)return;
  const key=[text,w,h,color].join('|');let c=cache.get(key);
  if(!c){
   const d=6;c=createCanvas(Math.ceil(w*d),Math.ceil(h*d));const g=c.getContext('2d');g.scale(d,d);
   g.font=`400 ${h*.83}px "Prison UI", Arial, sans-serif`;
   g.textAlign='center';g.textBaseline='middle';
   const dark=color==='#111820',ink=g.createLinearGradient(0,h*.15,0,h*.83);
   ink.addColorStop(0,dark?'#323b40':'#fffdf2');
   ink.addColorStop(.42,dark?'#192228':'#ece7dc');
   ink.addColorStop(.47,dark?'#10191f':'#d4cfc4');
   ink.addColorStop(1,dark?'#050b10':'#c1c0bb');
   blockPath(g,text,w,h);
   g.save();g.translate(0,h*.045);g.fillStyle=dark?'#050b10':'#495258';g.fill();g.restore();
   g.fillStyle=ink;g.fill();
   g.globalCompositeOperation='destination-out';
   let seed=2166136261;for(const ch of text)seed=Math.imul(seed^ch.charCodeAt(0),16777619);
   const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   // Less wear on small body copy so Russian counters and fine strokes remain legible.
   const count=Math.floor(w*h*(h>=12?.32:.10));
   for(let i=0;i<count;i++){
    const px=random()*w,py=random()*h;
    g.globalAlpha=.35+random()*.55;g.lineWidth=.12+random()*.20;
    g.beginPath();g.moveTo(px,py);g.lineTo(px+.15+random()*.7,py+random()*.35);g.stroke();
   }
   if(cache.size>512)cache.clear();cache.set(key,c);
  }
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  // Silhouette underlays supply an engraved dark edge and a short downward extrusion.
  ctx.shadowColor='rgba(0,0,0,.95)';ctx.shadowBlur=h*.025;ctx.shadowOffsetX=h*.025;ctx.shadowOffsetY=h*.065;
  ctx.drawImage(c,x,y,w,h);ctx.shadowColor='transparent';ctx.restore();
 };
}
