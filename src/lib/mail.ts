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
  // Logic for internal alerts could also go through backend if needed
  console.log(`[MAIL SERVICE] Sending new booking alert to assist@carmechs.in...`);
  return { success: true };
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

export async function sendInquiryConfirmation(email: string, name: string) {
  console.log(`[MAIL SERVICE] Sending inquiry confirmation to ${email}...`);
  console.log(`Subject: Inquiry Received - CarMechs`);
  console.log(`Body: Hi ${name}, we've received your message and will get back to you within 24 hours.`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
}
