/**
 * Booking Controller
 * Handles appointment bookings with availability management
 */

const { v4: uuidv4 } = require('uuid');

class BookingController {
  constructor(collections) {
    this.collections = collections;
  }

  // Helper: Parse duration string to minutes (e.g., "30 minutes" -> 30, "1 hour" -> 60)
  parseDurationToMinutes(durationStr) {
    if (!durationStr) return 60; // Default 60 minutes
    
    const str = durationStr.toLowerCase();
    
    // Handle "X minutes" format
    const minMatch = str.match(/(\d+)\s*min/);
    if (minMatch) return parseInt(minMatch[1], 10);
    
    // Handle "X hour(s)" format
    const hourMatch = str.match(/(\d+)\s*hour/);
    if (hourMatch) return parseInt(hourMatch[1], 10) * 60;
    
    // Handle "1.5 hours" or similar
    const decimalHourMatch = str.match(/([\d.]+)\s*hour/);
    if (decimalHourMatch) return Math.round(parseFloat(decimalHourMatch[1]) * 60);
    
    return 60; // Default
  }

  // Helper: Get availability settings from site settings
  async getAvailabilitySettings() {
    const settings = await this.collections.siteSettings.findOne(
      { id: 'site_settings' },
      { projection: { _id: 0 } }
    );

    const defaults = {
      enabled: false,
      gap_between_appointments: 30, // minutes
      advance_booking_days: 30,
      working_hours: {
        monday: { enabled: true, start: '09:00', end: '17:00' },
        tuesday: { enabled: true, start: '09:00', end: '17:00' },
        wednesday: { enabled: true, start: '09:00', end: '17:00' },
        thursday: { enabled: true, start: '09:00', end: '17:00' },
        friday: { enabled: true, start: '09:00', end: '17:00' },
        saturday: { enabled: false, start: '09:00', end: '17:00' },
        sunday: { enabled: false, start: '09:00', end: '17:00' }
      },
      location_type: 'both', // 'fixed', 'mobile', 'both'
      fixed_location_address: '',
      email_notifications_enabled: false
    };

    return settings?.booking_settings || defaults;
  }

  // GET /api/bookings/availability (public)
  // Get available time slots for a specific date and price option
  getAvailability = async (req, res) => {
    try {
      const { date, price_id } = req.query;

      if (!date || !price_id) {
        return res.status(400).json({
          success: false,
          message: 'Date and price_id are required'
        });
      }

      // Get the price option to determine duration
      const priceOption = await this.collections.prices.findOne(
        { id: price_id },
        { projection: { _id: 0 } }
      );

      if (!priceOption) {
        return res.status(404).json({
          success: false,
          message: 'Price option not found'
        });
      }

      const durationMinutes = priceOption.duration_minutes || this.parseDurationToMinutes(priceOption.duration);
      const bookingSettings = await this.getAvailabilitySettings();

      if (!bookingSettings.enabled) {
        return res.status(400).json({
          success: false,
          message: 'Online booking is currently disabled'
        });
      }

      // Parse the date
      const requestedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if date is in the past
      if (requestedDate < today) {
        return res.status(400).json({
          success: false,
          message: 'Cannot book appointments in the past'
        });
      }

      // Check advance booking limit
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + bookingSettings.advance_booking_days);
      if (requestedDate > maxDate) {
        return res.status(400).json({
          success: false,
          message: `Cannot book more than ${bookingSettings.advance_booking_days} days in advance`
        });
      }

      // Get day of week
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = days[requestedDate.getDay()];
      const daySettings = bookingSettings.working_hours[dayOfWeek];

      if (!daySettings || !daySettings.enabled) {
        return res.json({
          success: true,
          date,
          available_slots: [],
          message: 'Not available on this day'
        });
      }

      // Generate time slots
      const slots = [];
      const [startHour, startMin] = daySettings.start.split(':').map(Number);
      const [endHour, endMin] = daySettings.end.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const gap = bookingSettings.gap_between_appointments;
      const slotDuration = durationMinutes + gap;

      // Get existing bookings for this date
      const dateStr = date.split('T')[0];
      const existingBookings = await this.collections.bookings.find({
        booking_date: dateStr,
        status: { $in: ['confirmed', 'pending_payment'] }
      }).toArray();

      // Create blocked time ranges from existing bookings
      const blockedRanges = existingBookings.map(booking => ({
        start: booking.start_minutes,
        end: booking.end_minutes + gap // Include gap after each booking
      }));

      // Generate available slots
      for (let slotStart = startMinutes; slotStart + durationMinutes <= endMinutes; slotStart += 30) {
        const slotEnd = slotStart + durationMinutes;
        
        // Check if this slot overlaps with any blocked range
        const isBlocked = blockedRanges.some(range => 
          (slotStart < range.end && slotEnd > range.start)
        );

        if (!isBlocked) {
          const hours = Math.floor(slotStart / 60);
          const mins = slotStart % 60;
          const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          
          slots.push({
            time: timeStr,
            start_minutes: slotStart,
            end_minutes: slotEnd,
            available: true
          });
        }
      }

      res.json({
        success: true,
        date,
        duration_minutes: durationMinutes,
        gap_minutes: gap,
        available_slots: slots
      });
    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get availability'
      });
    }
  };

  // GET /api/bookings/settings (public)
  // Get booking configuration for the frontend
  getBookingSettings = async (req, res) => {
    try {
      const bookingSettings = await this.getAvailabilitySettings();

      res.json({
        success: true,
        settings: {
          enabled: bookingSettings.enabled,
          advance_booking_days: bookingSettings.advance_booking_days,
          working_hours: bookingSettings.working_hours,
          location_type: bookingSettings.location_type,
          fixed_location_address: bookingSettings.fixed_location_address
        }
      });
    } catch (error) {
      console.error('Get booking settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get booking settings'
      });
    }
  };

  // POST /api/bookings/create (public)
  // Create a booking (pending payment)
  create = async (req, res) => {
    try {
      const {
        price_id,
        booking_date,
        booking_time,
        client_name,
        client_email,
        client_phone,
        client_address,
        is_home_visit,
        notes
      } = req.body;

      // Validate required fields
      if (!price_id || !booking_date || !booking_time || !client_name || !client_email || !client_phone) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const bookingSettings = await this.getAvailabilitySettings();

      if (!bookingSettings.enabled) {
        return res.status(400).json({
          success: false,
          message: 'Online booking is currently disabled'
        });
      }

      // If home visit, address is required
      if (is_home_visit && !client_address) {
        return res.status(400).json({
          success: false,
          message: 'Address is required for home visits'
        });
      }

      // Get price option
      const priceOption = await this.collections.prices.findOne(
        { id: price_id },
        { projection: { _id: 0 } }
      );

      if (!priceOption) {
        return res.status(404).json({
          success: false,
          message: 'Price option not found'
        });
      }

      // Get therapy info
      const therapy = await this.collections.therapies.findOne(
        { id: priceOption.therapy_id },
        { projection: { _id: 0 } }
      );

      const durationMinutes = priceOption.duration_minutes || this.parseDurationToMinutes(priceOption.duration);

      // Parse time
      const [hours, mins] = booking_time.split(':').map(Number);
      const startMinutes = hours * 60 + mins;
      const endMinutes = startMinutes + durationMinutes;

      // Verify slot is still available
      const existingBooking = await this.collections.bookings.findOne({
        booking_date,
        status: { $in: ['confirmed', 'pending_payment'] },
        $or: [
          { start_minutes: { $lt: endMinutes + bookingSettings.gap_between_appointments }, end_minutes: { $gt: startMinutes } }
        ]
      });

      if (existingBooking) {
        return res.status(409).json({
          success: false,
          message: 'This time slot is no longer available'
        });
      }

      // Create booking
      const booking = {
        id: uuidv4(),
        price_id,
        therapy_id: priceOption.therapy_id,
        therapy_name: therapy?.name || 'Unknown Therapy',
        price_name: priceOption.name,
        price_amount: priceOption.price,
        duration_minutes: durationMinutes,
        booking_date,
        booking_time,
        start_minutes: startMinutes,
        end_minutes: endMinutes,
        client_name,
        client_email,
        client_phone,
        client_address: is_home_visit ? client_address : bookingSettings.fixed_location_address,
        is_home_visit: !!is_home_visit,
        notes: notes || '',
        status: 'pending_payment', // Will change to 'confirmed' after payment
        payment_status: 'pending',
        payment_id: null,
        payment_provider: 'sumup',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.collections.bookings.insertOne(booking);

      console.log(`✅ Booking created (pending payment): ${booking.id}`);

      res.status(201).json({
        success: true,
        booking: {
          id: booking.id,
          therapy_name: booking.therapy_name,
          price_name: booking.price_name,
          price_amount: booking.price_amount,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          duration_minutes: booking.duration_minutes,
          client_name: booking.client_name,
          status: booking.status
        }
      });
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create booking'
      });
    }
  };

  // POST /api/bookings/:id/confirm (called after successful payment)
  confirmPayment = async (req, res) => {
    try {
      const { id } = req.params;
      const { payment_id, payment_reference } = req.body;

      const booking = await this.collections.bookings.findOne({ id });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      if (booking.status === 'confirmed') {
        return res.json({
          success: true,
          message: 'Booking already confirmed',
          booking
        });
      }

      // Update booking status
      await this.collections.bookings.updateOne(
        { id },
        {
          $set: {
            status: 'confirmed',
            payment_status: 'paid',
            payment_id: payment_id || null,
            payment_reference: payment_reference || null,
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      );

      const updatedBooking = await this.collections.bookings.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      console.log(`✅ Booking confirmed: ${id}`);

      // TODO: Send confirmation email if enabled
      const bookingSettings = await this.getAvailabilitySettings();
      if (bookingSettings.email_notifications_enabled) {
        // Email sending logic would go here
        console.log(`📧 Would send confirmation email to ${updatedBooking.client_email}`);
      }

      res.json({
        success: true,
        message: 'Booking confirmed',
        booking: updatedBooking
      });
    } catch (error) {
      console.error('Confirm payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm booking'
      });
    }
  };

  // POST /api/bookings/:id/cancel (public - cancel pending booking)
  cancelBooking = async (req, res) => {
    try {
      const { id } = req.params;

      const booking = await this.collections.bookings.findOne({ id });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Only allow cancelling pending bookings from public
      if (booking.status !== 'pending_payment') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel this booking'
        });
      }

      await this.collections.bookings.updateOne(
        { id },
        {
          $set: {
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      );

      console.log(`✅ Booking cancelled: ${id}`);

      res.json({
        success: true,
        message: 'Booking cancelled'
      });
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel booking'
      });
    }
  };

  // ============ ADMIN ENDPOINTS ============

  // GET /api/admin/bookings (admin)
  list = async (req, res) => {
    try {
      const { status, date_from, date_to, limit = 50, skip = 0 } = req.query;

      const filter = {};

      if (status) {
        filter.status = status;
      }

      if (date_from || date_to) {
        filter.booking_date = {};
        if (date_from) filter.booking_date.$gte = date_from;
        if (date_to) filter.booking_date.$lte = date_to;
      }

      const bookings = await this.collections.bookings
        .find(filter, { projection: { _id: 0 } })
        .sort({ booking_date: -1, start_minutes: 1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .toArray();

      const total = await this.collections.bookings.countDocuments(filter);

      res.json({
        success: true,
        bookings,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip)
        }
      });
    } catch (error) {
      console.error('List bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list bookings'
      });
    }
  };

  // GET /api/admin/bookings/:id (admin)
  get = async (req, res) => {
    try {
      const { id } = req.params;

      const booking = await this.collections.bookings.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      res.json({
        success: true,
        booking
      });
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get booking'
      });
    }
  };

  // PUT /api/admin/bookings/:id (admin)
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const allowedFields = ['status', 'notes', 'admin_notes'];

      const updateData = {
        updated_at: new Date().toISOString()
      };

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      await this.collections.bookings.updateOne(
        { id },
        { $set: updateData }
      );

      const booking = await this.collections.bookings.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      console.log(`✅ Booking updated: ${id}`);

      res.json({
        success: true,
        booking
      });
    } catch (error) {
      console.error('Update booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update booking'
      });
    }
  };

  // PUT /api/admin/bookings/:id/status (admin)
  updateStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }

      await this.collections.bookings.updateOne(
        { id },
        { $set: updateData }
      );

      const booking = await this.collections.bookings.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      console.log(`✅ Booking status updated to ${status}: ${id}`);

      res.json({
        success: true,
        booking
      });
    } catch (error) {
      console.error('Update booking status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update booking status'
      });
    }
  };

  // DELETE /api/admin/bookings/:id (admin)
  delete = async (req, res) => {
    try {
      const { id } = req.params;

      const result = await this.collections.bookings.deleteOne({ id });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      console.log(`✅ Booking deleted: ${id}`);

      res.json({
        success: true,
        message: 'Booking deleted'
      });
    } catch (error) {
      console.error('Delete booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete booking'
      });
    }
  };

  // GET /api/admin/bookings/calendar (admin)
  // Get bookings in calendar format
  getCalendar = async (req, res) => {
    try {
      const { month, year } = req.query;
      
      const targetMonth = parseInt(month) || new Date().getMonth() + 1;
      const targetYear = parseInt(year) || new Date().getFullYear();

      // Create date range for the month
      const startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
      const endDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-31`;

      const bookings = await this.collections.bookings
        .find({
          booking_date: { $gte: startDate, $lte: endDate },
          status: { $in: ['confirmed', 'completed'] }
        }, { projection: { _id: 0 } })
        .sort({ booking_date: 1, start_minutes: 1 })
        .toArray();

      // Group by date
      const calendar = {};
      for (const booking of bookings) {
        if (!calendar[booking.booking_date]) {
          calendar[booking.booking_date] = [];
        }
        calendar[booking.booking_date].push({
          id: booking.id,
          time: booking.booking_time,
          client_name: booking.client_name,
          therapy_name: booking.therapy_name,
          duration_minutes: booking.duration_minutes,
          status: booking.status,
          is_home_visit: booking.is_home_visit
        });
      }

      res.json({
        success: true,
        month: targetMonth,
        year: targetYear,
        calendar
      });
    } catch (error) {
      console.error('Get calendar error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get calendar'
      });
    }
  };
}

module.exports = BookingController;
