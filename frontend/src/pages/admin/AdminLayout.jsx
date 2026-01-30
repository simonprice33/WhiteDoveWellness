import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { publicApi } from '../../lib/api';
import {
  LayoutDashboard,
  Sparkles,
  PoundSterling,
  MessageSquare,
  Award,
  FileText,
  Settings,
  Users,
  UserCircle,
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { label: 'Therapies', icon: Sparkles, href: '/admin/therapies' },
  { label: 'Prices', icon: PoundSterling, href: '/admin/prices' },
  { label: 'Contacts', icon: MessageSquare, href: '/admin/contacts' },
  { label: 'Clients', icon: Users, href: '/admin/clients' },
  { label: 'Affiliations', icon: Award, href: '/admin/affiliations' },
  { label: 'Policies', icon: FileText, href: '/admin/policies' },
  { label: 'Admin Users', icon: UserCircle, href: '/admin/users' },
  { label: 'Settings', icon: Settings, href: '/admin/settings' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('/images/logo.png');

  useEffect(() => {
    publicApi.getSettings().then(res => {
      if (res.data.settings?.images?.logo_url) {
        setLogoUrl(res.data.settings.images.logo_url);
      }
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isActive = (href) => {
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]" data-testid="admin-layout">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-slate-100 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-slate-600 hover:text-[#9F87C4]"
          data-testid="mobile-sidebar-toggle"
        >
          <Menu size={24} />
        </button>
        <img src={logoUrl} alt="Logo" className="h-10 mx-auto" />
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-100
          transform transition-transform duration-300 lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        data-testid="admin-sidebar"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <img src={logoUrl} alt="White Dove Wellness" className="h-12" />
          <button
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${isActive(item.href)
                  ? 'bg-[#9F87C4]/10 text-[#9F87C4]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }
              `}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon size={20} />
              {item.label}
              {isActive(item.href) && (
                <ChevronRight size={16} className="ml-auto" />
              )}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#9F87C4]/10 flex items-center justify-center">
              <UserCircle size={24} className="text-[#9F87C4]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {user?.username || 'Admin'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut size={18} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
