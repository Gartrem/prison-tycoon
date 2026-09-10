/** The supplied complete portrait replaces both halves of the old office and its character. */
export function createGovernorOffice(image){
 return (ctx,[x,y,w,h])=>{
  if(!image||w<=0||h<=0)return false;
  const scale=Math.min(w/image.width,h/image.height);
  const dw=image.width*scale,dh=image.height*scale;
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  ctx.fillStyle='#162127';ctx.fillRect(x,y,w,h);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(image,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
  ctx.restore();return true;
 };
}
