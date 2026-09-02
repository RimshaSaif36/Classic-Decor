import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ShippingReturns() {
  return (
    <>
      <Header />
      <div className="policies-container">
        <div className="policies-content">
          <h1>Shipping & Returns Policy</h1>
          
          <section className="policy-section">
            <h2>Shipping Information</h2>
            <p>
              At The Classic Decor, we strive to deliver your order quickly and safely. Here's what you need to know:
            </p>
            <ul>
              <li><strong>Shipping Time:</strong> Orders are typically shipped within 3-5 business days</li>
              <li><strong>Delivery Time:</strong> Standard delivery takes 5-7 business days within Pakistan</li>
              <li><strong>Shipping Cost:</strong> Free shipping on orders above PKR 5,000</li>
              <li><strong>Tracking:</strong> You will receive a tracking number via email once your order ships</li>
              <li><strong>Packaging:</strong> All items are carefully packaged to ensure safe delivery</li>
            </ul>
          </section>

          
          
<section className="policy-section">
  <h2>Return Policy</h2>
  <p>
    We accept returns only for genuine issues with your order. Please contact our support team within 7 days of delivery:
  </p>
  <ul>
    <li><strong>Accepted:</strong> Wrong, damaged, defective, or incorrectly sized products</li>
    <li><strong>Not Accepted:</strong> Change of mind, colour preference, normal wear, or damage after delivery</li>
    <li><strong>Process:</strong> Contact support with your order number, item name, and clear photo or video of the issue</li>
    <li><strong>Verification:</strong> Our team will verify the issue and may request additional details</li>
    <li><strong>Resolution:</strong> Approved returns or replacements will receive instructions via email or WhatsApp</li>
  </ul>
</section>



          {/* <section className="policy-section">
            <h2>Defective Items</h2>
            <p>
              If you receive a defective item, we'll replace it at no cost. Please contact us immediately with photos of the damage.
            </p>
          </section> */}

          <section className="policy-section">
            <h2>Contact Us</h2>
            <p>
              For any questions about shipping or returns, please contact our customer service team at:
            </p>
            <p>
              <strong>Email:</strong> support@theclassicdecor.com<br />
              <strong>Phone:</strong> +923717014445
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
