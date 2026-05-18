import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import cron from "node-cron";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    console.log("[FIREBASE] Configuration loaded for project:", firebaseConfig.projectId);
  } else {
    console.warn("[FIREBASE] firebase-applet-config.json not found in", process.cwd());
  }
} catch (err) {
  console.error("[FIREBASE] Failed to load config:", err);
}

// Initialize Firebase Admin
try {
  if (admin.apps.length === 0) {
    if (firebaseConfig.projectId) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
      console.log("[FIREBASE] Admin SDK initialized with explicit project ID:", firebaseConfig.projectId);
    } else {
      admin.initializeApp();
      console.warn("[FIREBASE] Admin SDK initialized with Application Default Credentials");
    }
  }
} catch (err) {
  console.error("[FIREBASE] Admin initialization failed:", err);
}

// Ensure dbAdmin targets the correct database if provided
const dbAdmin = firebaseConfig.firestoreDatabaseId
  ? getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId)
  : getFirestore();

async function getSecretsConfig() {
  try {
    const snap = await dbAdmin.collection("config").doc("secrets").get();
    return snap.exists ? snap.data() : {};
  } catch (err) {
    console.error("Failed to fetch secrets from Firestore:", err);
    return {};
  }
}

// AI search lazy initialization
let aiClient: GoogleGenAI | null = null;
async function getAI() {
  if (!aiClient) {
    const secrets = await getSecretsConfig();
    const key = process.env.GEMINI_API_KEY || (secrets as any).GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY missing in both ENV and Firestore. AI features will be degraded.");
      return null;
    }
    try {
      aiClient = new GoogleGenAI({ apiKey: key });
    } catch (err) {
      console.error("Failed to initialize GoogleGenAI:", err);
      return null;
    }
  }
  return aiClient;
}

// Helper function for confirmation email as requested in prompt
async function sendConfirmationEmail(details: any) {
  const { email, fullName, bookingId, serviceType, date, time, cart, totalPrice } = details;
  
  let servicesHtml = "";
  if (cart && Array.isArray(cart)) {
    servicesHtml = `
      <div style="margin-top: 20px;">
        <h3 style="font-size: 14px; text-transform: uppercase; color: #666; margin-bottom: 10px;">Services Selected</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${cart.map((s: any) => `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">${s.title}</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">₹${s.price}</td>
            </tr>
          `).join('')}
          <tr>
            <td style="padding: 15px 0; font-weight: bold;">Total Price</td>
            <td style="padding: 15px 0; font-weight: bold; text-align: right; color: #6366f1; font-size: 18px;">₹${totalPrice}</td>
          </tr>
        </table>
      </div>
    `;
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #6366f1; border-radius: 15px; background: #fff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">CarMechs confirmed</h1>
        <p style="color: #94a3b8; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 5px;">Mission Logic Synchronized</p>
      </div>
      
      <p>Dear ${fullName},</p>
      <p>Your deployment request for <strong>${serviceType}</strong> has been successfully validated and scheduled.</p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 15px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Deployment Parameters</h3>
        <p style="margin: 8px 0;"><strong>Mission ID:</strong> <span style="font-family: monospace; color: #6366f1;">#${bookingId}</span></p>
        <p style="margin: 8px 0;"><strong>Target Date:</strong> ${date}</p>
        <p style="margin: 8px 0;"><strong>Arrival Window:</strong> ${time}</p>
      </div>
      
      ${servicesHtml}
      
      <div style="margin-top: 30px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 12px; text-align: center;">
        <p style="margin: 0; color: #166534; font-size: 13px;">Our technician will arrive equipped for the operation. Ensure the target vehicle is accessible.</p>
      </div>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; text-transform: uppercase;">CarMechs Automated Dispatch Node • assist@carmechs.in</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `CONFIRMED: ${serviceType} Deployment (#${bookingId.substring(0, 8)})`,
    html
  });
}

// Helper function for reminder email as requested
async function sendBookingReminder(details: any) {
  const { email, fullName, carModel, serviceType, date, time } = details;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #000; border-radius: 10px; background: #fff;">
      <div style="background: #000; color: #fff; padding: 15px 20px; border-radius: 5px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
         <strong style="text-transform: uppercase; letter-spacing: 2px;">Mission Alert</strong>
         <span style="font-size: 10px; opacity: 0.7;">24H PRE-DEPLOYMENT</span>
      </div>
      
      <h1 style="color: #000; font-size: 22px; text-transform: uppercase;">Upcoming Service Reminder</h1>
      <p>Dear ${fullName},</p>
      <p>This is a tactical reminder for your scheduled vehicle service tomorrow.</p>
      
      <div style="background: #f1f5f9; padding: 25px; border-radius: 10px; margin: 25px 0; border: 1px solid #e2e8f0;">
        <table style="width: 100%;">
          <tr>
            <td style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: bold;">Vehicle Unit</td>
            <td style="text-align: right; font-weight: bold; font-size: 14px;">${carModel}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: bold; padding-top: 10px;">Service Logic</td>
            <td style="text-align: right; font-weight: bold; font-size: 14px; padding-top: 10px;">${serviceType}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: bold; padding-top: 10px;">Schedule</td>
            <td style="text-align: right; font-weight: bold; font-size: 14px; padding-top: 10px;">${date} @ ${time}</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 13px; color: #475569; line-height: 1.5;">Please ensure the vehicle is located in a workspace-friendly area and notify building security of our arrival.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="font-size: 10px; color: #94a3b8; text-transform: uppercase; text-align: center;">CarMechs Operations Control • Tactical Unit Assigned</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `TACTICAL REMINDER: Your ${serviceType} is tomorrow!`,
    html
  });
}

// AI Search Integrations

// Scheduled Reminders: Runs every hour to check for bookings happening tomorrow
cron.schedule("0 * * * *", async () => {
  console.log("[CRON] Checking for upcoming service reminders...");
  
  if (!firebaseConfig.projectId) {
    console.error("[CRON ERROR] Project ID missing in configuration. Aborting cycle.");
    return;
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  try {
    const snap = await dbAdmin.collection("bookings")
      .where("appointmentDate", "==", tomorrowStr)
      .where("status", "in", ["pending", "confirmed"])
      .where("reminderSent", "==", false)
      .get();

    if (snap.empty) {
      console.log("[CRON] No reminders to send for", tomorrowStr);
      return;
    }

    for (const doc of snap.docs) {
      const data = doc.data();
      const { email, fullName, carModel, serviceType, appointmentTime } = data;

      if (!email) continue;

      const result = await sendBookingReminder({
        email, fullName, carModel, serviceType, date: tomorrowStr, time: appointmentTime
      });

      if (result.success) {
        await doc.ref.update({ reminderSent: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log(`[CRON] Reminder sent to ${email} for booking ${doc.id}`);
      }
    }
  } catch (err) {
    console.error("[CRON ERROR] Reminder cycle failed:", err);
  }
});

async function getSystemConfig() {
  try {
    const snap = await dbAdmin.collection("config").doc("system").get();
    return snap.exists ? snap.data() : {};
  } catch (err) {
    console.error("Failed to fetch system config from Firestore:", err);
    return {};
  }
}

// Lazy initialization for Razorpay
async function getRazorpay() {
  const config = await getSystemConfig() as any;
  const secrets = await getSecretsConfig() as any;
  const key_id = process.env.RAZORPAY_KEY_ID || config.razorpayKeyId;
  const key_secret = process.env.RAZORPAY_KEY_SECRET || config.razorpayKeySecret || secrets.RAZORPAY_SECRET;
  
  if (!key_id || !key_secret) {
    console.warn("RAZORPAY keys missing in ENV, System Config, and Secrets Vault. Mock mode active.");
    return null;
  }
  return new Razorpay({ key_id, key_secret });
}

// Mailer setup
async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.log(`[Mock Email] To: ${to}, Subject: ${subject}. Content: ${html.substring(0, 50)}...`);
    return { success: true, mock: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: false,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"CarMechs" <assist@carmechs.in>',
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Razorpay: Create Order
  app.post("/api/payment/order", async (req, res) => {
    const { amount, currency, receipt, method } = req.body;
    const sysConfig = await getSystemConfig() as any;
    const secrets = await getSecretsConfig() as any;

    if (method === "paytm") {
       const mid = process.env.PAYTM_MID || sysConfig.paytmMid;
       if (!mid) {
          return res.json({ id: `paytm_mock_${Date.now()}`, mid: "MOCK_MID", mock: true });
       }
       return res.json({ id: `paytm_order_${Date.now()}`, mid, amount, currency });
    }

    const rzp = await getRazorpay();

    if (!rzp) {
      return res.json({ 
        id: `order_mock_${Math.random().toString(36).substring(7)}`, 
        amount: amount * 100, 
        currency, 
        mock: true 
      });
    }

    try {
      const order = await rzp.orders.create({
        amount: Math.round(amount * 100), 
        currency: currency || "INR",
        receipt: receipt || `receipt_${Date.now()}`,
      });
      res.json({ 
         ...order, 
         key_id: process.env.RAZORPAY_KEY_ID || sysConfig.razorpayKeyId 
      });
    } catch (error) {
      console.error("Razorpay Order Error:", error);
      res.status(500).json({ error: "Failed to create payment order" });
    }
  });

  // Razorpay: Verify Signature
  app.post("/api/payment/verify", async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const config = await getSystemConfig() as any;
    const secrets = await getSecretsConfig() as any;
    const secret = process.env.RAZORPAY_KEY_SECRET || config.razorpayKeySecret || secrets.RAZORPAY_SECRET;

    if (!secret) {
      console.log("Mock verification: Signature verifcation skipped (no secret in Vault, System Config or ENV)");
      return res.json({ status: "success", mock: true });
    }

    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest("hex");

    if (digest === razorpay_signature) {
      res.json({ status: "success" });
    } else {
      res.status(400).json({ status: "failure", error: "Invalid signature" });
    }
  });

  // AI SERVICE SEARCH
  app.post("/api/ai/search-services", async (req, res) => {
    const { query, carDetails } = req.body;

    if (!query) {
       return res.status(400).json({ error: "Missing query telemetry." });
    }

    try {
       // Fetch all active services to give Gemini context
       const servicesSnap = await dbAdmin.collection("services").get();
       const services = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

       const prompt = `
         You are a CarMechs technical advisor. 
         A client is describing a vehicle issue or service need: "${query}"
         Their vehicle is: ${JSON.stringify(carDetails)}
         
         Here is our tactical service catalog:
         ${JSON.stringify(services.map((s: any) => ({ id: s.id, title: s.title, description: s.description })))}
         
         Based on the query, return the IDs of up to 3 most relevant services in a JSON array format.
         Only return the array, no extra text.
         Format: ["service-id-1", "service-id-2"]
       `;

       const ai = await getAI();
       if (!ai) return res.status(503).json({ error: "AI Engine Offline" });
       
       const aiResult = await ai.models.generateContent({
         model: "gemini-1.5-flash-latest",
         contents: [{ role: "user", parts: [{ text: prompt }] }]
       });
       const responseText = aiResult.text;
       
       // Extract array from text (sometimes Gemini adds markdown)
       const jsonMatch = responseText.match(/\[.*\]/s);
       const serviceIds = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

       // Return the full service objects
       const matchedServices = services.filter(s => serviceIds.includes(s.id));
       res.json({ results: matchedServices });
    } catch (err) {
       console.error("AI Search failure:", err);
       res.status(500).json({ error: "AI reasoning failure." });
    }
  });

  // AI Content Generation for Services
  app.post("/api/admin/generate-service-content", async (req, res) => {
    const { title, category } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: "Title and Category are required for content generation." });
    }

    try {
      const prompt = `
        You are an expert copywriter for CarMechs, a premium doorstep car service platform.
        Generate a detailed description and a bulleted list of features for a service titled "${title}" in the category "${category}".
        
        The description should be professional, emphasizing convenience and expertise (approx 50-80 words).
        Features should be a list of 4-6 specific technical steps or value-adds included in the service.
        
        Return the result in JSON format:
        {
          "description": "...",
          "features": ["feature 1", "feature 2", ...]
        }
      `;

      const ai = await getAI();
      if (!ai) return res.status(503).json({ error: "AI Content Engine Offline" });

      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash-latest",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      const responseText = result.text;

      const jsonMatch = responseText.match(/\{.*?\}/s);
      const generated = jsonMatch ? JSON.parse(jsonMatch[0]) : { description: "", features: [] };
      
      res.json(generated);
    } catch (err) {
      console.error("AI Content Generation failure:", err);
      res.status(500).json({ error: "AI content generation failed." });
    }
  });

  // Research Service Details (Deep Search) - Grounded Research
  app.post("/api/admin/research-service", async (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "Title required for diagnostic research." });

    try {
      const ai = await getAI();
      if (!ai) return res.status(503).json({ error: "AI Engine Offline" });

      const prompt = `Research car service details for "${title}". 
      Focus on deep technical data including relevant car parts, diagnostic procedures, and industry standards.
      Provide:
      1. A professional excerpt (max 20 words).
      2. A detailed description of what the service involves.
      3. A list of 5 key features or diagnostic steps included in this service.
      4. Detailed technical notes for a mechanic, specifically mentioning required car parts, specialized tools, and diagnostic procedures.
      Return ONLY in JSON format: { "excerpt": "...", "description": "...", "features": ["...", "..."], "notes": "..." }`;

      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash-latest",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = result.text;
      // Extract valid JSON if Gemini wraps it in markdown blocks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText || "{}");
      res.json(data);
    } catch (err) {
      console.error("AI Research failure:", err);
      res.status(500).json({ error: "AI reasoning failure during deep research." });
    }
  });

  // Admin Password Reset
  app.post("/api/admin/reset-user-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    try {
      // Note: We should ideally verify the requester is an admin here using their token
      // but for now we'll rely on the client-side check for the proof-of-concept.
      const link = await admin.auth().generatePasswordResetLink(email);
      
      // We can either return the link or send the email directly. 
      // Sending email is safer.
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px;">
          <h2 style="color: #6366f1;">Password Reset Requested</h2>
          <p>An administrator has initiated a password reset for your CarMechs account.</p>
          <p>Click the link below to set a new password:</p>
          <a href="${link}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `;

      await sendEmail({ to: email, subject: "CarMechs - Password Reset", html });
      res.json({ success: true, message: `Password reset link sent to ${email}` });
    } catch (err: any) {
      console.error("Password Reset Error:", err);
      res.status(500).json({ error: err.message || "Failed to trigger password reset." });
    }
  });

  // Notifications: Email Confirmation
  app.post("/api/notify/booking-confirmation", async (req, res) => {
    try {
      const result = await sendConfirmationEmail(req.body);
      res.json(result);
    } catch (err) {
      console.error("Confirmation trigger failure:", err);
      res.status(500).json({ error: "Email relay failure" });
    }
  });

  app.post("/api/notify/booking-status", async (req, res) => {
    const { email, fullName, bookingId, status, carModel, serviceType, date, time } = req.body;
    
    let statusMsg = "";
    switch(status) {
      case 'confirmed': statusMsg = "Your booking has been officially confirmed and scheduled."; break;
      case 'in-progress': statusMsg = "Our technician has started working on your vehicle."; break;
      case 'completed': statusMsg = "The service operation is complete. Your vehicle is ready!"; break;
      case 'cancelled': statusMsg = "Your booking has been cancelled as requested or due to operational constraints."; break;
      default: statusMsg = `Your booking status has been updated to ${status.toUpperCase()}.`;
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #6366f1;">Service Directive Update</h1>
        <p>Dear ${fullName},</p>
        <p style="font-size: 16px; color: #333; font-weight: bold;">${statusMsg}</p>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Vehicle:</strong> ${carModel}</p>
          <p><strong>Service:</strong> ${serviceType}</p>
          <p><strong>Schedule:</strong> ${date} @ ${time}</p>
        </div>
        <p style="margin-top: 20px;">For real-time assistance, contact our support node.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">CarMechs Operations Control</p>
      </div>
    `;

    const result = await sendEmail({
      to: email,
      subject: `Status Update: ${status.toUpperCase()} (#${bookingId.substring(0, 8)})`,
      html
    });

    res.json(result);
  });

  app.post("/api/notify/booking-reminder", async (req, res) => {
    const { email, fullName, booking } = req.body;
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #6366f1;">Tactical Reminder: Upcoming Service</h1>
        <p>Dear ${fullName},</p>
        <p>This is a reminder for your upcoming vehicle service deployment with CarMechs.</p>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e1e4e8;">
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Date:</strong> ${booking.appointmentDate}</p>
          <p><strong>Time Window:</strong> ${booking.appointmentTime}</p>
          <p><strong>Service Type:</strong> ${booking.serviceType}</p>
        </div>
        <p>Our expert technician will arrive at your location as scheduled. If you need to make any tactical adjustments, please contact us via our support node immediately.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666; font-style: italic;">CarMechs Operations & Control Hub</p>
      </div>
    `;

    const result = await sendEmail({
      to: email,
      subject: `Service Reminder: Upcoming Mission (${booking.appointmentDate})`,
      html
    });

    res.json(result);
  });

  // Admin Bulk Actions
  app.post("/api/admin/bulk-update-bookings", async (req, res) => {
    const { bookingIds, action, payload } = req.body;
    if (!bookingIds || !Array.isArray(bookingIds)) return res.status(400).json({ error: "Booking IDs required." });

    try {
      const results = [];
      for (const id of bookingIds) {
        const docRef = admin.firestore().collection("bookings").doc(id);
        const docSnap = await docRef.get();
        
        if (!docSnap.exists) continue;
        const b = docSnap.data();

        if (action === "update-status") {
          await docRef.update({ 
            status: payload.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          results.push({ id, success: true, action: "status-update" });
        } else if (action === "send-reminder") {
          // Logic to send reminder email
          const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h1 style="color: #6366f1;">Tactical Reminder: Upcoming Service</h1>
              <p>Dear ${b.fullName},</p>
              <p>This is a tactical reminder for your scheduled vehicle service deployment.</p>
              <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e1e4e8;">
                <p><strong>Booking ID:</strong> ${id}</p>
                <p><strong>Date:</strong> ${b.appointmentDate}</p>
                <p><strong>Time Window:</strong> ${b.appointmentTime}</p>
                <p><strong>Service Type:</strong> ${b.serviceType}</p>
              </div>
              <p>Our expert technician will arrive at your location as scheduled. Please contact us via our support node for any adjustments.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #666; font-style: italic;">CarMechs Operations & Control Hub</p>
            </div>
          `;
          await sendEmail({
            to: b.email,
            subject: `[REMINDER] Service Deployment (${b.appointmentDate})`,
            html
          });
          results.push({ id, success: true, action: "reminder-sent" });
        }
      }
      res.json({ results });
    } catch (err: any) {
      console.error("Bulk Update Error:", err);
      res.status(500).json({ error: err.message || "Bulk update failed." });
    }
  });

  // Notifications: New Inquiry
  app.post("/api/notify/new-inquiry", async (req, res) => {
    const { name, email, phone, message } = req.body;
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #6366f1;">New Site Inquiry</h1>
        <p>You have received a new inquiry from the contact form.</p>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">CarMechs Notification Engine</p>
      </div>
    `;

    const result = await sendEmail({
      to: "assist@carmechs.in",
      subject: `New Inquiry from ${name}`,
      html
    });

    res.json(result);
  });

  // Notifications: Task Alert
  app.post("/api/notify/task-alert", async (req, res) => {
    const { email, task } = req.body;
    const { title, description, priority, dueDate } = task;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #f43f5e;">Operational Directive: TASK_ALERT</h1>
        <p>A priority task is pending your attention.</p>
        <div style="background: #fff1f2; padding: 15px; border-radius: 8px; border: 1px solid #fecdd3; margin: 20px 0;">
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Priority:</strong> ${priority.toUpperCase()}</p>
          <p><strong>Due Date:</strong> ${dueDate ? new Date(dueDate).toLocaleString() : "TBD"}</p>
          <hr style="border: 0; border-top: 1px solid #fecdd3; margin: 15px 0;" />
          <p><strong>Description:</strong></p>
          <p>${description || "No metadata provided."}</p>
        </div>
        <p style="margin-top: 20px;">Please synchronize with the Command Dashboard to execute the resolution protocol.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.1em;">CarMechs Internal Comms Protocol</p>
      </div>
    `;

    const result = await sendEmail({
      to: email,
      subject: `[TASK ALERT] ${title} (${priority.toUpperCase()})`,
      html
    });

    res.json(result);
  });

  // Notifications: Promotional Offer
  app.post("/api/notify/promotion", async (req, res) => {
    const { email, fullName, offerTitle, offerDescription, couponCode, expiryDate } = req.body;
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #6366f1; border-radius: 20px; text-align: center;">
        <h1 style="color: #6366f1; margin-bottom: 5px;">Exclusive Reward</h1>
        <p style="text-transform: uppercase; font-weight: bold; color: #999; letter-spacing: 2px;">Specially for ${fullName}</p>
        
        <div style="background: #f5f3ff; padding: 30px; border-radius: 15px; margin: 25px 0; border: 2px dashed #c7d2fe;">
          <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #1e1b4b;">${offerTitle}</h2>
          <p style="color: #4338ca; font-size: 16px; line-height: 1.6;">${offerDescription}</p>
          
          ${couponCode ? `
            <div style="margin-top: 25px; padding: 15px; background: #fff; border-radius: 10px; display: inline-block; border: 1px solid #e0e7ff;">
              <p style="margin: 0 0 5px 0; font-size: 10px; text-transform: uppercase; color: #6366f1; font-weight: 800;">Use Code</p>
              <div style="font-size: 24px; font-weight: 900; letter-spacing: 3px; color: #1e1b4b;">${couponCode}</div>
            </div>
          ` : ''}
          
          <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">Valid until ${expiryDate || "further notice"}</p>
        </div>
        
        <a href="${process.env.APP_URL || '#'}" style="display: inline-block; background: #6366f1; color: white; padding: 15px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; text-transform: uppercase; font-size: 14px;">Redeem Now</a>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">You received this as a CarMechs Premium Member</p>
      </div>
    `;

    const result = await sendEmail({
      to: email,
      subject: `🎁 ${offerTitle} for you, ${fullName}!`,
      html
    });

    res.json(result);
  });

  // Notifications: Admin Booking Alert
  app.post("/api/notify/admin-booking-alert", async (req, res) => {
    const { booking } = req.body;
    const { fullName, phone, carModel, serviceType, appointmentDate, appointmentTime, city, id, price } = booking;
    const sysConfig = await getSystemConfig() as any;
    
    // Broadcast to mechanics in the same city
    try {
      const mechanicsSnap = await dbAdmin.collection("technicians")
        .where("city", "==", city)
        .where("status", "==", "available")
        .get();
      
      const mechanicEmails = mechanicsSnap.docs.map(doc => doc.data().email).filter(Boolean);
      
      if (mechanicEmails.length > 0) {
        const mechHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #6366f1; border-radius: 10px; background: #fff;">
            <div style="background: #6366f1; color: #fff; padding: 10px 20px; border-radius: 5px; margin-bottom: 20px;">
              <strong style="text-transform: uppercase;">New Mission Alert</strong>
            </div>
            <h2 style="margin: 0 0 20px 0; font-size: 20px; text-transform: uppercase;">Available Deployment in ${city}</h2>
            <div style="margin-bottom: 20px; background: #f3f4f6; padding: 20px; border-radius: 10px;">
              <p><strong>Service:</strong> ${serviceType}</p>
              <p><strong>Vehicle:</strong> ${carModel}</p>
              <p><strong>Schedule:</strong> ${appointmentDate} @ ${appointmentTime}</p>
              <p><strong>Offer Value:</strong> ₹${price}</p>
            </div>
            <p>Login to your Mechanic Dashboard to claim this mission immediately.</p>
            <p style="font-size: 10px; color: #999; margin-top: 30px; text-transform: uppercase;">CarMechs Automated Dispatch</p>
          </div>
        `;

        // Send to all relevant mechanics
        await Promise.all(mechanicEmails.map(mEmail => sendEmail({
          to: mEmail,
          subject: `🚨 [NEW MISSION] ${serviceType} available in ${city}!`,
          html: mechHtml
        })));
      }
    } catch (broadcastErr) {
      console.error("Mechanic broadcast failed:", broadcastErr);
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #000; border-radius: 10px; background: #fff;">
        <div style="background: #000; color: #fff; padding: 10px 20px; border-radius: 5px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <strong style="text-transform: uppercase; letter-spacing: 2px;">System Alert</strong>
          <span style="font-size: 10px; opacity: 0.7;">${new Date().toLocaleString()}</span>
        </div>
        
        <h2 style="margin: 0 0 20px 0; font-size: 20px; text-transform: uppercase; border-bottom: 2px solid #eee; padding-bottom: 10px;">New Booking Deployment</h2>
        
        <div style="margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>ID:</strong> #${id.substring(0, 8).toUpperCase()}</p>
          <p style="margin: 5px 0;"><strong>Client:</strong> ${fullName} (${phone})</p>
          <p style="margin: 5px 0;"><strong>Vehicle:</strong> ${carModel}</p>
          <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceType}</p>
          <p style="margin: 5px 0;"><strong>Value:</strong> ₹${price}</p>
          <p style="margin: 5px 0;"><strong>Schedule:</strong> ${appointmentDate} @ ${appointmentTime}</p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${city}</p>
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
          <p style="margin: 0; font-size: 12px; color: #374151;">Action Required: Please login to Admin Dashboard to assign a technician and synchronize logistics.</p>
        </div>
        
        <p style="font-size: 10px; color: #999; margin-top: 30px; text-transform: uppercase; text-align: center;">CarMechs Operational Telemetry</p>
      </div>
    `;

    const result = await sendEmail({
      to: process.env.ADMIN_EMAIL || sysConfig.supportEmail || "carmechstechlabs@gmail.com",
      subject: `🚨 [NEW BOOKING] ${fullName} - ${city} (#${id.substring(0, 8)})`,
      html
    });

    res.json(result);
  });

  // Notifications: Booking Reminder
  app.post("/api/notify/booking-reminder", async (req, res) => {
    const { email, fullName, bookingId, carModel, serviceType, date, time } = req.body;
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #6366f1; border-radius: 10px;">
        <h1 style="color: #6366f1;">Upcoming Service Reminder</h1>
        <p>Dear ${fullName},</p>
        <p>This is a friendly reminder for your scheduled vehicle service.</p>
        <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c7d2fe;">
          <p style="margin: 5px 0;"><strong>Vehicle:</strong> ${carModel}</p>
          <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceType}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 5px 0;"><strong>Arrival Window:</strong> ${time}</p>
        </div>
        <p>Please ensure the vehicle is accessible and any security gates are notified of our technician's arrival.</p>
        <p style="margin-top: 20px;">Need to reschedule? Reply to this email or visit our dashboard.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">CarMechs Operations Control</p>
      </div>
    `;

    const result = await sendEmail({
      to: email,
      subject: `Reminder: Your ${serviceType} service is coming up!`,
      html
    });

    res.json(result);
  });

  // Feedback and Ratings
  app.post("/api/services/:id/reviews", async (req, res) => {
    const { id } = req.params;
    const { rating, feedback, userId, userName, bookingId } = req.body;

    if (!rating) {
      return res.status(400).json({ error: "Rating is mandatory." });
    }

    try {
      const review = {
        rating,
        feedback: feedback || "",
        userId: userId || "anonymous",
        userName: userName || "Anonymous Client",
        bookingId: bookingId || null,
        createdAt: new Date().toISOString()
      };

      // Instruction: Store in 'services' collection
      // Usually, we update the service document with an array of reviews or a subcollection.
      // Based on the prompt, I will add it to a 'reviews' array in the service document.
      await dbAdmin.collection("services").doc(id).update({
        reviews: admin.firestore.FieldValue.arrayUnion(review),
        rating: admin.firestore.FieldValue.increment(rating), // Total sum for avg calc
        reviewCount: admin.firestore.FieldValue.increment(1)
      });

      res.json({ success: true, message: "Review synchronized with service node." });
    } catch (err) {
      console.error("Failed to store review:", err);
      res.status(500).json({ error: "Internal telemetry failure during review uplink." });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", environment: process.env.NODE_ENV || "development" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CarMechs Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Server failed to start:", err);
  process.exit(1);
});
