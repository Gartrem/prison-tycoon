import { pointerPosition, GAME_WIDTH, GAME_HEIGHT } from './viewport.js';

export function bindTouchGestures(canvas, { ready, state, interact, tap, pan }) {
  let gesture = null;
  function cancel() { gesture = null; }
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary) { cancel(); return; }
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    interact();
    if (!ready()) return;
    const rect = canvas.getBoundingClientRect();
    const [x, y] = pointerPosition(event.clientX, event.clientY, rect);
    gesture = { id: event.pointerId, state: state(), startX: event.clientX, startY: event.clientY,
      lastX: event.clientX, lastY: event.clientY, remainderX: 0, remainderY: 0,
      moved: false, canPan: state() === 27 && y >= 36 && y < 294 };
    canvas.setPointerCapture?.(event.pointerId);
  });
  function move(event) {
    const g = gesture;
    if (!g || g.id !== event.pointerId) return;
    if (state() !== g.state) { cancel(); return; }
    if (!g.moved && Math.hypot(event.clientX - g.startX, event.clientY - g.startY) < 8) return;
    g.moved = true;
    const rect = canvas.getBoundingClientRect();
    g.remainderX += (event.clientX - g.lastX) * GAME_WIDTH / rect.width;
    g.remainderY += (event.clientY - g.lastY) * GAME_HEIGHT / rect.height;
    g.lastX = event.clientX; g.lastY = event.clientY;
    const dx = Math.trunc(g.remainderX), dy = Math.trunc(g.remainderY);
    g.remainderX -= dx; g.remainderY -= dy;
    if (g.canPan && (dx || dy)) pan(dx, dy);
  }
  canvas.addEventListener('pointermove', event => { event.preventDefault(); move(event); });
  canvas.addEventListener('pointerup', event => {
    move(event);
    const g = gesture;
    if (!g || g.id !== event.pointerId) return;
    cancel();
    if (!g.moved && state() === g.state) {
      const rect = canvas.getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX < rect.right && event.clientY >= rect.top && event.clientY < rect.bottom) {
        tap(...pointerPosition(event.clientX, event.clientY, rect));
      }
    }
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', cancel);
  return cancel;
}
