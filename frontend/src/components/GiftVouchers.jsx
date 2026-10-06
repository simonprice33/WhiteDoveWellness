import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { publicApi } from '../lib/api';
import { Gift, Mail, Sparkles, ArrowRight, Check } from 'lucide-react';
import GiftVoucherModal from './GiftVoucherModal';

const stepIcons = [Gift, Mail, Sparkles];

export default function GiftVouchers() {
  const [settings, setSettings] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    publicApi.getSettings()
      .then((res) => {
        const gv = res.data.settings?.gift_voucher_settings;
        if (gv?.enabled && gv.sumup_link) {
          setSettings(gv);
          setSelectedAmount(gv.amounts?.[0] ?? null);
        }
      })
      .catch(() => {});
  }, []);

  if (!settings) return null;

  const amounts = (settings.amounts || []).filter((a) => Number(a) > 0);

  return (
    <section id="vouchers" className="py-20 md:py-32 bg-[#2E2A3B] relative overflow-hidden" data-testid="gift-vouchers-section">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#9F87C4]/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-20 w-[28rem] h-[28rem] rounded-full bg-[#6BA8A0]/15 blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-6"
          >
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#C9B8E8] mb-6">
              <Gift size={14} /> Gift Vouchers
            </span>
            <h2 className="font-serif text-4xl md:text-5xl text-white leading-tight mb-6">{settings.title}</h2>
            <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-xl">{settings.subtitle}</p>

            <ol className="space-y-5">
              {(settings.how_it_works || []).map((step, idx) => {
                const Icon = stepIcons[idx % stepIcons.length];
                return (
                  <motion.li
                    key={step}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + idx * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <span className="shrink-0 w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[#C9B8E8]">
                      <Icon size={18} />
                    </span>
                    <p className="text-white/80 pt-2">{step}</p>
                  </motion.li>
                );
              })}
            </ol>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-6"
          >
            <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
              <p className="text-sm uppercase tracking-widest text-white/50 mb-5">Choose an amount</p>
              <div className="grid grid-cols-3 gap-3">
                {amounts.map((amount) => {
                  const active = selectedAmount === amount;
                  return (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setSelectedAmount(amount)}
                      className={`relative rounded-2xl py-6 font-serif text-3xl transition-all duration-200 border ${
                        active
                          ? 'bg-[#9F87C4] border-[#9F87C4] text-white shadow-lg shadow-[#9F87C4]/30 -translate-y-0.5'
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/25'
                      }`}
                      data-testid={`voucher-amount-${amount}`}
                    >
                      £{amount}
                      {active && <Check size={16} className="absolute top-2 right-2" />}
                    </button>
                  );
                })}
                {settings.allow_custom_amount && (
                  <button
                    type="button"
                    onClick={() => setSelectedAmount('custom')}
                    className={`relative rounded-2xl py-6 text-base font-medium transition-all duration-200 border ${
                      selectedAmount === 'custom'
                        ? 'bg-[#9F87C4] border-[#9F87C4] text-white shadow-lg shadow-[#9F87C4]/30 -translate-y-0.5'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/25'
                    }`}
                    data-testid="voucher-amount-custom"
                  >
                    Custom
                    {selectedAmount === 'custom' && <Check size={16} className="absolute top-2 right-2" />}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="group mt-8 w-full bg-white text-[#2E2A3B] rounded-full py-4 font-medium text-lg flex items-center justify-center gap-3 hover:bg-[#F5F3FA] transition-colors"
                data-testid="buy-voucher-btn"
              >
                <Gift size={20} className="text-[#9F87C4]" />
                {settings.button_text || 'Buy a Gift Voucher'}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
              {settings.small_print && (
                <p className="text-xs text-white/40 text-center mt-5 leading-relaxed">{settings.small_print}</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {showModal && (
        <GiftVoucherModal settings={settings} amount={selectedAmount} onClose={() => setShowModal(false)} />
      )}
    </section>
  );
}
