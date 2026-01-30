import { useState, useEffect, useRef } from 'react';
import { adminApi, getImageUrl } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Plus, Pencil, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAffiliations() {
  const [affiliations, setAffiliations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', logo_url: '', website_url: '', display_order: 0, is_active: true });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadAffiliations(); }, []);

  const loadAffiliations = async () => {
    try {
      const response = await adminApi.getAffiliations();
      setAffiliations(response.data.affiliations || []);
    } catch (error) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const openDialog = (item = null) => {
    if (item) {
      setEditing(item);
      setFormData({ name: item.name, logo_url: item.logo_url, website_url: item.website_url || '', display_order: item.display_order || 0, is_active: item.is_active !== false });
    } else {
      setEditing(null);
      setFormData({ name: '', logo_url: '', website_url: '', display_order: affiliations.length, is_active: true });
    }
    setDialogOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      
      const response = await adminApi.uploadImage(formDataUpload);
      if (response.data.success) {
        setFormData({ ...formData, logo_url: response.data.url });
        toast.success('Image uploaded');
      }
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearImage = () => {
    setFormData({ ...formData, logo_url: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await adminApi.updateAffiliation(editing.id, formData);
        toast.success('Updated');
      } else {
        await adminApi.createAffiliation(formData);
        toast.success('Created');
      }
      setDialogOpen(false);
      loadAffiliations();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await adminApi.deleteAffiliation(item.id);
      toast.success('Deleted');
      loadAffiliations();
    } catch (error) { toast.error('Failed'); }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="admin-affiliations">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="font-serif text-3xl text-slate-800">Affiliations</h1><p className="text-slate-600 mt-1">Manage professional affiliations</p></div>
        <Button onClick={() => openDialog()} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="add-affiliation-btn"><Plus size={18} className="mr-2" />Add Affiliation</Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-500">Loading...</div> : affiliations.length === 0 ? <div className="p-8 text-center text-slate-500">No affiliations yet</div> : (
          <div className="divide-y divide-slate-50">
            {affiliations.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-slate-50" data-testid={`affiliation-row-${item.id}`}>
                <img src={item.logo_url} alt={item.name} className="w-16 h-10 object-contain bg-slate-50 rounded" />
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{item.name}</p>
                  {item.website_url && <a href={item.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#9F87C4] hover:underline">{item.website_url}</a>}
                </div>
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
        <DialogContent className="sm:max-w-lg" data-testid="affiliation-dialog">
          <DialogHeader><DialogTitle className="font-serif text-xl">{editing ? 'Edit' : 'Add'} Affiliation</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Name *</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="mt-1" />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700">Logo *</label>
              <div className="mt-1 space-y-2">
                {/* Image preview */}
                {formData.logo_url && (
                  <div className="relative inline-block">
                    <img 
                      src={formData.logo_url} 
                      alt="Logo preview" 
                      className="h-20 object-contain bg-slate-50 rounded border border-slate-200 p-2"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                
                {/* Upload button */}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2"
                  >
                    <Upload size={16} />
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <span className="text-xs text-slate-500">or enter URL below</span>
                </div>
                
                {/* URL input */}
                <Input 
                  value={formData.logo_url} 
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} 
                  placeholder="https://... or upload above"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700">Website URL</label>
              <Input value={formData.website_url} onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} className="mt-1" />
            </div>
            
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="rounded" />
              <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#9F87C4] hover:bg-[#8A6EB5]" disabled={!formData.logo_url}>{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
