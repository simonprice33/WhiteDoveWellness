import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Therapies from '../components/Therapies';
import Prices from '../components/Prices';
import AboutMe from '../components/AboutMe';
import Contact from '../components/Contact';
import Affiliations from '../components/Affiliations';
import Footer from '../components/Footer';
import BookingForm from '../components/BookingForm';
import { publicApi } from '../lib/api';

export default function HomePage() {
  const [showBooking, setShowBooking] = useState(false);
  const [bookingEnabled, setBookingEnabled] = useState(false);

  useEffect(() => {
    // Check if booking is enabled
    publicApi.getBookingSettings()
      .then(res => setBookingEnabled(res.data.settings?.enabled || false))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" data-testid="home-page">
      <Header onBookClick={() => setShowBooking(true)} bookingEnabled={bookingEnabled} />
      <main>
        <Hero onBookClick={() => setShowBooking(true)} bookingEnabled={bookingEnabled} />
        <Therapies />
        <Prices onBookClick={() => setShowBooking(true)} bookingEnabled={bookingEnabled} />
        <AboutMe />
        <Contact />
        <Affiliations />
      </main>
      <Footer />
      
      {/* Booking Modal */}
      {showBooking && bookingEnabled && (
        <BookingForm onClose={() => setShowBooking(false)} />
      )}
    </div>
  );
}
