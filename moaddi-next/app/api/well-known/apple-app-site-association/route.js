/*
 * iOS Universal Links association file, served at
 * `/.well-known/apple-app-site-association` via a rewrite in next.config.ts.
 *
 * Lets an https gift link (`https://<this-host>/gift/<token>`) open the Moaddi
 * app directly on the claim screen when installed; otherwise the web claim
 * page at app/(root)/gift/[token] renders. Mirrors the file served by
 * moaddi-server/app/routes/deeplinks.js for the legacy server-host links.
 */

const IOS_APP_ID = process.env.IOS_APP_ID || "VYHX753Y3N.com.moaddi";

// Runtime env read: credentials can change without a rebuild.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    applinks: {
      apps: [],
      details: [{ appID: IOS_APP_ID, paths: ["/gift/*"] }],
    },
  });
}
