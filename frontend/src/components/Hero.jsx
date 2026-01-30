import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { publicApi } from '../lib/api';

export default function Hero() {
  const [settings, setSettings] = useState(null);
  
  const defaultImages = {
    logo_url: '/images/logo.png',
    hero_images: [
      '/images/hero-1.jpg',
      '/images/hero-2.jpg',
      '/images/hero-3.jpg'
    ]
  };

  const defaultHeroContent = {
    title: 'Welcome to White Dove Wellness Holistic Therapies',
    subtitle: 'Experience the healing power of holistic therapies in a serene and nurturing environment.',
    details: '',
    benefits: [],
    button_text: 'Book Your Session'
  };

  useEffect(() => {
    publicApi.getSettings().then(res => {
      setSettings(res.data.settings);
    }).catch(() => {});
  }, []);

  const logoUrl = settings?.images?.logo_url || defaultImages.logo_url;
  const heroImages = settings?.images?.hero_images?.length > 0 
    ? settings.images.hero_images 
    : defaultImages.hero_images;
  
  const heroContent = {
    title: settings?.hero_content?.title || defaultHeroContent.title,
    subtitle: settings?.hero_content?.subtitle || defaultHeroContent.subtitle,
    details: settings?.hero_content?.details || defaultHeroContent.details,
    benefits: settings?.hero_content?.benefits || defaultHeroContent.benefits,
    button_text: settings?.hero_content?.button_text || defaultHeroContent.button_text
  };

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
            src={logoUrl}
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
            {heroContent.title}
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            {heroContent.subtitle}
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
            {heroContent.button_text}
          </button>
        </motion.div>

        {/* Hero Images - Equal size grid */}
        {/* Desktop: 3 images, Mobile: 1 image */}
        <div className="hidden md:grid grid-cols-3 gap-6" data-testid="hero-images-desktop">
          {heroImages.map((imageUrl, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.15, duration: 0.6 }}
              className="relative rounded-3xl overflow-hidden shadow-lg h-[280px]"
            >
              <img
                src={imageUrl}
                alt={`Reflexology Treatment ${index + 1}`}
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
              src={heroImages[0]}
              alt="Reflexology Treatment"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
