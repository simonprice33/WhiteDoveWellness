import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: '', slug: '', content: '', display_order: 0, is_active: true });

  useEffect(() => { loadPolicies(); }, []);

  const loadPolicies = async () => {
    try {
      const response = await adminApi.getPolicies();
      setPolicies(response.data.policies || []);
    } catch (error) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const generateSlug = (title) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const openDialog = (item = null) => {
    if (item) {
      setEditing(item);
      setFormData({ title: item.title, slug: item.slug, content: item.content, display_order: item.display_order || 0, is_active: item.is_active !== false });
    } else {
      setEditing(null);
      setFormData({ title: '', slug: '', content: '', display_order: policies.length, is_active: true });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await adminApi.updatePolicy(editing.id, formData);
        toast.success('Updated');
      } else {
        await adminApi.createPolicy(formData);
        toast.success('Created');
      }
      setDialogOpen(false);
      loadPolicies();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await adminApi.deletePolicy(item.id);
      toast.success('Deleted');
      loadPolicies();
    } catch (error) { toast.error('Failed'); }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="admin-policies">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="font-serif text-3xl text-slate-800">Policies</h1><p className="text-slate-600 mt-1">Manage site policies and terms</p></div>
        <Button onClick={() => openDialog()} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="add-policy-btn"><Plus size={18} className="mr-2" />Add Policy</Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-500">Loading...</div> : policies.length === 0 ? <div className="p-8 text-center text-slate-500">No policies yet</div> : (
          <div className="divide-y divide-slate-50">
            {policies.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-slate-50" data-testid={`policy-row-${item.id}`}>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{item.title}</p>
                  <p className="text-sm text-slate-500">/policy/{item.slug}</p>
                </div>
                {!item.is_active && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">Inactive</span>}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openDialog(item)}><Pencil size={16} /></Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(item)}><Trash2 size={16} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl" data-testid="policy-dialog">
          <DialogHeader><DialogTitle className="font-serif text-xl">{editing ? 'Edit' : 'Add'} Policy</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-slate-700">Title *</label><Input value={formData.title} onChange={(e) => { setFormData({ ...formData, title: e.target.value, slug: editing ? formData.slug : generateSlug(e.target.value) }); }} required className="mt-1" /></div>
              <div><label className="text-sm font-medium text-slate-700">Slug *</label><Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required className="mt-1" /></div>
            </div>
            <div><label className="text-sm font-medium text-slate-700">Content * (Markdown supported)</label><Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required rows={12} className="mt-1 font-mono text-sm" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="rounded" /><label htmlFor="is_active" className="text-sm text-slate-700">Active</label></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" className="bg-[#9F87C4] hover:bg-[#8A6EB5]">{editing ? 'Update' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
