/** Original code-defined Cyrillic pixel glyphs, including Ё/Й. No external fonts. */
export const patterns = {
  А:['01110','10001','10001','11111','10001','10001','10001'],
  Б:['11111','10000','10000','11110','10001','10001','11110'],
  В:['11110','10001','10001','11110','10001','10001','11110'],
  Г:['11111','10000','10000','10000','10000','10000','10000'],
  Д:['0011100','0010100','0010100','0100100','0100100','1111110','1000010'],
  Е:['11111','10000','10000','11110','10000','10000','11111'],
  Ё:['01010','00000','11111','10000','10000','11110','10000','10000','11111'],
  Ж:['1001001','1001001','0101010','0011100','0101010','1001001','1001001'],
  З:['01110','10001','00001','00110','00001','10001','01110'],
  И:['10001','10001','10011','10101','11001','10001','10001'],
  Й:['01010','00100','10001','10001','10011','10101','11001','10001','10001'],
  К:['10001','10010','10100','11000','10100','10010','10001'],
  Л:['00111','01001','01001','01001','01001','01001','10001'],
  М:['10001','11011','10101','10101','10001','10001','10001'],
  Н:['10001','10001','10001','11111','10001','10001','10001'],
  О:['01110','10001','10001','10001','10001','10001','01110'],
  П:['11111','10001','10001','10001','10001','10001','10001'],
  Р:['11110','10001','10001','11110','10000','10000','10000'],
  С:['01111','10000','10000','10000','10000','10000','01111'],
  Т:['11111','00100','00100','00100','00100','00100','00100'],
  У:['10001','10001','10001','01111','00001','10001','01110'],
  Ф:['00100','01110','10101','10101','10101','01110','00100'],
  Х:['10001','10001','01010','00100','01010','10001','10001'],
  Ц:['100010','100010','100010','100010','100010','111110','000010'],
  Ч:['10001','10001','10001','01111','00001','00001','00001'],
  Ш:['1001001','1001001','1001001','1001001','1001001','1001001','1111111'],
  Щ:['10010010','10010010','10010010','10010010','10010010','11111110','00000010'],
  Ъ:['11000','01000','01000','01110','01001','01001','01110'],
  Ы:['1000001','1000001','1000001','1111001','1000101','1000101','1111001'],
  Ь:['10000','10000','10000','11110','10001','10001','11110'],
  Э:['11110','00001','00001','01111','00001','00001','11110'],
  Ю:['1001110','1010001','1010001','1110001','1010001','1010001','1001110'],
  Я:['01111','10001','10001','01111','00101','01001','10001'],
};
export const cyrillicAlphabet = Object.keys(patterns).join('');
export function createCyrillicRenderer(createCanvas, getSurface) {
  const cache=new Map(), colors=new Map();
  function color(reference,preserveDark) {
    const colorKey=`${reference}:${preserveDark?1:0}`;
    if(colors.has(colorKey))return colors.get(colorKey);
    const source=getSurface(reference),ctx=source.getContext('2d');
    const pixels=ctx.getImageData(0,0,source.width,source.height).data;
    let best=0,result='#ffffff';const frequency=new Map();
    for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<128)continue;const rgb=`rgb(${pixels[i]},${pixels[i+1]},${pixels[i+2]})`,count=(frequency.get(rgb)||0)+1;frequency.set(rgb,count);if(count>best){best=count;result=rgb;}}
    const values=result.match(/\d+/g)?.map(Number)||[255,255,255];
    const luminance=values[0]*.2126+values[1]*.7152+values[2]*.0722;
    if(!preserveDark&&luminance<145)result='#ffffff';
    colors.set(colorKey,result);return result;
  }
  return (ctx,[code,x,y,advance,height,reference],preserveDark=false)=>{
    const letter=String.fromCharCode(code).toUpperCase(),rows=patterns[letter];
    if(!rows)throw new Error(`Missing Cyrillic glyph: ${letter}`);
    const key=`${letter}:${advance}:${height}:${reference}:${preserveDark?1:0}`;
    if(!cache.has(key)){
      const canvas=createCanvas(advance+1,height+1),g=canvas.getContext('2d');
      const width=Math.max(rows[0].length,advance-1),bodyHeight=Math.max(7,height-1);
      const top=rows.length===9?0:2,ink=[];
      for(let yy=0;yy<bodyHeight;yy++)for(let xx=0;xx<width;xx++){
        const row=Math.floor(yy*9/bodyHeight)-top,col=Math.floor(xx*rows[0].length/width);
        if(row>=0&&rows[row]?.[col]==='1')ink.push([xx,yy]);
      }
      g.fillStyle='#0c151b';for(const[xx,yy]of ink)g.fillRect(xx+1,yy+1,1,1);
      g.fillStyle=color(reference,preserveDark);for(const[xx,yy]of ink)g.fillRect(xx,yy,1,1);
      cache.set(key,canvas);
    }
    ctx.drawImage(cache.get(key),x,y);
  };
}
