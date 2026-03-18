import Header from '../components/Header';
import Hero from '../components/Hero';
import Therapies from '../components/Therapies';
import Prices from '../components/Prices';
import AboutMe from '../components/AboutMe';
import Contact from '../components/Contact';
import Affiliations from '../components/Affiliations';
import Footer from '../components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen" data-testid="home-page">
      <Header />
      <main>
        <Hero />
        <Therapies />
        <Prices />
        <AboutMe />
        <Contact />
        <Affiliations />
      </main>
      <Footer />
    </div>
  );
}
