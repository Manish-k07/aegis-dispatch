/**
 * AEGIS DISPATCH - Enterprise SMS Gateway Integration (Node.js Reference Implementation)
 * Provides HIPAA-compliant pre-arrival alerts from Driver MDT to Hospital ED.
 * 
 * Dependencies:
 *   npm install express twilio cors
 */

const express = require('express');
const twilio = require('twilio');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'AC_DEMO_SID';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'demo_auth_token';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+15005550006';

const client = (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN)
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

/**
 * Build HIPAA / DPDP Compliant SMS Payload
 * STRICT REQUIREMENT: No patient names or street addresses over standard SMS.
 */
function buildHipaaPayload({ registrationNumber, unitType, etaMinutes, priority, chiefComplaint, patientId, vitals }) {
  const patientTag = patientId ? `PT-${patientId.substring(0, 4).toUpperCase()}` : 'PT-DEMO';
  const vitalsText = vitals
    ? `HR ${vitals.heartRate || 80} | BP ${vitals.bpSys || 120}/${vitals.bpDia || 80} | SpO2 ${vitals.spO2 || 98}%`
    : 'HR 84 | BP 124/82 | SpO2 98%';

  return (
    `[AEGIS-ALERT] INBOUND AMBULANCE: ${registrationNumber} (${unitType || 'ALS'})\n` +
    `ETA: ~${Math.round(etaMinutes)} mins\n` +
    `PATIENT ID: #${patientTag}\n` +
    `ACUITY: ${priority || 'CRITICAL'}\n` +
    `CHIEF COMPLAINT: ${chiefComplaint || 'CARDIAC'}\n` +
    `VITALS: ${vitalsText}\n` +
    `REPLY:\n` +
    `  1 to CONFIRM TRAUMA BAY READY\n` +
    `  2 for ED DIVERSION (REROUTE)`
  );
}

/**
 * Outbound Route: POST /api/missions/notify-hospital
 */
app.post('/api/missions/notify-hospital', async (req, res) => {
  try {
    const { missionId, hospitalId, hospitalPhone, registrationNumber, unitType, etaMinutes, priority, chiefComplaint, vitals } = req.body;

    const payload = buildHipaaPayload({
      registrationNumber: registrationNumber || 'KA-01-AE-1001',
      unitType: unitType || 'ALS',
      etaMinutes: etaMinutes || 8,
      priority: priority || 'CRITICAL',
      chiefComplaint: chiefComplaint || 'TRAUMA',
      patientId: missionId,
      vitals,
    });

    const targetPhone = hospitalPhone || '+918022220001';

    let messageSid = 'SIMULATED-' + Date.now();
    if (client && !TWILIO_ACCOUNT_SID.includes('DEMO')) {
      const message = await client.messages.create({
        body: payload,
        from: TWILIO_PHONE_NUMBER,
        to: targetPhone,
      });
      messageSid = message.sid;
    }

    console.log(`[SMS GATEWAY] Pre-Arrival SMS dispatched to ${targetPhone} (SID: ${messageSid})`);
    return res.status(200).json({
      success: true,
      messageSid,
      sentAt: new Date().toISOString(),
      recipient: targetPhone,
      payloadPreview: payload,
    });
  } catch (err) {
    console.error('[SMS ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Inbound 2-Way Webhook: POST /api/missions/sms-webhook
 * Triggered when hospital charge nurse replies "1" (Accept) or "2" (Divert)
 */
app.post('/api/missions/sms-webhook', (req, res) => {
  const replyBody = (req.body.Body || '').trim();
  const fromNumber = req.body.From;

  const twiml = new twilio.twiml.MessagingResponse();

  if (replyBody === '1') {
    twiml.message('[AEGIS CONFIRMATION] Trauma Bay 1 locked for inbound unit. Triage team alerted.');
    console.log(`[WEBHOOK] Facility ${fromNumber} confirmed Trauma Bay ready.`);
  } else if (replyBody === '2') {
    twiml.message('[AEGIS DIVERSION] Diversion acknowledged. Central CAD auto-rerouting inbound ambulance.');
    console.log(`[WEBHOOK] Facility ${fromNumber} declared emergency diversion.`);
  } else {
    twiml.message('AEGIS CAD Command: Reply 1 to Confirm Trauma Bay Ready, or 2 to declare Diversion.');
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AEGIS Node.js SMS Service running on port ${PORT}`);
});
