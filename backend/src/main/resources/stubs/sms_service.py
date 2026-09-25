"""
AEGIS DISPATCH - Enterprise SMS Gateway Integration (Python / FastAPI Reference Implementation)
Provides HIPAA-compliant pre-arrival alerts from Driver MDT to Hospital ED.

Dependencies:
    pip install fastapi uvicorn twilio pydantic
Run:
    uvicorn sms_service:app --port 8001 --reload
"""

import os
import datetime
from typing import Optional, Dict, Any
from fastapi import FastAPI, Form, HTTPException, Response
from pydantic import BaseModel
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse

app = FastAPI(title="AEGIS CAD - SMS Notification Gateway")

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "AC_DEMO_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "demo_auth_token")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "+15005550006")

twilio_client = None
if TWILIO_ACCOUNT_SID and not TWILIO_ACCOUNT_SID.startswith("AC_DEMO"):
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


class NotifyHospitalRequest(BaseModel):
    missionId: str
    hospitalId: str
    hospitalPhone: Optional[str] = "+918022220001"
    registrationNumber: Optional[str] = "KA-01-AE-1001"
    unitType: Optional[str] = "ALS"
    etaMinutes: Optional[float] = 8.0
    priority: Optional[str] = "CRITICAL"
    chiefComplaint: Optional[str] = "TRAUMA"
    vitals: Optional[Dict[str, Any]] = None


def build_hipaa_payload(req: NotifyHospitalRequest) -> str:
    """
    HIPAA / DPDP Compliance Enforcement:
    Strictly forbids full patient names, personal contact numbers, and explicit addresses.
    """
    patient_tag = f"PT-{req.missionId[:4].upper()}" if req.missionId else "PT-DEMO"
    
    vitals_text = "HR 84 | BP 124/82 | SpO2 98%"
    if req.vitals:
        hr = req.vitals.get("heartRate", 80)
        sys = req.vitals.get("bpSys", 120)
        dia = req.vitals.get("bpDia", 80)
        spo2 = req.vitals.get("spO2", 98)
        vitals_text = f"HR {hr} | BP {sys}/{dia} | SpO2 {spo2}%"

    return (
        f"[AEGIS-ALERT] INBOUND AMBULANCE: {req.registrationNumber} ({req.unitType})\n"
        f"ETA: ~{round(req.etaMinutes)} mins\n"
        f"PATIENT ID: #{patient_tag}\n"
        f"ACUITY: {req.priority}\n"
        f"CHIEF COMPLAINT: {req.chiefComplaint}\n"
        f"VITALS: {vitals_text}\n"
        f"REPLY:\n"
        f"  1 to CONFIRM TRAUMA BAY READY\n"
        f"  2 for ED DIVERSION (REROUTE)"
    )


@app.post("/api/missions/notify-hospital")
async def notify_hospital(payload: NotifyHospitalRequest):
    """
    Outbound SMS Dispatcher:
    Sends formatted clinical alert to designated emergency receiving department.
    """
    sms_text = build_hipaa_payload(payload)
    target_phone = payload.hospitalPhone or "+918022220001"

    message_sid = f"SIMULATED-{datetime.datetime.now().timestamp()}"
    if twilio_client:
        try:
            msg = twilio_client.messages.create(
                body=sms_text,
                from_=TWILIO_PHONE_NUMBER,
                to=target_phone
            )
            message_sid = msg.sid
        except Exception as e:
            print(f"[TWILIO ERROR] {e}. Falling back to simulated carrier.")

    print(f"[SMS LOG] Dispatched to {target_phone} (SID: {message_sid}):\n{sms_text}")

    return {
        "success": True,
        "messageSid": message_sid,
        "recipient": target_phone,
        "sentAt": datetime.datetime.utcnow().isoformat() + "Z",
        "payloadPreview": sms_text
    }


@app.post("/api/missions/sms-webhook")
async def sms_webhook(From: str = Form(...), Body: str = Form(...)):
    """
    2-Way Inbound Reply Webhook:
    Enables ED charge nurses to reply "1" to confirm trauma bay readiness or "2" to trigger auto-diversion.
    """
    reply = Body.strip()
    resp = MessagingResponse()

    if reply == "1":
        resp.message("[AEGIS CONFIRMATION] Trauma Bay 1 locked for inbound unit. Triage team alerted.")
        print(f"[WEBHOOK] Facility {From} confirmed Trauma Bay ready.")
    elif reply == "2":
        resp.message("[AEGIS DIVERSION] Diversion acknowledged. Central CAD auto-rerouting inbound ambulance.")
        print(f"[WEBHOOK] Facility {From} declared emergency diversion.")
    else:
        resp.message("AEGIS CAD: Reply 1 to Confirm Trauma Bay Ready, or 2 to declare Diversion.")

    return Response(content=str(resp), media_type="application/xml")
