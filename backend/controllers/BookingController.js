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
          location_type: null,
          message: 'Not available on this day'
        });
      }

      // Get day's location type
      const dayLocationType = daySettings.location_type || 'both';

      // If remote-only day, return special response with message
      if (dayLocationType === 'remote') {
        return res.json({
          success: true,
          date,
          location_type: 'remote',
          is_remote_day: true,
          remote_day_message: bookingSettings.remote_day_message || 'Working remotely on this day. Please continue to request an appointment.',
          available_slots: [] // No time slots for remote days - user just requests
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
        end: booking.end_minutes + gap, // Include gap after each booking
        reason: 'booking'
      }));

      // Get blocked times from blocked_times collection (one-time + recurring)
      const blockedTimes = await this.collections.blockedTimes?.find({
        $or: [
          { is_recurring: false, date: dateStr },
          { is_recurring: true, day_of_week: dayOfWeek }
        ]
      }).toArray() || [];

      // Add blocked times to blocked ranges
      for (const block of blockedTimes) {
        blockedRanges.push({
          start: block.start_minutes,
          end: block.end_minutes,
          reason: block.reason || 'blocked'
        });
      }

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
        location_type: dayLocationType,
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
          fixed_location_address: bookingSettings.fixed_location_address,
          require_online_payment: bookingSettings.require_online_payment || false,
          payment_button_text: bookingSettings.payment_button_text || 'Complete Booking Request',
          confirmation_message: bookingSettings.confirmation_message || 'Your booking request has been submitted. We will confirm your appointment shortly.',
          remote_day_message: bookingSettings.remote_day_message || 'Working remotely on this day. Please continue to request an appointment.',
          calendar_colors: bookingSettings.calendar_colors || {
            fixed: '#9F87C4',
            remote: '#6BA8A0',
            both: '#8B9DC3'
          }
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

  // GET /api/bookings/available-dates (public)
  // Get dates with availability for a given month and price option
  getAvailableDates = async (req, res) => {
    try {
      const { price_id, month, year } = req.query;

      if (!price_id) {
        return res.status(400).json({
          success: false,
          message: 'price_id is required'
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

      const targetMonth = parseInt(month) || new Date().getMonth() + 1;
      const targetYear = parseInt(year) || new Date().getFullYear();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + bookingSettings.advance_booking_days);

      // Get all bookings for this month
      const startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
      const endDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-31`;
      
      const existingBookings = await this.collections.bookings.find({
        booking_date: { $gte: startDate, $lte: endDate },
        status: { $in: ['confirmed', 'pending_payment'] }
      }).toArray();

      // Group bookings by date
      const bookingsByDate = {};
      for (const booking of existingBookings) {
        if (!bookingsByDate[booking.booking_date]) {
          bookingsByDate[booking.booking_date] = [];
        }
        bookingsByDate[booking.booking_date].push({
          start: booking.start_minutes,
          end: booking.end_minutes
        });
      }

      const gap = bookingSettings.gap_between_appointments;
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const availableDates = [];
      const unavailableDates = [];

      // Check each day in the month
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const date = new Date(dateStr);
        
        // Skip past dates
        if (date < today) {
          unavailableDates.push(dateStr);
          continue;
        }
        
        // Skip dates beyond advance booking window
        if (date > maxDate) {
          unavailableDates.push(dateStr);
          continue;
        }

        // Check if this day is a working day
        const dayOfWeek = days[date.getDay()];
        const daySettings = bookingSettings.working_hours[dayOfWeek];
        
        if (!daySettings || !daySettings.enabled) {
          unavailableDates.push(dateStr);
          continue;
        }

        // Calculate available slots for this day
        const [startHour, startMin] = daySettings.start.split(':').map(Number);
        const [endHour, endMin] = daySettings.end.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        // Get blocked ranges for this date
        const blockedRanges = (bookingsByDate[dateStr] || []).map(booking => ({
          start: booking.start,
          end: booking.end + gap
        }));

        // Check if any slot is available
        let hasAvailableSlot = false;
        for (let slotStart = startMinutes; slotStart + durationMinutes <= endMinutes; slotStart += 30) {
          const slotEnd = slotStart + durationMinutes;
          
          const isBlocked = blockedRanges.some(range => 
            (slotStart < range.end && slotEnd > range.start)
          );

          if (!isBlocked) {
            hasAvailableSlot = true;
            break;
          }
        }

        if (hasAvailableSlot) {
          availableDates.push(dateStr);
        } else {
          unavailableDates.push(dateStr);
        }
      }

      res.json({
        success: true,
        month: targetMonth,
        year: targetYear,
        available_dates: availableDates,
        unavailable_dates: unavailableDates
      });
    } catch (error) {
      console.error('Get available dates error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available dates'
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
        first_name,
        last_name,
        client_name, // Legacy support
        client_email,
        client_phone,
        client_address,
        is_home_visit,
        notes
      } = req.body;

      // Handle name fields - support both old (client_name) and new (first_name, last_name)
      let firstName = first_name;
      let lastName = last_name;
      
      if (!firstName && client_name) {
        // Split legacy client_name into first/last
        const nameParts = client_name.trim().split(/\s+/);
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      const fullName = lastName ? `${firstName} ${lastName}` : firstName;

      // Validate required fields
      if (!price_id || !booking_date || !firstName || !client_email || !client_phone) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields (price_id, booking_date, first_name, client_email, client_phone)'
        });
      }

      const bookingSettings = await this.getAvailabilitySettings();

      if (!bookingSettings.enabled) {
        return res.status(400).json({
          success: false,
          message: 'Online booking is currently disabled'
        });
      }

      // Check if this is a remote day (no booking_time required for remote days)
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const requestedDate = new Date(booking_date);
      const dayOfWeek = days[requestedDate.getDay()];
      const daySettings = bookingSettings.working_hours[dayOfWeek];
      const isRemoteDay = daySettings?.location_type === 'remote';

      // For non-remote days, booking_time is required
      if (!isRemoteDay && !booking_time) {
        return res.status(400).json({
          success: false,
          message: 'Booking time is required for fixed location days'
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

      let startMinutes = 0;
      let endMinutes = 0;
      
      if (booking_time) {
        // Parse time
        const [hours, mins] = booking_time.split(':').map(Number);
        startMinutes = hours * 60 + mins;
        endMinutes = startMinutes + durationMinutes;

        // Verify slot is still available (only for non-remote days)
        if (!isRemoteDay) {
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
        }
      }

      // Find or create client
      let client = await this.collections.clients.findOne({ email: client_email.toLowerCase() });
      
      if (!client) {
        // Create new client
        const newClient = {
          id: uuidv4(),
          first_name: firstName,
          last_name: lastName || '',
          email: client_email.toLowerCase(),
          phone: client_phone,
          address: client_address || '',
          notes: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        await this.collections.clients.insertOne(newClient);
        client = newClient;
        console.log(`✅ New client created from booking: ${client.id} (${client_email})`);
      } else {
        // Update client phone/address if provided and different
        const updates = {};
        if (client_phone && client_phone !== client.phone) {
          updates.phone = client_phone;
        }
        if (client_address && client_address !== client.address) {
          updates.address = client_address;
        }
        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          await this.collections.clients.updateOne({ id: client.id }, { $set: updates });
        }
      }

      // Create booking
      const booking = {
        id: uuidv4(),
        client_id: client.id,
        price_id,
        therapy_id: priceOption.therapy_id,
        therapy_name: therapy?.name || 'Unknown Therapy',
        price_name: priceOption.name,
        price_amount: priceOption.price,
        duration_minutes: durationMinutes,
        booking_date,
        booking_time: booking_time || null,
        start_minutes: startMinutes,
        end_minutes: endMinutes,
        first_name: firstName,
        last_name: lastName || '',
        client_name: fullName, // Keep for backwards compatibility
        client_email: client_email.toLowerCase(),
        client_phone,
        client_address: is_home_visit ? client_address : bookingSettings.fixed_location_address,
        is_home_visit: !!is_home_visit,
        is_remote_booking: isRemoteDay,
        notes: notes || '',
        status: isRemoteDay ? 'pending_confirmation' : 'pending_payment',
        payment_status: 'pending',
        payment_id: null,
        payment_provider: 'sumup',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.collections.bookings.insertOne(booking);

      console.log(`✅ Booking created: ${booking.id} (${isRemoteDay ? 'remote day request' : 'pending payment'})`);

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
          first_name: booking.first_name,
          last_name: booking.last_name,
          client_name: booking.client_name,
          status: booking.status,
          is_remote_booking: booking.is_remote_booking
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

  // GET /api/admin/bookings/upcoming (admin)
  // Get upcoming appointments for the next N days (default 7)
  getUpcoming = async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const numDays = parseInt(days) || 7;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + numDays);
      const endDateStr = endDate.toISOString().split('T')[0];

      const bookings = await this.collections.bookings
        .find({
          booking_date: { $gte: todayStr, $lte: endDateStr },
          status: { $in: ['confirmed', 'pending_payment', 'pending_confirmation'] }
        }, { projection: { _id: 0 } })
        .sort({ booking_date: 1, start_minutes: 1 })
        .toArray();

      // Group by date
      const grouped = {};
      for (const booking of bookings) {
        if (!grouped[booking.booking_date]) {
          grouped[booking.booking_date] = [];
        }
        grouped[booking.booking_date].push({
          id: booking.id,
          time: booking.booking_time,
          client_name: booking.client_name,
          first_name: booking.first_name,
          last_name: booking.last_name,
          therapy_name: booking.therapy_name,
          duration_minutes: booking.duration_minutes,
          status: booking.status,
          is_home_visit: booking.is_home_visit,
          is_remote_booking: booking.is_remote_booking,
          client_phone: booking.client_phone
        });
      }

      res.json({
        success: true,
        days: numDays,
        start_date: todayStr,
        end_date: endDateStr,
        total_appointments: bookings.length,
        appointments_by_date: grouped
      });
    } catch (error) {
      console.error('Get upcoming bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get upcoming bookings'
      });
    }
  };

  // POST /api/admin/bookings/create (admin)
  // Create a booking from the admin panel
  adminCreate = async (req, res) => {
    try {
      const {
        client_id,        // Existing client ID
        new_client,       // Or new client details: { first_name, last_name, email, phone, address }
        price_id,
        booking_date,
        booking_time,
        is_home_visit,
        notes,
        admin_notes,
        status = 'confirmed'  // Admin can set initial status
      } = req.body;

      // Validate required fields
      if (!price_id || !booking_date) {
        return res.status(400).json({
          success: false,
          message: 'Price and booking date are required'
        });
      }

      // Get or create client
      let client;
      if (client_id) {
        client = await this.collections.clients.findOne({ id: client_id }, { projection: { _id: 0 } });
        if (!client) {
          return res.status(404).json({
            success: false,
            message: 'Client not found'
          });
        }
      } else if (new_client) {
        // Validate new client fields
        if (!new_client.first_name || !new_client.email || !new_client.phone) {
          return res.status(400).json({
            success: false,
            message: 'New client requires first_name, email, and phone'
          });
        }

        // Check if client with this email already exists
        const existingClient = await this.collections.clients.findOne({ 
          email: new_client.email.toLowerCase() 
        });

        if (existingClient) {
          return res.status(400).json({
            success: false,
            message: 'A client with this email already exists. Please select them from the list.',
            existing_client_id: existingClient.id
          });
        }

        // Create new client
        client = {
          id: uuidv4(),
          first_name: new_client.first_name,
          last_name: new_client.last_name || '',
          email: new_client.email.toLowerCase(),
          phone: new_client.phone,
          address: new_client.address || '',
          notes: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await this.collections.clients.insertOne(client);
        console.log(`✅ New client created by admin: ${client.id}`);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Either client_id or new_client details are required'
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
      const bookingSettings = await this.getAvailabilitySettings();

      // Check day settings
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const requestedDate = new Date(booking_date);
      const dayOfWeek = days[requestedDate.getDay()];
      const daySettings = bookingSettings.working_hours[dayOfWeek];
      const isRemoteDay = daySettings?.location_type === 'remote';

      let startMinutes = 0;
      let endMinutes = 0;

      if (booking_time) {
        const [hours, mins] = booking_time.split(':').map(Number);
        startMinutes = hours * 60 + mins;
        endMinutes = startMinutes + durationMinutes;

        // Check for conflicts (admin can override but warn)
        const existingBooking = await this.collections.bookings.findOne({
          booking_date,
          status: { $in: ['confirmed', 'pending_payment'] },
          start_minutes: { $lt: endMinutes },
          end_minutes: { $gt: startMinutes }
        });

        if (existingBooking) {
          // Admin can still create but we warn
          console.log(`⚠️ Admin creating overlapping booking on ${booking_date} at ${booking_time}`);
        }
      }

      const fullName = client.last_name ? `${client.first_name} ${client.last_name}` : client.first_name;

      // Create booking
      const booking = {
        id: uuidv4(),
        client_id: client.id,
        price_id,
        therapy_id: priceOption.therapy_id,
        therapy_name: therapy?.name || 'Unknown Therapy',
        price_name: priceOption.name,
        price_amount: priceOption.price,
        duration_minutes: durationMinutes,
        booking_date,
        booking_time: booking_time || null,
        start_minutes: startMinutes,
        end_minutes: endMinutes,
        first_name: client.first_name,
        last_name: client.last_name || '',
        client_name: fullName,
        client_email: client.email,
        client_phone: client.phone,
        client_address: is_home_visit ? client.address : bookingSettings.fixed_location_address,
        is_home_visit: !!is_home_visit,
        is_remote_booking: isRemoteDay && !booking_time,
        notes: notes || '',
        admin_notes: admin_notes || '',
        status: status,
        payment_status: status === 'confirmed' ? 'paid' : 'pending',
        payment_id: null,
        payment_provider: null,
        created_by: req.user?.username || 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.collections.bookings.insertOne(booking);

      console.log(`✅ Booking created by admin: ${booking.id}`);

      // Return full booking with client info
      const responseBooking = { ...booking, _id: undefined };

      res.status(201).json({
        success: true,
        booking: responseBooking,
        client: { ...client, _id: undefined }
      });
    } catch (error) {
      console.error('Admin create booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create booking'
      });
    }
  };
}

module.exports = BookingController;
