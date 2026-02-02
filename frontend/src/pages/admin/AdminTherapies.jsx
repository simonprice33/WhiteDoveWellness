import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const iconOptions = [
  'Footprints', 'Hand', 'Flower2', 'Gem', 'Sparkles', 'Smile', 'Heart', 'Star', 'Moon', 'Sun'
];

export default function AdminTherapies() {
  const [therapies, setTherapies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTherapy, setEditingTherapy] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    short_description: '',
    full_description: '',
    icon: 'Sparkles',
    display_order: 0,
    is_active: true,
    coming_soon: false
  });

  useEffect(() => {
    loadTherapies();
  }, []);

  const loadTherapies = async () => {
    try {
      const response = await adminApi.getTherapies();
      setTherapies(response.data.therapies || []);
    } catch (error) {
      toast.error('Failed to load therapies');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (therapy = null) => {
    if (therapy) {
      setEditingTherapy(therapy);
      setFormData({
        name: therapy.name,
        short_description: therapy.short_description,
        full_description: therapy.full_description || '',
        icon: therapy.icon || 'Sparkles',
        display_order: therapy.display_order || 0,
        is_active: therapy.is_active !== false,
        coming_soon: therapy.coming_soon === true
      });
    } else {
      setEditingTherapy(null);
      setFormData({
        name: '',
        short_description: '',
        full_description: '',
        icon: 'Sparkles',
        display_order: therapies.length,
        is_active: true,
        coming_soon: false
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTherapy) {
        await adminApi.updateTherapy(editingTherapy.id, formData);
        toast.success('Therapy updated');
      } else {
        await adminApi.createTherapy(formData);
        toast.success('Therapy created');
      }
      setDialogOpen(false);
      loadTherapies();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save therapy');
    }
  };

  const handleDelete = async (therapy) => {
    if (!window.confirm(`Delete "${therapy.name}"? This will also delete all associated prices.`)) {
      return;
    }
    try {
      await adminApi.deleteTherapy(therapy.id);
      toast.success('Therapy deleted');
      loadTherapies();
    } catch (error) {
      toast.error('Failed to delete therapy');
    }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="admin-therapies">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-slate-800">Therapies</h1>
          <p className="text-slate-600 mt-1">Manage your therapy services</p>
        </div>
        <Button
          onClick={() => openDialog()}
          className="bg-[#9F87C4] hover:bg-[#8A6EB5]"
          data-testid="add-therapy-btn"
        >
          <Plus size={18} className="mr-2" />
          Add Therapy
        </Button>
      </div>

      {/* Therapies List */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : therapies.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No therapies yet</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {therapies.map((therapy) => (
              <div
                key={therapy.id}
                className="flex items-center gap-4 p-4 hover:bg-slate-50"
                data-testid={`therapy-row-${therapy.id}`}
              >
                <GripVertical size={20} className="text-slate-300" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">{therapy.name}</p>
                    {therapy.coming_soon && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium">
                        Coming Soon
                      </span>
                    )}
                    {!therapy.is_active && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                    {therapy.short_description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDialog(therapy)}
                    data-testid={`edit-therapy-${therapy.id}`}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(therapy)}
                    data-testid={`delete-therapy-${therapy.id}`}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="therapy-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingTherapy ? 'Edit Therapy' : 'Add Therapy'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="mt-1"
                data-testid="therapy-name-input"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Short Description *</label>
              <Input
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                required
                className="mt-1"
                data-testid="therapy-short-desc-input"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Full Description</label>
              <Textarea
                value={formData.full_description}
                onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
                rows={4}
                className="mt-1"
                data-testid="therapy-full-desc-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Icon</label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"
                  data-testid="therapy-icon-select"
                >
                  {iconOptions.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Display Order</label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  className="mt-1"
                  data-testid="therapy-order-input"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-slate-300"
                data-testid="therapy-active-checkbox"
              />
              <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="therapy-submit-btn">
                {editingTherapy ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
