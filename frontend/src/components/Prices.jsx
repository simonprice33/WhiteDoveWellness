import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { publicApi } from '../lib/api';
import { Clock, PoundSterling } from 'lucide-react';

export default function Prices() {
  const [therapies, setTherapies] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [therapiesRes, pricesRes] = await Promise.all([
        publicApi.getTherapies(),
        publicApi.getPrices()
      ]);
      setTherapies(therapiesRes.data.therapies || []);
      setPrices(pricesRes.data.prices || []);
    } catch (error) {
      console.error('Failed to load prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTherapyName = (therapyId) => {
    const therapy = therapies.find(t => t.id === therapyId);
    return therapy?.name || 'Unknown';
  };

  // Group prices by therapy
  const groupedPrices = therapies.map(therapy => ({
    ...therapy,
    prices: prices.filter(p => p.therapy_id === therapy.id)
  })).filter(t => t.prices.length > 0);

  if (loading) {
    return (
      <section id="prices" className="py-20 bg-[#FAFAF9]">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="animate-pulse">Loading prices...</div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="prices"
      className="py-20 md:py-32"
      style={{
        background: 'linear-gradient(180deg, #FAFAF9 0%, #F5F3FA 100%)'
      }}
      data-testid="prices-section"
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
            Treatment Prices
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Transparent pricing for all our holistic therapy services.
          </p>
        </motion.div>

        {/* Price List by Therapy */}
        <div className="space-y-8">
          {groupedPrices.map((therapy, therapyIndex) => (
            <motion.div
              key={therapy.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: therapyIndex * 0.1 }}
              className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)]"
              data-testid={`price-group-${therapy.id}`}
            >
              <h3 className="font-serif text-2xl text-slate-800 mb-6 pb-4 border-b border-slate-100">
                {therapy.name}
              </h3>

              <div className="space-y-4">
                {therapy.prices.map((price, priceIndex) => (
                  <div
                    key={price.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 border-b border-slate-50 last:border-0"
                    data-testid={`price-item-${price.id}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800">{price.name}</h4>
                      {price.description && (
                        <p className="text-sm text-slate-500 mt-1">{price.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-6 mt-3 sm:mt-0">
                      {/* Duration */}
                      <div className="flex items-center text-slate-500 text-sm">
                        <Clock size={16} className="mr-2" />
                        {price.duration}
                      </div>

                      {/* Price */}
                      <div className="flex items-center text-[#9F87C4] font-semibold text-xl">
                        <PoundSterling size={18} className="mr-1" />
                        {price.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-slate-500 text-sm mt-8"
        >
          All prices include consultation. Gift vouchers available.
        </motion.p>
      </div>
    </section>
  );
}
