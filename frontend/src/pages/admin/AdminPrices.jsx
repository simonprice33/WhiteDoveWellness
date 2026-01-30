import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPrices() {
  const [therapies, setTherapies] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [formData, setFormData] = useState({
    therapy_id: '',
    name: '',
    duration: '',
    price: '',
    description: '',
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [therapiesRes, pricesRes] = await Promise.all([
        adminApi.getTherapies(),
        adminApi.getPrices()
      ]);
      setTherapies(therapiesRes.data.therapies || []);
      setPrices(pricesRes.data.prices || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getTherapyName = (therapyId) => {
    const therapy = therapies.find(t => t.id === therapyId);
    return therapy?.name || 'Unknown';
  };

  const openDialog = (price = null) => {
    if (price) {
      setEditingPrice(price);
      setFormData({
        therapy_id: price.therapy_id,
        name: price.name,
        duration: price.duration,
        price: price.price.toString(),
        description: price.description || '',
        display_order: price.display_order || 0,
        is_active: price.is_active !== false
      });
    } else {
      setEditingPrice(null);
      setFormData({
        therapy_id: therapies[0]?.id || '',
        name: '',
        duration: '60 minutes',
        price: '',
        description: '',
        display_order: prices.length,
        is_active: true
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, price: parseFloat(formData.price) };
      if (editingPrice) {
        await adminApi.updatePrice(editingPrice.id, data);
        toast.success('Price updated');
      } else {
        await adminApi.createPrice(data);
        toast.success('Price created');
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save price');
    }
  };

  const handleDelete = async (price) => {
    if (!window.confirm(`Delete "${price.name}"?`)) return;
    try {
      await adminApi.deletePrice(price.id);
      toast.success('Price deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete price');
    }
  };

  // Group prices by therapy
  const groupedPrices = therapies.map(therapy => ({
    ...therapy,
    prices: prices.filter(p => p.therapy_id === therapy.id)
  }));

  return (
    <div className="p-6 lg:p-8" data-testid="admin-prices">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-slate-800">Prices</h1>
          <p className="text-slate-600 mt-1">Manage your therapy prices</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="add-price-btn">
          <Plus size={18} className="mr-2" />
          Add Price
        </Button>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : groupedPrices.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No prices yet</div>
        ) : (
          groupedPrices.map((therapy) => (
            <div key={therapy.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <h2 className="font-medium text-slate-800">{therapy.name}</h2>
              </div>
              {therapy.prices.length === 0 ? (
                <div className="p-4 text-slate-500 text-sm">No prices for this therapy</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {therapy.prices.map((price) => (
                    <div key={price.id} className="flex items-center gap-4 p-4 hover:bg-slate-50" data-testid={`price-row-${price.id}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800">{price.name}</p>
                          {!price.is_active && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">Inactive</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{price.duration}</p>
                      </div>
                      <p className="text-lg font-semibold text-[#9F87C4]">£{price.price.toFixed(2)}</p>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(price)}>
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(price)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="price-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{editingPrice ? 'Edit Price' : 'Add Price'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Therapy *</label>
              <select
                value={formData.therapy_id}
                onChange={(e) => setFormData({ ...formData, therapy_id: e.target.value })}
                required
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"
                data-testid="price-therapy-select"
              >
                <option value="">Select therapy</option>
                {therapies.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Name *</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="mt-1" data-testid="price-name-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Duration *</label>
                <Input value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} required className="mt-1" placeholder="60 minutes" data-testid="price-duration-input" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Price (£) *</label>
                <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required className="mt-1" data-testid="price-amount-input" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Description</label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="rounded border-slate-300" />
              <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="price-submit-btn">{editingPrice ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
