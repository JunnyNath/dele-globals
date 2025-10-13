
// Api Key = a6484f636caf86f6cdcf37b72ee7673e-us10


// Audience List ID = 1c94b56dee

import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
   if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
app.use(express.static("public"));
const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;
const PORT = process.env.PORT || 4000;
app.post("/subscribe", async (req, res) => {
  res.json({ message: 'Subscription successful!' });

  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }
    const response = await fetch(
      `https://us10.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members`,
      {
        method: "POST",
        headers: {
          "Authorization": `apikey ${MAILCHIMP_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email_address: email,
          status: "subscribed"
        })
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: data.detail || "Failed to subscribe"
      });
    }
    res.status(200).json({
      success: true,
      message: "Successfully subscribed to newsletter!"
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

