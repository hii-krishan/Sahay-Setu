
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const { randomBytes } = require("node:crypto");
require("dotenv").config();

// Supabase authentication
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const app = express();
const PORT = process.env.PORT || 5001;

const configuredOrigins = (process.env.FRONTEND_URL || "http://localhost:5175")
  .split(",").map(value => value.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    const isLocalDevelopmentOrigin = process.env.NODE_ENV !== "production"
      && origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (!origin || configuredOrigins.includes(origin) || isLocalDevelopmentOrigin) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin is not allowed by Sahay-Setu API CORS policy."));
  }
}));
if (process.env.TRUST_PROXY_HOPS && /^\d+$/.test(process.env.TRUST_PROXY_HOPS)) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
}
app.use(express.json({ limit: "32kb" }));

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
  return `SS-${new Date().getFullYear()}-${randomBytes(16).toString("hex").toUpperCase()}`;
}

// A small per-process limiter for the public tracking endpoint. Multiple API
// instances should use a shared store before deployment.
const trackingAttempts = new Map();
function limitTracking(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 30;
  let entry = trackingAttempts.get(key);
  if (!entry || now >= entry.resetAt) entry = { count: 0, resetAt: now + windowMs };
  entry.count += 1;
  trackingAttempts.set(key, entry);
  if (trackingAttempts.size > 5000) {
    for (const [ip, attempt] of trackingAttempts) if (now >= attempt.resetAt) trackingAttempts.delete(ip);
  }
  res.set("RateLimit-Limit", String(maxAttempts));
  res.set("RateLimit-Remaining", String(Math.max(0, maxAttempts - entry.count)));
  if (entry.count > maxAttempts) {
    res.set("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    return res.status(429).json({ success: false, message: "Too many tracking attempts. Please try again later." });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    const metadata = req.user?.app_metadata || {};
    const roles = Array.isArray(metadata.roles) ? metadata.roles : [metadata.role].filter(Boolean);
    const authorized = roles.includes(role)
      && (role !== "ngo" || metadata.ngo_verified === true);
    if (!authorized) return res.status(403).json({ success: false, message: `An authorized ${role} account is required.` });
    next();
  };
}

function safeRequestId(value) {
  const requestId = String(value || "").trim().toUpperCase();
  return /^SS-\d{4}-(?:\d{4}|[A-F0-9]{8}|[A-F0-9]{16}|[A-F0-9]{32})$/.test(requestId) ? requestId : null;
}

const categoryNames = new Map([
    ["flood", "Flood"], ["earthquake", "Earthquake"], ["fire", "Fire"], ["cyclone", "Cyclone"],
    ["building collapse", "Building Collapse"], ["heatwave", "Heatwave"], ["landslide", "Landslide"],
    ["chemical industrial", "Chemical / Industrial"], ["road accident", "Road Accident"], ["other emergency", "Other Emergency"],
    ["food", "Food"], ["water", "Water"], ["shelter", "Shelter"], ["medical", "Medical Aid"], ["medicine", "Medicine"], ["rescue", "Rescue"], ["clothing", "Clothing"], ["transport", "Transport"]
]);

function safeRequestType(record) {
  const candidate = record.type ?? record.emergencyType ?? record.helpTypes;
  const rawCategories = Array.isArray(candidate) ? candidate : String(candidate || "").split(",");
  return rawCategories.map(value => categoryNames.get(String(value).toLowerCase().replace(/[^a-z ]/g, "").trim())).filter(Boolean).join(", ") || null;
}

function publicTrackingRecord(record) {
  const allowedStatuses = new Set(["Submitted", "Under Review", "In Progress", "Resolved"]);
  const status = allowedStatuses.has(record.status) ? record.status : "Submitted";
  return {
    requestId: record.requestId,
    status,
    type: safeRequestType(record),
    createdAt: record.createdAt instanceof Date || typeof record.createdAt === "string" ? record.createdAt : null,
    updatedAt: record.updatedAt instanceof Date || typeof record.updatedAt === "string" ? record.updatedAt : null
  };
}

function operationalRequest(record) {
  const urgencySeverity = { yes: "critical", soon: "high", today: "medium", planning: "low" };
  const rawSeverity = String(record.severity ?? record.urgency ?? "").toLowerCase();
  const severity = ["critical", "high", "medium", "low"].includes(rawSeverity)
    ? rawSeverity
    : urgencySeverity[rawSeverity] || null;
  return {
    requestId: record.requestId,
    status: record.status || "Submitted",
    type: safeRequestType(record) || "Other",
    severity,
    location: record.location || null,
    peopleAffected: record.peopleAffected ?? record.people ?? null,
    description: record.description ?? record.details ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function coarseArea(value) {
  const parts = String(value || "").split(",").map(part => part.trim()).filter(Boolean);
  const states = new Set(["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh"]);
  const state = parts.at(-1);
  return states.has(state) ? state : "Area withheld until assignment";
}

app.use("/api/requests", limitTracking);
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

  const submissionFields = {
    reports: ["name", "phone", "type", "location", "severity", "peopleAffected", "injuries", "description", "alternateContact"],
    help: ["name", "location", "helpTypes", "people", "urgency", "details"],
    volunteers: ["name", "age", "phone", "email", "location", "skills", "availability", "organizationId"],
    donations: ["amount", "currency", "destination", "organizationId"]
  }[req.params.kind];
  const submission = Object.fromEntries(submissionFields.map(field => [field, req.body[field]]).filter(([, value]) => value !== undefined));
  const hasText = (field, max) => typeof submission[field] === "string" && submission[field].trim().length > 0 && submission[field].trim().length <= max;
  const validEmail = value => typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const validPhone = value => typeof value === "string" && /^[+0-9()\-\s]{7,32}$/.test(value);
  let validSubmission = false;
  if (req.params.kind === "reports") {
    validSubmission = hasText("name", 160) && validPhone(submission.phone) && hasText("location", 300)
      && hasText("description", 2000) && Boolean(safeRequestType({ type: submission.type }))
      && ["critical", "high", "medium", "low"].includes(submission.severity)
      && (submission.injuries === undefined || ["None", "Minor (1–5)", "Moderate (6–20)", "Severe (20+)", "Unknown"].includes(submission.injuries))
      && (submission.alternateContact === undefined || (typeof submission.alternateContact === "string" && submission.alternateContact.length <= 300))
      && (submission.peopleAffected == null || (Number.isSafeInteger(submission.peopleAffected) && submission.peopleAffected >= 1 && submission.peopleAffected <= 1000000));
  } else if (req.params.kind === "help") {
    validSubmission = hasText("name", 160) && hasText("location", 300)
      && (submission.details === undefined || (typeof submission.details === "string" && submission.details.length <= 2000))
      && Array.isArray(submission.helpTypes) && submission.helpTypes.length > 0 && submission.helpTypes.length <= 12
      && submission.helpTypes.every(value => ["food", "water", "medicine", "shelter", "clothing", "rescue", "medical", "transport"].includes(value))
      && Number.isSafeInteger(submission.people) && submission.people >= 1 && submission.people <= 1000000
      && ["yes", "soon", "today", "planning"].includes(submission.urgency);
  } else if (req.params.kind === "volunteers") {
    validSubmission = hasText("name", 160) && validPhone(submission.phone)
      && (submission.email === undefined || submission.email === "" || validEmail(submission.email))
      && hasText("location", 300) && Number.isSafeInteger(submission.age) && submission.age >= 18 && submission.age <= 120
      && Array.isArray(submission.skills) && submission.skills.length <= 20
      && submission.skills.every(value => typeof value === "string" && value.length <= 80)
      && hasText("availability", 120);
  } else if (req.params.kind === "donations") {
    validSubmission = Number.isFinite(submission.amount) && submission.amount >= 10 && submission.amount <= 100000000
      && submission.currency === "INR" && hasText("destination", 160)
      && (submission.destination === undefined || submission.destination.length <= 160);
  }
  if (!validSubmission) return res.status(400).json({ success: false, message: "Some submission fields are missing or invalid. Please review the form and try again." });

  if (["volunteers", "donations"].includes(req.params.kind) && submission.organizationId !== undefined) {
    if (typeof submission.organizationId !== "string" || !/^[a-f0-9]{24}$/i.test(submission.organizationId)) {
      return res.status(400).json({ success: false, message: "Choose a valid verified organization or leave the organization unselected." });
    }
  }

  try {
    let associatedNgoId;
    if (["volunteers", "donations"].includes(req.params.kind) && submission.organizationId) {
      const application = await database.collection("ngoApplications").findOne({
        publicId: submission.organizationId,
        status: "Approved"
      }, { projection: { userId: 1 } });
      if (!application?.userId) return res.status(400).json({ success: false, message: "That organization is not currently approved to receive associations." });
      associatedNgoId = application.userId;
    }
    delete submission.organizationId;
    const now = new Date();
    let requestId;
    if (req.params.kind === "reports" || req.params.kind === "help") {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = createRequestId();
        const [existingReport, existingHelp] = await Promise.all([
          database.collection(collectionNames.reports).findOne({ requestId: candidate }, { projection: { _id: 1 } }),
          database.collection(collectionNames.help).findOne({ requestId: candidate }, { projection: { _id: 1 } })
        ]);
        if (!existingReport && !existingHelp) { requestId = candidate; break; }
      }
      if (!requestId) return res.status(503).json({ success: false, message: "Unable to allocate a request ID right now. Please try again." });
    }
    const record = {
      ...submission,
      userId: req.user?.id || null,
      ...(associatedNgoId ? { ngoId: associatedNgoId } : {}),
      requestId,
      status: "Submitted",
      createdAt: now,
      updatedAt: now
    };
    Object.keys(record).forEach(key => record[key] === undefined && delete record[key]);
    await database.collection(collectionName).insertOne(record);
    res.status(201).json({ success: true, requestId: record.requestId, status: record.status });
  } catch (error) {
    console.error("Citizen submission error:", error.message);
    res.status(500).json({ success: false, message: "Unable to save your submission. Please try again." });
  }
});


app.get("/api/requests/:requestId", async (req, res) => {
  try {
    const requestId = safeRequestId(req.params.requestId);
    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid Request ID."
      });
    }

    const query = { requestId };

    const [report, helpRequest] = await Promise.all([
      database.collection(collectionNames.reports).findOne(query, { projection: { _id: 0, requestId: 1, type: 1, emergencyType: 1, helpTypes: 1, status: 1, createdAt: 1, updatedAt: 1 } }),
      database.collection(collectionNames.help).findOne(query, { projection: { _id: 0, requestId: 1, type: 1, emergencyType: 1, helpTypes: 1, status: 1, createdAt: 1, updatedAt: 1 } })
    ]);

    const record = report || helpRequest;

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Request not found."
      });
    }

    return res.json({
      success: true,
      record: publicTrackingRecord(record)
    });
  } catch (error) {
    console.error("Request lookup error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to look up this request right now."
    });
  }
});

app.get("/api/ngo/dashboard", requireAuth, requireRole("ngo"), async (req, res) => {
  try {
    const [requests, resources, volunteers, donations, camps] = await Promise.all([
      database.collection(collectionNames.help).find({ $or: [
        { assignedNgoId: req.user.id },
        { assignedNgoId: null, status: "Submitted" }
      ] }).sort({ createdAt: -1 }).limit(100).toArray(),
      database.collection("reliefResources").find({ ngoId: req.user.id }).project({ name: 1, type: 1, label: 1, location: 1, distance: 1, details: 1, status: 1, active: 1, quantity: 1, available: 1, allocated: 1, total: 1, source: 1 }).toArray(),
      database.collection(collectionNames.volunteers).find({ ngoId: req.user.id }).sort({ createdAt: -1 }).limit(100).toArray(),
      database.collection(collectionNames.donations).find({ ngoId: req.user.id }).sort({ createdAt: -1 }).limit(100).toArray(),
      database.collection("reliefCamps").find({ ngoId: req.user.id }).sort({ createdAt: -1 }).limit(100).toArray()
    ]);
    res.json({
      success: true,
      requests: requests.map(request => request.assignedNgoId === req.user.id
        ? operationalRequest(request)
        : { requestId: request.requestId, status: request.status || "Submitted", type: safeRequestType(request) || "Help request", severity: operationalRequest(request).severity, location: coarseArea(request.location), peopleAffected: request.peopleAffected ?? request.people ?? null, createdAt: request.createdAt }),
      resources: resources.map(({ _id, ...resource }) => ({ ...resource, id: _id.toString() })),
      volunteers: volunteers.map(({ name, skills, location, availability, status, createdAt }) => ({ name, skills, location, availability, status, createdAt })),
      donations: donations.map(({ amount, currency, destination, status, createdAt }) => ({ amount, currency, destination, status, createdAt })),
      camps: camps.map(({ _id, name, location, capacity, disasterType, status, createdAt }) => ({ id: _id.toString(), name, location, capacity, disasterType, status, createdAt }))
    });
  } catch (error) {
    console.error("NGO dashboard lookup error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load NGO operations." });
  }
});

app.get("/api/ngo/application", requireAuth, async (req, res) => {
  try {
    const application = await database.collection("ngoApplications").findOne({ userId: req.user.id }, {
      projection: { _id: 0, organizationName: 1, status: 1, createdAt: 1, updatedAt: 1, reviewedAt: 1 }
    });
    res.json({ success: true, application: application || null });
  } catch (error) {
    console.error("NGO application status lookup error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load NGO application status." });
  }
});

app.get("/api/public/ngos", async (_req, res) => {
  try {
    const collection = database.collection("ngoApplications");
    const approved = await collection.find({ status: "Approved" }).sort({ organizationName: 1 }).limit(500)
      .project({ _id: 1, publicId: 1, organizationName: 1, location: 1, specialties: 1 }).toArray();
    const organizations = await Promise.all(approved.map(async application => {
      if (!application.publicId) {
        const publicId = randomBytes(12).toString("hex");
        await collection.updateOne({ _id: application._id, $or: [{ publicId: { $exists: false } }, { publicId: null }] }, { $set: { publicId } });
        const refreshed = await collection.findOne({ _id: application._id }, { projection: { publicId: 1 } });
        application.publicId = refreshed?.publicId;
      }
      if (!/^[a-f0-9]{24}$/i.test(application.publicId || "")) return null;
      return { publicId: application.publicId, organizationName: application.organizationName, location: application.location, specialties: application.specialties || [] };
    }));
    res.json({ success: true, organizations: organizations.filter(Boolean) });
  } catch (error) {
    console.error("Public NGO directory lookup error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load verified organizations." });
  }
});

app.get("/api/public/summary", async (_req, res) => {
  try {
    const [openReports, openHelp, resolvedReports, resolvedHelp, ngos, volunteers] = await Promise.all([
      database.collection(collectionNames.reports).countDocuments({ status: { $ne: "Resolved" } }),
      database.collection(collectionNames.help).countDocuments({ status: { $ne: "Resolved" } }),
      database.collection(collectionNames.reports).countDocuments({ status: "Resolved" }),
      database.collection(collectionNames.help).countDocuments({ status: "Resolved" }),
      database.collection("ngoApplications").countDocuments({ status: "Approved" }),
      database.collection(collectionNames.volunteers).countDocuments({})
    ]);
    res.json({ success: true, summary: { activeRequests: openReports + openHelp, approvedNgos: ngos, volunteers, resolved: resolvedReports + resolvedHelp } });
  } catch (error) {
    console.error("Public summary lookup error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load current platform summary." });
  }
});

app.get("/api/public/alerts", async (_req, res) => {
  try {
    const alerts = await database.collection("alerts").find({ status: "Active" }).sort({ createdAt: -1 }).limit(20)
      .project({ _id: 0, title: 1, type: 1, area: 1, severity: 1, createdAt: 1 }).toArray();
    res.json({ success: true, alerts });
  } catch (error) {
    console.error("Public alert lookup error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load current alerts." });
  }
});

app.post("/api/ngo/applications", requireAuth, async (req, res) => {
  const organizationName = String(req.body?.organizationName || "").trim().slice(0, 160);
  const location = String(req.body?.location || "").trim().slice(0, 160);
  const registrationNumber = String(req.body?.registrationNumber || "").trim().slice(0, 80);
  const specialties = Array.isArray(req.body?.specialties)
    ? req.body.specialties.filter(value => typeof value === "string").map(value => value.trim().slice(0, 60)).filter(Boolean).slice(0, 8)
    : [];
  if (!organizationName || !location || !registrationNumber || !specialties.length) {
    return res.status(400).json({ success: false, message: "Provide the organization name, location, registration number, and at least one specialty." });
  }
  try {
    const existing = await database.collection("ngoApplications").findOne({ userId: req.user.id }, { projection: { _id: 1, status: 1 } });
    if (existing) return res.status(409).json({ success: false, message: "An NGO application already exists for this account." });
    // A user-derived _id makes repeat submissions atomic even without a new
    // database index; existing ObjectId-based application records remain valid.
    const application = { _id: `user:${req.user.id}`, userId: req.user.id, publicId: randomBytes(12).toString("hex"), organizationName, location, registrationNumber, specialties, status: "Pending", createdAt: new Date(), updatedAt: new Date() };
    const result = await database.collection("ngoApplications").insertOne(application);
    res.status(201).json({ success: true, applicationId: result.insertedId.toString(), status: application.status });
  } catch (error) {
    console.error("NGO application error:", error.message);
    res.status(500).json({ success: false, message: "Unable to submit the NGO application." });
  }
});

app.post("/api/ngo/resources", requireAuth, requireRole("ngo"), async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 120);
  const quantity = Number(req.body?.quantity);
  if (!name || !Number.isFinite(quantity) || quantity < 0) return res.status(400).json({ success: false, message: "Provide a resource name and a nonnegative quantity." });
  try {
    const resource = { name, type: String(req.body?.type || "Other").slice(0, 80), quantity, available: quantity, allocated: 0, total: quantity, source: String(req.body?.source || "").trim().slice(0, 120), status: "AVAILABLE", active: true, ngoId: req.user.id, createdAt: new Date(), updatedAt: new Date() };
    await database.collection("reliefResources").insertOne(resource);
    res.status(201).json({ success: true, resource: { name: resource.name, type: resource.type, quantity: resource.quantity, available: resource.available, allocated: resource.allocated, total: resource.total, status: resource.status } });
  } catch (error) {
    console.error("NGO resource creation error:", error.message);
    res.status(500).json({ success: false, message: "Unable to add this resource." });
  }
});

app.patch("/api/ngo/resources/:resourceId/active", requireAuth, requireRole("ngo"), async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.resourceId)) return res.status(400).json({ success: false, message: "Invalid resource ID." });
  if (typeof req.body?.active !== "boolean") return res.status(400).json({ success: false, message: "Active must be true or false." });
  try {
    const result = await database.collection("reliefResources").findOneAndUpdate(
      { _id: new ObjectId(req.params.resourceId), ngoId: req.user.id },
      { $set: { active: req.body.active, status: req.body.active ? "AVAILABLE" : "INACTIVE", updatedAt: new Date() } },
      { returnDocument: "after", projection: { _id: 1, active: 1, status: 1 } }
    );
    if (!result) return res.status(404).json({ success: false, message: "Resource not found for this organization." });
    res.json({ success: true, resource: { id: result._id.toString(), active: result.active, status: result.status } });
  } catch (error) {
    console.error("NGO resource status error:", error.message);
    res.status(500).json({ success: false, message: "Unable to update this resource." });
  }
});

app.post("/api/ngo/camps", requireAuth, requireRole("ngo"), async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 160);
  const location = String(req.body?.location || "").trim().slice(0, 240);
  const capacity = Number(req.body?.capacity);
  if (!name || !location || !Number.isInteger(capacity) || capacity < 1) return res.status(400).json({ success: false, message: "Provide a camp name, location, and positive bed capacity." });
  try {
    const camp = { name, location, capacity, disasterType: String(req.body?.disasterType || "Other").slice(0, 80), status: "Active", ngoId: req.user.id, createdAt: new Date(), updatedAt: new Date() };
    await database.collection("reliefCamps").insertOne(camp);
    res.status(201).json({ success: true, camp: { name: camp.name, location: camp.location, capacity: camp.capacity, disasterType: camp.disasterType, status: camp.status, createdAt: camp.createdAt } });
  } catch (error) {
    console.error("NGO camp creation error:", error.message);
    res.status(500).json({ success: false, message: "Unable to create this camp." });
  }
});

app.patch("/api/ngo/camps/:campId/status", requireAuth, requireRole("ngo"), async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.campId)) return res.status(400).json({ success: false, message: "Invalid camp ID." });
  const status = String(req.body?.status || "");
  if (!["Active", "Closed"].includes(status)) return res.status(400).json({ success: false, message: "Status must be Active or Closed." });
  try {
    const result = await database.collection("reliefCamps").findOneAndUpdate(
      { _id: new ObjectId(req.params.campId), ngoId: req.user.id },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after", projection: { _id: 1, status: 1 } }
    );
    if (!result) return res.status(404).json({ success: false, message: "Camp not found for this organization." });
    res.json({ success: true, camp: { id: result._id.toString(), status: result.status } });
  } catch (error) {
    console.error("NGO camp status error:", error.message);
    res.status(500).json({ success: false, message: "Unable to update this camp." });
  }
});

app.patch("/api/ngo/requests/:requestId/status", requireAuth, requireRole("ngo"), async (req, res) => {
  const requestId = safeRequestId(req.params.requestId);
  const status = String(req.body?.status || "");
  if (!requestId) return res.status(400).json({ success: false, message: "Please enter a valid Request ID." });
  if (!["In Progress", "Resolved"].includes(status)) return res.status(400).json({ success: false, message: "Status must be In Progress or Resolved." });
  try {
    const now = new Date();
    const statusFilter = status === "In Progress"
      ? { requestId, status: "Submitted", assignedNgoId: null }
      : { requestId, status: "In Progress", assignedNgoId: req.user.id };
    const updates = { status, updatedAt: now, lastUpdatedBy: req.user.id };
    if (status === "In Progress") updates.assignedNgoId = req.user.id;
    const result = await database.collection(collectionNames.help).findOneAndUpdate(
      statusFilter, { $set: updates }, { returnDocument: "after" }
    );
    if (!result) {
      const exists = await database.collection(collectionNames.help).findOne({ requestId }, { projection: { _id: 1 } });
      return res.status(exists ? 409 : 404).json({ success: false, message: exists ? "This request is already assigned or cannot make that status transition." : "Help request not found." });
    }
    res.json({ success: true, request: operationalRequest(result) });
  } catch (error) {
    console.error("NGO request update error:", error.message);
    res.status(500).json({ success: false, message: "Unable to update this request." });
  }
});

app.get("/api/government/dashboard", requireAuth, requireRole("government"), async (req, res) => {
  try {
    const [reports, helpRequests, resources, reportCount, helpRequestCount] = await Promise.all([
      database.collection(collectionNames.reports).find({}).sort({ createdAt: -1 }).limit(200).toArray(),
      database.collection(collectionNames.help).find({}).sort({ createdAt: -1 }).limit(200).toArray(),
      database.collection("reliefResources").countDocuments({ active: { $ne: false } }),
      database.collection(collectionNames.reports).countDocuments({}),
      database.collection(collectionNames.help).countDocuments({})
    ]);
    res.json({ success: true, reports: reports.map(operationalRequest), requests: helpRequests.map(operationalRequest), summary: { reports: reportCount, helpRequests: helpRequestCount, availableResources: resources } });
  } catch (error) {
    console.error("Government dashboard lookup error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load government operations." });
  }
});

app.get("/api/government/ngos", requireAuth, requireRole("government"), async (_req, res) => {
  try {
    const applications = await database.collection("ngoApplications").find({}).sort({ createdAt: -1 }).limit(500)
      .project({ organizationName: 1, location: 1, specialties: 1, registrationNumber: 1, status: 1, createdAt: 1, reviewedAt: 1 }).toArray();
    res.json({ success: true, applications: applications.map(application => ({ ...application, _id: application._id.toString() })) });
  } catch (error) {
    console.error("Government NGO review lookup error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load NGO applications." });
  }
});

app.patch("/api/government/ngos/:applicationId/status", requireAuth, requireRole("government"), async (req, res) => {
  const { applicationId } = req.params;
  const status = String(req.body?.status || "");
  const applicationKey = ObjectId.isValid(applicationId)
    ? new ObjectId(applicationId)
    : applicationId.startsWith("user:") && applicationId.length <= 100 ? applicationId : null;
  if (!applicationKey) return res.status(400).json({ success: false, message: "Invalid NGO application ID." });
  if (!["Approved", "Rejected"].includes(status)) return res.status(400).json({ success: false, message: "Choose Approved or Rejected." });
  try {
    const result = await database.collection("ngoApplications").findOneAndUpdate(
      { _id: applicationKey, status: "Pending" },
      { $set: { status, reviewedAt: new Date(), reviewedBy: req.user.id, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!result) {
      const exists = await database.collection("ngoApplications").findOne({ _id: applicationKey }, { projection: { _id: 1 } });
      return res.status(exists ? 409 : 404).json({ success: false, message: exists ? "This application has already been reviewed." : "NGO application not found." });
    }
    res.json({ success: true, application: { id: result._id.toString(), status: result.status, reviewedAt: result.reviewedAt } });
  } catch (error) {
    console.error("Government NGO review update error:", error.message);
    res.status(500).json({ success: false, message: "Unable to update the NGO application." });
  }
});

app.get("/api/government/operations", requireAuth, requireRole("government"), async (_req, res) => {
  try {
    const [reports, requests, camps, alerts, resources, openReportCount, openRequestCount, activeCampCount, activeAlertCount, activeTypeGroups] = await Promise.all([
      database.collection(collectionNames.reports).find({ status: { $ne: "Resolved" } }).sort({ createdAt: -1 }).limit(100).toArray(),
      database.collection(collectionNames.help).find({ status: { $ne: "Resolved" } }).sort({ createdAt: -1 }).limit(100).toArray(),
      database.collection("reliefCamps").find({ status: { $ne: "Closed" } }).sort({ createdAt: -1 }).limit(100).project({ _id: 0, name: 1, location: 1, capacity: 1, disasterType: 1, status: 1 }).toArray(),
      database.collection("alerts").find({ status: "Active" }).sort({ createdAt: -1 }).limit(100).project({ _id: 0, title: 1, area: 1, severity: 1, status: 1, createdAt: 1 }).toArray(),
      database.collection("reliefResources").aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ["$total", "$quantity"] } }, available: { $sum: { $ifNull: ["$available", "$quantity"] } } } }]).toArray(),
      database.collection(collectionNames.reports).countDocuments({ status: { $ne: "Resolved" } }),
      database.collection(collectionNames.help).countDocuments({ status: { $ne: "Resolved" } }),
      database.collection("reliefCamps").countDocuments({ status: { $ne: "Closed" } }),
      database.collection("alerts").countDocuments({ status: "Active" }),
      database.collection(collectionNames.reports).aggregate([{ $match: { status: { $ne: "Resolved" } } }, { $group: { _id: { $ifNull: ["$type", { $ifNull: ["$emergencyType", "Other"] }] } } }]).toArray()
    ]);
    res.json({
      success: true,
      reports: reports.map(operationalRequest),
      requests: requests.map(operationalRequest),
      camps,
      alerts,
      resourceSummary: resources[0] ? { total: resources[0].total, available: resources[0].available } : { total: 0, available: 0 },
      summary: { openReports: openReportCount, openRequests: openRequestCount, activeCamps: activeCampCount, activeAlerts: activeAlertCount, activeDisasterTypes: activeTypeGroups.length }
    });
  } catch (error) {
    console.error("Government operations lookup error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load relief operations." });
  }
});

app.get("/api/government/analytics", requireAuth, requireRole("government"), async (_req, res) => {
  try {
    const reportsCollection = database.collection(collectionNames.reports);
    const helpCollection = database.collection(collectionNames.help);
    const aggregateStatuses = collection => collection.aggregate([
      { $group: { _id: { $ifNull: ["$status", "Submitted"] }, count: { $sum: 1 } } }
    ]).toArray();
    const aggregateLocations = collection => collection.aggregate([
      { $match: { location: { $type: "string", $ne: "" } } },
      { $group: { _id: "$location", count: { $sum: 1 } } }
    ]).toArray();
    const [reportCount, helpCount, resolvedReports, resolvedHelp, peopleReports, peopleHelp,
      typeGroups, reportStatuses, helpStatuses, reportLocations, helpLocations, resourceGroups,
      approvedApplications, monthlyReports, monthlyHelp] = await Promise.all([
      reportsCollection.countDocuments({}), helpCollection.countDocuments({}),
      reportsCollection.countDocuments({ status: "Resolved" }), helpCollection.countDocuments({ status: "Resolved" }),
      reportsCollection.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ["$peopleAffected", 0] } } } }]).toArray(),
      helpCollection.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ["$people", 0] } } } }]).toArray(),
      reportsCollection.aggregate([{ $group: { _id: { $ifNull: ["$type", "Other"] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }]).toArray(),
      aggregateStatuses(reportsCollection), aggregateStatuses(helpCollection),
      aggregateLocations(reportsCollection), aggregateLocations(helpCollection),
      database.collection("reliefResources").aggregate([{ $group: { _id: { $ifNull: ["$type", "$name"] }, total: { $sum: { $ifNull: ["$total", "$quantity"] } }, available: { $sum: { $ifNull: ["$available", "$quantity"] } } } }, { $sort: { total: -1 } }]).toArray(),
      database.collection("ngoApplications").countDocuments({ status: "Approved" }),
      reportsCollection.aggregate([{ $match: { createdAt: { $type: "date" } } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray(),
      helpCollection.aggregate([{ $match: { createdAt: { $type: "date" } } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray()
    ]);
    const statuses = {};
    for (const entry of [...reportStatuses, ...helpStatuses]) {
      const status = ["Submitted", "Under Review", "In Progress", "Resolved"].includes(entry._id) ? entry._id : "Other";
      statuses[status] = (statuses[status] || 0) + entry.count;
    }
    const regions = new Map();
    for (const entry of [...reportLocations, ...helpLocations]) {
      const region = coarseArea(entry._id);
      if (region !== "Area withheld until assignment") regions.set(region, (regions.get(region) || 0) + entry.count);
    }
    const monthly = new Map();
    for (const entry of [...monthlyReports, ...monthlyHelp]) monthly.set(entry._id, (monthly.get(entry._id) || 0) + entry.count);
    const reportTypes = new Map();
    for (const entry of typeGroups) {
      const category = safeRequestType({ type: entry._id }) || "Other";
      reportTypes.set(category, (reportTypes.get(category) || 0) + entry.count);
    }
    res.json({ success: true, analytics: {
      summary: { reports: reportCount, helpRequests: helpCount, totalRequests: reportCount + helpCount, resolved: resolvedReports + resolvedHelp, peopleAffected: (peopleReports[0]?.total || 0) + (peopleHelp[0]?.total || 0), approvedNgoApplications: approvedApplications },
      reportTypes: [...reportTypes].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
      statuses: Object.entries(statuses).map(([status, count]) => ({ status, count })),
      regions: [...regions].map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      monthly: [...monthly].map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
      resources: resourceGroups.map(group => ({ type: safeRequestType({ type: group._id }) || "Other", total: group.total, available: group.available }))
    } });
  } catch (error) {
    console.error("Government analytics lookup error:", error.message);
    res.status(500).json({ success: false, message: "Unable to calculate government analytics." });
  }
});

app.get("/api/government/alerts", requireAuth, requireRole("government"), async (_req, res) => {
  try {
    const alerts = await database.collection("alerts").find({}).sort({ createdAt: -1 }).limit(100).project({ title: 1, type: 1, area: 1, severity: 1, population: 1, message: 1, status: 1, createdAt: 1 }).toArray();
    res.json({ success: true, alerts });
  } catch (error) {
    console.error("Government alert lookup error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load alerts." });
  }
});

app.patch("/api/government/alerts/:alertId/close", requireAuth, requireRole("government"), async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.alertId)) return res.status(400).json({ success: false, message: "Invalid alert ID." });
  try {
    const result = await database.collection("alerts").findOneAndUpdate(
      { _id: new ObjectId(req.params.alertId), status: "Active" },
      { $set: { status: "Closed", closedAt: new Date(), closedBy: req.user.id } },
      { returnDocument: "after", projection: { _id: 1, status: 1 } }
    );
    if (!result) {
      const exists = await database.collection("alerts").findOne({ _id: new ObjectId(req.params.alertId) }, { projection: { _id: 1 } });
      return res.status(exists ? 409 : 404).json({ success: false, message: exists ? "This alert is already closed." : "Alert not found." });
    }
    res.json({ success: true, alert: { id: result._id.toString(), status: result.status } });
  } catch (error) {
    console.error("Government alert close error:", error.message);
    res.status(500).json({ success: false, message: "Unable to close this alert." });
  }
});

app.post("/api/government/alerts", requireAuth, requireRole("government"), async (req, res) => {
  const title = String(req.body?.title || "").trim().slice(0, 160);
  const area = String(req.body?.area || "").trim().slice(0, 200);
  const message = String(req.body?.message || "").trim().slice(0, 2000);
  const severity = String(req.body?.severity || "").toLowerCase();
  const population = req.body?.population === undefined || req.body?.population === ""
    ? 0
    : Number(req.body.population);
  if (!title || !area || !message || !["critical", "high", "medium", "low"].includes(severity)
    || !Number.isSafeInteger(population) || population < 0) {
    return res.status(400).json({ success: false, message: "Complete the alert details and provide a nonnegative whole-number affected population." });
  }
  try {
    const alert = { title, area, message, severity, type: String(req.body?.type || "Emergency").trim().slice(0, 80), population, status: "Active", createdAt: new Date(), createdBy: req.user.id };
    await database.collection("alerts").insertOne(alert);
    res.status(201).json({ success: true, alert: { title: alert.title, area: alert.area, message: alert.message, severity: alert.severity, type: alert.type, population: alert.population, status: alert.status, createdAt: alert.createdAt } });
  } catch (error) {
    console.error("Government alert creation error:", error.message);
    res.status(500).json({ success: false, message: "Unable to issue this alert." });
  }
});

app.patch("/api/government/reports/:requestId/status", requireAuth, requireRole("government"), async (req, res) => {
  const requestId = safeRequestId(req.params.requestId);
  const status = String(req.body?.status || "");
  if (!requestId) return res.status(400).json({ success: false, message: "Please enter a valid Request ID." });
  if (!["Under Review", "In Progress", "Resolved"].includes(status)) return res.status(400).json({ success: false, message: "Choose a permitted report status." });
  try {
    const allowedFrom = {
      "Under Review": ["Submitted"],
      "In Progress": ["Submitted", "Under Review"],
      "Resolved": ["Under Review", "In Progress"]
    }[status];
    const sourceStates = [{ status: { $in: allowedFrom } }];
    if (allowedFrom.includes("Submitted")) sourceStates.push({ status: { $exists: false } });
    const result = await database.collection(collectionNames.reports).findOneAndUpdate(
      { requestId, $or: sourceStates },
      { $set: { status, updatedAt: new Date(), lastUpdatedBy: req.user.id } },
      { returnDocument: "after" }
    );
    if (!result) {
      const exists = await database.collection(collectionNames.reports).findOne({ requestId }, { projection: { _id: 1 } });
      return res.status(exists ? 409 : 404).json({ success: false, message: exists ? "This report cannot make that status transition." : "Emergency report not found." });
    }
    res.json({ success: true, report: operationalRequest(result) });
  } catch (error) {
    console.error("Government report update error:", error.message);
    res.status(500).json({ success: false, message: "Unable to update this report." });
  }
});

app.patch("/api/government/help/:requestId/status", requireAuth, requireRole("government"), async (req, res) => {
  const requestId = safeRequestId(req.params.requestId);
  const status = String(req.body?.status || "");
  if (!requestId) return res.status(400).json({ success: false, message: "Please enter a valid Request ID." });
  if (!["Under Review", "In Progress", "Resolved"].includes(status)) return res.status(400).json({ success: false, message: "Choose a permitted help-request status." });
  try {
    const allowedFrom = { "Under Review": ["Submitted"], "In Progress": ["Submitted", "Under Review"], "Resolved": ["Under Review", "In Progress"] }[status];
    const sourceStates = [{ status: { $in: allowedFrom } }];
    if (allowedFrom.includes("Submitted")) sourceStates.push({ status: { $exists: false } });
    const result = await database.collection(collectionNames.help).findOneAndUpdate(
      { requestId, $and: [{ $or: [{ assignedNgoId: { $exists: false } }, { assignedNgoId: null }] }, { $or: sourceStates }] },
      { $set: { status, updatedAt: new Date(), lastUpdatedBy: req.user.id } },
      { returnDocument: "after" }
    );
    if (!result) {
      const exists = await database.collection(collectionNames.help).findOne({ requestId }, { projection: { _id: 1, assignedNgoId: 1 } });
      return res.status(exists ? 409 : 404).json({ success: false, message: exists ? "This request is assigned to an NGO or cannot make that status transition." : "Help request not found." });
    }
    res.json({ success: true, request: operationalRequest(result) });
  } catch (error) {
    console.error("Government help request update error:", error.message);
    res.status(500).json({ success: false, message: "Unable to update this help request." });
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
      .project({ _id: 0, name: 1, type: 1, label: 1, location: 1, distance: 1, details: 1, status: 1, active: 1, quantity: 1, available: 1 }).toArray();
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

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  const isBadJson = error instanceof SyntaxError && error.status === 400 && "body" in error;
  const status = isBadJson ? 400 : error.status === 413 ? 413 : 500;
  res.status(status).json({ success: false, message: isBadJson ? "Request body must be valid JSON." : status === 413 ? "Request body is too large." : "The server could not complete this request." });
});

async function ensureIndexes(db) {
  await Promise.all([
    db.collection(collectionNames.reports).createIndex({ requestId: 1 }),
    db.collection(collectionNames.help).createIndex({ requestId: 1 }),
    db.collection(collectionNames.help).createIndex({ assignedNgoId: 1, status: 1, createdAt: -1 }),
    db.collection(collectionNames.volunteers).createIndex({ ngoId: 1, createdAt: -1 }),
    db.collection(collectionNames.donations).createIndex({ ngoId: 1, createdAt: -1 }),
    db.collection("ngoApplications").createIndex({ status: 1, organizationName: 1 }),
    db.collection("ngoApplications").createIndex({ userId: 1 }),
    db.collection("ngoApplications").createIndex({ publicId: 1 }),
    db.collection("reliefResources").createIndex({ ngoId: 1, active: 1 }),
    db.collection("reliefCamps").createIndex({ ngoId: 1, status: 1 })
  ]);
}

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
      await ensureIndexes(connectedDatabase);
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
