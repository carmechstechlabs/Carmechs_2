/**
 * Transactional Email Service Mock
 * In production, replace this with a real provider like Resend, SendGrid, or Postmark.
 */
export async function sendConfirmationEmail(email: string, fullName: string, bookingId: string) {
  console.log(`[MAIL SERVICE] Sending confirmation to ${email}...`);
  console.log(`Subject: Booking Confirmed - CarMechs #${bookingId.slice(0, 8)}`);
  console.log(`Body: Hi ${fullName}, your booking with CarMechs has been confirmed! Our team will reach out soon.`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
}

export async function sendNewBookingAlert(booking: any) {
  console.log(`[MAIL SERVICE] Sending new booking alert to assist@carmechs.in...`);
  console.log(`Subject: [NEW BOOKING] ${booking.fullName} - ${booking.serviceType}`);
  console.log(`Body: New request received for ${booking.carModel}. Phone: ${booking.phone}.`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
}

export async function sendContactSubmissionAlert(data: any) {
  console.log(`[MAIL SERVICE] Sending contact form alert to assist@carmechs.in...`);
  console.log(`Subject: [CONTACT INQUIRY] From ${data.name}`);
  console.log(`Body: Message: ${data.message}. Email: ${data.email}`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
}

export async function sendInquiryConfirmation(email: string, name: string) {
  console.log(`[MAIL SERVICE] Sending inquiry confirmation to ${email}...`);
  console.log(`Subject: Inquiry Received - CarMechs`);
  console.log(`Body: Hi ${name}, we've received your message and will get back to you within 24 hours.`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
}
