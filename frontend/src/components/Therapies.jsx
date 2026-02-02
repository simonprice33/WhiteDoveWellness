import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { publicApi } from '../lib/api';
import * as Icons from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

export default function Therapies() {
  const [therapies, setTherapies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTherapy, setSelectedTherapy] = useState(null);

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

  const getIconSmall = (iconName) => {
    const Icon = Icons[iconName] || Icons.Sparkles;
    return <Icon size={24} />;
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
              className="service-tile bg-white rounded-2xl p-8 border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_60px_-15px_rgba(159,135,196,0.2)] group cursor-pointer relative"
              onClick={() => setSelectedTherapy(therapy)}
              data-testid={`therapy-card-${therapy.id}`}
            >
              {/* Coming Soon Badge */}
              {therapy.coming_soon && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                  Coming Soon
                </div>
              )}

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

      {/* Therapy Details Dialog */}
      <Dialog open={!!selectedTherapy} onOpenChange={() => setSelectedTherapy(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedTherapy && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#9F87C4]/10 flex items-center justify-center text-[#9F87C4]">
                    {getIconSmall(selectedTherapy.icon)}
                  </div>
                  <div>
                    <DialogTitle className="font-serif text-2xl text-slate-800">
                      {selectedTherapy.name}
                    </DialogTitle>
                    {selectedTherapy.coming_soon && (
                      <span className="inline-block mt-1 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>
              </DialogHeader>
              
              <div className="mt-4 space-y-4">
                {/* Full Description */}
                <div>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedTherapy.full_description || selectedTherapy.short_description}
                  </p>
                </div>

                {/* Benefits if available */}
                {selectedTherapy.benefits && selectedTherapy.benefits.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">Benefits</h4>
                    <ul className="space-y-2">
                      {selectedTherapy.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-600 text-sm">
                          <Icons.Check size={16} className="text-[#9F87C4] mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prices if available */}
                {selectedTherapy.prices && selectedTherapy.prices.length > 0 && (
                  <div className="bg-[#F5F3FA] rounded-xl p-4">
                    <h4 className="font-medium text-slate-800 mb-3">Pricing</h4>
                    <div className="space-y-2">
                      {selectedTherapy.prices.map((price, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm">{price.duration}</span>
                          <span className="font-semibold text-[#9F87C4]">£{price.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="pt-4">
                  {selectedTherapy.coming_soon ? (
                    <div className="block w-full bg-slate-200 text-slate-500 text-center py-3 rounded-xl font-medium cursor-not-allowed">
                      Coming Soon - Contact Us For Updates
                    </div>
                  ) : (
                    <a
                      href="#contact"
                      onClick={() => setSelectedTherapy(null)}
                      className="block w-full bg-[#9F87C4] hover:bg-[#8A6EB5] text-white text-center py-3 rounded-xl font-medium transition-colors"
                    >
                      Book This Treatment
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
