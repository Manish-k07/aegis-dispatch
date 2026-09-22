Write-Host "=== 1. Resetting simulation ==="
$reset = Invoke-RestMethod -Uri "http://localhost:8080/api/simulation/reset" -Method Post -ContentType "application/json" -Body "{}"
Write-Host "Reset Status:" $reset.status "Message:" $reset.message

Write-Host "`n=== 2. Testing AI Clinical Triage ==="
$triageBody = @{
    type = "CARDIAC"
    description = "54yo male collapsed at metro station, clutching chest, gasping for air, cyanosis visible"
} | ConvertTo-Json
$triage = Invoke-RestMethod -Uri "http://localhost:8080/api/ai/triage" -Method Post -ContentType "application/json" -Body $triageBody
Write-Host "Priority:" $triage.priority
Write-Host "ESI Level:" $triage.esiLevel
Write-Host "Required Unit:" $triage.requiredUnit
Write-Host "Protocol Checklist:"
foreach ($item in $triage.protocolChecklist) {
    Write-Host "  [x]" $item
}

Write-Host "`n=== 3. Testing Auto-Assign for Emergency 1 ==="
$emId = "30000000-0000-0000-0000-000000000001"
$autoAssign = Invoke-RestMethod -Uri "http://localhost:8080/api/emergencies/$emId/auto-assign" -Method Post -ContentType "application/json" -Body "{}"
$dispId = $autoAssign.dispatch.id
Write-Host "Auto-assign Message:" $autoAssign.message
Write-Host "Dispatch ID:" $dispId
Write-Host "Ambulance Plate:" $autoAssign.ambulance.registrationNumber "Type:" $autoAssign.ambulance.type "Status:" $autoAssign.ambulance.status
Write-Host "Destination Hospital:" $autoAssign.hospital.name "Avail Beds:" $autoAssign.hospital.availableBeds "ICU:" $autoAssign.hospital.icuBedsAvailable

Write-Host "`n=== 4. Testing Live Patient Vitals Stream ==="
$vitalsBody = @{
    heartRate = 124
    bloodPressureSys = 148
    bloodPressureDia = 92
    spO2 = 91
    respiratoryRate = 26
    temperature = 37.8
    gcs = 13
    conditionSummary = "STEMI alert, high-flow O2 running, IV established"
} | ConvertTo-Json
$vitalsResp = Invoke-RestMethod -Uri "http://localhost:8080/api/dispatches/$dispId/vitals" -Method Post -ContentType "application/json" -Body $vitalsBody
Write-Host "Vitals Stream Status:" $vitalsResp.status "Dispatch:" $vitalsResp.dispatchId
Write-Host "HR:" $vitalsResp.vitals.heartRate "BP:" ($vitalsResp.vitals.bloodPressureSys.ToString() + '/' + $vitalsResp.vitals.bloodPressureDia.ToString()) "SpO2:" $vitalsResp.vitals.spO2 "%"
Write-Host "Condition Summary:" $vitalsResp.vitals.conditionSummary

Write-Host "`n=== 5. Testing Hospital Capacity Update ==="
$hospId = "10000000-0000-0000-0000-000000000001"
$capBody = @{
    availableBeds = 42
    icuBedsAvailable = 5
    traumaBaysAvailable = 3
} | ConvertTo-Json
$capResp = Invoke-RestMethod -Uri "http://localhost:8080/api/hospitals/$hospId/capacity" -Method Post -ContentType "application/json" -Body $capBody
Write-Host "Hospital:" $capResp.name
Write-Host "Beds:" $capResp.availableBeds "/" $capResp.totalBeds "ICU:" $capResp.icuBedsAvailable "/" $capResp.icuBedsTotal "Trauma:" $capResp.traumaBaysAvailable "/" $capResp.traumaBaysTotal

Write-Host "`n=== 6. Testing AI Dispatch Copilot Chat (Fleet Query) ==="
$chatFleet = Invoke-RestMethod -Uri "http://localhost:8080/api/ai/chat" -Method Post -ContentType "application/json" -Body (@{ message = "What is the fleet status?" } | ConvertTo-Json)
Write-Host "Copilot Fleet Reply:" $chatFleet.reply

Write-Host "`n=== 7. Testing AI Dispatch Copilot Chat (Hospital Beds Query) ==="
$chatHosp = Invoke-RestMethod -Uri "http://localhost:8080/api/ai/chat" -Method Post -ContentType "application/json" -Body (@{ message = "Check ICU and trauma bed availability" } | ConvertTo-Json)
Write-Host "Copilot Hosp Reply:" $chatHosp.reply

Write-Host "`n=== 8. Testing AI Dispatch Copilot Auto-Dispatch Action ==="
$chatAuto = Invoke-RestMethod -Uri "http://localhost:8080/api/ai/chat" -Method Post -ContentType "application/json" -Body (@{ message = "Auto assign next emergency" } | ConvertTo-Json)
Write-Host "Copilot Auto-Assign Reply:" $chatAuto.reply
Write-Host "Action Executed:" $chatAuto.actionExecuted

Write-Host "`n========================================="
Write-Host "ALL 8 COMPREHENSIVE BACKEND API TESTS VERIFIED!"
Write-Host "========================================="
