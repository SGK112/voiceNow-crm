import Lead from '../models/Lead.js';
import Note from '../models/Note.js';
import Transaction from '../models/Transaction.js';
import Estimate from '../models/Estimate.js';
import Appointment from '../models/Appointment.js';
import AIConversation from '../models/AIConversation.js';

export const getLeads = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      source,
      qualified,
      priority,
      search,
      assignedTo,
      tags
    } = req.query;

    const filter = { userId: req.user._id };

    if (status) filter.status = status;
    if (source) filter.source = source;
    if (qualified !== undefined) filter.qualified = qualified === 'true';
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (tags) filter.tags = { $in: tags.split(',') };

    // Text search across name, email, company
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email')
      .populate('callId')
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
      .populate('callId')
      .populate('assignedTo', 'name email')
      .populate('teamMembers', 'name email');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Get related data counts
    const [notesCount, transactionsCount, estimatesCount, appointmentsCount, conversationsCount] = await Promise.all([
      Note.countDocuments({ leadId: lead._id }),
      Transaction.countDocuments({ leadId: lead._id }),
      Estimate.countDocuments({ leadId: lead._id }),
      Appointment.countDocuments({ leadId: lead._id }),
      AIConversation.countDocuments({ leadId: lead._id })
    ]);

    res.json({
      ...lead.toObject(),
      counts: {
        notes: notesCount,
        transactions: transactionsCount,
        estimates: estimatesCount,
        appointments: appointmentsCount,
        conversations: conversationsCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createLead = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      alternatePhone,
      address,
      company,
      jobTitle,
      source = 'manual',
      qualified,
      value,
      status,
      priority,
      assignedTo,
      teamMembers,
      tags,
      estimatedValue,
      budget,
      projectType,
      serviceCategory,
      projectDescription,
      preferredStartDate
    } = req.body;

    const lead = await Lead.create({
      userId: req.user._id,
      name,
      email,
      phone,
      alternatePhone,
      address,
      company,
      jobTitle,
      source,
      qualified: qualified || false,
      value: value || 0,
      status: status || 'new',
      priority: priority || 'medium',
      assignedTo,
      assignedToName: req.user.name,
      teamMembers: teamMembers || [],
      tags: tags || [],
      estimatedValue,
      budget,
      projectType,
      serviceCategory,
      projectDescription,
      preferredStartDate,
      lastActivityType: 'note',
      lastActivityAt: new Date()
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

    const updateFields = [
      'name', 'email', 'phone', 'alternatePhone', 'address', 'company', 'jobTitle',
      'qualified', 'qualificationScore', 'value', 'priority', 'assignedTo', 'assignedToName',
      'teamMembers', 'tags', 'estimatedValue', 'budget', 'projectType', 'serviceCategory',
      'projectDescription', 'preferredStartDate', 'slackChannelId', 'slackThreadId'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        lead[field] = req.body[field];
      }
    });

    // Handle status changes
    if (req.body.status) {
      lead.status = req.body.status;
      if (req.body.status === 'converted') {
        lead.convertedAt = new Date();
      }
    }

    lead.lastContactedAt = new Date();
    lead.lastActivityAt = new Date();
    await lead.save();

    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email')
      .populate('teamMembers', 'name email');

    res.json(populatedLead);
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

    const csvHeaders = [
      'Name', 'Email', 'Phone', 'Company', 'Job Title', 'Source',
      'Qualified', 'Value', 'Status', 'Priority', 'Created At'
    ];
    const csvRows = leads.map(lead => [
      lead.name,
      lead.email,
      lead.phone,
      lead.company || '',
      lead.jobTitle || '',
      lead.source,
      lead.qualified ? 'Yes' : 'No',
      lead.value || 0,
      lead.status,
      lead.priority || 'medium',
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

// Bulk import leads from CSV or array
export const importLeads = async (req, res) => {
  try {
    const { leads, batchId } = req.body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ message: 'No leads provided for import' });
    }

    const importBatchId = batchId || `IMPORT-${Date.now()}`;
    const results = {
      total: leads.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    const leadsToCreate = [];

    for (let i = 0; i < leads.length; i++) {
      const leadData = leads[i];

      // Validate required fields
      if (!leadData.name || !leadData.email || !leadData.phone) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          data: leadData,
          error: 'Missing required fields: name, email, or phone'
        });
        continue;
      }

      // Check for duplicate email
      const existingLead = await Lead.findOne({
        userId: req.user._id,
        email: leadData.email
      });

      if (existingLead) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          data: leadData,
          error: `Lead with email ${leadData.email} already exists`
        });
        continue;
      }

      leadsToCreate.push({
        userId: req.user._id,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        alternatePhone: leadData.alternatePhone,
        company: leadData.company,
        jobTitle: leadData.jobTitle,
        address: leadData.address,
        source: leadData.source || 'import',
        qualified: leadData.qualified || false,
        qualificationScore: leadData.qualificationScore || 0,
        value: leadData.value || 0,
        status: leadData.status || 'new',
        priority: leadData.priority || 'medium',
        tags: leadData.tags || [],
        estimatedValue: leadData.estimatedValue,
        budget: leadData.budget,
        projectType: leadData.projectType,
        serviceCategory: leadData.serviceCategory,
        projectDescription: leadData.projectDescription,
        importBatchId,
        lastActivityType: 'note',
        lastActivityAt: new Date()
      });
    }

    // Bulk create leads
    if (leadsToCreate.length > 0) {
      await Lead.insertMany(leadsToCreate);
      results.successful = leadsToCreate.length;
    }

    res.status(201).json({
      message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
      results
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get lead statistics
export const getLeadStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      totalLeads,
      qualifiedLeads,
      convertedLeads,
      statusBreakdown,
      sourceBreakdown,
      priorityBreakdown
    ] = await Promise.all([
      Lead.countDocuments({ userId }),
      Lead.countDocuments({ userId, qualified: true }),
      Lead.countDocuments({ userId, status: 'converted' }),
      Lead.aggregate([
        { $match: { userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { userId } },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { userId } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    ]);

    const totalValue = await Lead.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);

    const totalRevenue = await Lead.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$totalRevenue' } } }
    ]);

    res.json({
      totalLeads,
      qualifiedLeads,
      convertedLeads,
      totalValue: totalValue[0]?.total || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
      conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0,
      statusBreakdown,
      sourceBreakdown,
      priorityBreakdown
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
