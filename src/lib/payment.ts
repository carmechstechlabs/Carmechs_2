/**
 * Payment Gateway Utility for CarMechs
 * Integrates with Razorpay (via server-side order creation)
 */

export interface PaymentOptions {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentResponse {
  id: string; // payment ID
  status: 'success' | 'failed' | 'cancelled';
  orderId: string;
  signature?: string;
  method?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const loadGatewayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const initializePayment = async (options: PaymentOptions, method: string = "upi_razorpay"): Promise<PaymentResponse> => {
  if (method === "cash") {
    return { id: "CASH_" + Date.now(), status: "success", orderId: "CASH_ORDER" };
  }

  const isScriptLoaded = await loadGatewayScript();
  if (!isScriptLoaded) {
    throw new Error("Payment gateway SDK failed to load");
  }

  // 1. Create order on the server
  const orderResponse = await fetch("/api/payment/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: options.amount,
      currency: options.currency,
      receipt: options.receipt,
      method
    }),
  });

  const order = await orderResponse.json();

  if (order.mock) {
     console.log(`Operating in mock mode as ${method} keys are not configured.`);
     return {
       id: `pay_mock_${Math.random().toString(36).substring(7)}`,
       status: 'success',
       orderId: order.id
     };
  }

  if (method === "paytm") {
    // Paytm redirect logic would normally go here
    // For this implementation, we'll simulate the gateway interaction
    // in a real app, you'd use the Paytm JS Checkout or redirect to their pg
    console.log("Paytm Gateway engaged. Mid:", order.mid);
    return new Promise((resolve) => {
       setTimeout(() => {
          resolve({ id: "paytm_" + Date.now(), orderId: order.id, status: "success" });
       }, 2000);
    });
  }

  // 2. Open Razorpay Checkout modal
  return new Promise((resolve) => {
    const rzpOptions = {
      key: order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
      amount: order.amount,
      currency: order.currency,
      name: "CarMechs Services",
      description: `Payment for ${options.receipt}`,
      order_id: order.id,
      handler: async (response: any) => {
        // 3. Verify payment on server
        const verifyResponse = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            method
          }),
        });

        const verifyResult = await verifyResponse.json();
        if (verifyResult.status === "success") {
          resolve({
            id: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
            status: "success"
          });
        } else {
          resolve({ id: response.razorpay_payment_id, orderId: order.id, status: "failed" });
        }
      },
      prefill: {
        name: options.customerName,
        email: options.customerEmail,
        contact: options.customerPhone
      },
      theme: { color: "#6366f1" },
      modal: {
        ondismiss: () => {
          resolve({ id: "", orderId: order.id, status: "cancelled" });
        }
      }
    };

    const rzp = new window.Razorpay(rzpOptions);
    rzp.open();
  });
};

export const refundPayment = async (paymentId: string): Promise<boolean> => {
  console.log(`Refunding payment ${paymentId}...`);
  // Real refund logic would require another server endpoint
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 1500);
  });
};
