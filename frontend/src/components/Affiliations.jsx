import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { publicApi } from '../lib/api';

export default function Affiliations() {
  const [affiliations, setAffiliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    loadAffiliations();
  }, []);

  const loadAffiliations = async () => {
    try {
      const response = await publicApi.getAffiliations();
      setAffiliations(response.data.affiliations || []);
    } catch (error) {
      console.error('Failed to load affiliations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || affiliations.length === 0) {
    return null;
  }

  // Double the affiliations for infinite scroll effect
  const doubledAffiliations = [...affiliations, ...affiliations];

  return (
    <section
      className="py-16 bg-[#F5F3FA]"
      data-testid="affiliations-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="font-serif text-2xl md:text-3xl text-slate-800 mb-2">
            Professional Affiliations
          </h2>
          <p className="text-slate-600">Accredited & Insured</p>
        </motion.div>

        {/* Desktop: Marquee */}
        <div
          className="hidden md:block overflow-hidden"
          data-testid="affiliations-marquee"
        >
          <div className="marquee-content flex items-center gap-16">
            {doubledAffiliations.map((affiliation, index) => (
              <a
                key={`${affiliation.id}-${index}`}
                href={affiliation.website_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                data-testid={`affiliation-${affiliation.id}`}
              >
                <img
                  src={affiliation.logo_url}
                  alt={affiliation.name}
                  className="h-16 w-auto object-contain grayscale hover:grayscale-0 transition-all"
                />
              </a>
            ))}
          </div>
        </div>

        {/* Mobile: Static Grid */}
        <div
          className="md:hidden grid grid-cols-2 gap-6"
          data-testid="affiliations-static"
        >
          {affiliations.map((affiliation) => (
            <a
              key={affiliation.id}
              href={affiliation.website_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-4 bg-white rounded-xl"
            >
              <img
                src={affiliation.logo_url}
                alt={affiliation.name}
                className="h-12 w-auto object-contain"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
