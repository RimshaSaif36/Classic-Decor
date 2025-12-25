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
              <li><strong>Shipping Cost:</strong> Free shipping on orders above PKR 2,500</li>
              <li><strong>Tracking:</strong> You will receive a tracking number via email once your order ships</li>
              <li><strong>Packaging:</strong> All items are carefully packaged to ensure safe delivery</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>Return Policy</h2>
            <p>
              We want you to be completely satisfied with your purchase. If you need to return an item, please follow these guidelines:
            </p>
            <ul>
              <li><strong>Return Window:</strong> Items can be returned within 14 days of delivery</li>
              <li><strong>Condition:</strong> Items must be in original condition with packaging intact</li>
              <li><strong>Process:</strong> Contact our customer service team to initiate a return</li>
              <li><strong>Refund:</strong> Refunds are processed within 7-10 business days after we receive the item</li>
              <li><strong>Return Shipping:</strong> Return shipping costs are the customer's responsibility unless the item is defective</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>Defective Items</h2>
            <p>
              If you receive a defective item, we'll replace it at no cost. Please contact us immediately with photos of the damage.
            </p>
          </section>

          <section className="policy-section">
            <h2>Contact Us</h2>
            <p>
              For any questions about shipping or returns, please contact our customer service team at:
            </p>
            <p>
              <strong>Email:</strong> support@theclassicdecor.com<br />
              <strong>Phone:</strong> +92-300-XXXX-XXX
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
