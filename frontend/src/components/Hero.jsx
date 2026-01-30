import { motion } from 'framer-motion';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_7e232f8d-2324-4282-8851-b8c7ddbb51d5/artifacts/0oowyfv8_White%20Dove%20Wellness%20-%20Logo%20-%20no%20BG%20%281%29.png';

const heroImages = [
  {
    url: 'https://images.unsplash.com/photo-1728497872660-cc6b16238c3a?crop=entropy&cs=srgb&fm=jpg&q=85&w=800',
    alt: 'Reflexology Treatment'
  },
  {
    url: 'https://images.pexels.com/photos/15174768/pexels-photo-15174768.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Calming Hands'
  },
  {
    url: 'https://images.unsplash.com/photo-1611073615723-e06aceba76d4?crop=entropy&cs=srgb&fm=jpg&q=85&w=600',
    alt: 'Spa Treatment'
  }
];

export default function Hero() {
  const scrollToContact = () => {
    const element = document.querySelector('#contact');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="home"
      className="relative min-h-screen pt-20 overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 50% 0%, #F5F3FA 0%, #FAFAF9 100%)'
      }}
      data-testid="hero-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* Logo - Centered, 400x300 ratio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex justify-center mb-12"
        >
          <img
            src={LOGO_URL}
            alt="White Dove Wellness - Holistic Therapies"
            className="w-[300px] md:w-[400px] h-auto"
            data-testid="hero-logo"
          />
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-slate-800 mb-4">
            Welcome to Wellness
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Experience the healing power of holistic therapies in a serene and nurturing environment.
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-center mb-16"
        >
          <button
            onClick={scrollToContact}
            className="bg-[#9F87C4] text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-[#8A6EB5] transition-all hover:shadow-lg hover:-translate-y-1"
            data-testid="hero-cta-btn"
          >
            Book Your Session
          </button>
        </motion.div>

        {/* Hero Images - Bento Grid */}
        {/* Desktop: 3 images, Mobile: 1 image */}
        <div className="hidden md:grid grid-cols-3 gap-6" data-testid="hero-images-desktop">
          {heroImages.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.15, duration: 0.6 }}
              className={`relative rounded-3xl overflow-hidden shadow-lg ${
                index === 0 ? 'row-span-2 h-[400px]' : 'h-[190px]'
              }`}
            >
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </motion.div>
          ))}
        </div>

        {/* Mobile: Single image */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="md:hidden"
          data-testid="hero-image-mobile"
        >
          <div className="relative rounded-3xl overflow-hidden shadow-lg h-[300px]">
            <img
              src={heroImages[0].url}
              alt={heroImages[0].alt}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
