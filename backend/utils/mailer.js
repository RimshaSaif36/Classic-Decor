const nodemailer = require("nodemailer");

const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_PASS = process.env.GMAIL_PASS || "";

const transporter =
  GMAIL_USER && GMAIL_PASS
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_PASS,
        },
      })
    : null;

async function sendOrderConfirmation(orderDetails) {
  if (!transporter) {
    console.log("Email not sent: mailer not configured");
    return;
  }

  const { name, total, items } = orderDetails;
  const itemRows = items
    .map(
      (item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>PKR ${item.price}</td>
    </tr>
  `
    )
    .join("");

  const mailOptions = {
    from: GMAIL_USER,
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
