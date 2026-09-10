/** Native browser audio for the game's WAV/MPEG clips and MIDI sequences. */
export function createAudio() {
  const players=[];let context=null,muted=false;
  const ensure=()=>{context??=new AudioContext();context.resume().catch(()=>{});return context;};
  function midi(bytes){
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let pos=0;
    const str=n=>{let r='';while(n--)r+=String.fromCharCode(bytes[pos++]);return r;};
    const u32=()=>{const n=view.getUint32(pos);pos+=4;return n;};
    const u16=()=>{const n=view.getUint16(pos);pos+=2;return n;};
    const vlq=()=>{let n=0,b;do{b=bytes[pos++];n=(n<<7)|(b&127);}while(b&128);return n;};
    if(str(4)!=='MThd')return [];const header=u32();u16();const tracks=u16(),division=u16();pos=8+header;const events=[];
    for(let t=0;t<tracks&&pos<bytes.length;t++){if(str(4)!=='MTrk')break;const end=pos+4+u32();let time=0,running=0;while(pos<end){time+=vlq();let status=bytes[pos++];if(status<128){pos--;status=running;}else if(status<240)running=status;
      if(status===255){const type=bytes[pos++],len=vlq();if(type===81&&len===3)events.push({tick:time,tempo:(bytes[pos]<<16)|(bytes[pos+1]<<8)|bytes[pos+2]});pos+=len;}
      else if(status===240||status===247){const length=vlq();pos+=length;}
      else {const type=status>>4,ch=status&15,a=bytes[pos++],b=(type===12||type===13)?0:bytes[pos++];if(type===8||type===9)events.push({tick:time,key:a,velocity:type===8?0:b,ch});}
    }pos=end;}
    events.sort((a,b)=>a.tick-b.tick);let tick=0,seconds=0,tempo=500000;const notes=[],active=new Map();for(const event of events){seconds+=(event.tick-tick)*tempo/1000000/division;tick=event.tick;if(event.tempo){tempo=event.tempo;continue;}const key=`${event.ch}:${event.key}`;if(event.velocity){active.set(key,{key:event.key,ch:event.ch,velocity:event.velocity,start:seconds});}else if(active.has(key)){notes.push({...active.get(key),duration:Math.max(.04,seconds-active.get(key).start)});active.delete(key);}}
    for(const note of active.values())notes.push({...note,duration:.3});return notes;
  }
  function stop(player){clearTimeout(player.timer);player.media?.pause();player.nodes?.forEach(node=>{try{node.stop();}catch{}});player.nodes=[];player.playing=false;}
  function play(player,loops){stop(player);if(muted)return;player.playing=true;
    if(player.media){player.media.loop=loops===-1;player.media.volume=player.volume;player.media.play().catch(()=>{player.playing=false;});return;}
    const ctx=ensure();player.nodes=[];let duration=0;const now=ctx.currentTime+.02;
    for(const note of player.notes){const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type=note.ch===9?'triangle':'sine';oscillator.frequency.value=440*2**((note.key-69)/12);gain.gain.setValueAtTime(0,now+note.start);gain.gain.linearRampToValueAtTime(player.volume*note.velocity/127*.09,now+note.start+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+note.start+note.duration);oscillator.connect(gain).connect(ctx.destination);oscillator.start(now+note.start);oscillator.stop(now+note.start+note.duration+.02);player.nodes.push(oscillator);duration=Math.max(duration,note.start+note.duration);}
    player.timer=setTimeout(()=>{player.playing=false;if(loops===-1&&!muted)play(player,-1);},Math.max(.1,duration)*1000);
  }
  return {
    unlock:ensure,
    mute(value){muted=value;if(muted)players.forEach(stop);},
    create(data,mime){const bytes=new Uint8Array(data),player={volume:.7,playing:false,nodes:[]};if(mime.includes('midi')){try{player.notes=midi(bytes);}catch{player.notes=[];}}else{player.media=new Audio(URL.createObjectURL(new Blob([bytes],{type:mime})));player.media.onended=()=>{player.playing=false;};}players.push(player);return players.length-1;},
    control(id,op,value){const p=players[id];if(!p)return 300;switch(op){case 0:return p.playing?400:300;case 1:play(p,value);break;case 2:stop(p);break;case 3:p.volume=Math.max(0,Math.min(1,value/100));if(p.media)p.media.volume=p.volume;break;case 4:if(p.media)p.media.currentTime=value/1000;break;}return 300;},
    dispose(){players.forEach(p=>{stop(p);if(p.media)URL.revokeObjectURL(p.media.src);});context?.close();}
  };
}
