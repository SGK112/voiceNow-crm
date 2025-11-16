import express from 'express';
import Appointment from '../models/Appointment.js';
import Lead from '../models/Lead.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all appointments for a lead
router.get('/lead/:leadId', protect, async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findOne({ _id: leadId, userId: req.user.userId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const appointments = await Appointment.find({ leadId })
      .populate('agentId', 'name configuration')
      .sort({ startTime: 1 });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get all appointments for user
router.get('/', protect, async (req, res) => {
  try {
    const { startDate, endDate, type, status } = req.query;

    const query = { userId: req.user.userId };

    if (type) query.type = type;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const appointments = await Appointment.find(query)
      .populate('leadId', 'name email company phone')
      .populate('agentId', 'name configuration')
      .sort({ startTime: 1 });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get upcoming appointments
router.get('/upcoming/list', protect, async (req, res) => {
  try {
    const now = new Date();
    const appointments = await Appointment.find({
      userId: req.user.userId,
      startTime: { $gte: now },
      status: { $in: ['scheduled', 'confirmed'] }
    })
      .populate('leadId', 'name email company phone')
      .populate('agentId', 'name')
      .sort({ startTime: 1 })
      .limit(10);

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming appointments' });
  }
});

// Get a single appointment
router.get('/:appointmentId', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.appointmentId,
      userId: req.user.userId
    })
      .populate('leadId', 'name email company phone address')
      .populate('agentId', 'name configuration');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Create a new appointment
router.post('/', protect, async (req, res) => {
  try {
    const {
      leadId,
      type,
      title,
      description,
      startTime,
      endTime,
      location,
      attendees,
      aiScheduled,
      agentId,
      callInstructions
    } = req.body;

    const lead = await Lead.findOne({ _id: leadId, userId: req.user.userId });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const appointment = new Appointment({
      userId: req.user.userId,
      leadId,
      type,
      title,
      description,
      startTime,
      endTime,
      location,
      attendees: attendees || [],
      aiScheduled: aiScheduled || false,
      agentId,
      callInstructions
    });

    await appointment.save();

    // Update lead's meetings scheduled count
    lead.meetingsScheduled = (lead.meetingsScheduled || 0) + 1;
    lead.lastActivityType = 'meeting';
    lead.lastActivityAt = new Date();
    await lead.save();

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('leadId', 'name email company')
      .populate('agentId', 'name');

    res.status(201).json(populatedAppointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Update an appointment
router.put('/:appointmentId', protect, async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      startTime,
      endTime,
      location,
      attendees,
      status,
      callInstructions
    } = req.body;

    const appointment = await Appointment.findOne({
      _id: req.params.appointmentId,
      userId: req.user.userId
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (type !== undefined) appointment.type = type;
    if (title !== undefined) appointment.title = title;
    if (description !== undefined) appointment.description = description;
    if (startTime !== undefined) appointment.startTime = startTime;
    if (endTime !== undefined) appointment.endTime = endTime;
    if (location !== undefined) appointment.location = location;
    if (attendees !== undefined) appointment.attendees = attendees;
    if (status !== undefined) {
      appointment.status = status;
      if (status === 'completed') {
        appointment.completedAt = new Date();
      }
    }
    if (callInstructions !== undefined) appointment.callInstructions = callInstructions;

    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('leadId', 'name email company')
      .populate('agentId', 'name');

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Delete an appointment
router.delete('/:appointmentId', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({
      _id: req.params.appointmentId,
      userId: req.user.userId
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

// Schedule AI call
router.post('/:appointmentId/schedule-ai-call', protect, async (req, res) => {
  try {
    const { agentId, callInstructions } = req.body;

    const appointment = await Appointment.findOne({
      _id: req.params.appointmentId,
      userId: req.user.userId
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    appointment.aiScheduled = true;
    appointment.agentId = agentId;
    appointment.callInstructions = callInstructions;
    await appointment.save();

    // TODO: Integrate with ElevenLabs to actually schedule the call
    // This will trigger the voice agent at the scheduled time

    res.json({ message: 'AI call scheduled successfully', appointment });
  } catch (error) {
    console.error('Error scheduling AI call:', error);
    res.status(500).json({ error: 'Failed to schedule AI call' });
  }
});

// Send reminder
router.post('/:appointmentId/send-reminder', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.appointmentId,
      userId: req.user.userId
    }).populate('leadId');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    appointment.reminderSent = true;
    appointment.reminderSentAt = new Date();
    await appointment.save();

    // TODO: Send actual reminder via email/SMS

    res.json({ message: 'Reminder sent successfully' });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

export default router;
