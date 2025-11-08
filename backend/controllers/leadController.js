import Lead from '../models/Lead.js';

export const getLeads = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, source, qualified } = req.query;

    const filter = { userId: req.user._id };

    if (status) filter.status = status;
    if (source) filter.source = source;
    if (qualified !== undefined) filter.qualified = qualified === 'true';

    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lead.countDocuments(filter);

    res.json({
      leads,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('callId');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createLead = async (req, res) => {
  try {
    const { name, email, phone, source = 'manual', qualified, value, status, notes } = req.body;

    const lead = await Lead.create({
      userId: req.user._id,
      name,
      email,
      phone,
      source,
      qualified: qualified || false,
      value: value || 0,
      status: status || 'new',
      notes: notes ? [{ content: notes, createdBy: req.user.email }] : []
    });

    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, userId: req.user._id });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const { name, email, phone, qualified, qualificationScore, value, status, assignedTo, note } = req.body;

    if (name) lead.name = name;
    if (email) lead.email = email;
    if (phone) lead.phone = phone;
    if (qualified !== undefined) lead.qualified = qualified;
    if (qualificationScore !== undefined) lead.qualificationScore = qualificationScore;
    if (value !== undefined) lead.value = value;
    if (status) {
      lead.status = status;
      if (status === 'converted') {
        lead.convertedAt = new Date();
      }
    }
    if (assignedTo) lead.assignedTo = assignedTo;
    if (note) {
      lead.notes.push({
        content: note,
        createdBy: req.user.email,
        createdAt: new Date()
      });
    }

    lead.lastContactedAt = new Date();
    await lead.save();

    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, userId: req.user._id });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    await lead.deleteOne();
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const exportLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ userId: req.user._id }).lean();

    const csvHeaders = ['Name', 'Email', 'Phone', 'Source', 'Qualified', 'Value', 'Status', 'Created At'];
    const csvRows = leads.map(lead => [
      lead.name,
      lead.email,
      lead.phone,
      lead.source,
      lead.qualified ? 'Yes' : 'No',
      lead.value,
      lead.status,
      new Date(lead.createdAt).toISOString()
    ]);

    const csv = [csvHeaders, ...csvRows].map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
