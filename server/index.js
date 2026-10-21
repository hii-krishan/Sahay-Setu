
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

// Supabase authentication
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin(origin, callback) {
    const configuredOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
    const isLocalDevelopmentOrigin = origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (!origin || origin === configuredOrigin || isLocalDevelopmentOrigin) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin is not allowed by Sahay-Setu API CORS policy."));
  }
}));
app.use(express.json());

let client;
let database;
let databaseError;

const collectionNames = {
  reports: "emergencyReports",
  help: "helpRequests",
  volunteers: "volunteers",
  donations: "donations"
};

async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!supabase) {
    return res.status(503).json({
      success: false,
      message: "Authentication is not configured on the server."
    });
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Please sign in to continue."
    });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        message: "Your session is invalid or expired. Please sign in again."
      });
    }

    req.user = data.user;
    next();
  } catch (error) {
    console.error("Authentication verification failed:", error.message);

    return res.status(401).json({
      success: false,
      message: "Unable to verify your session. Please sign in again."
    });
  }
}

function createRequestId() {
  return `SS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

app.use("/api", (req, res, next) => {
  if (req.path === "/health") return next();
  if (!database) {
    return res.status(503).json({
      success: false,
      message: databaseError || "The database is connecting. Please try again shortly."
    });
  }
  next();
});

app.post(
  "/api/citizen/:kind",
  (req, res, next) => {
    const protectedKinds = ["help", "volunteers", "donations"];

    if (!protectedKinds.includes(req.params.kind)) {
      return next();
    }

    return requireAuth(req, res, next);
  },
  async (req, res) => {
  const collectionName = collectionNames[req.params.kind];
  if (!collectionName) return res.status(404).json({ success: false, message: "Unknown submission type." });
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: "A valid submission is required." });
  }

  try {
    const now = new Date();
    const record = {
      ...req.body,
      userId: req.user?.id || null,
      requestId:
        req.params.kind === "reports" || req.params.kind === "help"
          ? createRequestId()
          : undefined,
      status: "Submitted",
      createdAt: now,
      updatedAt: now
    };
    Object.keys(record).forEach(key => record[key] === undefined && delete record[key]);
    await database.collection(collectionName).insertOne(record);
    res.status(201).json({ success: true, requestId: record.requestId, record });
  } catch (error) {
    console.error("Citizen submission error:", error.message);
    res.status(500).json({ success: false, message: "Unable to save your submission. Please try again." });
  }
});


app.get("/api/requests/:requestId", async (req, res) => {
  try {
    const requestId = String(req.params.requestId || "")
      .trim()
      .toUpperCase();

    // Accept only IDs in the expected format.
    if (!/^SS-\d{4}-\d{4}$/.test(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid Request ID."
      });
    }

    const query = { requestId };

    const [report, helpRequest] = await Promise.all([
      database.collection(collectionNames.reports).findOne(query),
      database.collection(collectionNames.help).findOne(query)
    ]);

    const record = report || helpRequest;

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Request not found."
      });
    }

    // Return only fields approved for public tracking.
    const publicRecord = {
      requestId: record.requestId,
      status: record.status,
      type: record.type ?? record.emergencyType ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };

    return res.json({
      success: true,
      record: publicRecord
    });
  } catch (error) {
    console.error("Request lookup error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to look up this request right now."
    });
  }
});

app.get("/api/relief-resources", async (req, res) => {
  try {
    const filter = { active: { $ne: false } };
    const location = String(req.query.location || "").trim();
    if (location) {
      const safeLocation = location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.location = { $regex: safeLocation, $options: "i" };
    }
    const resources = await database.collection("reliefResources").find(filter)
      .project({ _id: 0 }).toArray();
    res.json({ success: true, resources });
  } catch (error) {
    console.error("Relief resource lookup error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load relief resources." });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    databaseReady: Boolean(database),
    databaseStatus: database ? "connected" : databaseError ? "unavailable" : "connecting",
    message: database ? "Sahay-Setu API and database are ready" : databaseError || "Sahay-Setu API is running; database connection is pending"
  });
});

async function startServer() {
  app.listen(PORT, () => console.log(`Sahay-Setu API listening on port ${PORT}`));
  if (!process.env.MONGODB_URI) {
    databaseError = "Database unavailable: MONGODB_URI is missing from .env.";
    console.error(databaseError);
    return;
  }

  let retryDelay = 5000;
  while (!database) {
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    try {
      await client.connect();
      const connectedDatabase = client.db("sahay_setu");
      await connectedDatabase.command({ ping: 1 });
      database = connectedDatabase;
      databaseError = null;
      console.log("MongoDB connected successfully");
    } catch (error) {
      const serverErrors = [...(error.reason?.servers?.values?.() || [])].flatMap(server => [server.error?.message, server.error?.cause?.message]);
      const errorMessages = [error.message, error.cause?.message, ...serverErrors].filter(Boolean);
      const isDnsFailure = error.code === "ENOTFOUND"
        || errorMessages.some(message => /querySrv (?:ETIMEOUT|ENOTFOUND)|getaddrinfo ENOTFOUND|ETIMEOUT/i.test(message));
      const isNetworkBlocked = error.code === "EACCES" || errorMessages.some(message => /EACCES/.test(message));
      const isTlsRejected = errorMessages.some(message => /tlsv1 alert internal error|ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR/i.test(message));
      databaseError = isDnsFailure
        ? "MongoDB Atlas hostname could not be resolved. Verify that MONGODB_URI uses the current connection string from Atlas."
        : isNetworkBlocked
          ? "This environment blocked the MongoDB connection. Run the API where outbound TCP port 27017 is allowed."
          : isTlsRejected
            ? "MongoDB rejected the TLS handshake. Check the Atlas IP access list and allow outbound TCP port 27017 from this computer."
            : "MongoDB connection failed. Check internet access, Atlas network access, and the configured database credentials.";
      console.error("MongoDB connection failed:");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);
      console.error("Error cause:", error.cause);
      console.error(`${databaseError} Retrying in ${Math.round(retryDelay / 1000)} seconds.`);
      await client.close().catch(() => { });
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      retryDelay = Math.min(retryDelay * 2, 30000);
    }
  }
}

startServer();
