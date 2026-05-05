import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization for Razorpay
let razorpayInstance: Razorpay | null = null;
function getRazorpay() {
  if (!razorpayInstance) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      console.warn("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing. Razorpay will operate in mock mode.");
      return null;
    }
    razorpayInstance = new Razorpay({ key_id, key_secret });
  }
  return razorpayInstance;
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
    const { amount, currency, receipt } = req.body;
    const rzp = getRazorpay();

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
        amount: Math.round(amount * 100), // Razorpay expects amount in paisa
        currency: currency || "INR",
        receipt: receipt || `receipt_${Date.now()}`,
      });
      res.json(order);
    } catch (error) {
      console.error("Razorpay Order Error:", error);
      res.status(500).json({ error: "Failed to create payment order" });
    }
  });

  // Razorpay: Verify Signature
  app.post("/api/payment/verify", async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      console.log("Mock verification: Signature verifcation skipped (no secret)");
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

  // Notifications: Email Confirmation
  app.post("/api/notify/booking-confirmation", async (req, res) => {
    const { email, fullName, bookingId, serviceType, date, time } = req.body;
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #6366f1;">CarMechs Confirmation</h1>
        <p>Dear ${fullName},</p>
        <p>Your booking for <strong>${serviceType}</strong> has been confirmed.</p>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Arrival Window:</strong> ${time}</p>
        </div>
        <p>Our expert technician will arrive at the scheduled time. Thank you for choosing CarMechs!</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply.</p>
      </div>
    `;

    const result = await sendEmail({
      to: email,
      subject: `Booking Confirmed: ${serviceType} (#${bookingId.substring(0, 8)})`,
      html
    });

    res.json(result);
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", environment: process.env.NODE_ENV || "development" });
  });

  // Vite middleware for development
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
    console.log(`CarMechs Production-Ready Server running on http://localhost:${PORT}`);
    console.log(`Support Email linked to: assist@carmechs.in`);
  });
}

startServer();
