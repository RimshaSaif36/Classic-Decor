import Header from '../components/Header';
import CategoryNav from '../components/CategoryNav';
import Footer from '../components/Footer';

export default function About() {
  return (
    <div>
      <Header />
      <CategoryNav />
      <main>
        <section className="about-overlay-section" aria-label="About The Classic Decor">
          <div className="about-overlay">
            <div className="about-card">
              <h2>About The Classic Decor</h2>
              <p>
                Our culture is founded on partnership, respect, and passion. From
                the designer who crafts fresh ideas, to the makers who bring them
                to life, to the customers who choose our work for their homes — we
                are united by a commitment to quality acrylic decor. We
                collaborate with care to deliver the very best.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
