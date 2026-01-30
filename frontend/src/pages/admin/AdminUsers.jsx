import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', is_active: true });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const response = await adminApi.getUsers();
      setUsers(response.data.users || []);
    } catch (error) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const openDialog = (user = null) => {
    if (user) {
      setEditing(user);
      setFormData({ username: user.username, email: user.email, password: '', is_active: user.is_active !== false });
    } else {
      setEditing(null);
      setFormData({ username: '', email: '', password: '', is_active: true });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (!data.password) delete data.password;
      if (editing) {
        await adminApi.updateUser(editing.id, data);
        toast.success('Updated');
      } else {
        await adminApi.createUser(data);
        toast.success('Created');
      }
      setDialogOpen(false);
      loadUsers();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete admin user "${user.username}"?`)) return;
    try {
      await adminApi.deleteUser(user.id);
      toast.success('Deleted');
      loadUsers();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="admin-users">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="font-serif text-3xl text-slate-800">Admin Users</h1><p className="text-slate-600 mt-1">Manage admin accounts</p></div>
        <Button onClick={() => openDialog()} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="add-user-btn"><Plus size={18} className="mr-2" />Add User</Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-500">Loading...</div> : users.length === 0 ? <div className="p-8 text-center text-slate-500">No users</div> : (
          <div className="divide-y divide-slate-50">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-slate-50" data-testid={`user-row-${user.id}`}>
                <div className="w-10 h-10 rounded-full bg-[#9F87C4]/10 flex items-center justify-center text-[#9F87C4] font-medium">{user.username.charAt(0).toUpperCase()}</div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{user.username}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
                {!user.is_active && <span className="px-2 py-0.5 bg-red-50 text-red-500 text-xs rounded">Inactive</span>}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openDialog(user)}><Pencil size={16} /></Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(user)}><Trash2 size={16} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="user-dialog">
          <DialogHeader><DialogTitle className="font-serif text-xl">{editing ? 'Edit' : 'Add'} Admin User</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-sm font-medium text-slate-700">Username *</label><Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required className="mt-1" /></div>
            <div><label className="text-sm font-medium text-slate-700">Email *</label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="mt-1" /></div>
            <div><label className="text-sm font-medium text-slate-700">{editing ? 'New Password (leave blank to keep current)' : 'Password *'}</label><Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editing} className="mt-1" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="rounded" /><label htmlFor="is_active" className="text-sm text-slate-700">Active</label></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" className="bg-[#9F87C4] hover:bg-[#8A6EB5]">{editing ? 'Update' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
