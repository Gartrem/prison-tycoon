/** Resolution-independent metal HUD frame, matched to the supplied reference. */
export function drawGuardPanel(ctx,x,y,portrait,panelImage=null){
 if(panelImage){
  // Use the approved artwork itself. Clip the outer silhouette so its
  // surrounding reference-scene background does not cover the live map.
  ctx.save();ctx.translate(x,y);ctx.scale(96/1798,96/1798);ctx.translate(-21,-72);
  const outline=[[21,214],[97,149],[1203,149],[1206,126],[1258,72],[1770,72],[1819,125],[1819,296],[1806,317],[1806,503],[1819,526],[1819,693],[1770,749],[1260,749],[1207,699],[62,699],[21,654],[29,532],[29,215]];
  ctx.beginPath();outline.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.clip();
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(panelImage,0,0,1851,850);
  ctx.restore();return;
 }
 ctx.save();ctx.translate(x,y);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 const bevel=(x,y,w,h,c)=>{ctx.beginPath();ctx.moveTo(x+c,y);ctx.lineTo(x+w-c,y);ctx.lineTo(x+w,y+c);ctx.lineTo(x+w,y+h-c);ctx.lineTo(x+w-c,y+h);ctx.lineTo(x+c,y+h);ctx.lineTo(x,y+h-c);ctx.lineTo(x,y+c);ctx.closePath();};
 const gradient=(y,h,stops)=>{const g=ctx.createLinearGradient(0,y,0,y+h);stops.forEach(([t,c])=>g.addColorStop(t,c));return g;};
 const plate=(x,y,w,h,c,fill,stroke,width=.4)=>{bevel(x,y,w,h,c);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}};
 const steel=gradient(0,33,[[0,'#e5f5fb'],[.12,'#819dac'],[.24,'#334956'],[.52,'#667e8c'],[.8,'#344652'],[.95,'#9bb1bd'],[1,'#263640']]);
 plate(0,2,96,31,2.7,'#070e13','#04080b',.8);
 plate(.5,2.4,95,30,2.5,steel,'#b2c8d5',.35);
 plate(2,4,92,26.7,4,'#080f16','#263e4c',.65);
 plate(3,5,90,24.7,3.5,gradient(5,25,[[0,'#213642'],[.15,'#111f29'],[1,'#0c1923']]),'#36566a',.35);
 // Subtle machined diagonal details, kept away from the name.
 ctx.save();bevel(3,5,90,24.7,3.5);ctx.clip();
 ctx.strokeStyle='#20323e';ctx.lineWidth=.45;
 for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(46+i*3,30);ctx.lineTo(66+i*3,10);ctx.stroke();}
 ctx.restore();
 for(const cy of [5,30]){ctx.beginPath();ctx.arc(3,cy,1,0,Math.PI*2);ctx.fillStyle='#a3b7c3';ctx.fill();ctx.strokeStyle='#071019';ctx.lineWidth=.45;ctx.stroke();ctx.beginPath();ctx.arc(3,cy,.42,0,Math.PI*2);ctx.fillStyle='#08121a';ctx.fill();}
 const glow=(x,y,w,h)=>{ctx.save();ctx.shadowColor='#00cfff';ctx.shadowBlur=1.5;ctx.fillStyle='#0ce1ff';ctx.fillRect(x,y,w,h);ctx.restore();};
 glow(6.1,9,0.8,17);glow(11,31,33,.25);
 ctx.textAlign='left';ctx.textBaseline='top';ctx.font='400 6px "Prison UI", Arial';ctx.fillStyle='#d4cfc4';ctx.fillText('Майор',10,10);
 ctx.font='400 9px "Prison UI", Arial';ctx.fillStyle=gradient(17,10,[[0,'#fffdf2'],[1,'#a6acae']]);ctx.fillText('Чикин',10,17.5,48);
 // Raised, square portrait bezel with clipped corners and an illuminated inset.
 plate(63,0,33,33,2.8,'#060d13','#02060a',.8);
 plate(63.4,.4,32.2,32.2,2.5,steel,'#dcebf3',.45);
 plate(65,1.8,29.2,29.4,2,'#111c25','#4e6573',.5);
 plate(66,2.6,27.2,27.7,1.7,'#183243','#047bac',.6);
 ctx.save();bevel(66.4,3,26.4,26.9,1.5);ctx.clip();
 ctx.fillStyle=gradient(3,27,[[0,'#0b1e2b'],[1,'#254b60']]);ctx.fillRect(66,3,27,28);
 ctx.fillStyle='#294858';for(let i=0;i<5;i++)ctx.fillRect(67+i*5,6,2,20);
 ctx.drawImage(portrait.image,0,0,portrait.w,120,66.4,3,26.4,26.9);
 ctx.restore();
 ctx.save();ctx.shadowColor='#00caff';ctx.shadowBlur=.8;bevel(66.3,2.9,26.6,27.1,1.5);ctx.strokeStyle='#19c6f5';ctx.lineWidth=.35;ctx.stroke();ctx.restore();
 glow(64.3,12,.35,9);glow(94.5,12,.35,9);
 ctx.restore();
}
