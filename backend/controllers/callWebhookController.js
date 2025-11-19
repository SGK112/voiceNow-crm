import CallLog from '../models/CallLog.js';
import VoiceAgent from '../models/VoiceAgent.js';
import WorkflowExecutor from '../services/workflowExecutor.js';
import emailService from '../services/emailService.js';

const workflowExecutor = new WorkflowExecutor();

/**
 * Webhook handler for ElevenLabs call completion
 * This endpoint is called by ElevenLabs when a call finishes
 */
export const handleCallCompletion = async (req, res) => {
  try {
    const callData = req.body;

    console.log('📞 Received call completion webhook:', {
      caller: callData.caller_phone,
      duration: callData.duration,
      status: callData.status
    });

    // Find the agent that handled this call (by ElevenLabs agent ID or phone number)
    const agent = await VoiceAgent.findOne({
      $or: [
        { elevenLabsAgentId: callData.agent_id }, // Fixed: use elevenLabsAgentId, not agentId
        { phoneNumber: callData.to_number }
      ]
    });

    console.log('🔍 Agent lookup for:', callData.agent_id);
    console.log('   Found agent:', agent ? agent.name : 'NONE');

    if (!agent) {
      console.warn('⚠️ No agent found for call:', callData.agent_id);
      return res.status(200).json({ message: 'No agent found, but acknowledged' });
    }

    const userId = agent.userId;
    console.log('   User ID:', userId);

    // Save the call to database
    const call = await CallLog.create({
      userId,
      agentId: agent._id,
      agentType: agent.type,
      direction: callData.direction || 'inbound',
      callerPhone: callData.caller_phone,
      callerName: callData.caller_name,
      duration: callData.duration,
      status: callData.status || 'completed',
      recordingUrl: callData.recording_url,
      transcript: callData.transcript,
      callCost: callData.cost || 0,
      qualified: callData.qualified || false,
      metadata: {
        elevenlabs_call_id: callData.call_id,
        timestamp: callData.timestamp,
        consultation_booked: callData.consultation_booked,
        customer_email: callData.customer_email || callData.email,
        customer_name: callData.customer_name || callData.caller_name,
        consultation_date: callData.consultation_date,
        consultation_time: callData.consultation_time,
        address: callData.address
      }
    });

    console.log(`✅ Call saved: ${call._id}`);

    // Execute workflows for this user based on call data
    try {
      await workflowExecutor.executeWorkflowsForCall(callData, userId);
    } catch (workflowError) {
      console.error('Error executing workflows:', workflowError);
      // Don't fail the webhook response if workflows fail
    }

    // Send calendar invite if consultation was booked
    try {
      // Check if the call data indicates a consultation was booked
      const transcript = callData.transcript || '';

      // Extract consultation details from callData (ElevenLabs sends it at top level)
      if (callData.consultation_booked || transcript.toLowerCase().includes('consultation scheduled')) {
        const customerEmail = callData.customer_email || callData.email;
        const customerName = callData.customer_name || callData.caller_name;
        const consultationDate = callData.consultation_date;
        const consultationTime = callData.consultation_time;
        const address = callData.address || agent.configuration?.business_address;

        if (customerEmail && consultationDate && consultationTime) {
          console.log('📧 Sending consultation confirmation with calendar invite...');

          await emailService.sendConsultationConfirmation({
            to: customerEmail,
            leadName: customerName,
            consultationDate,
            consultationTime,
            address: address || 'To be confirmed',
            companyName: agent.name || 'Our Company',
            companyEmail: process.env.COMPANY_EMAIL || 'info@company.com'
          });

          console.log('✅ Calendar invite sent successfully');
        }
      }
    } catch (calendarError) {
      console.error('Error sending calendar invite:', calendarError);
      // Don't fail the webhook response if calendar invite fails
    }

    // Respond to ElevenLabs
    res.status(200).json({
      success: true,
      callId: call._id,
      message: 'Call processed successfully'
    });
  } catch (error) {
    console.error('Error processing call webhook:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Webhook handler for real-time call events
 * This can be called during a call for real-time updates
 */
export const handleCallEvent = async (req, res) => {
  try {
    const eventData = req.body;

    console.log('📡 Received call event:', {
      type: eventData.event_type,
      callId: eventData.call_id
    });

    // Handle different event types
    switch (eventData.event_type) {
      case 'call_started':
        // Could update call status to 'in_progress'
        break;
      case 'call_transfer':
        // Could log transfer events
        break;
      case 'dtmf_pressed':
        // Could log button presses
        break;
      default:
        console.log('Unknown event type:', eventData.event_type);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing call event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
