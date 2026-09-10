/** Canvas backend for the compiled game. No bytecode interpreter or JVM. */
import { createCyrillicRenderer } from './russian-font.js';
import { createWornText } from './worn-text.js';
import {blockWidth} from './block-lettering.js';
export function createRenderer({ createCanvas, screen, images, resources, storage, audio, art = null, resolution = 1, onFrame = () => {}, onExit = () => {}, onSave = () => {} }) {
  const surfaces = [], imageIds = new Map();
  // Display buffers have high-density backing stores; resource bitmaps and game coordinates do not change.
  const sizes = new Map(), scales = new Map();
  const density = Math.max(1, Math.min(4, resolution));
  const readableTextImages = new Map();
  const measurement = createCanvas(16, 16).getContext('2d');
  const add = canvas => { surfaces.push(canvas); return surfaces.length - 1; };
  const get = id => { if (!surfaces[id]) throw new Error(`Missing surface ${id}`); return surfaces[id]; };
  const drawCyrillic=createCyrillicRenderer(createCanvas,get);
  const wornText=createWornText(createCanvas);
  const font = (size, bold) => `400 ${size}px "Prison UI", Arial, sans-serif`;
  const storagePrefix = 'prison-tycoon-native:v1:';
  const encode = bytes => { let text = ''; for (const byte of bytes) text += String.fromCharCode(byte & 255); return btoa(text); };
  const decode = text => { const data = atob(text), bytes = new Int8Array(data.length); for (let i=0;i<data.length;i++) bytes[i]=data.charCodeAt(i); return bytes; };
  const luminance = color => ((color>>>16)&255)*.2126+((color>>>8)&255)*.7152+(color&255)*.0722;
  const readableColor = color => luminance(color)<145 ? (color&0xff000000)|0xffffff : color;
  const readableTextImage = (source,sx,sy,w,h) => {
    const key=`${source}:${sx}:${sy}:${w}:${h}`;
    if(readableTextImages.has(key))return readableTextImages.get(key);
    const canvas=createCanvas(w,h),ctx=canvas.getContext('2d');
    ctx.drawImage(get(source),sx,sy,w,h,0,0,w,h);
    const image=ctx.getImageData(0,0,w,h),pixels=image.data;
    let visible=0,bright=0,total=0;
    for(let i=0;i<pixels.length;i+=4){
      if(pixels[i+3]<32)continue;
      const value=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;
      visible++;total+=value;if(value>=145)bright++;
    }
    if(visible&&bright<=visible*.05&&total/visible<120){
      for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>=32)pixels[i]=pixels[i+1]=pixels[i+2]=255;
      ctx.putImageData(image,0,0);
      readableTextImages.set(key,canvas);
      return canvas;
    }
    readableTextImages.set(key,null);
    return null;
  };
  const api = {
    resources, surfaces, frames: 0,
    resource(path) { const value = resources[path]; if (!value) throw new Error(`Missing game resource: ${path}`); return value; },
    surface(w,h) { const canvas=createCanvas(Math.ceil(w*density),Math.ceil(h*density));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);const id=add(canvas);sizes.set(id,[w,h]);scales.set(id,density);return id; },
    image(path) { if (!imageIds.has(path)) { if (!images[path]) throw new Error(`Missing image: ${path}`); imageIds.set(path, add(images[path])); } return imageIds.get(path); },
    width(id) { return sizes.get(id)?.[0]??get(id).width; }, height(id) { return sizes.get(id)?.[1]??get(id).height; },
    pixels(pixels,w,h,alpha) {
      const canvas=createCanvas(w,h),ctx=canvas.getContext('2d'),data=ctx.createImageData(w,h);
      for(let i=0;i<w*h;i++){const value=pixels[i];data.data[i*4]=(value>>>16)&255;data.data[i*4+1]=(value>>>8)&255;data.data[i*4+2]=value&255;data.data[i*4+3]=alpha?(value>>>24)&255:255;}
      ctx.putImageData(data,0,0);return add(canvas);
    },
    draw(id,op,state,args,text) {
      const ctx=get(id).getContext('2d'),[tx,ty,cx,cy,cw,ch,color,size,bold,textImageMode,preserveDarkText]=state;
      if(cw<=0||ch<=0)return;
      ctx.save();ctx.scale(scales.get(id)||1,scales.get(id)||1);ctx.beginPath();ctx.rect(cx,cy,cw,ch);ctx.clip();ctx.translate(tx,ty);ctx.imageSmoothingEnabled=false;
      ctx.fillStyle=ctx.strokeStyle=`rgba(${(color>>>16)&255},${(color>>>8)&255},${color&255},${((color>>>24)&255)/255})`;
      switch(op){
        case 0: if(args[2]>0&&args[3]>0)ctx.fillRect(...args);break;
        case 1: ctx.strokeRect(args[0]+.5,args[1]+.5,args[2],args[3]);break;
        case 2: ctx.beginPath();ctx.moveTo(args[0]+.5,args[1]+.5);ctx.lineTo(args[2]+.5,args[3]+.5);ctx.stroke();break;
        case 3:case 4:{const[x,y,w,h,start,arc]=args;if(w<=0||h<=0)break;ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,-start*Math.PI/180,-(start+arc)*Math.PI/180,arc>0);if(op===4)ctx.fill();else ctx.stroke();break;}
        case 5:{
          const[source,sx,sy,w,h,transform,px,py,anchor]=args;if(w<=0||h<=0)break;
          const dw=transform>=4?h:w,dh=transform>=4?w:h;
          const x=px-((anchor&8)?dw:(anchor&1)?Math.floor(dw/2):0),y=py-((anchor&32)?dh:(anchor&2)?Math.floor(dh/2):0);
          const matrices=[[1,0,0,1,0,0],[1,0,0,-1,0,h],[-1,0,0,1,w,0],[-1,0,0,-1,w,h],[0,1,1,0,0,0],[0,1,-1,0,h,0],[0,-1,1,0,0,w],[0,-1,-1,0,h,w]];
          const readable=textImageMode&&!preserveDarkText?readableTextImage(source,sx,sy,w,h):null;
          const sourceScale=readable?1:(scales.get(source)||1);
          ctx.translate(x,y);ctx.transform(...matrices[transform]);ctx.drawImage(readable||get(source),(readable?0:sx)*sourceScale,(readable?0:sy)*sourceScale,w*sourceScale,h*sourceScale,0,0,w,h);break;
        }
        case 6:{const[startX,startY,anchor]=args;let x=startX,y=startY;ctx.font=font(size,bold);const width=Math.ceil(ctx.measureText(text).width);x-=(anchor&8)?width:(anchor&1)?Math.floor(width/2):0;if(anchor&64)y-=size;else if(anchor&32)y-=size+3;else if(anchor&2)y-=Math.floor((size+3)/2);wornText(ctx,text,x,y,width,size+3,preserveDarkText?'#111820':'#eee9d9');break;}
        case 7:ctx.beginPath();ctx.moveTo(args[0],args[1]);ctx.lineTo(args[2],args[3]);ctx.lineTo(args[4],args[5]);ctx.closePath();ctx.fill();break;
        case 8:drawCyrillic(ctx,args,Boolean(preserveDarkText));break;
        case 9:{const [x,y,w,h]=args;ctx.imageSmoothingEnabled=true;wornText(ctx,text.replace(/\u00ad/g,''),x,y,w,h,preserveDarkText?'#111820':'#eee9d9');break;}
        default:throw new Error(`Unknown draw operation ${op}`);
      }
      ctx.restore();
    },
    remaster(id,kind,state,args) {
      if(!art&&kind!=='sound-icon')return false;
      const ctx=get(id).getContext('2d'),[tx,ty,cx,cy,cw,ch]=state;
      ctx.save();ctx.scale(scales.get(id)||1,scales.get(id)||1);ctx.beginPath();ctx.rect(cx,cy,cw,ch);ctx.clip();ctx.translate(tx,ty);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      try{
        if(kind==='sound-icon'){
          if(art?.draw(ctx,kind,args))return true;
          const [x,y,w=34,h=34]=args,s=Math.min(34,w-2,h-2)/34;ctx.translate(x-17*s,y-17*s);ctx.scale(s,s);
          const steel=ctx.createLinearGradient(0,0,34,34);steel.addColorStop(0,'#e4e8dc');steel.addColorStop(.4,'#69767b');steel.addColorStop(1,'#202e35');
          ctx.fillStyle='#111b21';ctx.strokeStyle=steel;ctx.lineWidth=1.3;ctx.beginPath();ctx.roundRect(0,0,34,34,5);ctx.fill();ctx.stroke();
          ctx.fillStyle=steel;ctx.beginPath();ctx.moveTo(7,13);ctx.lineTo(11,13);ctx.lineTo(17,8);ctx.lineTo(17,26);ctx.lineTo(11,21);ctx.lineTo(7,21);ctx.closePath();ctx.fill();
          ctx.strokeStyle='#dddac9';ctx.lineWidth=1.8;ctx.lineCap='round';
          for(const r of [6,10]){ctx.beginPath();ctx.arc(17,17,r,-.8,.8);ctx.stroke();}
          for(const px of [3,31])for(const py of [3,31]){ctx.fillStyle='#a5adb0';ctx.beginPath();ctx.arc(px,py,.7,0,Math.PI*2);ctx.fill();}
          return true;
        }
        return art.draw(ctx,kind,args);
      }finally{ctx.restore();}
    },
    present(id) { const ctx=screen.getContext('2d');ctx.imageSmoothingEnabled=density>1;ctx.clearRect(0,0,screen.width,screen.height);ctx.drawImage(get(id),0,0,screen.width,screen.height);api.frames++;onFrame(api.frames); },
    measure(text,size,bold) { return Math.ceil(blockWidth(text,size+3)); },
    readSave(name) { try{const value=storage.getItem(storagePrefix+name);return value?decode(value):null;}catch{return null;} },
    writeSave(name,data) { storage.setItem(storagePrefix+name,encode(data));onSave(name); },
    exportSave() { const result={format:'prison-tycoon-native',version:1,records:{}};for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(storagePrefix))result.records[key.slice(storagePrefix.length)]=storage.getItem(key);}return result; },
    validateSave(input) {if(input?.format!=='prison-tycoon-native'||input.version!==1||!input.records||typeof input.records!=='object'||Array.isArray(input.records))throw new Error('Неверный формат сохранения');const keys=Object.keys(input.records);if(keys.length>20)throw new Error('Слишком много записей');for(const name of keys){if(!/^pris[a-z0-9]{1,12}$/i.test(name)||typeof input.records[name]!=='string'||input.records[name].length>200000)throw new Error('Повреждённое сохранение');decode(input.records[name]);}return input;},
    importSave(input) {api.validateSave(input);for(const[name,data]of Object.entries(input.records))storage.setItem(storagePrefix+name,data);},
    audio(data,mime){return audio.create(data,mime);},audioControl(id,op,value){return audio.control(id,op,value);},exit:onExit,
  };
  return api;
}
