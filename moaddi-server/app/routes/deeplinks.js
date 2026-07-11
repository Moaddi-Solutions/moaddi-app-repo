"use strict";

/*
 * Deep-link support for gift claim URLs.
 *
 * A gift link is `https://<this-host>/gift/<token>`. For the OS to open that
 * https URL directly in the Moaddi app (iOS Universal Links / Android App
 * Links) the app-association files below MUST be served from the SAME host,
 * over https, with no redirect:
 *
 *   /.well-known/apple-app-site-association   (iOS)
 *   /.well-known/assetlinks.json              (Android)
 *
 * Values come from env (left with obvious placeholders until issued):
 *   IOS_APP_ID                     e.g. "ABCDE12345.com.moaddi" (TeamID.bundleId)
 *   ANDROID_PACKAGE                e.g. "com.moaddi"
 *   ANDROID_SHA256_CERT_FINGERPRINTS  comma-separated SHA-256 signing certs
 *
 * When the app is NOT installed, tapping the link opens it in a browser and
 * this router serves a small landing page that tries the app, then offers a
 * fallback. WhatsApp only makes https text tappable — which is the whole point
 * of routing gift links through this host instead of a `moaddi://` scheme URL.
 */

const express = require("express");

const IOS_APP_ID = process.env.IOS_APP_ID || "TEAMID.com.moaddi";
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE || "com.moaddi";
const ANDROID_FINGERPRINTS = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
/** Custom-scheme deep link the browser fallback hands off to. */
const APP_SCHEME = process.env.APP_SCHEME || "moaddi";

const appleAppSiteAssociation = {
  applinks: {
    apps: [],
    details: [{ appID: IOS_APP_ID, paths: ["/gift/*"] }],
  },
};

const assetLinks = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: ANDROID_PACKAGE,
      sha256_cert_fingerprints: ANDROID_FINGERPRINTS,
    },
  },
];

/* Minimal, self-contained HTML shown only when the app isn't installed or the
 * OS didn't intercept the link. Immediately attempts the app, then shows a
 * button + store links (placeholders until store URLs exist). */
const landingHtml = (token) => {
  const safeToken = String(token).replace(/[^a-zA-Z0-9._-]/g, "");
  const appLink = `${APP_SCHEME}://gift/${safeToken}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your Moaddi gift</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f7f9;color:#0b1220;
       display:flex;min-height:100vh;margin:0;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border-radius:20px;padding:32px 24px;max-width:360px;width:100%;
        box-shadow:0 10px 30px rgba(0,0,0,.08);text-align:center}
  h1{font-size:20px;margin:0 0 8px} p{color:#5b6472;font-size:14px;margin:0 0 20px}
  a.btn{display:block;background:#0d9488;color:#fff;text-decoration:none;font-weight:600;
        padding:14px;border-radius:999px;margin-bottom:12px}
  a.muted{color:#0d9488;font-size:13px;text-decoration:none}
</style>
</head>
<body>
  <div class="card">
    <h1>🎁 You've got a gift!</h1>
    <p>Open it in the Moaddi app to collect your item at the machine.</p>
    <a class="btn" href="${appLink}">Open in Moaddi app</a>
    <a class="muted" href="${appLink}">Already installed? Tap here</a>
  </div>
  <script>
    // Try to hand off to the app immediately.
    setTimeout(function(){ window.location.href = ${JSON.stringify(appLink)}; }, 300);
  </script>
</body>
</html>`;
};

const router = express.Router();

// iOS Universal Links association. Must be application/json, no extension.
router.get("/.well-known/apple-app-site-association", (req, res) => {
  res.type("application/json").json(appleAppSiteAssociation);
});
// Some iOS versions historically fetched the root-level path too.
router.get("/apple-app-site-association", (req, res) => {
  res.type("application/json").json(appleAppSiteAssociation);
});

// Android App Links association.
router.get("/.well-known/assetlinks.json", (req, res) => {
  res.type("application/json").json(assetLinks);
});

// Browser fallback for gift links (app-installed case is intercepted by the OS).
router.get("/gift/:token", (req, res) => {
  res.type("html").send(landingHtml(req.params.token));
});

module.exports = router;
