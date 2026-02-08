/**
 * Client Controller
 * Single Responsibility: CRUD operations for clients and client notes
 */

const { v4: uuidv4 } = require('uuid');

class ClientController {
  constructor(collections) {
    this.collections = collections;
  }

  // GET /api/admin/clients
  list = async (req, res) => {
    try {
      const { search } = req.query;
      let query = {};

      if (search) {
        query = {
          $or: [
            { first_name: { $regex: search, $options: 'i' } },
            { last_name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        };
      }

      const clients = await this.collections.clients
        .find(query, { projection: { _id: 0 } })
        .sort({ last_name: 1 })
        .toArray();

      res.json({
        success: true,
        clients
      });
    } catch (error) {
      console.error('List clients error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list clients'
      });
    }
  };

  // GET /api/admin/clients/:id
  get = async (req, res) => {
    try {
      const { id } = req.params;

      const client = await this.collections.clients.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      res.json({
        success: true,
        client
      });
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get client'
      });
    }
  };

  // POST /api/admin/clients
  create = async (req, res) => {
    try {
      const { first_name, last_name, email, phone, address, date_of_birth, medical_notes } = req.body;

      if (!first_name || !last_name) {
        return res.status(400).json({
          success: false,
          message: 'First name and last name are required'
        });
      }

      const now = new Date().toISOString();
      const client = {
        id: uuidv4(),
        first_name,
        last_name,
        email: email || '',
        phone: phone || '',
        address: address || '',
        date_of_birth: date_of_birth || '',
        medical_notes: medical_notes || '',
        created_at: now,
        updated_at: now
      };

      await this.collections.clients.insertOne(client);

      console.log(`✅ Created client: ${first_name} ${last_name}`);

      res.status(201).json({
        success: true,
        client
      });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create client'
      });
    }
  };

  // PUT /api/admin/clients/:id
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const updateFields = ['first_name', 'last_name', 'email', 'phone', 'address', 'date_of_birth', 'medical_notes'];

      const client = await this.collections.clients.findOne({ id });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      const updateData = { updated_at: new Date().toISOString() };
      for (const field of updateFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      await this.collections.clients.updateOne(
        { id },
        { $set: updateData }
      );

      const updated = await this.collections.clients.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      res.json({
        success: true,
        client: updated
      });
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update client'
      });
    }
  };

  // DELETE /api/admin/clients/:id
  delete = async (req, res) => {
    try {
      const { id } = req.params;

      const client = await this.collections.clients.findOne({ id });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      // Delete client notes as well
      await this.collections.clientNotes.deleteMany({ client_id: id });
      await this.collections.clients.deleteOne({ id });

      console.log(`✅ Deleted client: ${id}`);

      res.json({
        success: true,
        message: 'Client and notes deleted'
      });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete client'
      });
    }
  };

  // GET /api/admin/clients/:id/notes
  listNotes = async (req, res) => {
    try {
      const { id } = req.params;

      const client = await this.collections.clients.findOne({ id });
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      const notes = await this.collections.clientNotes
        .find({ client_id: id }, { projection: { _id: 0 } })
        .sort({ created_at: -1 })
        .toArray();

      res.json({
        success: true,
        notes
      });
    } catch (error) {
      console.error('List client notes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list notes'
      });
    }
  };

  // POST /api/admin/clients/:id/notes
  createNote = async (req, res) => {
    try {
      const { id } = req.params;
      const { note, session_date } = req.body;

      if (!note) {
        return res.status(400).json({
          success: false,
          message: 'Note content is required'
        });
      }

      const client = await this.collections.clients.findOne({ id });
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      const clientNote = {
        id: uuidv4(),
        client_id: id,
        note,
        session_date: session_date || '',
        created_at: new Date().toISOString(),
        created_by: req.user.id
      };

      await this.collections.clientNotes.insertOne(clientNote);

      console.log(`✅ Created note for client: ${id}`);

      res.status(201).json({
        success: true,
        note: clientNote
      });
    } catch (error) {
      console.error('Create note error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create note'
      });
    }
  };

  // PUT /api/admin/clients/:id/notes/:noteId
  updateNote = async (req, res) => {
    try {
      const { id, noteId } = req.params;
      const { note, session_date } = req.body;

      const clientNote = await this.collections.clientNotes.findOne({
        id: noteId,
        client_id: id
      });

      if (!clientNote) {
        return res.status(404).json({
          success: false,
          message: 'Note not found'
        });
      }

      const updateData = {};
      if (note !== undefined) updateData.note = note;
      if (session_date !== undefined) updateData.session_date = session_date;

      if (Object.keys(updateData).length > 0) {
        await this.collections.clientNotes.updateOne(
          { id: noteId },
          { $set: updateData }
        );
      }

      const updated = await this.collections.clientNotes.findOne(
        { id: noteId },
        { projection: { _id: 0 } }
      );

      res.json({
        success: true,
        note: updated
      });
    } catch (error) {
      console.error('Update note error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update note'
      });
    }
  };

  // DELETE /api/admin/clients/:id/notes/:noteId
  deleteNote = async (req, res) => {
    try {
      const { id, noteId } = req.params;

      const clientNote = await this.collections.clientNotes.findOne({
        id: noteId,
        client_id: id
      });

      if (!clientNote) {
        return res.status(404).json({
          success: false,
          message: 'Note not found'
        });
      }

      await this.collections.clientNotes.deleteOne({ id: noteId });

      console.log(`✅ Deleted note: ${noteId}`);

      res.json({
        success: true,
        message: 'Note deleted'
      });
    } catch (error) {
      console.error('Delete note error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete note'
      });
    }
  };

  // ==================== CONSULTATIONS ====================

  // GET /api/admin/clients/:id/consultations
  listConsultations = async (req, res) => {
    try {
      const { id } = req.params;

      const client = await this.collections.clients.findOne({ id });
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      const consultations = await this.collections.consultations
        .find({ client_id: id }, { projection: { _id: 0 } })
        .sort({ consultation_date: -1 })
        .toArray();

      res.json({
        success: true,
        consultations
      });
    } catch (error) {
      console.error('List consultations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list consultations'
      });
    }
  };

  // GET /api/admin/clients/:id/consultations/:consultationId
  getConsultation = async (req, res) => {
    try {
      const { id, consultationId } = req.params;

      const consultation = await this.collections.consultations.findOne(
        { id: consultationId, client_id: id },
        { projection: { _id: 0 } }
      );

      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: 'Consultation not found'
        });
      }

      res.json({
        success: true,
        consultation
      });
    } catch (error) {
      console.error('Get consultation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get consultation'
      });
    }
  };

  // POST /api/admin/clients/:id/consultations
  createConsultation = async (req, res) => {
    try {
      const { id } = req.params;
      const consultationData = req.body;

      const client = await this.collections.clients.findOne({ id });
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      const consultation = {
        id: uuidv4(),
        client_id: id,
        consultation_date: consultationData.consultation_date || new Date().toISOString(),
        // Client info (pre-filled from client record but can be overridden)
        client_code: consultationData.client_code || '',
        gender: consultationData.gender || '',
        dob: consultationData.dob || client.dob || '',
        address: consultationData.address || client.address || '',
        telephone: consultationData.telephone || client.phone || '',
        age_of_children: consultationData.age_of_children || '',
        // GP Details
        gp_name: consultationData.gp_name || '',
        gp_address: consultationData.gp_address || '',
        gp_telephone: consultationData.gp_telephone || '',
        gp_permission: consultationData.gp_permission || false,
        // Occupation
        occupation: consultationData.occupation || '',
        occupation_type: consultationData.occupation_type || '', // part-time, full-time
        // Contra-indications (array of selected conditions)
        contra_indications: consultationData.contra_indications || [],
        covid_symptoms: consultationData.covid_symptoms || false,
        recent_covid_test: consultationData.recent_covid_test || false,
        contra_indications_other: consultationData.contra_indications_other || '',
        // Lifestyle
        energy_levels: consultationData.energy_levels || '',
        stress_levels: consultationData.stress_levels || '',
        ability_to_relax: consultationData.ability_to_relax || '',
        sleep_pattern: consultationData.sleep_pattern || '',
        dietary_intake: consultationData.dietary_intake || '',
        fluid_intake: consultationData.fluid_intake || '',
        alcohol_units: consultationData.alcohol_units || '',
        smoker: consultationData.smoker || '',
        exercise: consultationData.exercise || '',
        hobbies: consultationData.hobbies || '',
        lifestyle: consultationData.lifestyle || {},
        // Treatment objectives
        treatment_objectives: consultationData.treatment_objectives || [],
        treatment_objectives_other: consultationData.treatment_objectives_other || '',
        // Modifications
        recommended_frequency: consultationData.recommended_frequency || '',
        // Consent
        contact_preferences: consultationData.contact_preferences || [],
        consent_data_storage: consultationData.consent_data_storage || false,
        client_signature: consultationData.client_signature || '',
        client_signature_image: consultationData.client_signature_image || '',
        client_signature_date: consultationData.client_signature_date || '',
        therapist_signature: consultationData.therapist_signature || '',
        therapist_signature_image: consultationData.therapist_signature_image || '',
        therapist_signature_date: consultationData.therapist_signature_date || '',
        // Metadata
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.collections.consultations.insertOne(consultation);

      console.log(`✅ Created consultation for client: ${id}`);

      res.status(201).json({
        success: true,
        consultation
      });
    } catch (error) {
      console.error('Create consultation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create consultation'
      });
    }
  };

  // PUT /api/admin/clients/:id/consultations/:consultationId
  updateConsultation = async (req, res) => {
    try {
      const { id, consultationId } = req.params;
      const updateData = req.body;

      const consultation = await this.collections.consultations.findOne({
        id: consultationId,
        client_id: id
      });

      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: 'Consultation not found'
        });
      }

      updateData.updated_at = new Date().toISOString();

      await this.collections.consultations.updateOne(
        { id: consultationId },
        { $set: updateData }
      );

      const updated = await this.collections.consultations.findOne(
        { id: consultationId },
        { projection: { _id: 0 } }
      );

      res.json({
        success: true,
        consultation: updated
      });
    } catch (error) {
      console.error('Update consultation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update consultation'
      });
    }
  };

  // DELETE /api/admin/clients/:id/consultations/:consultationId
  deleteConsultation = async (req, res) => {
    try {
      const { id, consultationId } = req.params;

      const consultation = await this.collections.consultations.findOne({
        id: consultationId,
        client_id: id
      });

      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: 'Consultation not found'
        });
      }

      await this.collections.consultations.deleteOne({ id: consultationId });

      console.log(`✅ Deleted consultation: ${consultationId}`);

      res.json({
        success: true,
        message: 'Consultation deleted'
      });
    } catch (error) {
      console.error('Delete consultation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete consultation'
      });
    }
  };
}

module.exports = ClientController;
