import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { publicApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Home,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  X,
  CreditCard
} from 'lucide-react';

export default function BookingForm({ onClose }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Refs for scrolling
  const pricesSectionRef = useRef(null);
  const modalContentRef = useRef(null);
  
  // Data
  const [therapies, setTherapies] = useState([]);
  const [prices, setPrices] = useState([]);
  const [bookingSettings, setBookingSettings] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  // Selections
  const [selectedTherapy, setSelectedTherapy] = useState(null);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [isHomeVisit, setIsHomeVisit] = useState(false);
  
  // Client details
  const [clientDetails, setClientDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  
  // Booking result
  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedTherapy) {
      loadPrices(selectedTherapy.id);
    }
  }, [selectedTherapy]);

  // Load available dates when price is selected or calendar month changes
  useEffect(() => {
    if (selectedPrice) {
      loadAvailableDates();
    }
  }, [selectedPrice, calendarMonth]);

  // Auto-scroll to prices when therapy is selected and prices are loaded
  useEffect(() => {
    if (selectedTherapy && prices.length > 0 && pricesSectionRef.current && modalContentRef.current) {
      // Small delay to allow render
      setTimeout(() => {
        pricesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedTherapy, prices]);

  useEffect(() => {
    if (selectedDate && selectedPrice) {
      loadAvailability();
    }
  }, [selectedDate, selectedPrice]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [therapiesRes, settingsRes] = await Promise.all([
        publicApi.getTherapies(),
        publicApi.getBookingSettings()
      ]);
      
      setTherapies(therapiesRes.data.therapies || []);
      setBookingSettings(settingsRes.data.settings);
      
      if (!settingsRes.data.settings.enabled) {
        setError('Online booking is currently unavailable. Please contact us directly.');
      }
    } catch (err) {
      setError('Failed to load booking options');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPrices = async (therapyId) => {
    try {
      const response = await publicApi.getPrices(therapyId);
      setPrices(response.data.prices || []);
    } catch (err) {
      console.error('Failed to load prices:', err);
    }
  };

  const loadAvailableDates = async () => {
    if (!selectedPrice) return;
    
    try {
      const month = calendarMonth.getMonth() + 1;
      const year = calendarMonth.getFullYear();
      const response = await publicApi.getAvailableDates(selectedPrice.id, month, year);
      setAvailableDates(response.data.available_dates || []);
    } catch (err) {
      console.error('Failed to load available dates:', err);
      setAvailableDates([]);
    }
  };

  const loadAvailability = async () => {
    if (!selectedDate || !selectedPrice) return;
    
    try {
      setAvailableSlots([]);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await publicApi.getAvailability(dateStr, selectedPrice.id);
      setAvailableSlots(response.data.available_slots || []);
    } catch (err) {
      console.error('Failed to load availability:', err);
      if (err.response?.data?.message) {
        setAvailableSlots([]);
      }
    }
  };

  const isDateDisabled = (date) => {
    if (!bookingSettings) return true;
    
    // Format date to match availableDates format (YYYY-MM-DD)
    const dateStr = date.toISOString().split('T')[0];
    
    // If we have availableDates loaded, use them
    if (availableDates.length > 0) {
      return !availableDates.includes(dateStr);
    }
    
    // Fallback to basic checks if availableDates not loaded yet
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Past dates
    if (date < today) return true;
    
    // Beyond advance booking window
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + bookingSettings.advance_booking_days);
    if (date > maxDate) return true;
    
    // Check working hours for day of week
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[date.getDay()];
    const daySettings = bookingSettings.working_hours[dayOfWeek];
    
    return !daySettings || !daySettings.enabled;
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const response = await publicApi.createBooking({
        price_id: selectedPrice.id,
        booking_date: dateStr,
        booking_time: selectedTime,
        client_name: clientDetails.name,
        client_email: clientDetails.email,
        client_phone: clientDetails.phone,
        client_address: isHomeVisit ? clientDetails.address : '',
        is_home_visit: isHomeVisit,
        notes: clientDetails.notes
      });
      
      setBooking(response.data.booking);
      setStep(5); // Move to payment step
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = () => {
    // TODO: Integrate with SumUp
    // For now, show a placeholder
    alert('SumUp payment integration coming soon! The booking has been created with pending payment status.');
  };

  const formatTime = (time) => {
    const [hours, mins] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${mins} ${ampm}`;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#9F87C4]" />
          <span>Loading booking options...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="booking-modal">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#9F87C4] to-[#7B6BA8] p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-serif">Book Your Session</h2>
              <p className="text-white/80 text-sm mt-1">Step {step} of 5</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              data-testid="close-booking-btn"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div 
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" ref={modalContentRef}>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Select Therapy */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-medium text-slate-800">Choose a Therapy</h3>
                <div className="grid gap-3">
                  {therapies.map((therapy) => (
                    <button
                      key={therapy.id}
                      onClick={() => {
                        setSelectedTherapy(therapy);
                        setSelectedPrice(null);
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedTherapy?.id === therapy.id
                          ? 'border-[#9F87C4] bg-[#F5F3FA]'
                          : 'border-slate-200 hover:border-[#9F87C4]/50'
                      }`}
                      data-testid={`therapy-option-${therapy.id}`}
                    >
                      <div className="font-medium text-slate-800">{therapy.name}</div>
                      <div className="text-sm text-slate-500 mt-1">{therapy.short_description}</div>
                    </button>
                  ))}
                </div>

                {selectedTherapy && prices.length > 0 && (
                  <div className="mt-6 space-y-4" ref={pricesSectionRef}>
                    <h3 className="text-lg font-medium text-slate-800">Select Duration & Price</h3>
                    <div className="grid gap-3">
                      {prices.map((price) => (
                        <button
                          key={price.id}
                          onClick={() => setSelectedPrice(price)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            selectedPrice?.id === price.id
                              ? 'border-[#9F87C4] bg-[#F5F3FA]'
                              : 'border-slate-200 hover:border-[#9F87C4]/50'
                          }`}
                          data-testid={`price-option-${price.id}`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-slate-800">{price.name}</div>
                              <div className="text-sm text-slate-500">{price.duration}</div>
                            </div>
                            <div className="text-xl font-bold text-[#9F87C4]">
                              £{price.price.toFixed(2)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Select Date */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-medium text-slate-800">Choose a Date</h3>
                <p className="text-sm text-slate-500">Dates with no available slots are disabled</p>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={isDateDisabled}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    className="rounded-xl border shadow-sm"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Select Time */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-medium text-slate-800">
                  Available Times for {selectedDate && formatDate(selectedDate)}
                </h3>
                
                {availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Clock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p>No available slots for this date.</p>
                    <p className="text-sm">Please select a different date.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          selectedTime === slot.time
                            ? 'border-[#9F87C4] bg-[#F5F3FA] text-[#9F87C4]'
                            : 'border-slate-200 hover:border-[#9F87C4]/50'
                        }`}
                        data-testid={`time-slot-${slot.time}`}
                      >
                        <span className="font-medium">{formatTime(slot.time)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Client Details */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-medium text-slate-800">Your Details</h3>
                
                {/* Location Type */}
                {bookingSettings?.location_type !== 'fixed' && (
                  <div className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visitType"
                        checked={!isHomeVisit}
                        onChange={() => setIsHomeVisit(false)}
                        className="w-4 h-4 text-[#9F87C4]"
                      />
                      <MapPin size={18} className="text-slate-500" />
                      <span>Visit Clinic</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visitType"
                        checked={isHomeVisit}
                        onChange={() => setIsHomeVisit(true)}
                        className="w-4 h-4 text-[#9F87C4]"
                      />
                      <Home size={18} className="text-slate-500" />
                      <span>Home Visit</span>
                    </label>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      <User size={16} className="inline mr-1" /> Full Name *
                    </label>
                    <input
                      type="text"
                      value={clientDetails.name}
                      onChange={(e) => setClientDetails({ ...clientDetails, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#9F87C4] focus:border-transparent"
                      required
                      data-testid="client-name-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      <Mail size={16} className="inline mr-1" /> Email *
                    </label>
                    <input
                      type="email"
                      value={clientDetails.email}
                      onChange={(e) => setClientDetails({ ...clientDetails, email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#9F87C4] focus:border-transparent"
                      required
                      data-testid="client-email-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      <Phone size={16} className="inline mr-1" /> Phone *
                    </label>
                    <input
                      type="tel"
                      value={clientDetails.phone}
                      onChange={(e) => setClientDetails({ ...clientDetails, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#9F87C4] focus:border-transparent"
                      required
                      data-testid="client-phone-input"
                    />
                  </div>
                  
                  {isHomeVisit && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <Home size={16} className="inline mr-1" /> Address *
                      </label>
                      <textarea
                        value={clientDetails.address}
                        onChange={(e) => setClientDetails({ ...clientDetails, address: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#9F87C4] focus:border-transparent"
                        rows={3}
                        required
                        data-testid="client-address-input"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={clientDetails.notes}
                      onChange={(e) => setClientDetails({ ...clientDetails, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#9F87C4] focus:border-transparent"
                      rows={3}
                      placeholder="Any special requirements or health conditions we should know about..."
                      data-testid="client-notes-input"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Payment */}
            {step === 5 && booking && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-medium text-slate-800">
                    {bookingSettings?.require_online_payment ? 'Booking Created!' : 'Booking Request Submitted!'}
                  </h3>
                  <p className="text-slate-500 mt-1">
                    {bookingSettings?.require_online_payment 
                      ? 'Please complete payment to confirm your booking.'
                      : bookingSettings?.confirmation_message || 'Your booking request has been submitted. We will confirm your appointment shortly.'}
                  </p>
                </div>
                
                {/* Booking Summary */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Therapy:</span>
                    <span className="font-medium">{booking.therapy_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Duration:</span>
                    <span className="font-medium">{booking.price_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date:</span>
                    <span className="font-medium">{formatDate(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Time:</span>
                    <span className="font-medium">{formatTime(booking.booking_time)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold text-[#9F87C4]">£{booking.price_amount.toFixed(2)}</span>
                  </div>
                </div>
                
                {bookingSettings?.require_online_payment ? (
                  <>
                    <Button
                      onClick={handlePayment}
                      className="w-full bg-[#9F87C4] hover:bg-[#8A74B0] text-white py-6 text-lg"
                      data-testid="pay-now-btn"
                    >
                      <CreditCard className="mr-2" />
                      Pay Now with SumUp
                    </Button>
                    <p className="text-center text-sm text-slate-500">
                      Your booking will be confirmed once payment is complete.
                      <br />
                      Booking reference: <span className="font-mono">{booking.id.slice(0, 8)}</span>
                    </p>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={onClose}
                      className="w-full bg-[#9F87C4] hover:bg-[#8A74B0] text-white py-6 text-lg"
                      data-testid="complete-booking-btn"
                    >
                      <Check className="mr-2" />
                      {bookingSettings?.payment_button_text || 'Complete Booking Request'}
                    </Button>
                    <p className="text-center text-sm text-slate-500">
                      Booking reference: <span className="font-mono">{booking.id.slice(0, 8)}</span>
                      <br />
                      We will contact you to confirm your appointment.
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        {step < 5 && (
          <div className="border-t p-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              data-testid="booking-back-btn"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !selectedPrice) ||
                  (step === 2 && !selectedDate) ||
                  (step === 3 && !selectedTime)
                }
                className="bg-[#9F87C4] hover:bg-[#8A74B0]"
                data-testid="booking-next-btn"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  !clientDetails.name ||
                  !clientDetails.email ||
                  !clientDetails.phone ||
                  (isHomeVisit && !clientDetails.address)
                }
                className="bg-[#9F87C4] hover:bg-[#8A74B0]"
                data-testid="booking-submit-btn"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
