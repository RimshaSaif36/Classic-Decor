const nodemailer = require("nodemailer");

const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_PASS = process.env.GMAIL_PASS || "";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = process.env.SMTP_PORT || "";
const SMTP_SECURE = process.env.SMTP_SECURE || "";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

const transporter = (() => {
  try {
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

async function sendOrderConfirmation(orderDetails) {
  if (!transporter) {
    console.log("Email not sent: mailer not configured");
    return;
  }

  const { name, total, items } = orderDetails;
  let itemRows = "";
  try {
    if (Array.isArray(items)) {
      itemRows = items
        .map(
          (item) => `
    <tr>
      <td>${item.name || ""}</td>
      <td>${item.quantity || 1}</td>
      <td>PKR ${item.price || 0}</td>
    </tr>
  `
        )
        .join("");
    } else if (typeof items === "string") {
      itemRows = `
        <tr>
          <td colspan="3">${items}</td>
        </tr>
      `;
    }
  } catch (_) {
    itemRows = "";
  }

  if (!orderDetails || !orderDetails.email) {
    console.log("Email not sent: missing recipient email");
    return;
  }

  const fromAddress = GMAIL_USER || SMTP_USER || "no-reply@classic-decor.local";
  const mailOptions = {
    from: fromAddress,
    to: orderDetails.email,
    subject: "Your Classic Decore Order Confirmation",
    html: `
      <h1>Thank you for your order, ${name}!</h1>
      <p>We've received your order and will process it shortly.</p>
      <h2>Order Summary</h2>
      <table border="1" cellpadding="10" cellspacing="0">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
      <h3>Total: PKR ${total}</h3>
      <p>Thanks for shopping with Classic Decore!</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Order confirmation email sent to", orderDetails.email);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

module.exports = { sendOrderConfirmation };
