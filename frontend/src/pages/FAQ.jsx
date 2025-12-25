import Header from '../components/Header';
import Footer from '../components/Footer';

export default function FAQ() {
  const faqs = [
    {
      question: "What materials do you use in your products?",
      answer: "We use high-quality acrylic materials that are durable, lightweight, and long-lasting. All our products are carefully crafted to ensure the best quality."
    },
    {
      question: "Do you offer custom designs?",
      answer: "Yes! We offer custom acrylic wall art and décor designs. Contact our team to discuss your specific requirements and we'll create something unique for you."
    },
    {
      question: "How do I care for my acrylic décor?",
      answer: "Simply dust your acrylic items with a soft cloth. For deeper cleaning, use a mild soap and water solution. Avoid harsh chemicals and abrasive materials."
    },
    {
      question: "What is your warranty?",
      answer: "All our products come with a 1-year warranty against manufacturing defects. If you experience any issues, contact us and we'll help resolve them."
    },
    {
      question: "Can I cancel or modify my order?",
      answer: "Yes, you can cancel or modify your order within 24 hours of placement. After that, orders enter production and cannot be changed. Contact us immediately if you need to make changes."
    },
    {
      question: "Do you ship internationally?",
      answer: "Currently, we ship within Pakistan. We're working on expanding our international shipping options. Follow us on social media for updates."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept multiple payment methods including credit/debit cards, bank transfers, and mobile payment solutions for your convenience."
    },
    {
      question: "How can I track my order?",
      answer: "Once your order ships, you'll receive an email with a tracking number. You can use this number to track your package with the courier."
    },
    {
      question: "What if my item arrives damaged?",
      answer: "Please contact us immediately with photos of the damage. We'll send you a replacement at no cost."
    },
    {
      question: "Do you have a physical store?",
      answer: "We currently operate online. You can view our complete collection on our website and place orders easily."
    }
  ];

  return (
    <>
      <Header />
      <div className="faq-container">
        <div className="faq-header">
          <h1>Frequently Asked Questions</h1>
          <p>Find answers to common questions about our products and services</p>
        </div>

        <div className="faq-items">
          {faqs.map((faq, index) => (
            <details key={index} className="faq-item">
              <summary className="faq-question">
                <span>{faq.question}</span>
                <i className="fas fa-chevron-down"></i>
              </summary>
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>

        <div className="faq-contact">
          <h2>Still have questions?</h2>
          <p>Contact our customer service team for more assistance.</p>
          <a href="/contact" className="view-all-btn">Contact Us</a>
        </div>
      </div>
      <Footer />
    </>
  );
}
