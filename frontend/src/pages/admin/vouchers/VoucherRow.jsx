import { Button } from '../../../components/ui/button';
import { Pencil, Trash2, CheckCircle2, RotateCcw, Ban } from 'lucide-react';

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800',
  redeemed: 'bg-slate-100 text-slate-700',
  expired: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-800'
};

const formatDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export const VoucherRow = ({ voucher, onEdit, onRedeem, onDelete, onStatus }) => {
  const balance = Number(voucher.balance ?? voucher.amount);
  const partiallyUsed = voucher.status === 'active' && balance < voucher.amount;

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 hover:bg-slate-50" data-testid={`voucher-row-${voucher.code}`}>
      <div className="md:w-40">
        <p className="font-mono font-semibold text-slate-800 tracking-wide">{voucher.code}</p>
        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[voucher.status] || 'bg-gray-100'}`} data-testid={`voucher-status-${voucher.code}`}>
          {voucher.status}
        </span>
      </div>

      <div className="md:w-28">
        <p className="text-lg font-semibold text-[#9F87C4]">£{balance.toFixed(2)}</p>
        {partiallyUsed && <p className="text-xs text-slate-400">of £{Number(voucher.amount).toFixed(2)}</p>}
      </div>

      <div className="flex-1 text-sm text-slate-600 space-y-0.5">
        {voucher.recipient_name && <p><span className="text-slate-400">For:</span> {voucher.recipient_name}</p>}
        {voucher.buyer_name && <p><span className="text-slate-400">Bought by:</span> {voucher.buyer_name}{voucher.buyer_email ? ` · ${voucher.buyer_email}` : ''}</p>}
        <p className="text-xs text-slate-400">Purchased {formatDate(voucher.purchased_at)} · Expires {formatDate(voucher.expires_at)}{voucher.redeemed_at ? ` · Redeemed ${formatDate(voucher.redeemed_at.slice(0, 10))}` : ''}</p>
        {voucher.notes && <p className="text-xs text-slate-500 italic">{voucher.notes}</p>}
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {voucher.status === 'active' && (
          <Button size="sm" onClick={onRedeem} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid={`redeem-voucher-${voucher.code}`}>
            <CheckCircle2 size={14} className="mr-1" />Redeem
          </Button>
        )}
        {voucher.status === 'active' && (
          <Button variant="ghost" size="icon" title="Cancel voucher" onClick={() => onStatus('cancelled')} data-testid={`cancel-voucher-${voucher.code}`}><Ban size={16} /></Button>
        )}
        {voucher.status !== 'active' && (
          <Button variant="ghost" size="sm" title="Reactivate" onClick={() => onStatus('active')} data-testid={`reactivate-voucher-${voucher.code}`}><RotateCcw size={14} className="mr-1" />Reactivate</Button>
        )}
        <Button variant="ghost" size="icon" onClick={onEdit} data-testid={`edit-voucher-${voucher.code}`}><Pencil size={16} /></Button>
        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onDelete} data-testid={`delete-voucher-${voucher.code}`}><Trash2 size={16} /></Button>
      </div>
    </div>
  );
};
