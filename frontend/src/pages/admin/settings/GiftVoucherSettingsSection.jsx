import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Gift } from 'lucide-react';

export const GiftVoucherSettingsSection = ({ value, onChange }) => {
  const gv = value || {};
  const update = (patch) => onChange({ ...gv, ...patch });

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6" data-testid="gift-voucher-settings-section">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-[#F5F3FA] rounded-lg">
          <Gift size={20} className="text-[#9F87C4]" />
        </div>
        <div className="flex-1">
          <h2 className="font-serif text-xl text-slate-800">Gift Vouchers Section</h2>
          <p className="text-sm text-slate-500">Controls the gift voucher section on the public website</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
          <input type="checkbox" checked={gv.enabled !== false} onChange={(e) => update({ enabled: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-[#9F87C4] focus:ring-[#9F87C4]" data-testid="gift-voucher-enabled" />
          Show on website
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">SumUp gift card link</label>
          <Input value={gv.sumup_link || ''} onChange={(e) => update({ sumup_link: e.target.value })} placeholder="https://giftcards.sumup.com/order/..." data-testid="gift-voucher-link" />
          <p className="text-xs text-slate-500 mt-1">Found in SumUp dashboard → Gift cards → Share link</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Heading</label>
          <Input value={gv.title || ''} onChange={(e) => update({ title: e.target.value })} data-testid="gift-voucher-title" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Intro text</label>
          <Textarea value={gv.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} rows={2} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Suggested amounts (£, comma separated)</label>
            <Input
              value={(gv.amounts || []).join(', ')}
              onChange={(e) => update({ amounts: e.target.value.split(',').map((s) => Number(s.trim())).filter((n) => n > 0) })}
              placeholder="25, 30, 40, 50, 100"
              data-testid="gift-voucher-amounts"
            />
            <p className="text-xs text-slate-500 mt-1">Match these to the amounts set in your SumUp gift card settings — SumUp can't pre-select an amount from a link</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Button text</label>
            <Input value={gv.button_text || ''} onChange={(e) => update({ button_text: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={gv.allow_custom_amount !== false} onChange={(e) => update({ allow_custom_amount: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-[#9F87C4]" />
          Show "choose your own amount" option
        </label>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">How it works (one step per line)</label>
          <Textarea
            value={(gv.how_it_works || []).join('\n')}
            onChange={(e) => update({ how_it_works: e.target.value.split('\n').filter((s) => s.trim()) })}
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Small print</label>
          <Input value={gv.small_print || ''} onChange={(e) => update({ small_print: e.target.value })} />
        </div>
      </div>
    </div>
  );
};
