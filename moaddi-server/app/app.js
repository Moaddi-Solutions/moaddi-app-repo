// Load development environment.
require("dotenv").config({
  path: "./env/dev.env",
});
const express = require("express");
const jsonServer = require("json-server");
const app = express();
const http = require("http");
const socketIO = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const errorHandler = require("./utilities/error-handler");
const config = require("../config");
const mongodb = require("../app/data/db/mongodb");
const { handleSocketConnection } = require("./services/socket");
const authenticate = require("./routes/middlewares/authenticate");
const multer = require("multer");
var slugify = require("slugify");
const { stripeSetPaymentDone } = require("./data/repos/purchases");
const { updateExchangeRate } = require("./services/currency");
const { createWhatsAppClient } = require("./services/whatsapp");
const server = http.createServer(app);
const { registerChatSocket } = require("./services/chatSocket");
const io = socketIO(server, {
  cors: {
    origin: "*",
  },
});

app.all("*", (req, res, next) => {
  if (
    process.env.REQUEST_LOG === "1" ||
    process.env.NODE_ENV === "development"
  ) {
    console.log("Request received", req.url);
  }
  next();
});

// Webhook routes MUST be registered before global bodyParser.json() so that
// provider signature verification receives the raw request body.
app.use("/api/v1", require("./routes/webhooks"));

// Enable cors on all requests
app.use(cors());
app.options("*", cors());
app.use(function (req, res, next) {
  // res.header("Access-Control-Allow-Headers", "*");
  // res.header('Access-Control-Allow-Methods', '*');
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, ngrok-skip-browser-warning",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

// Static
app.use("/images", express.static("images"));

// Deep-link association files (Universal / App Links) + gift browser fallback.
// Mounted before helmet so the association JSON and landing HTML are served
// verbatim with no CSP/redirect interference.
app.use("/", require("./routes/deeplinks"));

// json-server
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
const uploads = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      callback(null, "public/");
    },
    filename(req, file, callback) {
      callback(null, `${Date.now()}_${slugify(file.originalname)}`);
    },
  }),
  fileFilter: async (req, file, callback) => {
    if (
      // !file.mimetype.match(/jpg|jpeg|png|webp|gif|pdf|doc|docs|xls|xlsx|txt$i/)
      !file.mimetype.startsWith("image/")
    ) {
      callback(new Error("File is not supported"), false);
      return;
    }
    callback(null, true);
  },
});
app.post(
  "/content/upload",
  authenticate(),
  uploads.array("images"),
  (req, res) => res.status(201).json({ files: req.files }),
);
app.use(
  "/content",
  (req, res, next) => {
    if (req.method == "GET") next();
    else authenticate()(req, res, next);
    if (req.path.startsWith("/db")) return res.end("404");
  },
  jsonServer.defaults({ static: "public" }),
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
  },
  (req, res, next) => {
    const router = jsonServer.router("db.json");
    // remove default error handeler
    router.stack = router.stack.filter((item) => item.handle.length !== 4);
    router(req, res, next);
  },
);

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------

// Secure requests.
app.use(helmet());

// Parse request body.
app.use(bodyParser.json({ limit: "50mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// HTTP GET Method
app.get("/test", async (req, res) => {
  if (
    process.env.REQUEST_LOG === "1" ||
    process.env.NODE_ENV === "development"
  ) {
    console.log("GET Request");
  }
  return res.status(200).json({
    msg: "Assalam-o-Alaikum Hello World! Welcome to JP Learning :) (ci cd worrrkssss)",
  });
});

// Socket.IO connection handling
global.io = io; // Make the io instance available globally
io.on("connection", handleSocketConnection);
setInterval(() => io.emit("time", new Date().toTimeString()), 30 * 1000);
registerChatSocket(io);

// API documentation (Swagger UI + raw spec) — payment endpoints only.
require("./openapi")(app);

// Load all routes.
require("./routes")(app);

// Handle invalid url.
app.use((req, res, next) => {
  res.status(404).json({
    statusCode: 404,
    message: "Requested url not found.",
  });
});

// Handle errors.
app.use((err, req, res, next) => {
  let error = errorHandler.handle(err);
  return res.status(error.statusCode).json(error);
});

const bootstrap = async () => {
  // MongoDB must be ready before MQTT subscribes — otherwise DeviceData handlers hit buffering timeouts.
  await mongodb.connect();

  // Ensure seed groups exist (machines may reference these IDs even if groups seed was never run).
  try {
    const { ensureSeedGroups } = require("../db/seeds/groups.seed");
    await ensureSeedGroups();
  } catch (err) {
    console.warn("ensureSeedGroups:", err.message);
  }

  // Ensure exchange rates exist before we accept requests (schema validators depend on this).
  await updateExchangeRate();

  setInterval(
    () => {
      // Keep refreshing in background; updateExchangeRate handles its own errors.
      updateExchangeRate();
    },
    1000 * 60 * 60 * 6,
  ); // 6 hours

  require("./services/mqtt");

  // Initialize WhatsApp client for OTP delivery.
  createWhatsAppClient();

  server.listen(config.port, "0.0.0.0", () => {
    console.log(`Server running on port ${config.port}`);
  });
};

bootstrap();

// Handle uncaught exceptions.
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception", err);
});

// Handle unhandled promise rejections.
process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection", err);
});
