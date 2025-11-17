import VoiceAgent from '../models/VoiceAgent.js';
import CallLog from '../models/CallLog.js';
import Lead from '../models/Lead.js';
import TwilioService from '../services/twilioService.js';
import csv from 'csv-parser';
import { Readable } from 'stream';

const twilioService = new TwilioService();

/**
 * Initiate a single live call from Agent Studio
 */
export const initiateLiveCall = async (req, res) => {
  try {
    const { agentId, phoneNumber, leadName, leadNotes } = req.body;

    console.log('\n📞 [LIVE CALL] Initiating call from Agent Studio');
    console.log('   Agent ID:', agentId);
    console.log('   Phone:', phoneNumber);
    console.log('   Lead:', leadName || 'Unknown');

    if (!agentId || !phoneNumber) {
      return res.status(400).json({
        message: 'Agent ID and phone number are required'
      });
    }

    // Fetch the agent
    const agent = await VoiceAgent.findOne({ _id: agentId, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Validate agent configuration
    if (!agent.elevenLabsAgentId) {
      return res.status(400).json({
        message: 'Agent must have an ElevenLabs agent ID configured'
      });
    }

    // Get Twilio phone number
    const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioFromNumber) {
      return res.status(500).json({
        message: 'Twilio phone number not configured'
      });
    }

    // Format phone number
    let formattedNumber = phoneNumber.trim();
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+1' + formattedNumber.replace(/\D/g, '');
    }

    // Check for existing lead or create new one
    let lead = await Lead.findOne({
      userId: req.user._id,
      phone: formattedNumber
    });

    if (!lead && leadName) {
      lead = await Lead.create({
        userId: req.user._id,
        name: leadName,
        phone: formattedNumber,
        source: 'agent_studio_call',
        status: 'new',
        notes: leadNotes || 'Called from Agent Studio'
      });
      console.log('   ✅ Created new lead:', lead._id);
    }

    // Make the call
    console.log('   Initiating Twilio call with ElevenLabs WebSocket...');

    const call = await twilioService.makeCallWithElevenLabs(
      twilioFromNumber,
      formattedNumber,
      agent.elevenLabsAgentId
    );

    const callId = call.sid;
    console.log('   ✅ Call initiated:', callId);

    // Log the call
    const callLog = await CallLog.create({
      userId: req.user._id,
      agentId: agent._id,
      leadId: lead?._id,
      elevenLabsCallId: callId,
      phoneNumber: formattedNumber,
      status: 'initiated',
      direction: 'outbound',
      metadata: {
        liveCall: true,
        leadName: leadName || lead?.name,
        twilioCallSid: callId,
        fromNumber: twilioFromNumber,
        method: 'twilio_elevenlabs_websocket',
        initiatedFrom: 'agent_studio'
      }
    });

    res.json({
      success: true,
      message: 'Call initiated successfully',
      callId: callId,
      callLogId: callLog._id,
      leadId: lead?._id
    });

  } catch (error) {
    console.error('❌ [LIVE CALL] Error:', error.message);
    res.status(500).json({
      message: error.message || 'Failed to initiate call'
    });
  }
};

/**
 * Upload CSV and initiate bulk calls
 */
export const uploadAndCallBulk = async (req, res) => {
  try {
    const { agentId } = req.body;

    console.log('\n📋 [BULK CALL] Processing CSV upload');
    console.log('   Agent ID:', agentId);

    if (!agentId) {
      return res.status(400).json({ message: 'Agent ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Fetch the agent
    const agent = await VoiceAgent.findOne({ _id: agentId, userId: req.user._id });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Validate agent configuration
    if (!agent.elevenLabsAgentId) {
      return res.status(400).json({
        message: 'Agent must have an ElevenLabs agent ID configured'
      });
    }

    // Get Twilio phone number
    const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioFromNumber) {
      return res.status(500).json({
        message: 'Twilio phone number not configured'
      });
    }

    // Parse CSV
    const results = [];
    const fileContent = req.file.buffer.toString('utf-8');
    const stream = Readable.from(fileContent);

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`   📊 Parsed ${results.length} rows from CSV`);

    // Process each row
    const callResults = [];
    const errors = [];

    for (const row of results) {
      try {
        // Extract phone number (try different column names)
        const phoneNumber = row.phone || row.Phone || row.phoneNumber || row['Phone Number'] || row.number;
        const name = row.name || row.Name || row['Lead Name'] || row.leadName || 'Unknown';

        if (!phoneNumber) {
          errors.push({ row, error: 'No phone number found' });
          continue;
        }

        // Format phone number
        let formattedNumber = phoneNumber.trim();
        if (!formattedNumber.startsWith('+')) {
          formattedNumber = '+1' + formattedNumber.replace(/\D/g, '');
        }

        // Create or find lead
        let lead = await Lead.findOne({
          userId: req.user._id,
          phone: formattedNumber
        });

        if (!lead) {
          lead = await Lead.create({
            userId: req.user._id,
            name,
            phone: formattedNumber,
            source: 'bulk_call_csv',
            status: 'new',
            email: row.email || row.Email,
            notes: row.notes || row.Notes || 'Bulk call upload'
          });
        }

        // Initiate call
        const call = await twilioService.makeCallWithElevenLabs(
          twilioFromNumber,
          formattedNumber,
          agent.elevenLabsAgentId
        );

        // Log the call
        const callLog = await CallLog.create({
          userId: req.user._id,
          agentId: agent._id,
          leadId: lead._id,
          elevenLabsCallId: call.sid,
          phoneNumber: formattedNumber,
          status: 'initiated',
          direction: 'outbound',
          metadata: {
            bulkCall: true,
            leadName: name,
            twilioCallSid: call.sid,
            fromNumber: twilioFromNumber,
            method: 'twilio_elevenlabs_websocket',
            initiatedFrom: 'bulk_upload'
          }
        });

        callResults.push({
          phoneNumber: formattedNumber,
          name,
          callId: call.sid,
          leadId: lead._id,
          status: 'initiated'
        });

        console.log(`   ✅ Call initiated to ${name} (${formattedNumber})`);

        // Add delay between calls to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`   ❌ Error calling ${row.phone}:`, error.message);
        errors.push({ row, error: error.message });
      }
    }

    console.log(`\n✅ [BULK CALL] Complete: ${callResults.length} calls initiated, ${errors.length} errors`);

    res.json({
      success: true,
      message: `Initiated ${callResults.length} calls`,
      totalRows: results.length,
      successfulCalls: callResults.length,
      errors: errors.length,
      calls: callResults,
      errorDetails: errors
    });

  } catch (error) {
    console.error('❌ [BULK CALL] Error:', error.message);
    res.status(500).json({
      message: error.message || 'Failed to process bulk calls'
    });
  }
};

/**
 * Get call status
 */
export const getCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;

    const callLog = await CallLog.findOne({
      $or: [
        { elevenLabsCallId: callId },
        { 'metadata.twilioCallSid': callId }
      ],
      userId: req.user._id
    }).populate('agentId leadId');

    if (!callLog) {
      return res.status(404).json({ message: 'Call not found' });
    }

    res.json({
      success: true,
      call: callLog
    });

  } catch (error) {
    console.error('Error getting call status:', error.message);
    res.status(500).json({
      message: error.message || 'Failed to get call status'
    });
  }
};

export default {
  initiateLiveCall,
  uploadAndCallBulk,
  getCallStatus
};
