"use strict";

/**
 * Isolated OpenAPI / Swagger UI mount module.
 *
 * Wires two routes onto the Express app:
 *   GET /openapi.json   — raw OpenAPI 3 spec (JSON)
 *   GET /api-docs       — Swagger UI
 *
 * Call once from app.js:  require("./openapi")(app);
 *
 * Helmet content-security-policy is relaxed only for the /api-docs path so
 * that Swagger UI can load its own inline scripts and styles.
 */

const path = require("path");
const swaggerUi = require("swagger-ui-express");
const SwaggerParser = require("@apidevtools/swagger-parser");

const SPEC_PATH = path.join(__dirname, "..", "docs", "openapi.yaml");

let specPromise;
const getSpec = async () => {
  if (!specPromise) {
    specPromise = SwaggerParser.bundle(SPEC_PATH);
  }
  return specPromise;
};

module.exports = (app) => {
  // Serve raw JSON spec — useful for codegen tools
  app.get("/openapi.json", async (req, res, next) => {
    try {
      res.setHeader("Content-Type", "application/json");
      res.json(await getSpec());
    } catch (error) {
      next(error);
    }
  });

  // Swagger UI — disable helmet CSP only for this prefix
  app.use("/api-docs", swaggerUi.serve);
  app.get(["/api-docs", "/api-docs/"], async (req, res, next) => {
    try {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
      );
      const spec = await getSpec();
      return swaggerUi.setup(spec, {
        customSiteTitle: "Moaddi Payment API",
        swaggerOptions: { persistAuthorization: true },
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  });
};
