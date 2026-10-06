/**
 * Payment Controller
 * SumUp Hosted Checkout: admin configuration + public checkout flow.
 * A booking is only marked paid after the server verifies the checkout with SumUp.
 */

const SumUpService = require('../services/SumUpService');

const PUBLIC_BOOKING_FIELDS = {
  _id: 0, id: 1, status: 1, payment_status: 1, therapy_name: 1, price_name: 1,
  price_amount: 1, booking_date: 1, booking_time: 1, first_name: 1, payment_checkout_status: 1
};

class PaymentController {
  constructor(collections) {
    this.collections = collections;
    this.sumup = new SumUpService(collections);
  }

  // ---------- Admin ----------

  // GET /api/admin/payments/sumup/config
  getConfig = async (req, res) => {
    try {
      res.json({ success: true, config: await this.sumup.getFullConfig() });
    } catch (error) {
      console.error('Get SumUp config error:', error);
      res.status(500).json({ success: false, message: 'Failed to get SumUp config' });
    }
  };

  // POST /api/admin/payments/sumup/config
  saveConfig = async (req, res) => {
    try {
      const { api_key, merchant_code, currency } = req.body;

      if (!merchant_code || !merchant_code.trim()) {
        return res.status(400).json({ success: false, message: 'Merchant code is required' });
      }

      let finalKey = api_key;
      if (!api_key || api_key === '••••••••') {
        const existing = await this.sumup.getConfig();
        finalKey = existing?.api_key || '';
      }

      if (!finalKey) {
        return res.status(400).json({ success: false, message: 'API key is required' });
      }

      await this.sumup.saveConfig({ api_key: finalKey.trim(), merchant_code, currency });
      console.log('✅ SumUp config saved');

      res.json({
        success: true,
        message: 'SumUp configuration saved',
        config: await this.sumup.getFullConfig()
      });
    } catch (error) {
      console.error('Save SumUp config error:', error);
      res.status(500).json({ success: false, message: 'Failed to save SumUp config' });
    }
  };

  // POST /api/admin/payments/sumup/test
  testConnection = async (req, res) => {
    try {
      if (!(await this.sumup.isConfigured())) {
        return res.status(400).json({ success: false, message: 'Save your SumUp API key and merchant code first' });
      }
      const result = await this.sumup.testConnection();
      res.json({ success: true, message: 'Connected to SumUp successfully', ...result });
    } catch (error) {
      console.error('SumUp test connection error:', error.message);
      res.status(400).json({ success: false, message: error.message || 'Connection test failed' });
    }
  };

  // POST /api/admin/payments/sumup/disconnect
  disconnect = async (req, res) => {
    try {
      await this.sumup.clearConfig();
      res.json({ success: true, message: 'SumUp disconnected' });
    } catch (error) {
      console.error('SumUp disconnect error:', error);
      res.status(500).json({ success: false, message: 'Failed to disconnect SumUp' });
    }
  };

  // ---------- Public ----------

  // POST /api/payments/checkout  { booking_id }
  createCheckout = async (req, res) => {
    try {
      const { booking_id } = req.body;
      const booking = await this.collections.bookings.findOne({ id: booking_id });

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }
      if (booking.payment_status === 'paid') {
        return res.status(400).json({ success: false, message: 'This booking has already been paid' });
      }
      if (booking.status !== 'pending_payment') {
        return res.status(400).json({ success: false, message: 'This booking does not require online payment' });
      }
      if (!(await this.sumup.isConfigured())) {
        return res.status(503).json({ success: false, message: 'Online payments are not available right now. We will contact you to arrange payment.' });
      }

      // Reuse an existing pending checkout if SumUp still accepts it
      if (booking.payment_checkout_id) {
        try {
          const existing = await this.sumup.getCheckout(booking.payment_checkout_id);
          if (existing.status === 'PAID') {
            await this.applyCheckoutStatus(booking, existing);
            return res.status(400).json({ success: false, message: 'This booking has already been paid' });
          }
          if (existing.status === 'PENDING' && existing.hosted_checkout_url) {
            return res.json({ success: true, checkout_url: existing.hosted_checkout_url, checkout_id: existing.id });
          }
        } catch (error) {
          console.warn('Could not reuse SumUp checkout, creating a new one:', error.message);
        }
      }

      const checkout = await this.sumup.createCheckout({ booking, baseUrl: this.getBaseUrl(req) });

      await this.collections.bookings.updateOne(
        { id: booking.id },
        {
          $set: {
            payment_checkout_id: checkout.id,
            payment_checkout_reference: checkout.checkout_reference,
            payment_checkout_status: checkout.status || 'PENDING',
            payment_checkout_created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      );

      console.log(`💳 SumUp checkout created for booking ${booking.id}: ${checkout.id}`);
      res.json({ success: true, checkout_url: checkout.hosted_checkout_url, checkout_id: checkout.id });
    } catch (error) {
      console.error('Create checkout error:', error.message, error.data || '');
      res.status(502).json({ success: false, message: 'Could not start the payment. Please try again.' });
    }
  };

  // GET /api/payments/status/:bookingId
  getStatus = async (req, res) => {
    try {
      let booking = await this.collections.bookings.findOne({ id: req.params.bookingId });
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      let checkoutStatus = booking.payment_status === 'paid' ? 'PAID' : (booking.payment_checkout_status || null);

      if (booking.payment_status !== 'paid' && booking.payment_checkout_id) {
        try {
          const checkout = await this.sumup.getCheckout(booking.payment_checkout_id);
          checkoutStatus = await this.applyCheckoutStatus(booking, checkout);
          booking = await this.collections.bookings.findOne({ id: booking.id });
        } catch (error) {
          console.error('SumUp status lookup failed:', error.message);
        }
      }

      const publicBooking = await this.collections.bookings.findOne({ id: booking.id }, { projection: PUBLIC_BOOKING_FIELDS });
      res.json({ success: true, checkout_status: checkoutStatus, booking: publicBooking });
    } catch (error) {
      console.error('Payment status error:', error);
      res.status(500).json({ success: false, message: 'Failed to get payment status' });
    }
  };

  // POST /api/payments/sumup/webhook  (SumUp return_url: { event_type, id })
  webhook = async (req, res) => {
    const { event_type, id } = req.body || {};
    if (!id) {
      return res.sendStatus(400);
    }
    if (event_type && event_type !== 'CHECKOUT_STATUS_CHANGED') {
      return res.sendStatus(204);
    }

    res.sendStatus(204);

    try {
      const booking = await this.collections.bookings.findOne({ payment_checkout_id: id });
      if (!booking) {
        console.warn(`SumUp webhook for unknown checkout ${id}`);
        return;
      }
      const checkout = await this.sumup.getCheckout(id);
      await this.applyCheckoutStatus(booking, checkout);
    } catch (error) {
      console.error('SumUp webhook processing error:', error.message);
    }
  };

  // Update the booking from a verified SumUp checkout. Idempotent.
  async applyCheckoutStatus(booking, checkout) {
    const status = checkout.status;
    const now = new Date().toISOString();

    if (status === 'PAID') {
      const result = await this.collections.bookings.updateOne(
        { id: booking.id, payment_status: { $ne: 'paid' } },
        {
          $set: {
            status: 'confirmed',
            payment_status: 'paid',
            payment_provider: 'sumup',
            payment_id: checkout.transaction_id || checkout.transactions?.[0]?.id || checkout.id,
            payment_reference: checkout.checkout_reference || booking.payment_checkout_reference,
            payment_amount: checkout.amount,
            payment_currency: checkout.currency,
            payment_checkout_status: 'PAID',
            paid_at: now,
            confirmed_at: now,
            updated_at: now
          }
        }
      );
      if (result.modifiedCount > 0) {
        console.log(`✅ Booking ${booking.id} paid via SumUp (${checkout.checkout_reference})`);
      }
    } else if (status && status !== booking.payment_checkout_status) {
      await this.collections.bookings.updateOne(
        { id: booking.id },
        { $set: { payment_checkout_status: status, updated_at: now } }
      );
    }

    return status;
  }

  getBaseUrl(req) {
    const origin = req.get('origin');
    if (origin && /^https?:\/\//.test(origin)) {
      return origin.replace(/\/$/, '');
    }
    const proto = (req.get('x-forwarded-proto') || req.protocol).split(',')[0].trim();
    const host = (req.get('x-forwarded-host') || req.get('host')).split(',')[0].trim();
    return `${proto}://${host}`;
  }
}

module.exports = PaymentController;
