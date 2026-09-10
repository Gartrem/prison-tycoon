/** Approved high-resolution metal artwork. Input geometry stays owned by the game. */
import {createWornText} from './worn-text.js';
import {blockWidth} from './block-lettering.js';
export function createMetalButtons(createCanvas,atlas=null,texture=null,approvedPlay=null){
 const wornText=createWornText(createCanvas);
 const cache=new Map();
 const outline=(g,w,h,n)=>{g.beginPath();g.moveTo(n,0);g.lineTo(w-n,0);g.lineTo(w,n);g.lineTo(w,h-n);g.lineTo(w-n,h);g.lineTo(n,h);g.lineTo(0,h-n);g.lineTo(0,n);g.closePath();};
 return function draw(ctx,a){
  const [x,y,w,h,selected]=a;if(w<3||h<3||!texture)return false;
  const label=String.fromCharCode(...a.slice(6)).replace(/\{[^}]*\}/g,'').replace(/\s+/g,' ').trim();
  const key=[w,h,selected,label].join('|');let c=cache.get(key);
  if(!c){
   const d=6;c=createCanvas(Math.ceil(w*d),Math.ceil(h*d));const g=c.getContext('2d');g.scale(d,d);
   g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
   const play=/^играть$/i.test(label),green=/играть|начать|продолж|сохран|подтверд|^да$/i.test(label),red=/выйти|выход|удал|сброс|снести|увол/i.test(label);
   // Clip the silhouette: the generated reference has a baked checkerboard outside it.
   const sx=[45,235,1745],sy=[138,290,477],sw=[190,1510,190],sh=[152,187,152];
   const edge=Math.min(h*.30,w*.20),dy=Math.min(h*.30,edge),xx=[0,edge,w-edge],yy=[0,dy,h-dy],ww=[edge,w-edge*2,edge],hh=[dy,h-dy*2,dy];
   outline(g,w,h,Math.min(edge*.38,dy*.48));g.save();g.clip();
   {
    for(let r=0;r<3;r++)for(let col=0;col<3;col++)g.drawImage(texture,sx[col],sy[r],sw[col],sh[r],xx[col],yy[r],ww[col],hh[r]);
    if(green||red){g.globalCompositeOperation='color';g.fillStyle=green?'#286b35':'#8b2920';g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';}
    if(label){
     const iconSpace=play&&w>80?h*.6:0;
     const text=label.toLocaleUpperCase('ru-RU'),available=Math.max(1,w-edge*1.8-iconSpace);let size=Math.min(14,h*.47);
     if(iconSpace){g.fillStyle='#cee4ba';g.beginPath();g.moveTo(edge+3,h*.29);g.lineTo(edge+3,h*.71);g.lineTo(edge+3+h*.34,h*.5);g.closePath();g.fill();}
     g.font=`400 ${size}px "Prison UI", Arial, sans-serif`;
     while(blockWidth(text,size*1.2)>available&&size>6)size-=.25;
     g.textAlign='center';g.textBaseline='middle';g.shadowColor='#000';g.shadowBlur=.7;g.shadowOffsetY=.4;
     wornText(g,text,(w-available+iconSpace)/2,(h-size*1.2)/2,available,size*1.2,red?'#ffd2c3':'#eee9d9');
    }
   }
   if(selected){g.globalCompositeOperation='screen';g.fillStyle='#bcd4c017';g.fillRect(0,0,w,h);}
   g.restore();if(cache.size>256)cache.clear();cache.set(key,c);
  }
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(c,x,y,w,h);ctx.restore();return true;
 };
}
