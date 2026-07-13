/*
 * Android App Links association file, served at `/.well-known/assetlinks.json`
 * via a rewrite in next.config.ts. Android verifies the domain against the
 * release signing cert fingerprints, then opens gift links in the Moaddi app.
 *
 * ANDROID_SHA256_CERT_FINGERPRINTS: comma-separated SHA-256 fingerprints of the
 * release signing key(s) (from `eas credentials` or Play Console → App
 * integrity). Until set, Android falls back to the web claim page.
 */

const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE || "com.moaddi";
const ANDROID_FINGERPRINTS = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Runtime env read: fingerprints can be filled without a rebuild.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: ANDROID_FINGERPRINTS,
      },
    },
  ]);
}
