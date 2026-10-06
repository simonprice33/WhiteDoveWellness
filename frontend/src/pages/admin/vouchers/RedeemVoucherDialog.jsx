import { useState, useEffect } from 'react';
import { adminApi } from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { toast } from 'sonner';

export const RedeemVoucherDialog = ({ voucher, onOpenChange, onRedeemed }) => {
  const [form, setForm] = useState({ redeemed_by: '', redemption_notes: '', amount_used: '' });
  const [saving, setSaving] = useState(false);
  const balance = Number(voucher?.balance ?? voucher?.amount ?? 0);

  useEffect(() => {
    if (voucher) setForm({ redeemed_by: voucher.recipient_name || '', redemption_notes: '', amount_used: balance.toFixed(2) });
  }, [voucher, balance]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminApi.redeemVoucher(voucher.id, form);
      toast.success(res.data.message || 'Voucher redeemed');
      onOpenChange(false);
      onRedeemed();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to redeem voucher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!voucher} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="redeem-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Redeem voucher {voucher?.code}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-slate-600">Remaining balance: <span className="font-semibold text-[#9F87C4]">£{balance.toFixed(2)}</span></p>
          <div>
            <label className="text-sm font-medium text-slate-700">Amount used (£)</label>
            <Input type="number" min="0.01" max={balance} step="0.01" value={form.amount_used} onChange={(e) => setForm({ ...form, amount_used: e.target.value })} className="mt-1" data-testid="redeem-amount-input" />
            <p className="text-xs text-slate-400 mt-1">Use less than the full balance to keep the voucher active with the remainder</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Client name</label>
            <Input value={form.redeemed_by} onChange={(e) => setForm({ ...form, redeemed_by: e.target.value })} className="mt-1" data-testid="redeem-client-input" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Notes (treatment, date...)</label>
            <Input value={form.redemption_notes} onChange={(e) => setForm({ ...form, redemption_notes: e.target.value })} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="redeem-confirm-btn">{saving ? 'Saving...' : 'Mark as redeemed'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
