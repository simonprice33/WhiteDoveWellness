import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Check, Loader2, AlertCircle, CreditCard, Home } from 'lucide-react';

const formatDate = (dateStr) => new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
});

const formatTime = (time) => {
  if (!time) return 'To be confirmed';
  const [hours, mins] = time.split(':');
  const h = parseInt(hours);
  return `${h % 12 || 12}:${mins} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function BookingReturn() {
  const [params] = useSearchParams();
  const bookingId = params.get('booking_id');
  const [state, setState] = useState('checking');
  const [booking, setBooking] = useState(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!bookingId) { setState('missing'); return; }
    let stopped = false;
    let attempts = 0;
    let timer;

    const poll = async () => {
      try {
        const res = await publicApi.getPaymentStatus(bookingId);
        if (stopped) return;
        setBooking(res.data.booking);
        const status = res.data.checkout_status;
        if (res.data.booking.payment_status === 'paid') setState('paid');
        else if (status === 'FAILED' || status === 'EXPIRED') setState('failed');
        else if (attempts++ < 10) timer = setTimeout(poll, 2500);
        else setState('pending');
      } catch {
        if (!stopped) setState('error');
      }
    };
    poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [bookingId]);

  const retryPayment = async () => {
    setRetrying(true);
    try {
      const res = await publicApi.createCheckout(bookingId);
      window.location.assign(res.data.checkout_url);
    } catch {
      setRetrying(false);
      setState('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3FA] flex items-center justify-center p-4" data-testid="booking-return-page">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-r from-[#9F87C4] to-[#7B6BA8] p-6 text-white">
          <h1 className="text-2xl font-serif">White Dove Wellness</h1>
          <p className="text-white/80 text-sm mt-1">Booking payment</p>
        </div>

        <div className="p-8 space-y-6 text-center">
          {state === 'checking' && (
            <div className="space-y-3" data-testid="payment-checking">
              <Loader2 className="h-10 w-10 animate-spin text-[#9F87C4] mx-auto" />
              <p className="text-slate-600">Confirming your payment with SumUp...</p>
            </div>
          )}

          {state === 'paid' && (
            <div className="space-y-3" data-testid="payment-success">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-medium text-slate-800">Payment received - you're booked!</h2>
              <p className="text-slate-500">Thank you{booking?.first_name ? `, ${booking.first_name}` : ''}. Your appointment is confirmed.</p>
            </div>
          )}

          {(state === 'failed' || state === 'pending' || state === 'error' || state === 'missing') && (
            <div className="space-y-3" data-testid="payment-not-complete">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-medium text-slate-800">
                {state === 'failed' ? 'Payment not completed' : state === 'missing' ? 'Booking not found' : 'Payment still processing'}
              </h2>
              <p className="text-slate-500">
                {state === 'failed' && 'Your card was not charged. You can try again below - your appointment slot is still held for you.'}
                {state === 'pending' && 'SumUp has not confirmed the payment yet. If you completed payment, your booking will be confirmed automatically shortly.'}
                {state === 'error' && 'We could not check the payment status. Please contact us if you have been charged.'}
                {state === 'missing' && 'This link is missing a booking reference.'}
              </p>
            </div>
          )}

          {booking && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-left text-sm" data-testid="payment-booking-summary">
              <div className="flex justify-between"><span className="text-slate-600">Therapy</span><span className="font-medium">{booking.therapy_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Session</span><span className="font-medium">{booking.price_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Date</span><span className="font-medium">{formatDate(booking.booking_date)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Time</span><span className="font-medium">{formatTime(booking.booking_time)}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="font-medium">Total</span><span className="font-bold text-[#9F87C4]">£{Number(booking.price_amount).toFixed(2)}</span></div>
              <p className="text-xs text-slate-400 pt-1">Reference: <span className="font-mono">{booking.id.slice(0, 8)}</span></p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {state === 'failed' && (
              <Button onClick={retryPayment} disabled={retrying} className="w-full bg-[#9F87C4] hover:bg-[#8A74B0] py-6 text-lg" data-testid="retry-payment-btn">
                {retrying ? <Loader2 className="mr-2 animate-spin" /> : <CreditCard className="mr-2" />}
                {retrying ? 'Opening secure checkout...' : 'Try payment again'}
              </Button>
            )}
            <Button asChild variant="outline" data-testid="return-home-btn">
              <Link to="/"><Home className="mr-2 h-4 w-4" /> Back to website</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
