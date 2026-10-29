import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import {
  Sparkles,
  PoundSterling,
  MessageSquare,
  Users,
  ArrowUpRight,
  Calendar,
  Clock,
  MapPin,
  Phone
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    therapies: 0,
    prices: 0,
    contacts: 0,
    unreadContacts: 0,
    clients: 0
  });
  const [recentContacts, setRecentContacts] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [therapiesRes, pricesRes, contactsRes, clientsRes, upcomingRes] = await Promise.all([
        adminApi.getTherapies(),
        adminApi.getPrices(),
        adminApi.getContacts(),
        adminApi.getClients(),
        adminApi.getUpcomingBookings(7)
      ]);

      const contacts = contactsRes.data.contacts || [];
      
      setStats({
        therapies: therapiesRes.data.therapies?.length || 0,
        prices: pricesRes.data.prices?.length || 0,
        contacts: contacts.length,
        unreadContacts: contacts.filter(c => !c.is_read).length,
        clients: clientsRes.data.clients?.length || 0
      });

      setRecentContacts(contacts.slice(0, 5));
      setUpcomingAppointments(upcomingRes.data.appointments_by_date || {});
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending_payment': return 'bg-amber-100 text-amber-700';
      case 'pending_confirmation': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const statCards = [
    {
      label: 'Therapies',
      value: stats.therapies,
      icon: Sparkles,
      color: '#9F87C4',
      href: '/admin/therapies'
    },
    {
      label: 'Prices',
      value: stats.prices,
      icon: PoundSterling,
      color: '#D4AF37',
      href: '/admin/prices'
    },
    {
      label: 'Contacts',
      value: stats.contacts,
      badge: stats.unreadContacts > 0 ? `${stats.unreadContacts} new` : null,
      icon: MessageSquare,
      color: '#A7D7C5',
      href: '/admin/contacts'
    },
    {
      label: 'Clients',
      value: stats.clients,
      icon: Users,
      color: '#9F87C4',
      href: '/admin/clients'
    }
  ];

  return (
    <div className="p-6 lg:p-8" data-testid="admin-dashboard">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-slate-800">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome to your admin panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            to={stat.href}
            className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-lg transition-shadow group"
            data-testid={`stat-${stat.label.toLowerCase()}`}
          >
            <div className="flex items-start justify-between">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <stat.icon size={24} style={{ color: stat.color }} />
              </div>
              <ArrowUpRight
                size={20}
                className="text-slate-300 group-hover:text-[#9F87C4] transition-colors"
              />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-semibold text-slate-800">{stat.value}</p>
              <p className="text-slate-500 mt-1">{stat.label}</p>
            </div>
            {stat.badge && (
              <span className="inline-block mt-2 px-2 py-1 bg-[#A7D7C5]/20 text-[#39A575] text-xs rounded-full">
                {stat.badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" data-testid="upcoming-appointments">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#9F87C4]/10 flex items-center justify-center">
                <Calendar size={20} className="text-[#9F87C4]" />
              </div>
              <h2 className="font-serif text-xl text-slate-800">Upcoming Appointments</h2>
            </div>
            <Link
              to="/admin/bookings"
              className="text-[#9F87C4] hover:text-[#8A6EB5] text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          
          {loading ? (
            <div className="p-6 text-center text-slate-500">Loading...</div>
          ) : Object.keys(upcomingAppointments).length === 0 ? (
            <div className="p-8 text-center">
              <Calendar size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500">No upcoming appointments</p>
              <p className="text-sm text-slate-400 mt-1">Next 7 days are clear</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
              {Object.entries(upcomingAppointments).map(([date, appointments]) => (
                <div key={date} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold text-[#9F87C4]">{formatDate(date)}</span>
                    <span className="text-xs text-slate-400">({appointments.length} appointment{appointments.length !== 1 ? 's' : ''})</span>
                  </div>
                  <div className="space-y-2">
                    {appointments.map((apt) => (
                      <Link
                        key={apt.id}
                        to="/admin/bookings"
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-800 truncate">
                              {apt.first_name} {apt.last_name || ''}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(apt.status)}`}>
                              {apt.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 truncate">{apt.therapy_name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                            {apt.time && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {apt.time}
                              </span>
                            )}
                            {apt.is_home_visit && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                Home visit
                              </span>
                            )}
                            {apt.is_remote_booking && (
                              <span className="flex items-center gap-1 text-teal-600">
                                <Phone size={12} />
                                Remote
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Contacts */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#A7D7C5]/10 flex items-center justify-center">
                <MessageSquare size={20} className="text-[#A7D7C5]" />
              </div>
              <h2 className="font-serif text-xl text-slate-800">Recent Contacts</h2>
            </div>
            <Link
              to="/admin/contacts"
              className="text-[#9F87C4] hover:text-[#8A6EB5] text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          
          {loading ? (
            <div className="p-6 text-center text-slate-500">Loading...</div>
          ) : recentContacts.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500">No contacts yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentContacts.map((contact) => (
                <Link
                  key={contact.id}
                  to={`/admin/contacts`}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      contact.is_read ? 'bg-slate-300' : 'bg-[#A7D7C5]'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{contact.name}</p>
                    <p className="text-sm text-slate-500 truncate">{contact.email}</p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {new Date(contact.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
