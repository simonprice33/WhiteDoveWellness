import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_7e232f8d-2324-4282-8851-b8c7ddbb51d5/artifacts/0oowyfv8_White%20Dove%20Wellness%20-%20Logo%20-%20no%20BG%20%281%29.png';

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Therapies', href: '#therapies' },
  { label: 'Prices', href: '#prices' },
  { label: 'Contact', href: '#contact' },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e, href) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm'
          : 'bg-white/80 backdrop-blur-sm'
      )}
      data-testid="main-header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => scrollToSection(e, '#home')}
            className="flex items-center"
            data-testid="header-logo"
          >
            <img
              src={LOGO_URL}
              alt="White Dove Wellness"
              className="h-16 w-auto"
            />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8" data-testid="desktop-nav">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="text-sm font-medium uppercase tracking-widest text-slate-600 hover:text-[#9F87C4] transition-colors relative after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:w-0 after:h-[2px] after:bg-[#9F87C4] after:transition-all hover:after:w-full"
                data-testid={`nav-link-${link.label.toLowerCase()}`}
              >
                {link.label}
              </a>
            ))}
            <Link to="/admin/login">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-[#9F87C4]/30 text-[#9F87C4] hover:bg-[#9F87C4]/10 hover:border-[#9F87C4]"
                data-testid="admin-login-btn"
              >
                Admin
              </Button>
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-slate-600 hover:text-[#9F87C4]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="mobile-menu-btn"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100" data-testid="mobile-menu">
          <nav className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="block py-2 text-sm font-medium uppercase tracking-widest text-slate-600 hover:text-[#9F87C4]"
                data-testid={`mobile-nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/admin/login"
              className="block py-2 text-sm font-medium uppercase tracking-widest text-[#9F87C4]"
            >
              Admin Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
