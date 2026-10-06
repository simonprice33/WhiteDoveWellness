/**
 * Voucher Controller
 * Admin register of gift vouchers sold via SumUp (recorded manually - SumUp has no gift card API)
 */

const { v4: uuidv4 } = require('uuid');

const VALID_STATUSES = ['active', 'redeemed', 'expired', 'cancelled'];

const effectiveStatus = (voucher) => {
  if (voucher.status === 'active' && voucher.expires_at && voucher.expires_at < new Date().toISOString().slice(0, 10)) {
    return 'expired';
  }
  return voucher.status;
};

class VoucherController {
  constructor(collections) {
    this.collections = collections;
  }

  // GET /api/admin/vouchers?search=&status=
  list = async (req, res) => {
    try {
      const { search, status } = req.query;
      const query = {};
      if (search) {
        const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = [{ code: regex }, { buyer_name: regex }, { recipient_name: regex }, { buyer_email: regex }];
      }

      let vouchers = await this.collections.vouchers
        .find(query, { projection: { _id: 0 } })
        .sort({ purchased_at: -1, created_at: -1 })
        .toArray();

      vouchers = vouchers.map((v) => ({ ...v, status: effectiveStatus(v) }));
      if (status) {
        vouchers = vouchers.filter((v) => v.status === status);
      }

      const all = await this.collections.vouchers.find({}, { projection: { _id: 0, status: 1, expires_at: 1, amount: 1, balance: 1 } }).toArray();
      const summary = { active: 0, redeemed: 0, expired: 0, cancelled: 0, outstanding_value: 0 };
      for (const v of all) {
        const s = effectiveStatus(v);
        summary[s] = (summary[s] || 0) + 1;
        if (s === 'active') summary.outstanding_value += Number(v.balance ?? v.amount) || 0;
      }

      res.json({ success: true, vouchers, summary });
    } catch (error) {
      console.error('List vouchers error:', error);
      res.status(500).json({ success: false, message: 'Failed to list vouchers' });
    }
  };

  // POST /api/admin/vouchers
  create = async (req, res) => {
    try {
      const { code, amount, buyer_name, buyer_email, recipient_name, purchased_at, expires_at, notes } = req.body;

      if (!code || !code.trim()) {
        return res.status(400).json({ success: false, message: 'Voucher code is required' });
      }
      const value = Number(amount);
      if (!value || value <= 0) {
        return res.status(400).json({ success: false, message: 'A voucher value greater than 0 is required' });
      }

      const normalisedCode = code.trim().toUpperCase();
      const existing = await this.collections.vouchers.findOne({ code: normalisedCode });
      if (existing) {
        return res.status(409).json({ success: false, message: 'A voucher with this code already exists' });
      }

      const purchased = purchased_at || new Date().toISOString().slice(0, 10);
      let expiry = expires_at;
      if (!expiry) {
        const d = new Date(`${purchased}T00:00:00`);
        d.setFullYear(d.getFullYear() + 1);
        expiry = d.toISOString().slice(0, 10);
      }

      const now = new Date().toISOString();
      const voucher = {
        id: uuidv4(),
        code: normalisedCode,
        amount: value,
        balance: value,
        buyer_name: buyer_name || '',
        buyer_email: buyer_email || '',
        recipient_name: recipient_name || '',
        purchased_at: purchased,
        expires_at: expiry,
        notes: notes || '',
        status: 'active',
        redeemed_at: null,
        redeemed_by: '',
        redemption_notes: '',
        created_at: now,
        updated_at: now
      };

      await this.collections.vouchers.insertOne(voucher);
      const { _id, ...clean } = voucher;
      res.status(201).json({ success: true, voucher: clean });
    } catch (error) {
      console.error('Create voucher error:', error);
      res.status(500).json({ success: false, message: 'Failed to create voucher' });
    }
  };

  // PUT /api/admin/vouchers/:id
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const voucher = await this.collections.vouchers.findOne({ id });
      if (!voucher) {
        return res.status(404).json({ success: false, message: 'Voucher not found' });
      }

      const fields = ['code', 'amount', 'balance', 'buyer_name', 'buyer_email', 'recipient_name', 'purchased_at', 'expires_at', 'notes', 'status'];
      const updates = { updated_at: new Date().toISOString() };
      for (const field of fields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      if (updates.code) {
        updates.code = updates.code.trim().toUpperCase();
        const clash = await this.collections.vouchers.findOne({ code: updates.code, id: { $ne: id } });
        if (clash) {
          return res.status(409).json({ success: false, message: 'A voucher with this code already exists' });
        }
      }
      if (updates.amount !== undefined) {
        updates.amount = Number(updates.amount);
        if (!updates.amount || updates.amount <= 0) {
          return res.status(400).json({ success: false, message: 'A voucher value greater than 0 is required' });
        }
        if (updates.balance === undefined && voucher.balance === voucher.amount) updates.balance = updates.amount;
      }
      if (updates.balance !== undefined) updates.balance = Number(updates.balance);
      if (updates.status && !VALID_STATUSES.includes(updates.status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      if (updates.status === 'active') {
        updates.redeemed_at = null;
      }

      await this.collections.vouchers.updateOne({ id }, { $set: updates });
      const updated = await this.collections.vouchers.findOne({ id }, { projection: { _id: 0 } });
      res.json({ success: true, voucher: { ...updated, status: effectiveStatus(updated) } });
    } catch (error) {
      console.error('Update voucher error:', error);
      res.status(500).json({ success: false, message: 'Failed to update voucher' });
    }
  };

  // PUT /api/admin/vouchers/:id/redeem  { redeemed_by, redemption_notes, amount_used }
  redeem = async (req, res) => {
    try {
      const { id } = req.params;
      const { redeemed_by, redemption_notes, amount_used } = req.body;
      const voucher = await this.collections.vouchers.findOne({ id });
      if (!voucher) {
        return res.status(404).json({ success: false, message: 'Voucher not found' });
      }
      if (voucher.status !== 'active') {
        return res.status(400).json({ success: false, message: `Voucher is already ${voucher.status}` });
      }

      const now = new Date().toISOString();
      const currentBalance = Number(voucher.balance ?? voucher.amount);
      const used = amount_used !== undefined && amount_used !== null && amount_used !== '' ? Number(amount_used) : currentBalance;
      if (!used || used <= 0 || used > currentBalance + 0.001) {
        return res.status(400).json({ success: false, message: `Amount used must be between 0 and the remaining balance (£${currentBalance.toFixed(2)})` });
      }

      const remaining = Math.max(0, Math.round((currentBalance - used) * 100) / 100);
      const fullyUsed = remaining <= 0;
      const redemption = { at: now, amount: used, by: redeemed_by || '', notes: redemption_notes || '' };

      await this.collections.vouchers.updateOne(
        { id },
        {
          $set: {
            balance: remaining,
            status: fullyUsed ? 'redeemed' : 'active',
            redeemed_at: fullyUsed ? now : null,
            redeemed_by: redeemed_by || voucher.redeemed_by || '',
            redemption_notes: redemption_notes || voucher.redemption_notes || '',
            updated_at: now
          },
          $push: { redemptions: redemption }
        }
      );

      const updated = await this.collections.vouchers.findOne({ id }, { projection: { _id: 0 } });
      res.json({ success: true, voucher: updated, message: fullyUsed ? 'Voucher marked as redeemed' : `£${used.toFixed(2)} used - £${remaining.toFixed(2)} remaining` });
    } catch (error) {
      console.error('Redeem voucher error:', error);
      res.status(500).json({ success: false, message: 'Failed to redeem voucher' });
    }
  };

  // DELETE /api/admin/vouchers/:id
  delete = async (req, res) => {
    try {
      const result = await this.collections.vouchers.deleteOne({ id: req.params.id });
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'Voucher not found' });
      }
      res.json({ success: true, message: 'Voucher deleted' });
    } catch (error) {
      console.error('Delete voucher error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete voucher' });
    }
  };
}

module.exports = VoucherController;
