/** Trial HD renderer for exactly one prisoner instance.
 * All other prisoners and all unsupported contexts fall back to the original game art.
 */
export function createPrisonerTestArt(sheet) {
  let targetId = null;

  function shouldDraw(a) {
    const [id, , , , activity, , , , guard, , portrait, , inWorld] = a;
    if (guard || portrait || !inWorld || activity === 33) return false;
    if (targetId === null) targetId = id;
    return id === targetId;
  }

  return {
    draw(ctx, kind, a) {
      if (kind !== 'actor' || !shouldDraw(a)) return false;
      const x = a[2], y = a[3];
      const w = 34, h = 60;

      if (a[12]) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(12,20,23,0.30)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sheet, x - w / 2, y - h, w, h);
      ctx.restore();
      return true;
    }
  };
}
