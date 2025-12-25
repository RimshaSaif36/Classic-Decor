export default function Footer() {
  return (
    <footer>
      <div className="footer-container">
        <div className="footer-column">
          <div className="footer-logo">
            <img src="/images/brandlogo.png" alt="The Classic Decor Logo" className="footer-logo-img" />
            <span className="footer-logo-text"></span>
          </div>
          <p>
            Your trusted destination for premium acrylic home décor. Explore
            modern wall art, elegant mirrors, clocks, and customized designs
            crafted to elevate your living space with style.
          </p>
        </div>
        <div className="footer-column">
          <h3>Customer Service</h3>
          <ul>
            <li><a href="/about">About Us</a></li>
            <li><a href="/contact">Contact Us</a></li>
            <li><a href="/shipping-returns">Shipping & Returns</a></li>
            <li><a href="/faq">FAQ</a></li>
          </ul>
        </div>
        <div className="footer-column">
          <h3>Legal</h3>
          <ul>
            <li><a href="/terms">Terms of Service</a></li>
            <li><a href="/privacy">Privacy Policy</a></li>
          </ul>
        </div>
        <div className="footer-column">
          <h3>Stay Connected</h3>
          <div className="social-media">
            <a 
              href="https://www.facebook.com/people/The-Classic-Decor/61585245614907/" 
              target="_blank" 
              rel="noopener noreferrer" 
              title="Follow us on Facebook"
              aria-label="Facebook"
            >
              <i className="fab fa-facebook-f"></i>
            </a>
            <a 
              href="https://www.instagram.com/theclassicdecorofficial/" 
              target="_blank" 
              rel="noopener noreferrer" 
              title="Follow us on Instagram"
              aria-label="Instagram"
            >
              <i className="fab fa-instagram"></i>
            </a>
            <a 
              href="https://www.tiktok.com/@theclassicdecorofficial?lang=en" 
              target="_blank" 
              rel="noopener noreferrer" 
              title="Follow us on TikTok"
              aria-label="TikTok"
            >
              <i className="fab fa-tiktok"></i>
            </a>
            <a 
              href="https://www.youtube.com/@TheClassicDecor" 
              target="_blank" 
              rel="noopener noreferrer" 
              title="Subscribe on YouTube"
              aria-label="YouTube"
            >
              <i className="fab fa-youtube"></i>
            </a>
            <a 
              href="https://www.linkedin.com/company/theclassicdecor/" 
              target="_blank" 
              rel="noopener noreferrer" 
              title="Connect on LinkedIn"
              aria-label="LinkedIn"
            >
              <i className="fab fa-linkedin-in"></i>
            </a>
          </div>
          <div className="newsletter">
            <p>Sign up for our newsletter to get the latest updates.</p>
            <form onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Enter your email" />
              <button type="submit">Subscribe</button>
            </form>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2025 The Classic Decor. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
