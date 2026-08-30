import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Mail,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  MoreVertical,
  Eye,
  Home,
  CreditCard,
  AlertCircle
} from 'lucide-react';

export default function AdminBookings() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [view, setView] = useState('list'); // 'list' or 'calendar'
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState({});

  useEffect(() => {
    if (view === 'list') {
      loadBookings();
    } else {
      loadCalendar();
    }
  }, [view, statusFilter, currentMonth, currentYear]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      
      const response = await adminApi.getBookings(params);
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendar = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getBookingsCalendar(currentMonth, currentYear);
      setCalendarData(response.data.calendar || {});
    } catch (error) {
      console.error('Failed to load calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId, newStatus) => {
    try {
      await adminApi.updateBookingStatus(bookingId, newStatus);
      loadBookings();
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, mins] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${mins} ${ampm}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      pending_payment: 'Pending Payment',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No Show'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];
    
    // Empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayBookings = calendarData[dateStr] || [];
      const isToday = new Date().toISOString().split('T')[0] === dateStr;
      
      days.push(
        <div 
          key={day} 
          className={`h-24 border border-slate-200 p-1 overflow-hidden ${
            isToday ? 'bg-[#F5F3FA]' : 'bg-white'
          }`}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-[#9F87C4]' : 'text-slate-600'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayBookings.slice(0, 2).map((booking, idx) => (
              <div 
                key={idx}
                className="text-xs bg-[#9F87C4]/20 text-[#7B6BA8] px-1 py-0.5 rounded truncate cursor-pointer hover:bg-[#9F87C4]/30"
                title={`${booking.time} - ${booking.client_name}`}
              >
                {formatTime(booking.time)} {booking.client_name.split(' ')[0]}
              </div>
            ))}
            {dayBookings.length > 2 && (
              <div className="text-xs text-slate-500">+{dayBookings.length - 2} more</div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6" data-testid="admin-bookings">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif text-slate-800">Bookings</h1>
          <p className="text-slate-500">Manage appointment bookings</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            onClick={() => setView('list')}
            size="sm"
            data-testid="view-list-btn"
          >
            List
          </Button>
          <Button
            variant={view === 'calendar' ? 'default' : 'outline'}
            onClick={() => setView('calendar')}
            size="sm"
            data-testid="view-calendar-btn"
          >
            Calendar
          </Button>
        </div>
      </div>

      {/* Filters (List View) */}
      {view === 'list' && (
        <div className="flex gap-2 flex-wrap">
          {['', 'pending_payment', 'confirmed', 'completed', 'cancelled'].map((status) => (
            <Button
              key={status || 'all'}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? 'bg-[#9F87C4]' : ''}
            >
              {status === '' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Button>
          ))}
        </div>
      )}

      {/* Calendar Navigation */}
      {view === 'calendar' && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (currentMonth === 1) {
                setCurrentMonth(12);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-medium">
            {monthNames[currentMonth - 1]} {currentYear}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (currentMonth === 12) {
                setCurrentMonth(1);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#9F87C4]" />
        </div>
      ) : (
        <>
          {/* Calendar View */}
          {view === 'calendar' && (
            <div className="border rounded-xl overflow-hidden">
              <div className="grid grid-cols-7 bg-slate-100">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-slate-600">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {renderCalendar()}
              </div>
            </div>
          )}

          {/* List View */}
          {view === 'list' && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500">No bookings found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {bookings.map((booking) => (
                    <div 
                      key={booking.id} 
                      className="p-4 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedBooking(booking)}
                      data-testid={`booking-row-${booking.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{booking.client_name}</span>
                            {getStatusBadge(booking.status)}
                            {booking.is_home_visit && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                <Home className="inline h-3 w-3 mr-1" />
                                Home Visit
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500">
                            {booking.therapy_name} - {booking.price_name}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(booking.booking_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatTime(booking.booking_time)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-[#9F87C4]">
                            £{booking.price_amount?.toFixed(2)}
                          </span>
                          <Eye className="h-5 w-5 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif text-slate-800">Booking Details</h2>
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Status:</span>
                {getStatusBadge(selectedBooking.status)}
              </div>
              
              {/* Payment Status */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Payment:</span>
                <span className={`flex items-center gap-1 ${
                  selectedBooking.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  <CreditCard className="h-4 w-4" />
                  {selectedBooking.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </span>
              </div>
              
              {/* Therapy */}
              <div>
                <span className="text-sm text-slate-500">Therapy</span>
                <p className="font-medium">{selectedBooking.therapy_name}</p>
                <p className="text-sm text-slate-600">{selectedBooking.price_name}</p>
              </div>
              
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-slate-500">Date</span>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-[#9F87C4]" />
                    {formatDate(selectedBooking.booking_date)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">Time</span>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4 text-[#9F87C4]" />
                    {formatTime(selectedBooking.booking_time)}
                  </p>
                </div>
              </div>
              
              {/* Client Details */}
              <div className="border-t pt-4">
                <h3 className="font-medium text-slate-800 mb-3">Client Details</h3>
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    {selectedBooking.client_name}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <a href={`mailto:${selectedBooking.client_email}`} className="text-[#9F87C4] hover:underline">
                      {selectedBooking.client_email}
                    </a>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <a href={`tel:${selectedBooking.client_phone}`} className="text-[#9F87C4] hover:underline">
                      {selectedBooking.client_phone}
                    </a>
                  </p>
                  {selectedBooking.client_address && (
                    <p className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 mt-1" />
                      <span>{selectedBooking.client_address}</span>
                    </p>
                  )}
                </div>
              </div>
              
              {/* Notes */}
              {selectedBooking.notes && (
                <div className="border-t pt-4">
                  <h3 className="font-medium text-slate-800 mb-2">Notes</h3>
                  <p className="text-slate-600 text-sm">{selectedBooking.notes}</p>
                </div>
              )}
              
              {/* Price */}
              <div className="border-t pt-4 flex justify-between items-center">
                <span className="text-lg font-medium">Total</span>
                <span className="text-2xl font-bold text-[#9F87C4]">
                  £{selectedBooking.price_amount?.toFixed(2)}
                </span>
              </div>
              
              {/* Actions */}
              <div className="border-t pt-4 space-y-2">
                <h3 className="font-medium text-slate-800 mb-3">Update Status</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedBooking.status !== 'confirmed' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(selectedBooking.id, 'confirmed')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Confirm
                    </Button>
                  )}
                  {selectedBooking.status === 'confirmed' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(selectedBooking.id, 'completed')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Mark Completed
                    </Button>
                  )}
                  {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(selectedBooking.id, 'no_show')}
                        className="text-gray-600"
                      >
                        No Show
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(selectedBooking.id, 'cancelled')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
