import express from 'express';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import googleCalendar from '../services/googleCalendar.js';

const router = express.Router();

// Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Post-call webhook for Surprise Granite agent
 * Handles vendor list requests and notifications
 */
router.post('/post-call', async (req, res) => {
  try {
    console.log('📞 Surprise Granite post-call webhook received');
    console.log('Payload:', JSON.stringify(req.body, null, 2));

    const {
      conversation_id,
      transcript,
      metadata,
      analysis
    } = req.body;

    // Extract phone number from metadata or transcript
    const customerPhone = metadata?.customer_phone || extractPhoneFromTranscript(transcript);
    const customerName = metadata?.customer_name || 'Customer';

    // Check if vendor list was requested
    const vendorListRequested = checkForVendorListRequest(transcript);

    if (vendorListRequested && customerPhone) {
      console.log('✅ Vendor list requested by customer');
      console.log('📱 Customer phone:', customerPhone);

      // Send vendor list link via SMS using A2P compliant messaging service
      try {
        const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGa86452ccc15de86eee32177817a09d90';
        const smsMessage = await twilioClient.messages.create({
          body: `Hi! Here's our vendor list where you can view slabs in person:\n\n🔗 https://www.surprisegranite.com/company/vendors-list\n\nRemember to mention "Surprise Granite is my fabricator" when visiting!\n\n- Surprise Granite Team`,
          messagingServiceSid: messagingServiceSid,
          to: customerPhone
        });

        console.log('✅ SMS sent:', smsMessage.sid);
      } catch (smsError) {
        console.error('❌ Error sending SMS:', smsError.message);
      }

      // Send email notification to Surprise Granite
      try {
        await emailTransporter.sendMail({
          from: process.env.SMTP_USER || 'noreply@voiceflowcrm.com',
          to: 'info@surprisegranite.com',
          subject: '📋 Customer Requested Vendor List',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Vendor List Request</h2>

              <p>A customer just requested the vendor list during their call.</p>

              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Customer Information:</h3>
                <p><strong>Name:</strong> ${customerName}</p>
                <p><strong>Phone:</strong> ${customerPhone}</p>
                <p><strong>Conversation ID:</strong> ${conversation_id}</p>
              </div>

              <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1e40af;">Action Taken:</h3>
                <p>✅ Vendor list link automatically sent via SMS to customer</p>
                <p>📱 SMS includes reminder to mention "Surprise Granite is my fabricator"</p>
              </div>

              ${transcript ? `
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #374151;">Call Transcript:</h3>
                  <div style="max-height: 300px; overflow-y: auto; padding: 10px; background-color: white; border-radius: 4px;">
                    <pre style="white-space: pre-wrap; font-size: 12px;">${transcript}</pre>
                  </div>
                </div>
              ` : ''}

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This is an automated notification from VoiceNow CRM
              </p>
            </div>
          `
        });

        console.log('✅ Email notification sent to info@surprisegranite.com');
      } catch (emailError) {
        console.error('❌ Error sending email:', emailError.message);
      }
    }

    // Check for appointment bookings
    const appointmentDetails = extractAppointmentDetails(transcript);
    if (appointmentDetails) {
      console.log('📅 Appointment detected:', appointmentDetails);

      try {
        // Send calendar invite to both customer and Surprise Granite
        const calendarResult = await googleCalendar.createEvent({
          summary: appointmentDetails.summary || 'Surprise Granite Consultation',
          description: `${appointmentDetails.description || 'Consultation appointment'}\n\nCustomer: ${customerName}\nPhone: ${customerPhone}\n\nConversation ID: ${conversation_id}`,
          startTime: appointmentDetails.startTime,
          endTime: appointmentDetails.endTime,
          attendees: [
            customerPhone ? `${customerPhone.replace(/\D/g, '')}@txt.voice.google.com` : null,
            'info@surprisegranite.com'
          ].filter(Boolean),
          location: appointmentDetails.location || 'Surprise Granite Showroom'
        });

        console.log('✅ Calendar invite created:', calendarResult);

        // Send SMS confirmation to customer using A2P compliant messaging service
        if (customerPhone) {
          const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGa86452ccc15de86eee32177817a09d90';
          await twilioClient.messages.create({
            body: `Your appointment with Surprise Granite is confirmed!\n\n📅 ${appointmentDetails.dateTimeText}\n📍 ${appointmentDetails.location || 'Our showroom'}\n\nYou'll receive a calendar invite shortly. See you then!`,
            messagingServiceSid: messagingServiceSid,
            to: customerPhone
          });
          console.log('✅ SMS confirmation sent to customer');
        }

        // Send email notification to Surprise Granite
        await emailTransporter.sendMail({
          from: process.env.SMTP_USER || 'noreply@voiceflowcrm.com',
          to: 'info@surprisegranite.com',
          subject: '📅 New Appointment Booked',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">New Appointment Booked</h2>

              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Customer Information:</h3>
                <p><strong>Name:</strong> ${customerName}</p>
                <p><strong>Phone:</strong> ${customerPhone}</p>
                <p><strong>Conversation ID:</strong> ${conversation_id}</p>
              </div>

              <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1e40af;">Appointment Details:</h3>
                <p><strong>📅 Date/Time:</strong> ${appointmentDetails.dateTimeText}</p>
                <p><strong>📍 Location:</strong> ${appointmentDetails.location || 'Showroom'}</p>
                <p><strong>📝 Type:</strong> ${appointmentDetails.summary || 'Consultation'}</p>
              </div>

              <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #059669;">Actions Completed:</h3>
                <p>✅ Calendar invite sent to both parties</p>
                <p>✅ SMS confirmation sent to customer</p>
              </div>

              ${transcript ? `
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #374151;">Call Transcript:</h3>
                  <div style="max-height: 300px; overflow-y: auto; padding: 10px; background-color: white; border-radius: 4px;">
                    <pre style="white-space: pre-wrap; font-size: 12px;">${transcript}</pre>
                  </div>
                </div>
              ` : ''}

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This is an automated notification from VoiceNow CRM
              </p>
            </div>
          `
        });

        console.log('✅ Appointment confirmation email sent to info@surprisegranite.com');

      } catch (appointmentError) {
        console.error('❌ Error handling appointment:', appointmentError.message);
      }
    }

    res.json({
      success: true,
      message: 'Post-call webhook processed',
      actions: {
        vendorListSent: vendorListRequested && customerPhone ? true : false,
        emailNotificationSent: vendorListRequested ? true : false,
        appointmentBooked: appointmentDetails ? true : false,
        calendarInviteSent: appointmentDetails ? true : false
      }
    });

  } catch (error) {
    console.error('❌ Error in post-call webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Check if vendor list was requested in the conversation
 */
function checkForVendorListRequest(transcript) {
  if (!transcript) return false;

  const lowerTranscript = transcript.toLowerCase();
  const keywords = [
    'vendor list',
    'vendors list',
    'vendor',
    'suppliers',
    'where can i see',
    'view slabs',
    'see materials',
    'visit to see'
  ];

  return keywords.some(keyword => lowerTranscript.includes(keyword));
}

/**
 * Extract appointment details from transcript
 * Returns null if no appointment detected, or object with appointment details
 */
function extractAppointmentDetails(transcript) {
  if (!transcript) return null;

  const lowerTranscript = transcript.toLowerCase();

  // Check if appointment was booked
  const appointmentKeywords = [
    'appointment booked',
    'scheduled for',
    'see you on',
    'consultation scheduled',
    'appointment on',
    'scheduled your appointment',
    'booked you for'
  ];

  const hasAppointment = appointmentKeywords.some(keyword => lowerTranscript.includes(keyword));
  if (!hasAppointment) return null;

  // Try to extract date and time information
  const dateTimePatterns = [
    // "Monday, November 25th at 2pm"
    /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)[,\s]+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
    // "November 25th at 2:30pm"
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
    // "tomorrow at 3pm"
    /(?:tomorrow|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
    // "2pm tomorrow"
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s+(?:tomorrow|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i
  ];

  let dateTimeText = 'TBD';
  let startTime = null;
  let endTime = null;

  for (const pattern of dateTimePatterns) {
    const match = transcript.match(pattern);
    if (match) {
      dateTimeText = match[0];
      // For now, create a basic ISO date (this could be enhanced with a date parsing library)
      // Default to tomorrow at 2pm if we can't parse precisely
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);
      startTime = tomorrow.toISOString();

      const endTimeDate = new Date(tomorrow);
      endTimeDate.setHours(15, 0, 0, 0); // 1 hour appointment
      endTime = endTimeDate.toISOString();
      break;
    }
  }

  // If no specific time found, use a default
  if (!startTime) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    startTime = tomorrow.toISOString();

    const endTimeDate = new Date(tomorrow);
    endTimeDate.setHours(15, 0, 0, 0);
    endTime = endTimeDate.toISOString();

    dateTimeText = 'To be confirmed';
  }

  return {
    summary: 'Surprise Granite Consultation',
    description: 'Consultation appointment scheduled via phone call',
    startTime,
    endTime,
    dateTimeText,
    location: 'Surprise Granite Showroom'
  };
}

/**
 * Extract phone number from transcript
 */
function extractPhoneFromTranscript(transcript) {
  if (!transcript) return null;

  // Look for phone number patterns
  const phoneRegex = /(\+?1?\s*)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g;
  const matches = transcript.match(phoneRegex);

  if (matches && matches.length > 0) {
    // Clean up the phone number
    return matches[0].replace(/\D/g, '');
  }

  return null;
}

export default router;
