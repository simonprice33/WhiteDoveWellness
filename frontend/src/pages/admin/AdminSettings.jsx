import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Save, Plus, Trash2, Image, Type } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const response = await adminApi.getSettings();
      const data = response.data.settings;
      
      // Ensure images object exists with defaults
      if (!data.images) {
        data.images = {
          logo_url: '/images/logo.png',
          hero_images: ['/images/hero-1.jpg', '/images/hero-2.jpg', '/images/hero-3.jpg'],
          contact_image_url: '/images/contact-dove.jpg'
        };
      }

      // Ensure hero_content exists with defaults
      if (!data.hero_content) {
        data.hero_content = {
          title: 'Welcome to White Dove Wellness Holistic Therapies',
          subtitle: 'Experience the healing power of holistic therapies in a serene and nurturing environment.',
          button_text: 'Book Your Session'
        };
      }
      
      setSettings(data);
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

  const updateImage = (key, value) => {
    setSettings({
      ...settings,
      images: { ...settings.images, [key]: value }
    });
  };

  const updateHeroContent = (key, value) => {
    setSettings({
      ...settings,
      hero_content: { ...settings.hero_content, [key]: value }
    });
  };

  const addBenefit = () => {
    const benefits = [...(settings?.hero_content?.benefits || []), ''];
    setSettings({
      ...settings,
      hero_content: { ...settings.hero_content, benefits }
    });
  };

  const updateBenefit = (index, value) => {
    const benefits = [...(settings?.hero_content?.benefits || [])];
    benefits[index] = value;
    setSettings({
      ...settings,
      hero_content: { ...settings.hero_content, benefits }
    });
  };

  const removeBenefit = (index) => {
    const benefits = [...(settings?.hero_content?.benefits || [])];
    benefits.splice(index, 1);
    setSettings({
      ...settings,
      hero_content: { ...settings.hero_content, benefits }
    });
  };

  const updateHeroImage = (index, value) => {
    const heroImages = [...(settings.images?.hero_images || [])];
    heroImages[index] = value;
    setSettings({
      ...settings,
      images: { ...settings.images, hero_images: heroImages }
    });
  };

  const addHeroImage = () => {
    const heroImages = [...(settings.images?.hero_images || []), ''];
    setSettings({
      ...settings,
      images: { ...settings.images, hero_images: heroImages }
    });
  };

  const removeHeroImage = (index) => {
    const heroImages = [...(settings.images?.hero_images || [])];
    heroImages.splice(index, 1);
    setSettings({
      ...settings,
      images: { ...settings.images, hero_images: heroImages }
    });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="p-6 lg:p-8" data-testid="admin-settings">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-slate-800">Site Settings</h1>
        <p className="text-slate-600 mt-1">Manage your website settings, images, and social links</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Hero Content */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Type size={20} className="text-[#9F87C4]" />
            <h2 className="font-serif text-xl text-slate-800">Hero Section Content</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Title</label>
              <Input 
                value={settings?.hero_content?.title || ''} 
                onChange={(e) => updateHeroContent('title', e.target.value)} 
                className="mt-1" 
                placeholder="Welcome to White Dove Wellness"
                data-testid="hero-title-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Subtitle</label>
              <Textarea 
                value={settings?.hero_content?.subtitle || ''} 
                onChange={(e) => updateHeroContent('subtitle', e.target.value)} 
                className="mt-1" 
                placeholder="Experience the healing power of holistic therapies..."
                rows={3}
                data-testid="hero-subtitle-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Details (additional text below subtitle)</label>
              <Textarea 
                value={settings?.hero_content?.details || ''} 
                onChange={(e) => updateHeroContent('details', e.target.value)} 
                className="mt-1" 
                placeholder="Add more details about your services..."
                rows={4}
                data-testid="hero-details-input"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Benefits (bullet points)</label>
                <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
                  <Plus size={14} className="mr-1" /> Add Benefit
                </Button>
              </div>
              <div className="space-y-2">
                {(settings?.hero_content?.benefits || []).map((benefit, index) => (
                  <div key={index} className="flex gap-2">
                    <Input 
                      value={benefit} 
                      onChange={(e) => updateBenefit(index, e.target.value)} 
                      placeholder="e.g., Reduce stress and anxiety"
                      data-testid={`hero-benefit-${index}-input`}
                    />
                    <Button type="button" variant="ghost" size="icon" className="text-red-500 shrink-0" onClick={() => removeBenefit(index)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Button Text</label>
              <Input 
                value={settings?.hero_content?.button_text || ''} 
                onChange={(e) => updateHeroContent('button_text', e.target.value)} 
                className="mt-1" 
                placeholder="Book Your Session"
                data-testid="hero-button-input"
              />
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="font-serif text-xl text-slate-800 mb-4">Business Information</h2>
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-slate-700">Business Name</label><Input value={settings?.business_name || ''} onChange={(e) => setSettings({ ...settings, business_name: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-slate-700">Tagline</label><Input value={settings?.tagline || ''} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-slate-700">Email</label><Input type="email" value={settings?.email || ''} onChange={(e) => setSettings({ ...settings, email: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-slate-700">Phone</label><Input value={settings?.phone || ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-slate-700">Address</label><Input value={settings?.address || ''} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="mt-1" /></div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Image size={20} className="text-[#9F87C4]" />
            <h2 className="font-serif text-xl text-slate-800">Site Images</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">Enter paths relative to public folder (e.g., /images/logo.png) or full URLs</p>
          
          <div className="space-y-4">
            {/* Logo */}
            <div>
              <label className="text-sm font-medium text-slate-700">Logo Image</label>
              <Input 
                value={settings?.images?.logo_url || ''} 
                onChange={(e) => updateImage('logo_url', e.target.value)} 
                className="mt-1" 
                placeholder="/images/logo.png"
                data-testid="logo-url-input"
              />
              {settings?.images?.logo_url && (
                <div className="mt-2 p-2 bg-slate-50 rounded-lg inline-block">
                  <img src={settings.images.logo_url} alt="Logo preview" className="h-16 object-contain" />
                </div>
              )}
            </div>

            {/* Hero Images */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Hero Images (Desktop shows 3, Mobile shows 1)</label>
                <Button type="button" variant="outline" size="sm" onClick={addHeroImage}>
                  <Plus size={14} className="mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {(settings?.images?.hero_images || []).map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input 
                      value={url} 
                      onChange={(e) => updateHeroImage(index, e.target.value)} 
                      placeholder={`/images/hero-${index + 1}.jpg`}
                      data-testid={`hero-image-${index}-input`}
                    />
                    <Button type="button" variant="ghost" size="icon" className="text-red-500 shrink-0" onClick={() => removeHeroImage(index)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
              {(settings?.images?.hero_images || []).length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {settings.images.hero_images.filter(url => url).map((url, index) => (
                    <div key={index} className="p-1 bg-slate-50 rounded-lg">
                      <img src={url} alt={`Hero ${index + 1}`} className="h-16 w-24 object-cover rounded" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact Image */}
            <div>
              <label className="text-sm font-medium text-slate-700">Contact Section Image</label>
              <Input 
                value={settings?.images?.contact_image_url || ''} 
                onChange={(e) => updateImage('contact_image_url', e.target.value)} 
                className="mt-1" 
                placeholder="/images/contact-dove.jpg"
                data-testid="contact-image-url-input"
              />
              {settings?.images?.contact_image_url && (
                <div className="mt-2 p-2 bg-slate-50 rounded-lg inline-block">
                  <img src={settings.images.contact_image_url} alt="Contact preview" className="h-20 object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
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
