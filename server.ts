import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import admin from "firebase-admin";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const dbAdmin = admin.firestore();

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
  const key_id = process.env.RAZORPAY_KEY_ID || config.razorpayKeyId;
  const key_secret = process.env.RAZORPAY_KEY_SECRET || config.razorpayKeySecret;
  
  if (!key_id || !key_secret) {
    console.warn("RAZORPAY keys missing in both ENV and Firestore. Mock mode active.");
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
    const secret = process.env.RAZORPAY_KEY_SECRET || config.razorpayKeySecret;

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
    const { email, fullName, bookingId, serviceType, date, time, cart, totalPrice } = req.body;
    
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
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #6366f1;">CarMechs Confirmation</h1>
        <p>Dear ${fullName},</p>
        <p>Your booking for <strong>${serviceType}</strong> has been confirmed.</p>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Arrival Window:</strong> ${time}</p>
        </div>
        ${servicesHtml}
        <p style="margin-top: 20px;">Our expert technician will arrive at the scheduled time. Thank you for choosing CarMechs!</p>
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

startServer();
