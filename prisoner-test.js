/** Animated HD test renderer for exactly one prisoner instance.
 * Current test sheet is a horizontal strip with four complete directional poses:
 * FRONT | BACK | RIGHT | LEFT.
 * The actor keeps the original game's world position and movement/facing data.
 */
export function createPrisonerTestArt(sheet) {
  const COLS = 4;
  const CELL_W = sheet.width / COLS;
  const CELL_H = sheet.height;
  const DRAW_H = 60;
  const DRAW_W = DRAW_H * (CELL_W / CELL_H);
  const FRONT = 0, BACK = 1, RIGHT = 2, LEFT = 3;

  let targetId = null;
  const history = new Map();

  function isTarget(a) {
    const [id, , , , activity, , , , guard, , portrait, , inWorld] = a;
    if (guard || portrait || !inWorld || activity === 33) return false;
    if (targetId === null) targetId = id;
    return id === targetId;
  }

  function stateFor(a) {
    const [id, seed, , , , moving] = a;
    const tick = a[9] || 0;
    const worldX = a[19], worldY = a[20], room = a[21];
    const vx = Number(a[17]) || 0, vy = Number(a[18]) || 0;

    let h = history.get(id);
    if (!h || h.seed !== seed || h.room !== room || tick < h.tick) {
      h = {seed, room, x: worldX, y: worldY, tick, phase: 0, dir: FRONT};
      history.set(id, h);
    }

    const screenX = vx - vy;
    const screenY = (vx + vy) / 2;
    if (moving && (screenX || screenY)) {
      if (Math.abs(screenX) > Math.abs(screenY) * 1.15) {
        h.dir = screenX > 0 ? RIGHT : LEFT;
      } else {
        h.dir = screenY < 0 ? BACK : FRONT;
      }
    }

    if (moving && Number.isFinite(worldX) && Number.isFinite(worldY) &&
        Number.isFinite(h.x) && Number.isFinite(h.y) && tick !== h.tick) {
      const dx = (worldX - h.x) / 4096;
      const dy = (worldY - h.y) / 4096;
      const distance = Math.hypot(dx - dy, (dx + dy) / 2);
      if (distance > 0 && distance < 24) h.phase = (h.phase + distance / 18) % 1;
    } else if (moving && tick !== h.tick) {
      h.phase = (h.phase + 0.10) % 1;
    }

    h.x = worldX;
    h.y = worldY;
    h.tick = tick;
    return h;
  }

  function drawShadow(ctx, x, y, moving, phase) {
    const k = moving ? 1 - 0.05 * Math.abs(Math.sin(phase * Math.PI * 2)) : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, 1);
    ctx.fillStyle = 'rgba(10,16,18,0.30)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 11.5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return {
    draw(ctx, kind, a) {
      if (kind !== 'actor' || !isTarget(a)) return false;

      const x = a[2], y = a[3];
      const moving = Boolean(a[5]);
      const h = stateFor(a);
      const step = moving ? Math.sin(h.phase * Math.PI * 2) : 0;
      const bob = moving ? -Math.abs(step) * 1.1 : 0;
      const sideView = h.dir === RIGHT || h.dir === LEFT;
      const flipStep = moving && sideView && h.phase >= 0.5;

      if (a[12]) drawShadow(ctx, x, y, moving, h.phase);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.translate(x, y + bob);

      // The source atlas contains four full-height cells. Never divide it vertically.
      // For side walking, mirror every second half-stride to avoid a frozen leg pose.
      if (flipStep) ctx.scale(-1, 1);
      ctx.drawImage(
        sheet,
        h.dir * CELL_W, 0, CELL_W, CELL_H,
        -DRAW_W / 2, -DRAW_H, DRAW_W, DRAW_H
      );

      ctx.restore();
      return true;
    }
  };
}
