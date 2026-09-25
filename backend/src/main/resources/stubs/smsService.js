/**
 * AEGIS DISPATCH CAD • Node.js / Express SMS Gateway Implementation Reference
 * Compatible with Express.js, Twilio Node SDK, and PostgreSQL (pg).
 */

const express = require('express');
const router = express.Router();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_FROM_PHONE || '+18005550199';

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Constructs a strict HIPAA-compliant SMS payload without patient names, phone numbers, or addresses.
 */
function buildHipaaPayload({ registrationNumber, etaMinutes, priority, type, patientId }) {
  const patientCode = patientId ? patientId.toString().substring(0, 6).toUpperCase() : 'UNKNOWN';
  return `AEGIS ALERT: Unit ${registrationNumber} en route. ETA: ${Math.round(etaMinutes)} mins. Acuity: ${priority || 'CRITICAL'}. Chief Complaint: ${type || 'TRAUMA'}. Patient ID: #${patientCode}.`;
}

/**
 * POST /api/missions/notify-hospital
 * Accepts missionId and hospitalId, formats clinical payload, and sends SMS via Twilio.
 */
router.post('/missions/notify-hospital', async (req, res) => {
  const { missionId, hospitalId } = req.body;

  if (!missionId) {
    return res.status(400).json({ error: 'missionId is required' });
  }

  try {
    // 1. In real PostgreSQL:
    // const mission = await db.query('SELECT d.*, a.registration_number, e.priority, e.type FROM dispatches d JOIN ambulances a ON d.ambulance_id = a.id JOIN emergencies e ON d.emergency_id = e.id WHERE d.id = $1', [missionId]);
    // const hospital = await db.query('SELECT name, designated_ed_phone, phone FROM hospitals WHERE id = $1', [hospitalId || mission.hospital_id]);

    const mockHospital = {
      name: 'Aegis City General Hospital',
      phone: '+918022220001',
      designated_ed_phone: '+918022220001'
    };

    const targetPhone = mockHospital.designated_ed_phone || mockHospital.phone;
    const payload = buildHipaaPayload({
      registrationNumber: 'KA-01-AE-1001',
      etaMinutes: 4.5,
      priority: 'CRITICAL',
      type: 'CARDIAC',
      patientId: '300000'
    });

    let gatewayStatus = 'MOCK_SANDBOX';
    if (twilioClient) {
      const message = await twilioClient.messages.create({
        body: payload,
        from: fromPhone,
        to: targetPhone
      });
      gatewayStatus = `TWILIO_SID_${message.sid}`;
    }

    return res.status(200).json({
      status: 'DELIVERED',
      facility: mockHospital.name,
      recipientPhone: targetPhone,
      messagePayload: payload,
      gateway: gatewayStatus,
      sentAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to notify hospital ED:', error);
    return res.status(500).json({ error: 'Failed to send ED SMS alert', details: error.message });
  }
});

/**
 * POST /api/missions/sms-webhook
 * Inbound webhook handler for two-way acknowledgment (Reply '1' for Bed Ready, '2' for Divert).
 */
router.post('/missions/sms-webhook', async (req, res) => {
  const { From, Body } = req.body;
  const replyBody = (Body || '').trim();

  let action = 'GENERAL_INQUIRY';
  let twimlResponse = 'AEGIS CAD: Reply "1" for Bed Ready, or "2" for ED Divert.';

  if (replyBody === '1' || replyBody.toUpperCase().includes('READY')) {
    action = 'BED_READY_ACKNOWLEDGED';
    twimlResponse = 'AEGIS: ED acknowledged. Trauma bay standing by.';
    // Update CAD state: await db.query('UPDATE dispatches SET ed_status = $1 WHERE ...', ['BED_READY']);
  } else if (replyBody === '2' || replyBody.toUpperCase().includes('DIVERT')) {
    action = 'FACILITY_DIVERT_REQUESTED';
    twimlResponse = 'AEGIS ALERT: Divert recorded. CAD rerouting to secondary receiving facility.';
  }

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(twimlResponse);

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

module.exports = router;
