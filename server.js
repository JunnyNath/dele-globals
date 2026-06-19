import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const allowedOrigins = [
  'https://dele-globals.vercel.app',
  'http://localhost:3000'
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  })
);

// No explicit preflight route needed; `cors()` handles OPTIONS automatically

app.use(express.static(__dirname));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.get("/:page", (req, res, next) => {
  const page = req.params.page;
  const filePath = path.join(__dirname, `${page}.html`);

  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  return next();
});

const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;
const MAILCHIMP_DATA_CENTER =
  process.env.MAILCHIMP_DATA_CENTER?.trim() || MAILCHIMP_API_KEY?.split("-")[1];
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_USER_ID = process.env.EMAILJS_USER_ID;
const EMAILJS_SECRET_KEY = process.env.EMAILJS_SECRET_KEY;
const EMAILJS_API_URL =
  process.env.EMAILJS_API_URL || "https://api.emailjs.com/api/v1.0/email/send";
const PORT = process.env.PORT || 4000;

const MAILCHIMP_ENABLED = Boolean(
  MAILCHIMP_API_KEY &&
  MAILCHIMP_LIST_ID &&
  MAILCHIMP_DATA_CENTER &&
  !MAILCHIMP_API_KEY.includes("placeholder")
);
const MOCK_SUBSCRIBE = process.env.MOCK_SUBSCRIBE === "true";

function getMailchimpConfigErrors() {
  const errors = [];
  if (!MAILCHIMP_API_KEY) {
    errors.push("MAILCHIMP_API_KEY is missing.");
  } else if (MAILCHIMP_API_KEY.includes("placeholder")) {
    errors.push("MAILCHIMP_API_KEY appears to be a placeholder.");
  }
  if (!MAILCHIMP_LIST_ID) {
    errors.push("MAILCHIMP_LIST_ID is missing.");
  }
  if (!MAILCHIMP_DATA_CENTER) {
    errors.push(
      "MAILCHIMP_DATA_CENTER is missing and could not be inferred from MAILCHIMP_API_KEY."
    );
  }
  return errors;
}

if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_USER_ID) {
  console.warn(
    "Missing required EmailJS environment variables: EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and/or EMAILJS_USER_ID. Email sending will be disabled, but the server will continue running."
  );
}

const MAILCHIMP_CONFIG_ERRORS = getMailchimpConfigErrors();
if (MAILCHIMP_CONFIG_ERRORS.length > 0) {
  console.warn(
    "Mailchimp configuration missing or incomplete. LIVE newsletter subscriptions are disabled by default.\n" +
      "To enable local testing only, set MOCK_SUBSCRIBE=true before starting the server.\n" +
      "Do NOT enable MOCK_SUBSCRIBE in production. Provide MAILCHIMP_API_KEY and MAILCHIMP_LIST_ID to enable live subscriptions.\n" +
      "If your API key is valid but the data center cannot be inferred, also set MAILCHIMP_DATA_CENTER.\n" +
      "Configuration errors: " + MAILCHIMP_CONFIG_ERRORS.join(" ")
  );
  if (!MOCK_SUBSCRIBE && process.env.FAIL_ON_INVALID_MAILCHIMP_CONFIG === "true") {
    console.error(
      "Exiting because Mailchimp configuration is invalid and MOCK_SUBSCRIBE is not enabled."
    );
    process.exit(1);
  }
}

async function fetchWithRetry(url, options = {}, retries = 2, backoffMs = 500) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok && response.status >= 500 && attempt < retries) {
        lastError = new Error(`Server responded with ${response.status}`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

function getMailchimpStatus() {
  return {
    enabled: MAILCHIMP_ENABLED,
    mock: MOCK_SUBSCRIBE,
    apiKeyConfigured: Boolean(MAILCHIMP_API_KEY),
    listIdConfigured: Boolean(MAILCHIMP_LIST_ID),
    dataCenter: MAILCHIMP_DATA_CENTER || null,
    configErrors: MAILCHIMP_CONFIG_ERRORS,
  };
}

app.get('/health', (req, res) => {
  res.json({
    uptime: process.uptime(),
    status: 'ok',
    mailchimp: getMailchimpStatus(),
  });
});

app.post("/api/subscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Mock mode is now opt-in: only enable mock when MOCK_SUBSCRIBE=true.
    if (MOCK_SUBSCRIBE) {
      console.log("Mock subscribe active - returning success for:", email);
      return res.status(200).json({
        success: true,
        message: "(Mock) Successfully subscribed to newsletter!",
      });
    }

    // If Mailchimp config is missing, respond with a clear 503 and guidance.
    if (!MAILCHIMP_ENABLED) {
      console.warn("Rejecting subscription: Mailchimp not configured. Set MOCK_SUBSCRIBE=true for local testing or provide MAILCHIMP_API_KEY and MAILCHIMP_LIST_ID for live subscriptions.");
      return res.status(503).json({
        success: false,
        message: "Newsletter service not configured. Set MOCK_SUBSCRIBE=true for local testing or configure Mailchimp credentials.",
      });
    }

    const mailchimpUrl = `https://${MAILCHIMP_DATA_CENTER}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members`;
    const response = await fetchWithRetry(mailchimpUrl, {
      method: "POST",
      headers: {
        Authorization: `apikey ${MAILCHIMP_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed",
      }),
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      data = { detail: await response.text() };
    }

    if (!response.ok) {
      // Map common Mailchimp errors to friendlier messages
      const detail = (data && (data.detail || data.title)) || "Failed to subscribe";

      // Mailchimp returns a 400 with detail containing 'is already a list member'
      if (typeof detail === "string" && detail.toLowerCase().includes("is already a list member")) {
        return res.status(200).json({
          success: true,
          message: "This email is already subscribed to the newsletter.",
        });
      }

      // Forward a concise error message and preserve status code where reasonable
      return res.status(response.status || 400).json({
        success: false,
        message: detail,
      });
    }

    res.status(200).json({
      success: true,
      message: "Successfully subscribed to newsletter!",
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

app.post("/send-email", async (req, res) => {
  try {
    const {
      name,
      company,
      email,
      phone,
      equipment,
      start,
      duration,
      location,
      notes,
    } = req.body;

    if (!name || !email || !phone || !equipment) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone, and equipment are required",
      });
    }

    const emailPayload = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_USER_ID,
      template_params: {
        name,
        company,
        email,
        phone,
        equipment,
        start,
        duration,
        location,
        notes,
      },
    };

    const headers = {
      "Content-Type": "application/json",
    };

    if (EMAILJS_SECRET_KEY) {
      headers.Authorization = `Bearer ${EMAILJS_SECRET_KEY}`;
    }

    const emailResponse = await fetch(EMAILJS_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(emailPayload),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      return res.status(emailResponse.status || 500).json({
        success: false,
        message:
          emailResult?.message || emailResult?.error || "Failed to send email request",
      });
    }

    res.status(200).json({
      success: true,
      message: "Quote request sent successfully!",
    });
  } catch (error) {
    console.error("EmailJS send error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to send your request at this time",
    });
  }
});

// 404 handler for non-API requests — placed after API routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "404.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

