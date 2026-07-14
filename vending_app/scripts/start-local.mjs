import { spawn, execSync } from "node:child_process";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const expoCli = path.join(root, "node_modules", "expo", "bin", "cli");
const port = process.env.MOADDI_LOCAL_PORT || "8085";

function getLanIp() {
  const nets = networkInterfaces();
  for (const iface of Object.keys(nets)) {
    for (const net of nets[iface] ?? []) {
      if (net.family === "IPv4" && !net.internal && net.address.startsWith("192.168.")) {
        return net.address;
      }
    }
  }
  for (const iface of Object.keys(nets)) {
    for (const net of nets[iface] ?? []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

const host = process.argv.includes("--emu") ? "10.0.2.2" : getLanIp();
const origin = `http://${host}:${port}/`;
/** Product/shop uploads usually live on production; local `images/` is often incomplete. */
const productionStatic = "https://server.moaddi-app.com/";
const staticOrigin =
  (typeof process.env.EXPO_PUBLIC_STATIC === "string" &&
    process.env.EXPO_PUBLIC_STATIC.trim() !== "" &&
    process.env.EXPO_PUBLIC_STATIC) ||
  productionStatic;

if (process.argv.includes("--emu")) {
  try {
    execSync(`adb reverse tcp:${port} tcp:${port}`, { stdio: "ignore" });
    console.log(`adb reverse tcp:${port} tcp:${port} — emulator can also use http://localhost:${port}/`);
  } catch {
    console.warn("adb reverse failed (no emulator?). Using 10.0.2.2 anyway.");
  }
}

console.log(`\nUsing local backend: ${origin}`);
console.log(`Using media/static origin: ${staticOrigin.replace(/\/?$/, "/")}`);
console.log(`Ensure moaddi-server is running (npm run dev) on port ${port}.\n`);

const child = spawn(process.execPath, [expoCli, "start", "--clear"], {
  cwd: root,
  env: {
    ...process.env,
    EXPO_PUBLIC_SERVER_ORIGIN: origin,
    // Keep media on production (or explicit EXPO_PUBLIC_STATIC) — do not force local.
    EXPO_PUBLIC_STATIC: staticOrigin.replace(/\/?$/, "/"),
  },
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
