import { createRenderer } from './renderer.js';
import { createAudio } from './audio.js';
import {createStatusHud} from './status-hud.js?v=20260910-large-alerts-3';
import { createGuardArt } from './guard-hd.js';
import { bindTouchGestures } from './touch-gestures.js';
import { GAME_WIDTH as VIEW_WIDTH, GAME_HEIGHT as VIEW_HEIGHT, pointerPosition } from './viewport.js';
import * as game from './game.js';
const canvas=document.getElementById('game'),loading=document.getElementById('loading');
const createCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const audio=createAudio(),pressed=new Set();
const notify=(type,text)=>{window.dispatchEvent(new CustomEvent('prison-event',{detail:{type,text}}));if(parent!==window)parent.postMessage({type,text},location.origin);};
const keyMap={ArrowUp:-1,ArrowDown:-2,ArrowLeft:-3,ArrowRight:-4,Enter:-5,Space:-5,F1:-6,KeyQ:-6,F2:-7,KeyW:-7,Escape:-7,KeyE:42,KeyR:35};
for(let i=0;i<10;i++){keyMap[`Digit${i}`]=48+i;keyMap[`Numpad${i}`]=48+i;}
let runtime,ready=false,manuallyPaused=false;
let fullscreenAttempted=false;
function enterMobileFullscreen(){
  if(window.PrisonAndroid)return; // Android owns the native immersive window.
  if(fullscreenAttempted||document.fullscreenElement||!matchMedia('(pointer:coarse)').matches)return;
  fullscreenAttempted=true;
  const target=document.documentElement;
  const request=target.requestFullscreen||target.webkitRequestFullscreen;
  if(!request)return;
  try{
    const result=request.call(target,{navigationUI:'hide'});
    if(result?.catch)result.catch(()=>{fullscreenAttempted=false;});
  }catch{fullscreenAttempted=false;}
}
function send(code,down){const key=keyMap[code];if(key===undefined||!ready)return;if(down){if(pressed.has(key))return;pressed.add(key);game.keyDown(key);}else{pressed.delete(key);game.keyUp(key);}}
function release(){for(const key of pressed)game.keyUp(key);pressed.clear();}
function fail(error){console.error(error);loading.hidden=false;loading.textContent='Не удалось загрузить игру. Обнови страницу. '+(error?.message||'');notify('prison-error',loading.textContent);}
window.addEventListener('error',event=>fail(event.error||event.message));
window.addEventListener('unhandledrejection',event=>fail(event.reason));
window.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey)return;if(keyMap[event.code]!==undefined){event.preventDefault();audio.unlock();send(event.code,true);}});
window.addEventListener('keyup',event=>{if(keyMap[event.code]!==undefined){event.preventDefault();send(event.code,false);}});
window.addEventListener('blur',release);
document.addEventListener('visibilitychange',()=>{if(!ready)return;release();if(document.hidden||manuallyPaused)game.pause();else game.resume();});
canvas.addEventListener('contextmenu',event=>event.preventDefault());
const cancelGesture=bindTouchGestures(canvas,{
  ready:()=>ready,
  state:()=>Number(/state=(\d+)/.exec(game.diagnostics())?.[1]),
  interact:()=>{enterMobileFullscreen();canvas.focus({preventScroll:true});audio.unlock();},
  tap:(x,y)=>game.tap(x,y),pan:(dx,dy)=>game.panCamera(dx,dy)
});
window.addEventListener('blur',cancelGesture);
document.addEventListener('visibilitychange',cancelGesture);
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==parent)return;
  if(event.data?.type==='prison-key')send(event.data.code,event.data.down);
  if(event.data?.type==='prison-release')release();
  if(event.data?.type==='prison-mute')audio.mute(!!event.data.value);
  if(event.data?.type==='prison-pause'&&ready){release();manuallyPaused=!!event.data.value;if(manuallyPaused||document.hidden)game.pause();else game.resume();}
  if(event.data?.type==='prison-export'&&runtime){notify('prison-save',runtime.exportSave());}
  if(event.data?.type==='prison-import'&&runtime){try{runtime.importSave(event.data.save);location.reload();}catch(error){notify('prison-error',error.message);}}
});
async function start(){
  const uiFont=new FontFace('Prison UI','url(./RussoOne-Regular.ttf)',{weight:'400'});
  try{document.fonts.add(await uiFont.load());}catch(error){console.warn('UI font fallback:',error);}
  const response=await fetch('./resources.json');if(!response.ok)throw new Error('Ресурсы игры недоступны');
  const packed=await response.json(),resources={},images={};
  await Promise.all(Object.entries(packed).map(async([name,data])=>{const raw=atob(data),bytes=new Int8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);resources[name]=bytes;if(name.endsWith('.png')){images[name]=await createImageBitmap(new Blob([bytes],{type:'image/png'}));}}));
  const rect=canvas.getBoundingClientRect();
  const resolution=Math.min(4,Math.max(2,Math.ceil(Math.max(rect.width/VIEW_WIDTH,rect.height/VIEW_HEIGHT)*(devicePixelRatio||1))));
  canvas.width=VIEW_WIDTH*resolution;canvas.height=VIEW_HEIGHT*resolution;
  let art=null;
  try{const response=await fetch('./guard-fsin-hd.png');if(!response.ok)throw new Error('Guard atlas unavailable');const sheet=await createImageBitmap(await response.blob());let radioSheet=null;try{const r=await fetch('./guard-radio-v2.png');if(r.ok)radioSheet=await createImageBitmap(await r.blob());}catch(error){console.warn('Radio frames unavailable:',error);}const [faces,radioFaces,panelImage,buttonsImage]=await Promise.all(['guard-face-adult.png','guard-radio-face-adult.png','major-chikin-panel-final.png','buttons-metal-reference.png'].map(async name=>{try{const r=await fetch('./'+name);return r.ok?await createImageBitmap(await r.blob()):null;}catch(error){console.warn('Face atlas unavailable:',error);return null;}}));art=createGuardArt(sheet,createCanvas,radioSheet,{faces,radioFaces,panelImage,buttonsImage});}catch(error){console.warn('Используется оригинальный охранник:',error);}
  const [buttonTexture,approvedPlay]=await Promise.all(['button-metal-hd.png','button-play-approved.png'].map(async name=>{const r=await fetch('./'+name);if(!r.ok)throw new Error('Не загружено оформление кнопок');return createImageBitmap(await r.blob());}));
  const {createMetalButtons}=await import('./metal-buttons.js');
  const drawButtons=createMetalButtons(createCanvas,null,buttonTexture,approvedPlay),characterArt=art;
  const soundResponse=await fetch('./sound-metal-hd.png');
  if(!soundResponse.ok)throw new Error('Не загружен значок звука');
  const soundImage=await createImageBitmap(await soundResponse.blob());
  const hudResponse=await fetch('./status-hud-hd.png');
  if(!hudResponse.ok)throw new Error('Не загружена панель состояния');
  const drawStatusHud=createStatusHud(await createImageBitmap(await hudResponse.blob()));
  const {createGovernorOffice}=await import('./governor-office.js');
  const governorResponse=await fetch('./governor-office-hd.png');
  if(!governorResponse.ok)throw new Error('Не загружен портрет губернатора');
  const drawGovernor=createGovernorOffice(await createImageBitmap(await governorResponse.blob()));
  art={draw:(ctx,kind,args)=>{
    if(kind==='governor-office')return drawGovernor(ctx,args);
    if(kind==='status-hud')return drawStatusHud(ctx,args);
    if(kind==='sound-icon'){
      const [x,y,w,h]=args;ctx.drawImage(soundImage,x-w/2,y-h/2,w,h);return true;
    }
    return kind==='button'?drawButtons(ctx,args):characterArt?.draw(ctx,kind,args)||false;
  }};
  runtime=createRenderer({createCanvas,screen:canvas,images,resources,storage:localStorage,audio,art,resolution,onFrame:()=>{
    // Show the engine's original blue progress bar; the HTML panel is only for errors.
    if(!ready){ready=true;notify('prison-ready');canvas.focus({preventScroll:true});}
  },onSave:()=>notify('prison-saved'),onExit:()=>notify('prison-exit')});
  window.PrisonWeb=runtime;
  game.main([],error=>{if(error)fail(error);});
}
start().catch(fail);
