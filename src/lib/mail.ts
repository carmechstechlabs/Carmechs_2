/**
 * Transactional Email Service Wrapper
 * Relays requests to the backend notification engine
 */
export async function sendConfirmationEmail(
  email: string, 
  fullName: string, 
  bookingId: string,
  serviceType: string = "Standard Service",
  date: string = "TBD",
  time: string = "Morning",
  cart?: any[],
  totalPrice?: number
) {
  try {
    const response = await fetch("/api/notify/booking-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, bookingId, serviceType, date, time, cart, totalPrice }),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to relay confirmation email:", error);
    return { success: false, error };
  }
}

export async function sendNewBookingAlert(booking: any) {
  try {
    const response = await fetch("/api/notify/admin-booking-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking }),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to relay admin booking alert:", error);
    return { success: false, error };
  }
}

export async function sendPromotionalOffer(offer: {
  email: string;
  fullName: string;
  offerTitle: string;
  offerDescription: string;
  couponCode?: string;
  expiryDate?: string;
}) {
  try {
    const response = await fetch("/api/notify/promotion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(offer),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to relay promotional offer:", error);
    return { success: false, error };
  }
}

export async function sendContactSubmissionAlert(data: any) {
  try {
    const response = await fetch("/api/notify/new-inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to relay contact alert:", error);
    return { success: false, error };
  }
}

export async function sendStatusUpdateEmail(data: {
  email: string;
  fullName: string;
  bookingId: string;
  status: string;
  carModel?: string;
  serviceType?: string;
  date?: string;
  time?: string;
}) {
  try {
    const response = await fetch("/api/notify/booking-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to relay status update email:", error);
    return { success: false, error };
  }
}

export async function sendInquiryConfirmation(email: string, name: string) {
  console.log(`[MAIL SERVICE] Sending inquiry confirmation to ${email}...`);
  console.log(`Subject: Inquiry Received - CarMechs`);
  console.log(`Body: Hi ${name}, we've received your message and will get back to you within 24 hours.`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
}

export async function sendTaskNotification(email: string, task: any) {
  try {
    const response = await fetch("/api/notify/task-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, task }),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to relay task alert:", error);
    return { success: false, error };
  }
}

export async function sendBookingReminder(email: string, fullName: string, booking: any) {
  try {
    const response = await fetch("/api/notify/booking-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, booking }),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to relay booking reminder:", error);
    return { success: false, error };
  }
}
