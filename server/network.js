export function resolveListenPort(configured = 3000, environment = process.env.PORT) {
  const value = environment === undefined || environment === "" ? configured : Number(environment);
  if (!Number.isInteger(value) || value < 0 || value > 65535)
    throw Error("PORT debe ser un número entre 0 y 65535");
  return value;
}

export function serverAddress(host, port, protocol = "http") {
  const name = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  const standard = (protocol === "http" && port === 80) || (protocol === "https" && port === 443);
  return `${protocol}://${name}${standard ? "" : `:${port}`}`;
}
