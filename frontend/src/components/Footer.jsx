import { useState, useEffect } from 'react';
import { Facebook, Instagram, Mail, Phone, MapPin, X } from 'lucide-react';
import { publicApi } from '../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '../components/ui/dialog';

export default function Footer() {
  const [settings, setSettings] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, policiesRes] = await Promise.all([
        publicApi.getSettings(),
        publicApi.getPolicies()
      ]);
      setSettings(settingsRes.data.settings);
      setPolicies(policiesRes.data.policies || []);
    } catch (error) {
      console.error('Failed to load footer data:', error);
    }
  };

  const scrollToSection = (e, href) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openPolicy = (policy) => {
    setSelectedPolicy(policy);
    setDialogOpen(true);
  };

  // Simple markdown-to-HTML renderer
  const renderContent = (content) => {
    if (!content) return null;
    
    return content.split('\n').map((line, i) => {
      if (line.startsWith('# ')) {
        return <h1 key={i} className="font-serif text-2xl text-slate-800 mb-4">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="font-serif text-xl text-slate-800 mt-6 mb-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="font-serif text-lg text-slate-800 mt-4 mb-2">{line.slice(4)}</h3>;
      }
      if (line.trim() === '') {
        return <br key={i} />;
      }
      return <p key={i} className="text-slate-600 mb-2">{line}</p>;
    });
  };

  return (
    <footer className="bg-slate-900 text-white" data-testid="main-footer">
      {/* Policies Section */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h3 className="font-serif text-2xl mb-6 text-center">Our Policies</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {policies.map((policy) => (
              <button
                key={policy.id}
                onClick={() => openPolicy(policy)}
                className="text-slate-400 hover:text-[#A7D7C5] transition-colors text-sm"
                data-testid={`policy-link-${policy.slug}`}
              >
                {policy.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h4 className="font-serif text-xl mb-4">{settings?.business_name || 'White Dove Wellness'}</h4>
            <p className="text-slate-400 text-sm mb-4">
              {settings?.tagline || 'Holistic Therapies'}
            </p>
            {settings?.address && (
              <p className="text-slate-400 text-sm flex items-start gap-2">
                <MapPin size={16} className="mt-1 shrink-0" />
                {settings.address}
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-lg mb-4">Quick Links</h4>
            <nav className="space-y-2">
              <a
                href="#therapies"
                onClick={(e) => scrollToSection(e, '#therapies')}
                className="block text-slate-400 hover:text-white transition-colors text-sm"
              >
                Our Therapies
              </a>
              <a
                href="#prices"
                onClick={(e) => scrollToSection(e, '#prices')}
                className="block text-slate-400 hover:text-white transition-colors text-sm"
              >
                Price List
              </a>
              <a
                href="#contact"
                onClick={(e) => scrollToSection(e, '#contact')}
                className="block text-slate-400 hover:text-white transition-colors text-sm"
              >
                Contact Us
              </a>
            </nav>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="font-serif text-lg mb-4">Connect With Us</h4>
            {settings?.email && (
              <a
                href={`mailto:${settings.email}`}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-2"
              >
                <Mail size={16} />
                {settings.email}
              </a>
            )}
            {settings?.phone && (
              <a
                href={`tel:${settings.phone}`}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-4"
              >
                <Phone size={16} />
                {settings.phone}
              </a>
            )}
            
            {/* Social Links - Always show with defaults */}
            <div className="flex gap-4 mt-4">
              <a
                href={settings?.social_links?.facebook_url || 'https://www.facebook.com/profile.php?id=61587212937489'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-[#9F87C4] transition-colors"
                data-testid="social-facebook"
              >
                <Facebook size={18} />
              </a>
              <a
                href={settings?.social_links?.instagram_url || 'https://www.instagram.com/white_dove_wellness_therapies/'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-[#9F87C4] transition-colors"
                data-testid="social-instagram"
              >
                <Instagram size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} {settings?.business_name || 'White Dove Wellness'}. All rights reserved.
          </p>
        </div>
      </div>

      {/* Policy Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="policy-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-slate-800">
              {selectedPolicy?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {renderContent(selectedPolicy?.content)}
          </div>
          {selectedPolicy?.updated_at && (
            <p className="text-sm text-slate-400 mt-6 pt-4 border-t">
              Last updated: {new Date(selectedPolicy.updated_at).toLocaleDateString()}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </footer>
  );
}
