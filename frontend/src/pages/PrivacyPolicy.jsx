import Header from '../components/Header';
import Footer from '../components/Footer';

export default function PrivacyPolicy() {
  return (
    <>
      <Header />
      <div className="policies-container">
        <div className="policies-content">
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last updated: December 2025</p>

          <section className="policy-section">
            <h2>Introduction</h2>
            <p>
              The Classic Decor ("we" or "us" or "our") operates the website. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our website and the choices you have associated with that data.
            </p>
          </section>

          <section className="policy-section">
            <h2>Information Collection and Use</h2>
            <p>
              We collect several different types of information for various purposes to provide and improve our service to you.
            </p>
            <ul>
              <li><strong>Personal Data:</strong> While using our website, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). This may include:
                <ul>
                  <li>Email address</li>
                  <li>First name and last name</li>
                  <li>Phone number</li>
                  <li>Address, State, Province, ZIP/Postal code, City</li>
                  <li>Cookies and Usage Data</li>
                </ul>
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>Use of Data</h2>
            <p>
              The Classic Decor uses the collected data for various purposes:
            </p>
            <ul>
              <li>To provide and maintain our website</li>
              <li>To notify you about changes to our website</li>
              <li>To allow you to participate in interactive features of our website</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information to improve our website</li>
              <li>To monitor the usage of our website</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>Security of Data</h2>
            <p>
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section className="policy-section">
            <h2>Links to Other Sites</h2>
            <p>
              Our website may contain links to other sites that are not operated by us. If you click on a third party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit. We have no control over and assume no responsibility for the content, privacy policies or practices of any third party sites or services.
            </p>
          </section>

          <section className="policy-section">
            <h2>Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top of this Privacy Policy.
            </p>
          </section>

          <section className="policy-section">
            <h2>Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <p>
              <strong>By email:</strong> support@theclassicdecor.com<br />
              <strong>By phone:</strong> 03110721400
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
