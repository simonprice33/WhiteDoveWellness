/**
 * Blocked Times Controller
 * Manages time slot blocking for appointments (one-time and recurring)
 */

const { v4: uuidv4 } = require('uuid');

class BlockedTimesController {
  constructor(collections) {
    this.collections = collections;
  }

  // GET /api/admin/blocked-times
  // List all blocked times (optionally filter by date range)
  list = async (req, res) => {
    try {
      const { date_from, date_to, include_recurring } = req.query;

      const filter = {};
      
      // For one-time blocks, filter by date range
      if (date_from || date_to) {
        filter.$or = [
          // One-time blocks within date range
          {
            is_recurring: false,
            ...(date_from || date_to ? {
              date: {
                ...(date_from && { $gte: date_from }),
                ...(date_to && { $lte: date_to })
              }
            } : {})
          }
        ];
        
        // Always include recurring blocks
        if (include_recurring !== 'false') {
          filter.$or.push({ is_recurring: true });
        }
      }

      const blockedTimes = await this.collections.blockedTimes
        .find(Object.keys(filter).length ? filter : {}, { projection: { _id: 0 } })
        .sort({ is_recurring: -1, date: 1, day_of_week: 1, start_time: 1 })
        .toArray();

      res.json({
        success: true,
        blocked_times: blockedTimes
      });
    } catch (error) {
      console.error('List blocked times error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list blocked times'
      });
    }
  };

  // GET /api/admin/blocked-times/:id
  get = async (req, res) => {
    try {
      const { id } = req.params;

      const blockedTime = await this.collections.blockedTimes.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      if (!blockedTime) {
        return res.status(404).json({
          success: false,
          message: 'Blocked time not found'
        });
      }

      res.json({
        success: true,
        blocked_time: blockedTime
      });
    } catch (error) {
      console.error('Get blocked time error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get blocked time'
      });
    }
  };

  // POST /api/admin/blocked-times
  // Create a new blocked time slot
  create = async (req, res) => {
    try {
      const {
        date,           // For one-time: 'YYYY-MM-DD'
        day_of_week,    // For recurring: 'monday', 'tuesday', etc.
        start_time,     // 'HH:MM' format
        end_time,       // 'HH:MM' format
        reason,         // Optional description
        is_recurring    // Boolean
      } = req.body;

      // Validate required fields
      if (!start_time || !end_time) {
        return res.status(400).json({
          success: false,
          message: 'Start time and end time are required'
        });
      }

      if (is_recurring && !day_of_week) {
        return res.status(400).json({
          success: false,
          message: 'Day of week is required for recurring blocks'
        });
      }

      if (!is_recurring && !date) {
        return res.status(400).json({
          success: false,
          message: 'Date is required for one-time blocks'
        });
      }

      // Validate time format
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid time format. Use HH:MM'
        });
      }

      // Validate end time is after start time
      const [startH, startM] = start_time.split(':').map(Number);
      const [endH, endM] = end_time.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (endMinutes <= startMinutes) {
        return res.status(400).json({
          success: false,
          message: 'End time must be after start time'
        });
      }

      const blockedTime = {
        id: uuidv4(),
        is_recurring: !!is_recurring,
        date: is_recurring ? null : date,
        day_of_week: is_recurring ? day_of_week.toLowerCase() : null,
        start_time,
        end_time,
        start_minutes: startMinutes,
        end_minutes: endMinutes,
        reason: reason || '',
        created_at: new Date().toISOString(),
        created_by: req.user?.username || 'admin'
      };

      await this.collections.blockedTimes.insertOne(blockedTime);

      console.log(`✅ Blocked time created: ${blockedTime.id} (${is_recurring ? 'recurring' : 'one-time'})`);

      res.status(201).json({
        success: true,
        blocked_time: {
          ...blockedTime,
          _id: undefined
        }
      });
    } catch (error) {
      console.error('Create blocked time error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create blocked time'
      });
    }
  };

  // PUT /api/admin/blocked-times/:id
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const { start_time, end_time, reason } = req.body;

      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (start_time) {
        const [startH, startM] = start_time.split(':').map(Number);
        updateData.start_time = start_time;
        updateData.start_minutes = startH * 60 + startM;
      }

      if (end_time) {
        const [endH, endM] = end_time.split(':').map(Number);
        updateData.end_time = end_time;
        updateData.end_minutes = endH * 60 + endM;
      }

      if (reason !== undefined) {
        updateData.reason = reason;
      }

      await this.collections.blockedTimes.updateOne(
        { id },
        { $set: updateData }
      );

      const blockedTime = await this.collections.blockedTimes.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      if (!blockedTime) {
        return res.status(404).json({
          success: false,
          message: 'Blocked time not found'
        });
      }

      console.log(`✅ Blocked time updated: ${id}`);

      res.json({
        success: true,
        blocked_time: blockedTime
      });
    } catch (error) {
      console.error('Update blocked time error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update blocked time'
      });
    }
  };

  // DELETE /api/admin/blocked-times/:id
  delete = async (req, res) => {
    try {
      const { id } = req.params;

      const result = await this.collections.blockedTimes.deleteOne({ id });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Blocked time not found'
        });
      }

      console.log(`✅ Blocked time deleted: ${id}`);

      res.json({
        success: true,
        message: 'Blocked time deleted'
      });
    } catch (error) {
      console.error('Delete blocked time error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete blocked time'
      });
    }
  };

  // GET /api/admin/blocked-times/for-date/:date
  // Get all blocked times that apply to a specific date (one-time + recurring)
  getForDate = async (req, res) => {
    try {
      const { date } = req.params;

      // Get day of week for the date
      const dateObj = new Date(date);
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = days[dateObj.getDay()];

      // Find one-time blocks for this date + recurring blocks for this day of week
      const blockedTimes = await this.collections.blockedTimes
        .find({
          $or: [
            { is_recurring: false, date: date },
            { is_recurring: true, day_of_week: dayOfWeek }
          ]
        }, { projection: { _id: 0 } })
        .sort({ start_time: 1 })
        .toArray();

      res.json({
        success: true,
        date,
        day_of_week: dayOfWeek,
        blocked_times: blockedTimes
      });
    } catch (error) {
      console.error('Get blocked times for date error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get blocked times'
      });
    }
  };
}

module.exports = BlockedTimesController;
