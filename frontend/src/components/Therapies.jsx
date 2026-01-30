import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { publicApi } from '../lib/api';
import * as Icons from 'lucide-react';

export default function Therapies() {
  const [therapies, setTherapies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTherapies();
  }, []);

  const loadTherapies = async () => {
    try {
      const response = await publicApi.getTherapies();
      setTherapies(response.data.therapies || []);
    } catch (error) {
      console.error('Failed to load therapies:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName) => {
    const Icon = Icons[iconName] || Icons.Sparkles;
    return <Icon size={32} />;
  };

  if (loading) {
    return (
      <section id="therapies" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="animate-pulse">Loading therapies...</div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="therapies"
      className="py-20 md:py-32 bg-white"
      data-testid="therapies-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-slate-800 mb-4">
            Our Therapies
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Discover our range of holistic treatments designed to restore balance and promote wellbeing.
          </p>
        </motion.div>

        {/* Therapy Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {therapies.map((therapy, index) => (
            <motion.div
              key={therapy.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="service-tile bg-white rounded-2xl p-8 border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_60px_-15px_rgba(159,135,196,0.2)] group cursor-pointer"
              data-testid={`therapy-card-${therapy.id}`}
            >
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-[#9F87C4]/10 flex items-center justify-center mb-6 text-[#9F87C4] group-hover:bg-[#9F87C4] group-hover:text-white transition-all">
                {getIcon(therapy.icon)}
              </div>

              {/* Title */}
              <h3 className="font-serif text-2xl text-slate-800 mb-3 group-hover:text-[#9F87C4] transition-colors">
                {therapy.name}
              </h3>

              {/* Description */}
              <p className="text-slate-600 text-sm leading-relaxed">
                {therapy.short_description}
              </p>

              {/* Learn More Link */}
              <div className="mt-6 flex items-center text-[#9F87C4] font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <span>View Details</span>
                <Icons.ArrowRight size={16} className="ml-2" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
