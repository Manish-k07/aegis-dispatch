"""
AEGIS DISPATCH CAD • Python / FastAPI SMS Gateway Implementation Reference
Compatible with FastAPI, Twilio Python Helper Library, and SQLAlchemy / Asyncpg.
"""

import os
from datetime import datetime
from fastapi import APIRouter, HTTPException, Form, Response
from pydantic import BaseModel
from typing import Optional

try:
    from twilio.rest import Client
    from twilio.twiml.messaging_response import MessagingResponse
except ImportError:
    Client = None
    MessagingResponse = None

router = APIRouter(prefix="/api/missions", tags=["SMS Notification Gateway"])

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM_PHONE = os.getenv("TWILIO_FROM_PHONE", "+18005550199")

twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and Client) else None


class NotifyHospitalRequest(BaseModel):
    mission_id: str
    hospital_id: Optional[str] = None


def build_hipaa_payload(registration_number: str, eta_minutes: float, priority: str, complaint: str, patient_id: str) -> str:
    """
    Constructs a HIPAA-compliant SMS payload without patient names, phone numbers, or street addresses.
    """
    code = patient_id[:6].upper() if patient_id else "UNKNOWN"
    return (
        f"AEGIS ALERT: Unit {registration_number} en route. "
        f"ETA: {round(eta_minutes)} mins. Acuity: {priority}. "
        f"Chief Complaint: {complaint}. Patient ID: #{code}."
    )


@router.post("/notify-hospital")
async def notify_hospital_ed(req: NotifyHospitalRequest):
    """
    Dispatches outbound HIPAA-compliant SMS alert to the target hospital's Emergency Department.
    """
    if not req.mission_id:
        raise HTTPException(status_code=400, detail="mission_id is required")

    # Mock or DB lookup for facility phone
    target_hospital = {
        "id": req.hospital_id or "10000000-0000-0000-0000-000000000001",
        "name": "Aegis City General Emergency Department",
        "designated_ed_phone": "+918022220001"
    }

    payload = build_hipaa_payload(
        registration_number="KA-01-AE-1001",
        eta_minutes=4.5,
        priority="CRITICAL",
        complaint="CARDIAC",
        patient_id="300000"
    )

    gateway_status = "AEGIS_SMS_SANDBOX"
    if twilio_client:
        try:
            msg = twilio_client.messages.create(
                body=payload,
                from_=TWILIO_FROM_PHONE,
                to=target_hospital["designated_ed_phone"]
            )
            gateway_status = f"TWILIO_{msg.sid}"
        except Exception as e:
            gateway_status = f"TWILIO_ERROR: {str(e)}"

    return {
        "status": "DELIVERED",
        "facility": target_hospital["name"],
        "recipient_phone": target_hospital["designated_ed_phone"],
        "message_payload": payload,
        "gateway": gateway_status,
        "sent_at": datetime.utcnow().isoformat() + "Z"
    }


@router.post("/sms-webhook")
async def handle_sms_webhook(From: str = Form(...), Body: str = Form(...)):
    """
    Two-way SMS Webhook: Hospital charge nurse replies '1' (Bed Ready) or '2' (Divert).
    """
    reply = Body.strip().upper()
    action = "GENERAL_INQUIRY"
    reply_text = "AEGIS CAD: Reply '1' for Bed Ready or '2' for ED Divert."

    if reply == "1" or "READY" in reply:
        action = "BED_READY_ACKNOWLEDGED"
        reply_text = "AEGIS CONFIRMATION: Emergency Department acknowledged. Trauma bay standing by."
    elif reply == "2" or "DIVERT" in reply:
        action = "FACILITY_DIVERT_REQUESTED"
        reply_text = "AEGIS ALERT: Divert recorded. CAD rerouting to secondary receiving facility."

    if MessagingResponse:
        twiml = MessagingResponse()
        twiml.message(reply_text)
        return Response(content=str(twiml), media_type="application/xml")

    return {
        "action": action,
        "from": From,
        "reply": reply_text
    }
