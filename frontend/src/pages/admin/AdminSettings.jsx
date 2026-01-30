import { useState, useEffect, useRef } from 'react';
import { adminApi, getImageUrl } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Save, Plus, Trash2, Image, Type, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  
  const logoInputRef = useRef(null);
  const contactInputRef = useRef(null);
  const heroInputRefs = useRef({});

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const response = await adminApi.getSettings();
      const data = response.data.settings;
      
      if (!data.images) {
        data.images = {
          logo_url: '/images/logo.png',
          hero_images: ['/images/hero-1.jpg', '/images/hero-2.jpg', '/images/hero-3.jpg'],
          contact_image_url: '/images/contact-dove.jpg'
        };
      }

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

  // Generic file upload handler
  const handleFileUpload = async (file, onSuccess, uploadKey) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(prev => ({ ...prev, [uploadKey]: true }));
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await adminApi.uploadImage(formData);
      if (response.data.success) {
        onSuccess(response.data.url);
        toast.success('Image uploaded');
      }
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  // Logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    handleFileUpload(file, (url) => updateImage('logo_url', url), 'logo');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // Contact image upload
  const handleContactUpload = (e) => {
    const file = e.target.files?.[0];
    handleFileUpload(file, (url) => updateImage('contact_image_url', url), 'contact');
    if (contactInputRef.current) contactInputRef.current.value = '';
  };

  // Hero image upload
  const handleHeroUpload = (e, index) => {
    const file = e.target.files?.[0];
    handleFileUpload(file, (url) => updateHeroImage(index, url), `hero_${index}`);
    if (heroInputRefs.current[index]) heroInputRefs.current[index].value = '';
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
                      placeholder="Enter a benefit..."
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
          <p className="text-sm text-slate-500 mb-4">Upload images or enter URLs</p>
          
          <div className="space-y-6">
            {/* Logo */}
            <div>
              <label className="text-sm font-medium text-slate-700">Logo Image</label>
              <div className="mt-2 space-y-2">
                {settings?.images?.logo_url && (
                  <div className="relative inline-block">
                    <img src={getImageUrl(settings.images.logo_url)} alt="Logo preview" className="h-16 object-contain bg-slate-50 rounded border border-slate-200 p-2" />
                    <button
                      type="button"
                      onClick={() => updateImage('logo_url', '')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                  <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploading.logo} className="flex items-center gap-2">
                    <Upload size={16} />
                    {uploading.logo ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  <span className="text-xs text-slate-500">or enter URL below</span>
                </div>
                <Input 
                  value={settings?.images?.logo_url || ''} 
                  onChange={(e) => updateImage('logo_url', e.target.value)} 
                  placeholder="/images/logo.png or https://..."
                  data-testid="logo-url-input"
                />
              </div>
            </div>

            {/* Hero Images */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Hero Images (Desktop shows 3, Mobile shows 1)</label>
                <Button type="button" variant="outline" size="sm" onClick={addHeroImage}>
                  <Plus size={14} className="mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-3">
                {(settings?.images?.hero_images || []).map((url, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Hero Image {index + 1}</span>
                      <Button type="button" variant="ghost" size="sm" className="text-red-500 ml-auto h-6 px-2" onClick={() => removeHeroImage(index)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    {url && (
                      <div className="relative inline-block">
                        <img src={getImageUrl(url)} alt={`Hero ${index + 1}`} className="h-20 w-32 object-cover rounded border border-slate-200" />
                        <button
                          type="button"
                          onClick={() => updateHeroImage(index, '')}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input 
                        ref={el => heroInputRefs.current[index] = el} 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleHeroUpload(e, index)} 
                        className="hidden" 
                        id={`hero-upload-${index}`} 
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => heroInputRefs.current[index]?.click()} disabled={uploading[`hero_${index}`]} className="flex items-center gap-2">
                        <Upload size={14} />
                        {uploading[`hero_${index}`] ? 'Uploading...' : 'Upload'}
                      </Button>
                      <Input 
                        value={url} 
                        onChange={(e) => updateHeroImage(index, e.target.value)} 
                        placeholder={`/images/hero-${index + 1}.jpg`}
                        className="flex-1"
                        data-testid={`hero-image-${index}-input`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Image */}
            <div>
              <label className="text-sm font-medium text-slate-700">Contact Section Image</label>
              <div className="mt-2 space-y-2">
                {settings?.images?.contact_image_url && (
                  <div className="relative inline-block">
                    <img src={getImageUrl(settings.images.contact_image_url)} alt="Contact preview" className="h-20 object-contain bg-slate-50 rounded border border-slate-200 p-2" />
                    <button
                      type="button"
                      onClick={() => updateImage('contact_image_url', '')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input ref={contactInputRef} type="file" accept="image/*" onChange={handleContactUpload} className="hidden" id="contact-upload" />
                  <Button type="button" variant="outline" onClick={() => contactInputRef.current?.click()} disabled={uploading.contact} className="flex items-center gap-2">
                    <Upload size={16} />
                    {uploading.contact ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <span className="text-xs text-slate-500">or enter URL below</span>
                </div>
                <Input 
                  value={settings?.images?.contact_image_url || ''} 
                  onChange={(e) => updateImage('contact_image_url', e.target.value)} 
                  placeholder="/images/contact-dove.jpg or https://..."
                  data-testid="contact-image-url-input"
                />
              </div>
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
