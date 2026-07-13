import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const expoCli = path.join(root, "node_modules", "expo", "bin", "cli");

const productionOrigin = "https://server.moaddi-app.com/";

console.log(`\nUsing production backend: ${productionOrigin}\n`);

const child = spawn(process.execPath, [expoCli, "start", "--clear"], {
  cwd: root,
  env: {
    ...process.env,
    EXPO_PUBLIC_SERVER_ORIGIN: productionOrigin,
    EXPO_PUBLIC_STATIC: productionOrigin,
  },
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
