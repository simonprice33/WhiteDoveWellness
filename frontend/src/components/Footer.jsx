import { useState, useEffect } from 'react';
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import { publicApi } from '../lib/api';

export default function Footer() {
  const [settings, setSettings] = useState(null);
  const [policies, setPolicies] = useState([]);

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

  return (
    <footer className="bg-slate-900 text-white" data-testid="main-footer">
      {/* Policies Section */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h3 className="font-serif text-2xl mb-6 text-center">Our Policies</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {policies.map((policy) => (
              <a
                key={policy.id}
                href={`/policy/${policy.slug}`}
                className="text-slate-400 hover:text-[#A7D7C5] transition-colors text-sm"
                data-testid={`policy-link-${policy.slug}`}
              >
                {policy.title}
              </a>
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
            
            {/* Social Links */}
            <div className="flex gap-4 mt-4">
              {settings?.social_links?.facebook_url && (
                <a
                  href={settings.social_links.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-[#9F87C4] transition-colors"
                  data-testid="social-facebook"
                >
                  <Facebook size={18} />
                </a>
              )}
              {settings?.social_links?.instagram_url && (
                <a
                  href={settings.social_links.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-[#9F87C4] transition-colors"
                  data-testid="social-instagram"
                >
                  <Instagram size={18} />
                </a>
              )}
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
    </footer>
  );
}
