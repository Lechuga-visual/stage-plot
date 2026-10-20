// The destination is a boundary in the original list: 0 = start, length = end.
export function moveChannels(channels, indices, boundary) {
  const selected = new Set(
    indices.filter((n) => Number.isInteger(n) && n >= 0 && n < channels.length),
  );
  if (
    !selected.size ||
    !Number.isInteger(boundary) ||
    boundary < 0 ||
    boundary > channels.length
  )
    return channels;
  const moving = channels.filter((_, n) => selected.has(n));
  const remaining = channels.filter((_, n) => !selected.has(n));
  const destination = channels
    .slice(0, boundary)
    .filter((_, n) => !selected.has(n)).length;
  return [
    ...remaining.slice(0, destination),
    ...moving,
    ...remaining.slice(destination),
  ];
}
