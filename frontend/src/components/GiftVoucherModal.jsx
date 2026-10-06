import { motion } from 'framer-motion';
import { Gift, X, ExternalLink, ShieldCheck, Mail, Clock } from 'lucide-react';

export default function GiftVoucherModal({ settings, amount, onClose }) {
  const amountLabel = amount === 'custom' ? 'an amount of your choice' : amount ? `£${amount}` : 'your chosen amount';

  const openSumUp = () => {
    window.open(settings.sumup_link, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose} data-testid="gift-voucher-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="bg-[#2E2A3B] p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors" data-testid="close-voucher-modal-btn">
            <X size={20} />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-[#9F87C4] flex items-center justify-center mb-4">
            <Gift size={22} />
          </div>
          <h3 className="font-serif text-2xl">Your gift voucher</h3>
          <p className="text-white/70 text-sm mt-1">You've chosen {amountLabel}.</p>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-slate-600 text-sm leading-relaxed">
            Gift vouchers are purchased through our payment partner SumUp. You'll be taken to our
            secure SumUp gift card page in a new tab, where you can
            {amount === 'custom' ? ' enter your own amount' : ' select the amount'} and add a personal message.
          </p>

          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-center gap-3"><ShieldCheck size={18} className="text-[#9F87C4] shrink-0" /> Secure card payment handled by SumUp</li>
            <li className="flex items-center gap-3"><Mail size={18} className="text-[#9F87C4] shrink-0" /> Voucher emailed instantly to you or the recipient</li>
            <li className="flex items-center gap-3"><Clock size={18} className="text-[#9F87C4] shrink-0" /> Valid for 12 months on any treatment</li>
          </ul>

          <button
            onClick={openSumUp}
            className="w-full bg-[#9F87C4] hover:bg-[#8A74B0] text-white rounded-full py-4 font-medium flex items-center justify-center gap-2 transition-colors"
            data-testid="continue-to-sumup-btn"
          >
            Continue to SumUp
            <ExternalLink size={16} />
          </button>
          <p className="text-xs text-slate-400 text-center">Opens giftcards.sumup.com in a new tab</p>
        </div>
      </motion.div>
    </div>
  );
}
