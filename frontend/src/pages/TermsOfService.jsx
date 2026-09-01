import Header from '../components/Header';
import Footer from '../components/Footer';

export default function TermsOfService() {
  return (
    <>
      <Header />
      <div className="policies-container">
        <div className="policies-content">
          <h1>Terms of Service</h1>
          <p className="last-updated">Last updated: December 2025</p>

          <section className="policy-section">
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing and using The Classic Decor website and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="policy-section">
            <h2>2. Use License</h2>
            <p>
              Permission is granted to temporarily download one copy of the materials (information or software) on The Classic Decor website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul>
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to decompile or reverse engineer any software contained on the website</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>3. Disclaimer</h2>
            <p>
              The materials on The Classic Decor website are provided on an 'as is' basis. The Classic Decor makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section className="policy-section">
            <h2>4. Limitations</h2>
            <p>
              In no event shall The Classic Decor or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on The Classic Decor website, even if The Classic Decor or an authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section className="policy-section">
            <h2>5. Accuracy of Materials</h2>
            <p>
              The materials appearing on The Classic Decor website could include technical, typographical, or photographic errors. The Classic Decor does not warrant that any of the materials on its website are accurate, complete, or current. The Classic Decor may make changes to the materials contained on its website at any time without notice.
            </p>
          </section>

          <section className="policy-section">
            <h2>6. Links</h2>
            <p>
              The Classic Decor has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by The Classic Decor of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section className="policy-section">
            <h2>7. Modifications</h2>
            <p>
              The Classic Decor may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section className="policy-section">
            <h2>8. Governing Law</h2>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws of Pakistan, and you irrevocably submit to the exclusive jurisdiction of the courts located in Pakistan.
            </p>
          </section>

          <section className="policy-section">
            <h2>9. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at support@theclassicdecor.com
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
