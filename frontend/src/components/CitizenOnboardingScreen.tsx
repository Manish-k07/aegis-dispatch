import React, { useState } from 'react';
import { CitizenProfile } from '../types';
import { DataSource } from '../services/DataSource';
import { Icon } from './common/Icon';
import { Button } from './common/Button';
import { Card } from './common/Card';
import { Field } from './common/Field';
import { Select } from './common/Select';
import { SectionHeader } from './common/SectionHeader';

interface CitizenOnboardingScreenProps {
  profile: CitizenProfile;
  dataSource: DataSource;
  onComplete: (updated: CitizenProfile) => void;
  onLogout: () => void;
}

const BLOOD_GROUPS = [
  { value: 'UNKNOWN', label: 'Unknown / Not tested' },
  { value: 'O+', label: 'O Positive (O+)' },
  { value: 'O-', label: 'O Negative (O-)' },
  { value: 'A+', label: 'A Positive (A+)' },
  { value: 'A-', label: 'A Negative (A-)' },
  { value: 'B+', label: 'B Positive (B+)' },
  { value: 'B-', label: 'B Negative (B-)' },
  { value: 'AB+', label: 'AB Positive (AB+)' },
  { value: 'AB-', label: 'AB Negative (AB-)' },
];

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

export const CitizenOnboardingScreen: React.FC<CitizenOnboardingScreenProps> = ({
  profile,
  dataSource,
  onComplete,
  onLogout,
}) => {
  // Personal (required)
  const [name, setName] = useState(profile.name || '');
  const [phone] = useState(profile.phone || '');
  const [dob, setDob] = useState(profile.dob || '');
  const [age, setAge] = useState<number>(profile.age || 25);
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'>(
    profile.gender || 'PREFER_NOT_TO_SAY'
  );
  const [address, setAddress] = useState(profile.address || '');
  const [landmark, setLandmark] = useState(profile.landmark || '');

  // Emergency Contact (required >=1)
  const [contactName, setContactName] = useState(
    profile.emergencyContactName || (profile.emergencyContacts && profile.emergencyContacts[0]?.name) || ''
  );
  const [contactRelationship, setContactRelationship] = useState(
    (profile.emergencyContacts && profile.emergencyContacts[0]?.relationship) || 'Family / Kin'
  );
  const [contactPhone, setContactPhone] = useState(
    profile.emergencyContactPhone || (profile.emergencyContacts && profile.emergencyContacts[0]?.phone) || ''
  );

  // Medical (optional)
  const [bloodGroup, setBloodGroup] = useState(profile.bloodGroup || 'UNKNOWN');
  const [allergiesText, setAllergiesText] = useState((profile.allergies || []).join(', '));
  const [medicationsText, setMedicationsText] = useState((profile.medications || []).join(', '));
  const [conditionsText, setConditionsText] = useState(
    (profile.chronicConditions || profile.diseases || []).join(', ')
  );
  const [surgeriesText, setSurgeriesText] = useState((profile.pastSurgeries || []).join(', '));
  const [disabilityNeeds, setDisabilityNeeds] = useState(profile.disabilityNeeds || '');
  const [pregnancyStatus, setPregnancyStatus] = useState(profile.pregnancyStatus || 'NOT_APPLICABLE');
  const [insuranceProvider, setInsuranceProvider] = useState(profile.insuranceProvider || '');
  const [insuranceId, setInsuranceId] = useState(profile.insuranceId || '');
  const [doctorName, setDoctorName] = useState(profile.doctorName || '');
  const [doctorPhone, setDoctorPhone] = useState(profile.doctorPhone || '');
  const [otherMedicalNotes, setOtherMedicalNotes] = useState(profile.otherMedicalNotes || '');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePersonalAndContact = (): boolean => {
    if (!name.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    if (!address.trim()) {
      setError('Home address is required.');
      return false;
    }
    if (!landmark.trim()) {
      setError('Nearby landmark is required so dispatchers can locate you quickly.');
      return false;
    }
    if (!contactName.trim() || !contactPhone.trim()) {
      setError('At least one emergency contact (name and phone) is required.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSave = async (includeMedical: boolean) => {
    if (!validatePersonalAndContact()) return;

    setIsSubmitting(true);
    setError(null);

    const splitTags = (val: string) =>
      val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    const updatedPayload: Partial<CitizenProfile> = {
      name: name.trim(),
      phone: phone.trim(),
      dob: dob || undefined,
      age: Number(age) || 25,
      gender,
      address: address.trim(),
      landmark: landmark.trim(),
      emergencyContactName: contactName.trim(),
      emergencyContactPhone: contactPhone.trim(),
      emergencyContacts: [
        {
          name: contactName.trim(),
          relationship: contactRelationship.trim() || 'Kin',
          phone: contactPhone.trim(),
        },
      ],
      profileComplete: true,
    };

    if (includeMedical) {
      updatedPayload.bloodGroup = bloodGroup === 'UNKNOWN' ? undefined : bloodGroup;
      updatedPayload.allergies = splitTags(allergiesText);
      updatedPayload.medications = splitTags(medicationsText);
      updatedPayload.chronicConditions = splitTags(conditionsText);
      updatedPayload.diseases = splitTags(conditionsText);
      updatedPayload.pastSurgeries = splitTags(surgeriesText);
      updatedPayload.disabilityNeeds = disabilityNeeds.trim() || undefined;
      updatedPayload.pregnancyStatus = pregnancyStatus !== 'NOT_APPLICABLE' ? pregnancyStatus : undefined;
      updatedPayload.insuranceProvider = insuranceProvider.trim() || undefined;
      updatedPayload.insuranceId = insuranceId.trim() || undefined;
      updatedPayload.doctorName = doctorName.trim() || undefined;
      updatedPayload.doctorPhone = doctorPhone.trim() || undefined;
      updatedPayload.otherMedicalNotes = otherMedicalNotes.trim() || undefined;
    }

    try {
      if (dataSource.updateCitizenProfile) {
        const saved = await dataSource.updateCitizenProfile(updatedPayload);
        onComplete(saved);
      } else {
        onComplete(updatedPayload as any);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--md-sys-color-surface)] py-8 px-4 flex justify-center items-start">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--md-sys-color-primary-container)] flex items-center justify-center text-[var(--md-sys-color-on-primary-container)]">
              <Icon name="verified_user" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--md-sys-color-on-surface)]">
                Complete Your Citizen Profile
              </h1>
              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                Aegis Dispatch Emergency Preparedness Onboarding
              </p>
            </div>
          </div>
          <Button variant="text" size="small" icon="logout" onClick={onLogout}>
            Sign Out
          </Button>
        </div>

        {/* Privacy Notice Banner */}
        <div className="p-4 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] flex items-start gap-3">
          <Icon name="shield" size={24} className="text-[var(--md-sys-color-primary)] shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <span className="font-semibold text-[var(--md-sys-color-on-surface)] block">
              Emergency Services Privacy Notice
            </span>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
              Your personal information and medical summary are strictly secured and will be shared
              with verified emergency medical responders and dispatchers <strong>only during an active emergency</strong>.
              All details remain editable anytime from your profile settings.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)] text-sm flex items-center gap-2">
            <Icon name="error" size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Personal Details */}
        <Card variant="outlined" padding={24}>
          <SectionHeader
            title="1. Personal Information (Required)"
            subtitle="Essential identity and location coordinates for emergency response"
            icon="person"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field
              label="Full Legal Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              fullWidth
              autoFocus
            />

            <Field
              label="Verified Phone Number"
              value={phone || 'Verified via OTP'}
              disabled
              fullWidth
              helperText="Phone verified via authentication"
            />

            <Field
              label="Date of Birth"
              type="date"
              value={dob}
              onChange={(e) => {
                setDob(e.target.value);
                if (e.target.value) {
                  const birthYear = new Date(e.target.value).getFullYear();
                  const calcAge = Math.max(1, new Date().getFullYear() - birthYear);
                  setAge(calcAge);
                }
              }}
              fullWidth
            />

            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Age (Years) *"
                type="number"
                value={String(age)}
                onChange={(e) => setAge(Math.max(1, parseInt(e.target.value, 10) || 1))}
                fullWidth
              />

              <Select
                label="Gender *"
                value={gender}
                onChange={(val) => setGender(val as any)}
                options={GENDER_OPTIONS}
                fullWidth
              />
            </div>

            <div className="md:col-span-2">
              <Field
                label="Home Address *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Door/Flat number, Building, Street, Area"
                fullWidth
                helperText="Primary dispatch destination for residence emergencies"
              />
            </div>

            <div className="md:col-span-2">
              <Field
                label="Nearby Landmark *"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Opposite Sony Signal, next to Apollo Pharmacy"
                fullWidth
                helperText="Crucial for fast ambulance navigation"
              />
            </div>
          </div>
        </Card>

        {/* Section 2: Emergency Contact */}
        <Card variant="outlined" padding={24}>
          <SectionHeader
            title="2. Emergency Contact (At least 1 Required)"
            subtitle="Who should dispatch notify if you require acute assistance or hospital admission?"
            icon="contacts"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Field
              label="Contact Full Name *"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Amit Patel"
              fullWidth
            />

            <Field
              label="Relationship *"
              value={contactRelationship}
              onChange={(e) => setContactRelationship(e.target.value)}
              placeholder="e.g. Spouse / Parent / Sibling"
              fullWidth
            />

            <Field
              label="Contact Phone *"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+91 98450 11223"
              fullWidth
            />
          </div>
        </Card>

        {/* Section 3: Medical Information */}
        <Card variant="outlined" padding={24}>
          <div className="flex items-start justify-between">
            <SectionHeader
              title="3. Medical Profile (Optional but Strongly Recommended)"
              subtitle="Critical clinical data relayed immediately to assigned paramedics and ER doctors"
              icon="medical_services"
            />
          </div>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Blood Group"
                value={bloodGroup}
                onChange={(val) => setBloodGroup(val)}
                options={BLOOD_GROUPS}
                fullWidth
              />

              <Select
                label="Pregnancy Status (if applicable)"
                value={pregnancyStatus}
                onChange={(val) => setPregnancyStatus(val)}
                options={[
                  { value: 'NOT_APPLICABLE', label: 'Not applicable' },
                  { value: 'FIRST_TRIMESTER', label: '1st Trimester' },
                  { value: 'SECOND_TRIMESTER', label: '2nd Trimester' },
                  { value: 'THIRD_TRIMESTER', label: '3rd Trimester' },
                ]}
                fullWidth
              />
            </div>

            <Field
              label="Known Allergies (comma-separated)"
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
              placeholder="e.g. Penicillin, Peanuts, Latex, Aspirin"
              fullWidth
              helperText="Paramedics check this before administering emergency analgesics or antibiotics"
            />

            <Field
              label="Current Medications (comma-separated)"
              value={medicationsText}
              onChange={(e) => setMedicationsText(e.target.value)}
              placeholder="e.g. Metformin 500mg, Salbutamol Inhaler, Amlodipine"
              fullWidth
            />

            <Field
              label="Chronic Conditions / Pre-existing Diseases"
              value={conditionsText}
              onChange={(e) => setConditionsText(e.target.value)}
              placeholder="e.g. Severe asthma, Type 2 diabetes, Hypertension, Epilepsy"
              fullWidth
            />

            <Field
              label="Past Surgeries / Major Procedures"
              value={surgeriesText}
              onChange={(e) => setSurgeriesText(e.target.value)}
              placeholder="e.g. Appendectomy (2020), Coronary stent (2023)"
              fullWidth
            />

            <Field
              label="Disability or Mobility Needs"
              value={disabilityNeeds}
              onChange={(e) => setDisabilityNeeds(e.target.value)}
              placeholder="e.g. Wheelchair user, Hearing impaired, Guide dog"
              fullWidth
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Health Insurance Provider"
                value={insuranceProvider}
                onChange={(e) => setInsuranceProvider(e.target.value)}
                placeholder="e.g. Star Health / Max Bupa"
                fullWidth
              />
              <Field
                label="Insurance Policy / Member ID"
                value={insuranceId}
                onChange={(e) => setInsuranceId(e.target.value)}
                placeholder="e.g. POL-8839201"
                fullWidth
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Treating Doctor / Physician Name"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g. Dr. Rajesh Rao"
                fullWidth
              />
              <Field
                label="Doctor Phone Number"
                value={doctorPhone}
                onChange={(e) => setDoctorPhone(e.target.value)}
                placeholder="+91 99880 01122"
                fullWidth
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] mb-1">
                Other Medical Notes / Advance Directives
              </label>
              <Field
                id="other-medical-notes"
                name="other_medical_notes"
                multiline
                rows={3}
                value={otherMedicalNotes}
                onChange={(e) => setOtherMedicalNotes(e.target.value)}
                placeholder="Any special medical instructions, pacemaker presence, dialysis schedule, etc."
              />
            </div>
          </div>
        </Card>

        <div style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', textAlign: 'center', padding: '4px 0' }}>
          Emergency medical details are protected under Digital Personal Data Protection standards and used exclusively for emergency triage and hospital ED pre-arrival prep.
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--md-sys-color-outline-variant)]">
          <Button
            variant="outlined"
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            icon="skip_next"
          >
            Skip medical details for now
          </Button>

          <Button
            variant="filled"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            icon="check_circle"
          >
            {isSubmitting ? 'Saving Profile...' : 'Save & Continue to Dashboard'}
          </Button>
        </div>
      </div>
    </div>
  );
};
