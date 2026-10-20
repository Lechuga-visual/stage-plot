export function validateImage(dataUrl) {
  if (typeof dataUrl !== "string" || dataUrl.length > 2800000)
    throw Error("Imagen demasiado grande");
  const match =
    /^data:image\/(png|webp|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw Error("Formato no admitido");
  const data = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  if (data.length > 2 * 1024 * 1024) throw Error("Imagen demasiado grande");
  const prefix = Array.from(data.slice(0, 12));
  if (
    match[1] === "png" &&
    prefix.slice(0, 8).join(",") !== "137,80,78,71,13,10,26,10"
  )
    throw Error("PNG inválido");
  if (match[1] === "jpeg" && prefix.slice(0, 3).join(",") !== "255,216,255")
    throw Error("JPEG inválido");
  if (
    match[1] === "webp" &&
    (String.fromCharCode(...prefix.slice(0, 4)) !== "RIFF" ||
      String.fromCharCode(...prefix.slice(8, 12)) !== "WEBP")
  )
    throw Error("WebP inválido");
  return data;
}
