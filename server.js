import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(express.static(__dirname));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;
const MAILCHIMP_DATA_CENTER = MAILCHIMP_API_KEY?.split("-")[1];
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_USER_ID = process.env.EMAILJS_USER_ID;
const EMAILJS_SECRET_KEY = process.env.EMAILJS_SECRET_KEY;
const EMAILJS_API_URL =
  process.env.EMAILJS_API_URL || "https://api.emailjs.com/api/v1.0/email/send";
const PORT = process.env.PORT || 4000;

if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_USER_ID) {
  console.error(
    "Missing required EmailJS environment variables: EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and/or EMAILJS_USER_ID"
  );
  process.exit(1);
}

if (!MAILCHIMP_API_KEY || !MAILCHIMP_LIST_ID || !MAILCHIMP_DATA_CENTER) {
  console.warn(
    "Mailchimp configuration missing or incomplete. Newsletter subscription will run in mock mode."
  );
}

app.post("/subscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Support a test/mock mode for local development so subscriptions
    // can be exercised without valid Mailchimp keys. Enable by setting
    // MOCK_SUBSCRIBE=true or by using incomplete Mailchimp config.
    if (
      process.env.MOCK_SUBSCRIBE === "true" ||
      !MAILCHIMP_API_KEY ||
      !MAILCHIMP_LIST_ID ||
      !MAILCHIMP_DATA_CENTER ||
      MAILCHIMP_API_KEY.includes("placeholder")
    ) {
      console.log("Mock subscribe active - returning success for:", email);
      return res.status(200).json({
        success: true,
        message: "(Mock) Successfully subscribed to newsletter!",
      });
    }

    const mailchimpUrl = `https://${MAILCHIMP_DATA_CENTER}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members`;
    const response = await fetch(mailchimpUrl, {
      method: "POST",
      headers: {
        Authorization: `apikey ${MAILCHIMP_API_KEY}`,
        "Content-Type": "application/json",
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
      return res.status(400).json({
        success: false,
        message: data.detail || "Failed to subscribe",
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
      message: "Internal server error",
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

