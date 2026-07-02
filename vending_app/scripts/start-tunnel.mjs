import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = "moaddi-app";

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
│  Connect your iPhone DEVELOPMENT build (not TestFlight prod)  │
├─────────────────────────────────────────────────────────────────┤
│  1. Open Moaddi dev app → "Enter URL manually"                  │
│  2. Paste tunnel URL:                                             │
│     ${tunnelUrl}
│                                                                 │
│  Or paste in Safari:                                            │
│     ${expUrl}
│                                                                 │
│  Do NOT use iPhone Camera on the QR code.                       │
│  Do NOT open http://localhost:8081 in a browser (web errors).  │
└─────────────────────────────────────────────────────────────────┘
`);
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

console.log(
  "\nTip: Use the Moaddi DEV app + manual URL. Do not open localhost:8081 in a browser.\n",
);

const expoCli = path.join(root, "node_modules", "expo", "bin", "cli");

const child = spawn(process.execPath, [expoCli, "start", "--clear", "--tunnel", "--dev-client"], {
  cwd: root,
  env: { ...process.env, MOADDI_NATIVE_TUNNEL: "1" },
  stdio: ["inherit", "pipe", "pipe"],
});

let connectHelpPrinted = false;
let tunnelReady = false;
let lastTunnelUrl = null;
let lastExpUrl = null;

function maybePrintConnectHelp() {
  if (connectHelpPrinted) return;

  const tunnelUrl = lastTunnelUrl;
  const expUrl =
    lastExpUrl ?? (tunnelUrl ? buildExpUrl(tunnelUrl) : null);

  if (!tunnelUrl && !expUrl) return;
  if (!tunnelReady && !expUrl) return;

  connectHelpPrinted = true;
  printConnectHelp(expUrl ?? buildExpUrl(tunnelUrl), tunnelUrl ?? decodeURIComponent(
    expUrl?.match(/url=([^&\s]+)/)?.[1] ?? "",
  ));
}

function handleOutput(chunk, stream) {
  const text = chunk.toString();
  stream.write(chunk);

  if (text.includes("Tunnel ready")) tunnelReady = true;

  const expMatch = text.match(/exp\+[^\s]+expo-development-client[^\s]+/);
  if (expMatch) lastExpUrl = expMatch[0].trim();

  const waiting = text.match(/Metro waiting on\s+(.+)/);
  if (waiting) {
    const line = waiting[1].trim();
    if (line.startsWith("exp+")) lastExpUrl = line;
  }

  const tunnelMatch = text.match(/https:\/\/[a-z0-9-]+[^\s]*\.exp\.direct/);
  if (tunnelMatch) lastTunnelUrl = tunnelMatch[0];

  maybePrintConnectHelp();
}

child.stdout.on("data", (chunk) => handleOutput(chunk, process.stdout));
child.stderr.on("data", (chunk) => handleOutput(chunk, process.stderr));

child.on("exit", (code) => process.exit(code ?? 0));
