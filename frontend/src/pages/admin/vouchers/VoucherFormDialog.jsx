import { useState, useEffect } from 'react';
import { adminApi } from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  code: '', amount: '', buyer_name: '', buyer_email: '', recipient_name: '', purchased_at: today(), expires_at: '', notes: ''
});

export const VoucherFormDialog = ({ open, onOpenChange, voucher, onSaved }) => {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(voucher ? {
      code: voucher.code, amount: voucher.amount, buyer_name: voucher.buyer_name || '', buyer_email: voucher.buyer_email || '',
      recipient_name: voucher.recipient_name || '', purchased_at: voucher.purchased_at || today(), expires_at: voucher.expires_at || '', notes: voucher.notes || ''
    } : emptyForm());
  }, [open, voucher]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (voucher) {
        await adminApi.updateVoucher(voucher.id, form);
        toast.success('Voucher updated');
      } else {
        await adminApi.createVoucher(form);
        toast.success('Voucher recorded');
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save voucher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="voucher-dialog">
        <DialogHeader><DialogTitle className="font-serif text-xl">{voucher ? 'Edit Voucher' : 'Record Gift Voucher'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Voucher code *</label>
              <Input value={form.code} onChange={set('code')} required placeholder="e.g. WDW-7K3P9Q" className="mt-1 font-mono uppercase" data-testid="voucher-code-input" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Value (£) *</label>
              <Input type="number" min="1" step="0.01" value={form.amount} onChange={set('amount')} required className="mt-1" data-testid="voucher-amount-input" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Recipient name</label>
            <Input value={form.recipient_name} onChange={set('recipient_name')} className="mt-1" data-testid="voucher-recipient-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Buyer name</label>
              <Input value={form.buyer_name} onChange={set('buyer_name')} className="mt-1" data-testid="voucher-buyer-input" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Buyer email</label>
              <Input type="email" value={form.buyer_email} onChange={set('buyer_email')} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Purchased</label>
              <Input type="date" value={form.purchased_at} onChange={set('purchased_at')} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Expires</label>
              <Input type="date" value={form.expires_at} onChange={set('expires_at')} className="mt-1" />
              <p className="text-xs text-slate-400 mt-1">Defaults to 12 months</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <Textarea value={form.notes} onChange={set('notes')} rows={2} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="voucher-save-btn">{saving ? 'Saving...' : voucher ? 'Update' : 'Record Voucher'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
