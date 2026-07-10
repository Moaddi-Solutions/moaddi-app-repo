import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = "moaddi-app";
const productionOrigin = "https://server.moaddi-app.com/";

function listAdbDevices() {
  try {
    const out = execSync("adb devices", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return out
      .split("\n")
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildExpUrl(tunnelUrl) {
  return `exp+${slug}://expo-development-client/?url=${encodeURIComponent(tunnelUrl)}`;
}

function printConnectHelp(expUrl, tunnelUrl) {
  console.log(`
┌─────────────────────────────────────────────────────────────────┐
│  Connect your phone with the Moaddi DEVELOPMENT build           │
│  (not TestFlight / Play Store production)                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Open Moaddi dev app → "Enter URL manually"                  │
│  2. Paste this dev-client URL:                                  │
│     ${expUrl}
│                                                                 │
│  Or paste the tunnel URL directly:                              │
│     ${tunnelUrl}
│                                                                 │
│  Do NOT scan the terminal QR with iPhone Camera.                │
│  Do NOT open http://localhost:8081 in a browser.                │
│                                                                 │
│  If the URL above is missing, open http://127.0.0.1:4040        │
│  on this PC and copy the https forwarding URL.                  │
└─────────────────────────────────────────────────────────────────┘
`);
}

async function fetchNgrokTunnelUrl(maxAttempts = 40, delayMs = 500) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const res = await fetch("http://127.0.0.1:4040/api/tunnels");
      if (!res.ok) throw new Error(`ngrok API ${res.status}`);
      const data = await res.json();
      const tunnels = Array.isArray(data.tunnels) ? data.tunnels : [];
      const httpsTunnel =
        tunnels.find((t) => typeof t.public_url === "string" && t.public_url.startsWith("https://")) ??
        tunnels.find((t) => typeof t.public_url === "string");
      if (httpsTunnel?.public_url) return httpsTunnel.public_url.replace(/\/$/, "");
    } catch {
      // ngrok local API may not be ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}

function isPortInUse(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(400);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

async function pickMetroPort(preferred = 8081) {
  for (let port = preferred; port < preferred + 10; port += 1) {
    if (!(await isPortInUse(port))) return port;
  }
  return preferred + 1;
}

const blocked = listAdbDevices().filter((line) =>
  /\b(unauthorized|offline|authorizing)\b/i.test(line),
);

if (blocked.length > 0) {
  console.error("\nCannot start tunnel: Android device(s) block adb reverse:\n");
  for (const line of blocked) console.error(`  ${line}`);
  console.error(`
Fix (pick one):
  • Close the Android emulator / unplug the device
  • On the device, accept the "Allow USB debugging" prompt
  • Run: adb kill-server
  • For iOS-only testing, stop Android tools then retry: yarn dev:tunnel

`);
  process.exit(1);
}

function readDotEnv(key) {
  try {
    const text = fs.readFileSync(path.join(root, ".env"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      if (trimmed.slice(0, eq).trim() !== key) continue;
      return trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  } catch {
    // no .env
  }
  return null;
}

function readEnvOrigin() {
  const fromEnv =
    process.env.EXPO_PUBLIC_SERVER_ORIGIN?.trim() ||
    readDotEnv("EXPO_PUBLIC_SERVER_ORIGIN")?.trim();
  if (fromEnv) return fromEnv.replace(/\/?$/, "/");
  return productionOrigin;
}

const apiOrigin = readEnvOrigin();
const isLocalApi =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(
    apiOrigin,
  );

console.log(`\nAPI backend: ${apiOrigin}`);
if (isLocalApi) {
  console.log(
    "Remote phone cannot reach a LAN/local IP. Either use the same Wi‑Fi with `npm run dev:local`,",
  );
  console.log(
    "or expose moaddi-server with ngrok (`ngrok http 8085`) and set EXPO_PUBLIC_SERVER_ORIGIN to that https URL.\n",
  );
} else {
  console.log(
    "Tip: Use the Moaddi DEV app + manual URL. Do not open localhost:8081 in a browser.\n",
  );
}

const expoCli = path.join(root, "node_modules", "expo", "bin", "cli");
const metroPort = await pickMetroPort(8081);
if (metroPort !== 8081) {
  console.log(`Port 8081 is busy — using ${metroPort} instead.\n`);
}

const child = spawn(
  process.execPath,
  [expoCli, "start", "--clear", "--tunnel", "--dev-client", "--port", String(metroPort)],
  {
    cwd: root,
    env: {
      ...process.env,
      MOADDI_NATIVE_TUNNEL: "1",
    },
    stdio: ["inherit", "pipe", "pipe"],
  },
);

let connectHelpPrinted = false;
let tunnelReady = false;
let ngrokPollStarted = false;
let lastTunnelUrl = null;
let lastExpUrl = null;

function maybePrintConnectHelp() {
  if (connectHelpPrinted) return;

  const tunnelUrl = lastTunnelUrl;
  const expUrl = lastExpUrl ?? (tunnelUrl ? buildExpUrl(tunnelUrl) : null);

  if (!tunnelUrl && !expUrl) return;
  if (!tunnelReady && !expUrl) return;

  connectHelpPrinted = true;
  printConnectHelp(
    expUrl ?? buildExpUrl(tunnelUrl),
    tunnelUrl ??
      decodeURIComponent(expUrl?.match(/url=([^&\s]+)/)?.[1] ?? ""),
  );
}

function startNgrokPoll() {
  if (ngrokPollStarted) return;
  ngrokPollStarted = true;

  fetchNgrokTunnelUrl()
    .then((url) => {
      if (url) {
        lastTunnelUrl = url;
        if (!lastExpUrl) lastExpUrl = buildExpUrl(url);
      }
      maybePrintConnectHelp();
      if (!lastTunnelUrl && tunnelReady) {
        console.warn(
          "\nCould not read tunnel URL automatically. Open http://127.0.0.1:4040 and paste the https URL into the dev app.\n",
        );
      }
    })
    .catch(() => {
      console.warn(
        "\nCould not read tunnel URL automatically. Open http://127.0.0.1:4040 and paste the https URL into the dev app.\n",
      );
    });
}

function parseOutput(text) {
  if (text.includes("Tunnel ready") || text.includes("Tunnel connected")) {
    tunnelReady = true;
    startNgrokPoll();
  }

  const expMatch = text.match(/exp\+[^\s]+expo-development-client[^\s]+/);
  if (expMatch) lastExpUrl = expMatch[0].trim();

  for (const pattern of [
    /Metro waiting on\s+(.+)/,
    /Waiting on\s+(exp\+[^\s]+)/,
    /Waiting on\s+(https:\/\/[^\s]+)/,
  ]) {
    const match = text.match(pattern);
    if (!match) continue;
    const line = match[1].trim();
    if (line.startsWith("exp+")) lastExpUrl = line;
    if (line.startsWith("https://")) lastTunnelUrl = line.replace(/\/$/, "");
  }

  const tunnelMatch = text.match(/https:\/\/[a-z0-9-]+[^\s]*\.exp\.direct\/?/i);
  if (tunnelMatch) lastTunnelUrl = tunnelMatch[0].replace(/\/$/, "");

  maybePrintConnectHelp();
}

function handleOutput(chunk, stream) {
  const text = chunk.toString();
  stream.write(chunk);
  parseOutput(text);
}

child.stdout.on("data", (chunk) => handleOutput(chunk, process.stdout));
child.stderr.on("data", (chunk) => handleOutput(chunk, process.stderr));

child.on("exit", (code) => process.exit(code ?? 0));
