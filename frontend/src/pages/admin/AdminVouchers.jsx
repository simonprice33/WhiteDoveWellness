import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Plus, Search, Gift, PoundSterling } from 'lucide-react';
import { toast } from 'sonner';
import { VoucherRow } from './vouchers/VoucherRow';
import { VoucherFormDialog } from './vouchers/VoucherFormDialog';
import { RedeemVoucherDialog } from './vouchers/RedeemVoucherDialog';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'redeemed', label: 'Redeemed' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' }
];

export default function AdminVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [redeeming, setRedeeming] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.getVouchers({ search, status });
      setVouchers(res.data.vouchers || []);
      setSummary(res.data.summary || null);
    } catch {
      toast.error('Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const handleDelete = async (voucher) => {
    if (!window.confirm(`Delete voucher ${voucher.code}? This cannot be undone.`)) return;
    try {
      await adminApi.deleteVoucher(voucher.id);
      toast.success('Voucher deleted');
      load();
    } catch {
      toast.error('Failed to delete voucher');
    }
  };

  const handleStatus = async (voucher, newStatus) => {
    try {
      await adminApi.updateVoucher(voucher.id, { status: newStatus });
      toast.success(`Voucher marked ${newStatus}`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update voucher');
    }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="admin-vouchers">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-slate-800">Gift Vouchers</h1>
          <p className="text-slate-600 mt-1">Record vouchers sold through SumUp and mark them as redeemed when clients attend</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="add-voucher-btn">
          <Plus size={18} className="mr-2" />Record Voucher
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" data-testid="voucher-summary">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Active</p>
            <p className="text-2xl font-semibold text-slate-800 mt-1" data-testid="summary-active">{summary.active}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Outstanding value</p>
            <p className="text-2xl font-semibold text-[#9F87C4] mt-1 flex items-center" data-testid="summary-outstanding"><PoundSterling size={18} />{summary.outstanding_value.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Redeemed</p>
            <p className="text-2xl font-semibold text-slate-800 mt-1" data-testid="summary-redeemed">{summary.redeemed}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Expired</p>
            <p className="text-2xl font-semibold text-slate-800 mt-1" data-testid="summary-expired">{summary.expired}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code, buyer or recipient" className="pl-9" data-testid="voucher-search" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <Button key={f.value || 'all'} size="sm" variant={status === f.value ? 'default' : 'outline'} onClick={() => setStatus(f.value)} className={status === f.value ? 'bg-[#9F87C4]' : ''} data-testid={`voucher-filter-${f.value || 'all'}`}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : vouchers.length === 0 ? (
          <div className="p-12 text-center text-slate-500" data-testid="vouchers-empty">
            <Gift size={32} className="mx-auto mb-3 text-slate-300" />
            {search || status ? 'No vouchers match your search' : 'No vouchers recorded yet. Click "Record Voucher" to add one.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {vouchers.map((v) => (
              <VoucherRow key={v.id} voucher={v} onEdit={() => { setEditing(v); setFormOpen(true); }} onRedeem={() => setRedeeming(v)} onDelete={() => handleDelete(v)} onStatus={(s) => handleStatus(v, s)} />
            ))}
          </div>
        )}
      </div>

      <VoucherFormDialog open={formOpen} onOpenChange={setFormOpen} voucher={editing} onSaved={load} />
      <RedeemVoucherDialog voucher={redeeming} onOpenChange={(open) => !open && setRedeeming(null)} onRedeemed={load} />
    </div>
  );
}
