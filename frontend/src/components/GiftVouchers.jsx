import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { publicApi } from '../lib/api';
import { Gift, Mail, Sparkles, ArrowRight } from 'lucide-react';
import GiftVoucherModal from './GiftVoucherModal';

const stepIcons = [Gift, Mail, Sparkles];

export default function GiftVouchers() {
  const [settings, setSettings] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    publicApi.getSettings()
      .then((res) => {
        const gv = res.data.settings?.gift_voucher_settings;
        if (gv?.enabled && gv.sumup_link) {
          setSettings(gv);
        }
      })
      .catch(() => {});
  }, []);

  if (!settings) return null;

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
            <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#9F87C4]/20 border border-[#9F87C4]/30 flex items-center justify-center mb-6">
                <Gift size={28} className="text-[#C9B8E8]" />
              </div>
              <p className="text-white/70 mb-8 leading-relaxed">
                Choose any amount and add a personal message on our secure SumUp gift card page.
              </p>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="group w-full bg-white text-[#2E2A3B] rounded-full py-4 font-medium text-lg flex items-center justify-center gap-3 hover:bg-[#F5F3FA] transition-colors"
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
        <GiftVoucherModal settings={settings} onClose={() => setShowModal(false)} />
      )}
    </section>
  );
}
