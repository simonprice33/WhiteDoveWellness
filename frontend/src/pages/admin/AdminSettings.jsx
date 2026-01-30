import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const response = await adminApi.getSettings();
      setSettings(response.data.settings);
    } catch (error) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateSettings(settings);
      toast.success('Settings saved');
    } catch (error) { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const updateSocialLink = (key, value) => {
    setSettings({
      ...settings,
      social_links: { ...settings.social_links, [key]: value }
    });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="p-6 lg:p-8" data-testid="admin-settings">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-slate-800">Site Settings</h1>
        <p className="text-slate-600 mt-1">Manage your website settings and social links</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        {/* Business Info */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
          <h2 className="font-serif text-xl text-slate-800 mb-4">Business Information</h2>
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-slate-700">Business Name</label><Input value={settings?.business_name || ''} onChange={(e) => setSettings({ ...settings, business_name: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-slate-700">Tagline</label><Input value={settings?.tagline || ''} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-slate-700">Email</label><Input type="email" value={settings?.email || ''} onChange={(e) => setSettings({ ...settings, email: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-slate-700">Phone</label><Input value={settings?.phone || ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-slate-700">Address</label><Input value={settings?.address || ''} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="mt-1" /></div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
          <h2 className="font-serif text-xl text-slate-800 mb-4">Social Links</h2>
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-slate-700">Facebook URL</label><Input value={settings?.social_links?.facebook_url || ''} onChange={(e) => updateSocialLink('facebook_url', e.target.value)} className="mt-1" placeholder="https://facebook.com/..." data-testid="facebook-url-input" /></div>
            <div><label className="text-sm font-medium text-slate-700">Instagram URL</label><Input value={settings?.social_links?.instagram_url || ''} onChange={(e) => updateSocialLink('instagram_url', e.target.value)} className="mt-1" placeholder="https://instagram.com/..." data-testid="instagram-url-input" /></div>
            <div><label className="text-sm font-medium text-slate-700">Twitter URL</label><Input value={settings?.social_links?.twitter_url || ''} onChange={(e) => updateSocialLink('twitter_url', e.target.value)} className="mt-1" placeholder="https://twitter.com/..." /></div>
            <div><label className="text-sm font-medium text-slate-700">LinkedIn URL</label><Input value={settings?.social_links?.linkedin_url || ''} onChange={(e) => updateSocialLink('linkedin_url', e.target.value)} className="mt-1" placeholder="https://linkedin.com/..." /></div>
          </div>
        </div>

        <Button type="submit" disabled={saving} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="save-settings-btn">
          <Save size={18} className="mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>
    </div>
  );
}
