import User from '../models/User.js';
import { encrypt, decrypt } from '../utils/encryption.js';

export const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+apiKeys');

    const settings = {
      company: user.company,
      phoneNumbers: user.phoneNumbers,
      teamMembers: user.teamMembers,
      settings: user.settings,
      apiKeys: {
        elevenlabs: user.apiKeys?.elevenlabs ? '••••••••' : null,
        twilio: user.apiKeys?.twilio ? '••••••••' : null,
        sendgrid: user.apiKeys?.sendgrid ? '••••••••' : null
      }
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+apiKeys');

    const { company, webhookUrl, notifications } = req.body;

    if (company) user.company = company;
    if (webhookUrl) user.settings.webhookUrl = webhookUrl;
    if (notifications) user.settings.notifications = { ...user.settings.notifications, ...notifications };

    await user.save();
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateApiKeys = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+apiKeys');

    const { elevenlabs, twilio, sendgrid } = req.body;

    if (!user.apiKeys) {
      user.apiKeys = {};
    }

    if (elevenlabs) user.apiKeys.elevenlabs = encrypt(elevenlabs);
    if (twilio) user.apiKeys.twilio = encrypt(twilio);
    if (sendgrid) user.apiKeys.sendgrid = encrypt(sendgrid);

    await user.save();
    res.json({ message: 'API keys updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getApiKeys = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+apiKeys');

    const apiKeys = {
      elevenlabs: user.apiKeys?.elevenlabs ? decrypt(user.apiKeys.elevenlabs) : null,
      twilio: user.apiKeys?.twilio ? decrypt(user.apiKeys.twilio) : null,
      sendgrid: user.apiKeys?.sendgrid ? decrypt(user.apiKeys.sendgrid) : null
    };

    res.json(apiKeys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addPhoneNumber = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { number, provider } = req.body;

    user.phoneNumbers.push({ number, provider });
    await user.save();

    res.json({ message: 'Phone number added successfully', phoneNumbers: user.phoneNumbers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removePhoneNumber = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { numberId } = req.params;

    user.phoneNumbers = user.phoneNumbers.filter(p => p._id.toString() !== numberId);
    await user.save();

    res.json({ message: 'Phone number removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addTeamMember = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { email, role } = req.body;

    user.teamMembers.push({ email, role });
    await user.save();

    res.json({ message: 'Team member added successfully', teamMembers: user.teamMembers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeTeamMember = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { memberId } = req.params;

    user.teamMembers = user.teamMembers.filter(m => m._id.toString() !== memberId);
    await user.save();

    res.json({ message: 'Team member removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
