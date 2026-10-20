export const CABLE_TYPES = {
  power: { label: "Energía", color: "#ffb341", dash: "" },
  audio: { label: "Señal de audio", color: "#45d7ed", dash: "" },
  multicore: { label: "Multipar", color: "#a78bfa", dash: "8 4" },
  ethernet: { label: "Ethernet", color: "#68e68a", dash: "3 4" },
  video: { label: "Vídeo", color: "#f472b6", dash: "10 3 2 3" },
};
const pixels = (p, w, h) => [(p[0] * w) / 100, (p[1] * h) / 100];
export function segmentDistance(point, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    den = dx * dx + dy * dy,
    t = den
      ? Math.max(
          0,
          Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / den),
        )
      : 0;
  return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
}
export function hitStroke(drawings, point, w, h, tolerance = 7) {
  const p = pixels(point, w, h);
  for (let n = drawings.length - 1; n >= 0; n--) {
    const d = drawings[n];
    for (let i = 1; i < d.points.length; i++)
      if (
        segmentDistance(
          p,
          pixels(d.points[i - 1], w, h),
          pixels(d.points[i], w, h),
        ) <=
        tolerance + d.width / 2
      )
        return n;
  }
  return -1;
}
// Split each segment at its exact circle intersections: erasing works even with sparse vertices.
export function eraseCircle(drawings, center, radius, w, h) {
  const c = pixels(center, w, h),
    result = [];
  for (const drawing of drawings) {
    const cutRadius = radius + (drawing.width || 0) / 2; // compensate round caps so thick marks expose an actual gap
    let part = [];
    const finish = () => {
      if (part.length >= 2) result.push({ ...drawing, points: part });
      part = [];
    };
    for (let i = 1; i < drawing.points.length; i++) {
      const A = drawing.points[i - 1],
        B = drawing.points[i],
        a = pixels(A, w, h),
        b = pixels(B, w, h),
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        fx = a[0] - c[0],
        fy = a[1] - c[1],
        aa = dx * dx + dy * dy,
        bb = 2 * (fx * dx + fy * dy),
        cc = fx * fx + fy * fy - cutRadius * cutRadius;
      const cuts = [0, 1],
        disc = bb * bb - 4 * aa * cc;
      if (aa && disc > 0) {
        const root = Math.sqrt(disc);
        for (const t of [(-bb - root) / (2 * aa), (-bb + root) / (2 * aa)])
          if (t > 0 && t < 1) cuts.push(t);
      }
      cuts.sort((a, b) => a - b);
      const at = (t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
      for (let j = 1; j < cuts.length; j++) {
        const lo = cuts[j - 1],
          hi = cuts[j],
          mid = (lo + hi) / 2;
        if (
          Math.hypot(a[0] + dx * mid - c[0], a[1] + dy * mid - c[1]) >=
          cutRadius - 1e-7
        ) {
          const start = at(lo),
            end = at(hi);
          if (!part.length) part.push(start);
          part.push(end);
        } else finish();
      }
    }
    finish();
  }
  return result;
}
export function eraseSweep(drawings, from, to, radius, w, h) {
  const a = pixels(from, w, h),
    b = pixels(to, w, h),
    steps = Math.max(
      1,
      Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (radius / 2)),
    );
  let result = drawings;
  for (let i = 0; i <= steps; i++)
    result = eraseCircle(
      result,
      [
        from[0] + ((to[0] - from[0]) * i) / steps,
        from[1] + ((to[1] - from[1]) * i) / steps,
      ],
      radius,
      w,
      h,
    );
  return result;
}
