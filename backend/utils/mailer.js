const nodemailer = require("nodemailer");

// Brevo SMTP Configuration
const MAIL_HOST = process.env.MAIL_HOST || "smtp-relay.brevo.com";
const MAIL_PORT = process.env.MAIL_PORT || 587;
const MAIL_USERNAME = process.env.MAIL_USERNAME || "";
const MAIL_PASSWORD = process.env.MAIL_PASSWORD || "";
const BREVO_SENDEREMAIL = process.env.BREVO_SENDEREMAIL || "support@theclassicdecor.com";

// Fallback to older env vars if Brevo not configured
const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_PASS = process.env.GMAIL_PASS || "";
const SMTP_HOST = process.env.SMTP_HOST || MAIL_HOST;
const SMTP_PORT = process.env.SMTP_PORT || MAIL_PORT;
const SMTP_SECURE = process.env.SMTP_SECURE || "false";
const SMTP_USER = process.env.SMTP_USER || MAIL_USERNAME;
const SMTP_PASS = process.env.SMTP_PASS || MAIL_PASSWORD;

const transporter = (() => {
  try {
    // Try Brevo first
    if (MAIL_USERNAME && MAIL_PASSWORD) {
      const t = nodemailer.createTransport({
        host: MAIL_HOST,
        port: Number(MAIL_PORT) || 587,
        secure: false,
        auth: { 
          user: MAIL_USERNAME, 
          pass: MAIL_PASSWORD 
        },
      });
      console.log("[mailer] Brevo SMTP transporter configured");
      return t;
    }
    // Fallback to other SMTP
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      const t = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: String(SMTP_SECURE).toLowerCase() === "true",
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
      console.log("[mailer] SMTP transporter configured");
      return t;
    }
    // Fallback to Gmail
    if (GMAIL_USER && GMAIL_PASS) {
      const t = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      });
      console.log("[mailer] Gmail transporter configured");
      return t;
    }
  } catch (e) {
    console.error(
      "[mailer] transporter init failed:",
      e && e.message ? e.message : e
    );
  }
  console.log("[mailer] Email not configured (missing env)");
  return null;
})();

async function sendWelcomeEmail(userDetails) {
  if (!transporter) {
    console.log("[mailer] Email not sent: mailer not configured");
    return false;
  }

  const { name, email } = userDetails;
  if (!email) {
    console.log("[mailer] Email not sent: missing recipient email");
    return false;
  }

  const fromAddress = BREVO_SENDEREMAIL || GMAIL_USER || SMTP_USER || "no-reply@classic-decor.local";
  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: "Welcome to Classic Decore! 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4af37; margin: 0;">Classic Decore</h1>
          <p style="color: #666; margin: 5px 0;">Premium Home Decor</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a1a; margin-top: 0;">Welcome, ${name}! 👋</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Thank you for joining Classic Decore! We're thrilled to have you as part of our community. 
            Get ready to explore our premium collection of home decor products.
          </p>
          
          <div style="background: #f0f0f0; padding: 15px; border-left: 4px solid #d4af37; margin: 20px 0;">
            <h3 style="color: #d4af37; margin-top: 0;">What's Next?</h3>
            <ul style="color: #555; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
              <li>Browse our exclusive collection</li>
              <li>Add items to your wishlist</li>
              <li>Track your orders in real-time</li>
              <li>Enjoy special member discounts</li>
            </ul>
          </div>
          
          <p style="color: #555; text-align: center; margin: 30px 0;">
            <a href="https://www.theclassicdecor.com" style="display: inline-block; background: #d4af37; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Start Shopping
            </a>
          </p>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            Questions? Contact us at support@theclassicdecor.com
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2026 Classic Decore. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("[mailer] Welcome email sent to", email);
    return true;
  } catch (error) {
    console.error("[mailer] Error sending welcome email:", error.message);
    return false;
  }
}

async function sendOrderConfirmation(orderDetails) {
  if (!transporter) {
    console.log("[mailer] Email not sent: mailer not configured");
    return false;
  }

  const { name, email, total, items, orderId } = orderDetails;
  
  if (!email) {
    console.log("[mailer] Email not sent: missing recipient email");
    return false;
  }

  let itemRows = "";
  try {
    if (Array.isArray(items)) {
      itemRows = items
        .map((item) => {
          const itemName = item.name || item.productName || "Unknown Item";
          const qty = item.quantity || item.qty || 1;
          const price = item.price || item.productPrice || 0;
          const total = qty * price;
          return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${itemName}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${qty}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">PKR ${price.toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">PKR ${total.toLocaleString()}</td>
        </tr>
      `;
        })
        .join("");
    }
  } catch (_) {
    itemRows = `<tr><td colspan="4" style="padding: 10px; text-align: center;">See order details for items</td></tr>`;
  }

  const fromAddress = BREVO_SENDEREMAIL || GMAIL_USER || SMTP_USER || "no-reply@classic-decor.local";
  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: `Order Confirmation #${orderId || 'N/A'} - Classic Decore`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4af37; margin: 0;">Classic Decore</h1>
          <p style="color: #666; margin: 5px 0;">Premium Home Decor</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a1a; margin-top: 0;">Order Confirmed! 🎉</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Thank you for your order, <strong>${name}</strong>! We've received your order and will process it shortly.
          </p>
          
          <div style="background: #f0f0f0; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #666;"><strong>Order ID:</strong> #${orderId || 'N/A'}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <h3 style="color: #1a1a1a; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f5f5f5; border-bottom: 2px solid #d4af37;">
                <th style="padding: 10px; text-align: left; color: #333; font-weight: bold;">Item</th>
                <th style="padding: 10px; text-align: center; color: #333; font-weight: bold;">Qty</th>
                <th style="padding: 10px; text-align: right; color: #333; font-weight: bold;">Price</th>
                <th style="padding: 10px; text-align: right; color: #333; font-weight: bold;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
          
          <div style="background: #f0f0f0; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: right;">
            <h3 style="color: #d4af37; margin: 0; font-size: 24px;">PKR ${Number(total || 0).toLocaleString()}</h3>
            <p style="color: #666; margin: 5px 0;">Total Amount</p>
          </div>
          
          <div style="background: #e8f5e9; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0; border-radius: 4px;">
            <h4 style="color: #2e7d32; margin-top: 0;">What happens next?</h4>
            <ol style="color: #555; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
              <li>We'll confirm your order and process the payment</li>
              <li>Your items will be carefully packed</li>
              <li>You'll receive tracking information via email</li>
              <li>Enjoy your new decor items! 🏡</li>
            </ol>
          </div>
          
          <p style="color: #555; text-align: center; margin: 30px 0;">
            <a href="https://www.theclassicdecor.com" style="display: inline-block; background: #d4af37; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Track Your Order
            </a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            Have questions about your order? Contact us at support@theclassicdecor.com or reply to this email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2026 Classic Decore. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("[mailer] Order confirmation email sent to", email);
    return true;
  } catch (error) {
    console.error("[mailer] Error sending order confirmation email:", error.message);
    return false;
  }
}

async function sendPaymentConfirmation(orderDetails) {
  if (!transporter) {
    console.log("[mailer] Email not sent: mailer not configured");
    return false;
  }

  const { name, email, total, items, orderId, transactionId } = orderDetails;
  
  if (!email) {
    console.log("[mailer] Email not sent: missing recipient email");
    return false;
  }

  let itemRows = "";
  try {
    if (Array.isArray(items)) {
      itemRows = items
        .map((item) => {
          const itemName = item.name || item.productName || "Unknown Item";
          const qty = item.quantity || item.qty || 1;
          const price = item.price || item.productPrice || 0;
          const total = qty * price;
          return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${itemName}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${qty}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">PKR ${price.toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">PKR ${total.toLocaleString()}</td>
        </tr>
      `;
        })
        .join("");
    }
  } catch (_) {
    itemRows = `<tr><td colspan="4" style="padding: 10px; text-align: center;">See order details for items</td></tr>`;
  }

  const fromAddress = BREVO_SENDEREMAIL || GMAIL_USER || SMTP_USER || "no-reply@classic-decor.local";
  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: `Payment Confirmed #${orderId || 'N/A'} - Classic Decore`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4af37; margin: 0;">Classic Decore</h1>
          <p style="color: #666; margin: 5px 0;">Premium Home Decor</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4caf50; margin: 0; font-size: 32px;">✓ Payment Confirmed!</h2>
          </div>
          
          <p style="color: #555; line-height: 1.6;">
            Hi <strong>${name}</strong>,
          </p>
          
          <p style="color: #555; line-height: 1.6;">
            Great news! We've successfully received and verified your payment. Your order is now confirmed and will be processed immediately.
          </p>
          
          <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
            <h3 style="color: #2e7d32; margin-top: 0;">Payment Verified ✓</h3>
            <p style="margin: 8px 0; color: #555;">
              <strong>Order ID:</strong> #${orderId || 'N/A'}
            </p>
            <p style="margin: 8px 0; color: #555;">
              <strong>Transaction ID:</strong> ${transactionId || 'N/A'}
            </p>
            <p style="margin: 8px 0; color: #555;">
              <strong>Amount Paid:</strong> <span style="font-size: 20px; color: #4caf50; font-weight: bold;">PKR ${Number(total || 0).toLocaleString()}</span>
            </p>
          </div>
          
          <h3 style="color: #1a1a1a; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f5f5f5; border-bottom: 2px solid #d4af37;">
                <th style="padding: 10px; text-align: left; color: #333; font-weight: bold;">Item</th>
                <th style="padding: 10px; text-align: center; color: #333; font-weight: bold;">Qty</th>
                <th style="padding: 10px; text-align: right; color: #333; font-weight: bold;">Price</th>
                <th style="padding: 10px; text-align: right; color: #333; font-weight: bold;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2196f3;">
            <h4 style="color: #1565c0; margin-top: 0;">What happens next?</h4>
            <ol style="color: #555; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
              <li>Your items will be carefully packed by our team</li>
              <li>Tracking information will be sent to this email</li>
              <li>Your order will be delivered within 2-5 business days</li>
              <li>Thank you for shopping with Classic Decore! 🏡</li>
            </ol>
          </div>
          
          <p style="color: #555; text-align: center; margin: 30px 0;">
            <a href="https://www.theclassicdecor.com" style="display: inline-block; background: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Track Your Order
            </a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            If you have any questions about your payment or order, please contact us at support@theclassicdecor.com
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© 2026 Classic Decore. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("[mailer] Payment confirmation email sent to", email);
    return true;
  } catch (error) {
    console.error("[mailer] Error sending payment confirmation email:", error.message);
    return false;
  }
}

module.exports = { sendWelcomeEmail, sendOrderConfirmation, sendPaymentConfirmation };
