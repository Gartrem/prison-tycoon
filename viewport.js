// Logical game coordinates are deliberately independent of the Canvas backing-store density.
export const GAME_WIDTH=240,GAME_HEIGHT=320;
export function pointerPosition(clientX,clientY,rect){
  return [
    Math.max(0,Math.min(GAME_WIDTH-1,Math.floor((clientX-rect.left)*GAME_WIDTH/rect.width))),
    Math.max(0,Math.min(GAME_HEIGHT-1,Math.floor((clientY-rect.top)*GAME_HEIGHT/rect.height))),
  ];
}
