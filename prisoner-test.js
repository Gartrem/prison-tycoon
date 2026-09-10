/** Animated HD test renderer for exactly one prisoner instance.
 *
 * The original game assembles prisoners from separate head/body/arm/leg sprites.
 * The browser remaster hook runs one level above that assembly, so this test keeps
 * the original actor identity, world coordinates, movement state and facing logic,
 * then renders a redesigned four-direction prisoner with a gait phase driven by
 * real world movement (camera panning cannot advance the walk cycle).
 *
 * Sheet layout: 4 equal horizontal cells: FRONT | BACK | RIGHT | LEFT.
 */
export function createPrisonerTestArt(sheet) {
  const FRAME_COUNT = 4;
  const CELL_W = sheet.width / FRAME_COUNT;
  const CELL_H = sheet.height;
  const DRAW_H = 62;
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
    const worldX = a[19];
    const worldY = a[20];
    const room = a[21];
    const vx = Number(a[17]) || 0;
    const vy = Number(a[18]) || 0;

    let h = history.get(id);
    if (!h || h.seed !== seed || h.room !== room || tick < h.tick) {
      h = {
        seed,
        room,
        x: worldX,
        y: worldY,
        tick,
        phase: 0,
        direction: 'front',
        facingRight: true
      };
      history.set(id, h);
    }

    const horizontal = vx - vy;
    const vertical = vx + vy;
    if (moving && (horizontal || vertical)) {
      // Same projection used by the HD guard renderer. Opposite-sign axis movement
      // is horizontal on screen; otherwise the actor is moving toward/away camera.
      if (Math.abs(horizontal) > Math.abs(vertical) * 1.35) {
        h.direction = horizontal > 0 ? 'right' : 'left';
      } else {
        h.direction = vertical < 0 ? 'back' : 'front';
        if (horizontal) h.facingRight = horizontal > 0;
      }
    }

    if (moving && Number.isFinite(worldX) && Number.isFinite(worldY) &&
        Number.isFinite(h.x) && Number.isFinite(h.y) && tick !== h.tick) {
      const dx = (worldX - h.x) / 4096;
      const dy = (worldY - h.y) / 4096;
      const distance = Math.hypot(dx - dy, (dx + dy) / 2);
      // Ignore teleports/room jumps; one full stride is roughly 28 projected units.
      if (distance > 0 && distance < 24) h.phase = (h.phase + distance / 28) % 1;
    } else if (moving && tick !== h.tick) {
      // Safety fallback if a build does not expose world coordinates.
      h.phase = (h.phase + Math.min(0.18, Math.max(0.04, (tick - h.tick) / 24))) % 1;
    }

    h.x = worldX;
    h.y = worldY;
    h.tick = tick;
    return h;
  }

  function frameFor(h, moving) {
    const secondStep = moving && h.phase >= 0.5;

    if (h.direction === 'right') {
      // The opposite side pose mirrored becomes the second natural step for the
      // same travel direction, giving us a true alternating leg stance.
      return secondStep ? { index: LEFT, flip: true } : { index: RIGHT, flip: false };
    }
    if (h.direction === 'left') {
      return secondStep ? { index: RIGHT, flip: true } : { index: LEFT, flip: false };
    }

    const index = h.direction === 'back' ? BACK : FRONT;
    // Front/back poses are nearly symmetrical: mirroring swaps leading leg/arm.
    // Keep the travel-facing mirror and XOR the gait phase so the feet alternate.
    return { index, flip: Boolean(h.facingRight) !== Boolean(secondStep) };
  }

  function drawShadow(ctx, x, y, phase, moving) {
    const squash = moving ? 1 - 0.08 * Math.abs(Math.sin(phase * Math.PI * 2)) : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(squash, 1);
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
      const { index, flip } = frameFor(h, moving);
      const stepWave = moving ? Math.abs(Math.sin(h.phase * Math.PI * 2)) : 0;
      const bob = -1.35 * stepWave;
      const breathe = moving ? 0 : Math.sin((a[9] || 0) / 18) * 0.18;

      if (a[12]) drawShadow(ctx, x, y, h.phase, moving);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.translate(x, y + bob + breathe);
      if (flip) ctx.scale(-1, 1);

      // Feet stay registered on the original actor ground point. The source cell
      // is always cropped before scaling, so we never draw the whole four-pose atlas.
      ctx.drawImage(
        sheet,
        index * CELL_W, 0, CELL_W, CELL_H,
        -DRAW_W / 2, -DRAW_H, DRAW_W, DRAW_H
      );
      ctx.restore();
      return true;
    }
  };
}
