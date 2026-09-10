/** Live HUD. No simulation writes; the original game advances digit animations. */
export function createStatusHud(image){
 return (ctx,a)=>{
  if(!image)return false;
  const [x,y,cash,needle,elapsed,duration,mode,tick]=a;
  ctx.save();ctx.translate(x,y);ctx.scale(110/2048,34/644);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  // Clip only the baked artwork: the area outside the metal silhouette is transparent.
  ctx.save();ctx.beginPath();
  ctx.moveTo(23,66);ctx.lineTo(59,33);ctx.lineTo(571,33);
  ctx.lineTo(606,66);ctx.lineTo(1989,66);ctx.lineTo(2023,98);
  ctx.lineTo(2023,567);ctx.lineTo(1986,600);ctx.lineTo(59,600);
  ctx.lineTo(23,567);ctx.closePath();ctx.clip();
  ctx.drawImage(image,0,0,2048,644);ctx.restore();
  const value=Math.max(0,Math.min(9999999,Math.trunc(cash))).toString().padStart(7,'0');
  for(let i=0;i<7;i++){
   const left=864+i*152;
   ctx.save();ctx.beginPath();ctx.rect(left,165,119,237);ctx.clip();
   ctx.font='400 172px "Prison UI", monospace';ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillStyle=i<7-String(Math.max(0,cash)).length?'#8b989d':'#101c22';
   const phase=a[22+i],old=a[15+i],next=a[8+i];
   if(phase>=0&&old!==next){
    const p=Math.max(0,Math.min(1,1-phase/((7-i)*2)));
    ctx.fillText(String(old),left+59,282-p*240,109);
    ctx.fillText(String(next),left+59,522-p*240,109);
   }else ctx.fillText(value[i],left+59,282,109);
   ctx.restore();
  }
  // Match the original 512-unit circle (288..480), including its end stops.
  const angle=(288+Math.max(0,Math.min(192,needle)))*Math.PI*2/512;
  ctx.save();ctx.translate(315,366);ctx.rotate(angle);
  ctx.shadowColor='#000';ctx.shadowBlur=10;ctx.shadowOffsetY=6;
  ctx.beginPath();ctx.moveTo(-35,-9);ctx.lineTo(178,-5);ctx.lineTo(200,0);ctx.lineTo(178,5);ctx.lineTo(-35,9);ctx.closePath();
  ctx.fillStyle='#d73725';ctx.strokeStyle='#e8dfcc';ctx.lineWidth=3;ctx.fill();ctx.stroke();ctx.restore();
  ctx.beginPath();ctx.arc(315,366,17,0,Math.PI*2);ctx.fillStyle='#b8c6c9';ctx.fill();ctx.strokeStyle='#18252d';ctx.lineWidth=6;ctx.stroke();
  const p=Math.max(0,Math.min(1,elapsed/Math.max(1,duration))),bx=640,by=492,bw=1280,bh=62;
  const grad=ctx.createLinearGradient(bx,0,bx+bw,0);grad.addColorStop(0,'#e13c26');grad.addColorStop(.27,'#ffd436');grad.addColorStop(.55,'#a5e523');grad.addColorStop(1,'#24c747');
  ctx.fillStyle=grad;ctx.fillRect(bx,by,bw,bh);
  ctx.strokeStyle='#0a2027';ctx.lineWidth=5;for(let n=1;n<10;n++){ctx.beginPath();ctx.moveTo(bx+bw*n/10,by);ctx.lineTo(bx+bw*n/10,by+bh);ctx.stroke();}
  // Time marker is the topmost layer, not hidden behind the replacement frame.
  const clockX=bx+bw*p,clockY=by+bh/2;
  ctx.save();ctx.translate(clockX,clockY);
  ctx.shadowColor='#000';ctx.shadowBlur=10;ctx.shadowOffsetY=5;
  ctx.beginPath();ctx.arc(0,0,68,0,Math.PI*2);
  ctx.fillStyle='#17262e';ctx.fill();ctx.strokeStyle='#bbcbd0';ctx.lineWidth=10;ctx.stroke();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.strokeStyle='#748c96';ctx.lineWidth=5;
  for(let n=0;n<12;n++){
   const t=n*Math.PI/6;ctx.beginPath();ctx.moveTo(Math.sin(t)*48,-Math.cos(t)*48);
   ctx.lineTo(Math.sin(t)*55,-Math.cos(t)*55);ctx.stroke();
  }
  for(const [turns,length,width] of [[p,29,9],[p*12,46,7]]){
   const t=turns*Math.PI*2;ctx.beginPath();ctx.moveTo(0,0);
   ctx.lineTo(Math.sin(t)*length,-Math.cos(t)*length);
   ctx.strokeStyle='#f4f0dc';ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();
  }
  ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fillStyle='#e9b95b';ctx.fill();ctx.restore();
  if(mode&&((tick>>1)&1)===0){
   if(mode===3||mode===1){
    // Year-end warning replaces the tiny glyph with a prominent sign over the dial.
    ctx.save();ctx.translate(315,330);
    ctx.shadowColor='#000';ctx.shadowBlur=20;ctx.shadowOffsetY=10;
    ctx.beginPath();ctx.moveTo(0,-192);ctx.lineTo(202,170);ctx.lineTo(-202,170);ctx.closePath();
    ctx.lineJoin='round';ctx.lineWidth=25;ctx.strokeStyle='#10181e';ctx.stroke();
    const warning=ctx.createLinearGradient(0,-192,0,170);
    warning.addColorStop(0,mode===1?'#ffe29a':'#fff18a');warning.addColorStop(.45,mode===1?'#ffae30':'#ffd333');warning.addColorStop(1,mode===1?'#e65421':'#ef9b15');
    ctx.fillStyle=warning;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.lineWidth=6;ctx.strokeStyle='#fff2a6';ctx.stroke();
    // Draw the exclamation mark as shapes so font loading cannot affect visibility.
    ctx.fillStyle='#10181e';ctx.beginPath();ctx.moveTo(-23,-79);ctx.lineTo(23,-79);
    ctx.lineTo(16,62);ctx.lineTo(-16,62);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.arc(0,108,22,0,Math.PI*2);ctx.fill();ctx.restore();
   }else if(mode===2){
    // Original riot symbol: skull and crossed bones, not a font-dependent lightning glyph.
    ctx.save();ctx.translate(315,328);
    ctx.shadowColor='#000';ctx.shadowBlur=18;ctx.shadowOffsetY=8;
    const ivory=ctx.createLinearGradient(0,-165,0,170);
    ivory.addColorStop(0,'#fff5cb');ivory.addColorStop(.5,'#e4ddbc');ivory.addColorStop(1,'#bca67c');
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const angle of [-.68,.68]){
     ctx.save();ctx.rotate(angle);
     ctx.beginPath();ctx.moveTo(-190,0);ctx.lineTo(190,0);
     ctx.strokeStyle='#231917';ctx.lineWidth=67;ctx.stroke();
     ctx.strokeStyle='#e8dcb6';ctx.lineWidth=42;ctx.stroke();
     for(const end of [-1,1])for(const offset of [-17,17]){
      ctx.beginPath();ctx.arc(end*184,offset,24,0,Math.PI*2);
      ctx.fillStyle=ivory;ctx.fill();ctx.strokeStyle='#392720';ctx.lineWidth=6;ctx.stroke();
     }
     ctx.restore();
    }
    ctx.beginPath();ctx.moveTo(-79,139);ctx.lineTo(-89,73);
    ctx.bezierCurveTo(-161,56,-160,-48,-136,-102);
    ctx.bezierCurveTo(-98,-191,98,-191,136,-102);
    ctx.bezierCurveTo(160,-48,161,56,89,73);
    ctx.lineTo(79,139);ctx.quadraticCurveTo(0,167,-79,139);ctx.closePath();
    ctx.strokeStyle='#261b18';ctx.lineWidth=20;ctx.stroke();ctx.fillStyle=ivory;ctx.fill();
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle='#291b19';
    for(const side of [-1,1]){
     ctx.beginPath();ctx.ellipse(side*65,-25,43,48,side*.25,0,Math.PI*2);ctx.fill();
    }
    ctx.beginPath();ctx.moveTo(0,17);ctx.lineTo(-23,60);ctx.quadraticCurveTo(0,50,23,60);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#675340';ctx.lineWidth=7;
    for(const x of [-48,-16,16,48]){ctx.beginPath();ctx.moveTo(x,97);ctx.lineTo(x,141);ctx.stroke();}
    ctx.restore();
   }
  }
  ctx.restore();return true;
 };
}
