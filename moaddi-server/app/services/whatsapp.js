const fs = require("fs");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const WINDOWS_CHROME =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const LINUX_CHROME_CANDIDATES = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/snap/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

const whatsapp = {
  client: null,
  isReady: false,
};

function resolveChromeExecutablePath() {
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }

  if (process.platform === "win32" && fs.existsSync(WINDOWS_CHROME)) {
    return WINDOWS_CHROME;
  }

  for (const candidate of LINUX_CHROME_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function buildPuppeteerOptions() {
  const executablePath = resolveChromeExecutablePath();
  const headless = process.env.WHATSAPP_HEADLESS !== "false";

  const options = {
    headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    timeout: 60000,
  };

  if (executablePath) {
    if (!fs.existsSync(executablePath)) {
      console.warn(
        `⚠️ CHROME_EXECUTABLE_PATH does not exist: ${executablePath}`,
      );
    } else {
      options.executablePath = executablePath;
      console.log(`🌐 WhatsApp Puppeteer using: ${executablePath}`);
    }
  } else {
    console.log(
      "🌐 WhatsApp Puppeteer: no system Chrome found; using bundled Chromium",
    );
  }

  return options;
}

function createWhatsAppClient() {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: buildPuppeteerOptions(),
  });

  whatsapp.client = client;

  client.on("qr", (qr) => {
    console.log("📱 Scan QR code to connect WhatsApp:");
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    whatsapp.isReady = true;
    console.log("✅ WhatsApp client is ready!");
  });

  client.on("disconnected", (reason) => {
    whatsapp.isReady = false;
    console.log("⚠️ WhatsApp client disconnected:", reason);
    console.log("🔄 Reconnecting in 5 seconds...");
    setTimeout(() => {
      createWhatsAppClient();
    }, 5000);
  });

  client.on("auth_failure", (msg) => {
    whatsapp.isReady = false;
    console.error("❌ WhatsApp auth failed:", msg);
    console.log("🔄 Retrying in 10 seconds...");
    setTimeout(() => {
      createWhatsAppClient();
    }, 10000);
  });

  client.initialize().catch((err) => {
    whatsapp.isReady = false;
    console.error("❌ WhatsApp initialization error:", err.message);
    console.log("🔄 Retrying in 10 seconds...");
    setTimeout(() => {
      createWhatsAppClient();
    }, 10000);
  });

  return client;
}

/**
 * Send a WhatsApp message to a number.
 * @param {string} number - Phone number without '+' (e.g. "201012345678")
 * @param {string} message - Text message to send
 */
async function sendWhatsAppMessage(number, message) {
  if (!whatsapp.isReady || !whatsapp.client) {
    throw new Error("WhatsApp client is not ready yet");
  }

  const numberDetails = await whatsapp.client.getNumberId(number);
  if (!numberDetails) {
    throw new Error("Number is not registered on WhatsApp");
  }

  await whatsapp.client.sendMessage(numberDetails._serialized, message);
}

module.exports = { whatsapp, createWhatsAppClient, sendWhatsAppMessage };
