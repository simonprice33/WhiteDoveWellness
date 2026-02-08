import { useState, useEffect } from 'react';
import { adminApi, publicApi } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import SignaturePad from './SignaturePad';

// Multi-select dropdown component
function MultiSelect({ label, options, selected, onChange, placeholder = "Select options..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-left flex items-center justify-between bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#9F87C4]/20"
      >
        <span className={selected.length === 0 ? 'text-slate-400' : 'text-slate-700'}>
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.map((item, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-[#9F87C4]/10 text-[#9F87C4] text-xs rounded-full">
              {item}
              <button type="button" onClick={() => toggleOption(item)} className="hover:text-[#8A6EB5]">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => toggleOption(option)}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 ${selected.includes(option) ? 'bg-[#9F87C4]/5 text-[#9F87C4]' : 'text-slate-700'}`}
            >
              <div className={`w-4 h-4 border rounded flex items-center justify-center ${selected.includes(option) ? 'bg-[#9F87C4] border-[#9F87C4]' : 'border-slate-300'}`}>
                {selected.includes(option) && <Check size={12} className="text-white" />}
              </div>
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Initial form state
const getInitialFormData = (client) => ({
  consultation_date: new Date().toISOString().split('T')[0],
  client_code: '',
  gender: '',
  dob: client?.date_of_birth || '',
  address: client?.address || '',
  telephone: client?.phone || '',
  age_of_children: '',
  // GP Details
  gp_name: '',
  gp_address: '',
  gp_telephone: '',
  gp_permission: false,
  // Occupation
  occupation: '',
  occupation_type: '',
  // Contra-indications
  contra_indications: [],
  covid_symptoms: false,
  recent_covid_test: false,
  contra_indications_other: '',
  // Lifestyle (dynamic based on settings)
  lifestyle: {},
  // Treatment objectives
  treatment_objectives: [],
  treatment_objectives_other: '',
  // Modifications
  recommended_frequency: '',
  // Consent
  contact_preferences: [],
  consent_data_storage: false,
  client_signature: '',
  client_signature_image: '',
  client_signature_date: '',
  therapist_signature: '',
  therapist_signature_image: '',
  therapist_signature_date: ''
});

export default function ConsultationForm({ client, onClose, onSaved }) {
  const [formData, setFormData] = useState(getInitialFormData(client));
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState({
    contra_indications: [],
    lifestyle_questions: [],
    treatment_objectives: []
  });

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const response = await publicApi.getSettings();
      const consultationOptions = response.data.settings?.consultation_options || {};
      setOptions({
        contra_indications: consultationOptions.contra_indications || [],
        lifestyle_questions: consultationOptions.lifestyle_questions || [],
        treatment_objectives: consultationOptions.treatment_objectives || []
      });
    } catch (error) {
      console.error('Failed to load consultation options:', error);
    }
  };

  const updateLifestyle = (id, value) => {
    setFormData({
      ...formData,
      lifestyle: { ...formData.lifestyle, [id]: value }
    });
  };

  const handleCheckboxArray = (field, value) => {
    const current = formData[field] || [];
    if (current.includes(value)) {
      setFormData({ ...formData, [field]: current.filter(v => v !== value) });
    } else {
      setFormData({ ...formData, [field]: [...current, value] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.createConsultation(client.id, formData);
      toast.success('Consultation saved');
      onSaved && onSaved();
      onClose();
    } catch (error) {
      toast.error('Failed to save consultation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-h-[75vh] overflow-y-auto px-1">
      {/* Section: Client Information */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 border-b border-[#9F87C4]/30 pb-2 mb-4">Client Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Client Code</label>
            <Input value={formData.client_code} onChange={(e) => setFormData({ ...formData, client_code: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Gender</label>
            <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg">
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Date of Birth</label>
            <Input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Consultation Date *</label>
            <Input type="date" value={formData.consultation_date} onChange={(e) => setFormData({ ...formData, consultation_date: e.target.value })} className="mt-1" required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Telephone</label>
            <Input value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Age of Children</label>
            <Input value={formData.age_of_children} onChange={(e) => setFormData({ ...formData, age_of_children: e.target.value })} className="mt-1" placeholder="e.g. 5, 8, 12" />
          </div>
          <div className="md:col-span-3">
            <label className="text-sm font-medium text-slate-700">Address</label>
            <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="mt-1" />
          </div>
        </div>
      </section>

      {/* Section: GP Details */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 border-b border-[#9F87C4]/30 pb-2 mb-4">GP Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">GP Name</label>
            <Input value={formData.gp_name} onChange={(e) => setFormData({ ...formData, gp_name: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">GP Telephone</label>
            <Input value={formData.gp_telephone} onChange={(e) => setFormData({ ...formData, gp_telephone: e.target.value })} className="mt-1" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.gp_permission} onChange={(e) => setFormData({ ...formData, gp_permission: e.target.checked })} className="rounded border-slate-300" />
              <span className="text-sm text-slate-700">Permission to contact GP</span>
            </label>
          </div>
          <div className="md:col-span-3">
            <label className="text-sm font-medium text-slate-700">GP Address</label>
            <Input value={formData.gp_address} onChange={(e) => setFormData({ ...formData, gp_address: e.target.value })} className="mt-1" />
          </div>
        </div>
      </section>

      {/* Section: Occupation */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 border-b border-[#9F87C4]/30 pb-2 mb-4">Occupation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Occupation</label>
            <Input value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Type</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="occupation_type" value="part-time" checked={formData.occupation_type === 'part-time'} onChange={(e) => setFormData({ ...formData, occupation_type: e.target.value })} className="border-slate-300" />
                <span className="text-sm">Part-time</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="occupation_type" value="full-time" checked={formData.occupation_type === 'full-time'} onChange={(e) => setFormData({ ...formData, occupation_type: e.target.value })} className="border-slate-300" />
                <span className="text-sm">Full-time</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Contra-indications */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 border-b border-[#9F87C4]/30 pb-2 mb-4">Contra-indications</h3>
        <p className="text-sm text-slate-500 mb-4">Highlight any conditions applicable to client</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 bg-slate-50 rounded-lg max-h-64 overflow-y-auto">
          {options.contra_indications.map((condition) => (
            <label key={condition} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={formData.contra_indications.includes(condition)}
                onChange={() => handleCheckboxArray('contra_indications', condition)}
                className="rounded border-slate-300"
              />
              <span className={formData.contra_indications.includes(condition) ? 'text-red-600 font-medium' : 'text-slate-700'}>
                {condition}
              </span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.covid_symptoms} onChange={(e) => setFormData({ ...formData, covid_symptoms: e.target.checked })} className="rounded border-slate-300" />
            <span className="text-sm text-slate-700">Experiencing any Covid symptoms?</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.recent_covid_test} onChange={(e) => setFormData({ ...formData, recent_covid_test: e.target.checked })} className="rounded border-slate-300" />
            <span className="text-sm text-slate-700">Done a recent Covid test?</span>
          </label>
        </div>
        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700">Other conditions not listed</label>
          <Input value={formData.contra_indications_other} onChange={(e) => setFormData({ ...formData, contra_indications_other: e.target.value })} className="mt-1" placeholder="Please specify any other conditions..." />
        </div>
      </section>

      {/* Section: Lifestyle */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 border-b border-[#9F87C4]/30 pb-2 mb-4">Lifestyle</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {options.lifestyle_questions.map((question) => (
            <div key={question.id}>
              <label className="text-sm font-medium text-slate-700">{question.label}</label>
              {question.type === 'select' ? (
                <select
                  value={formData.lifestyle[question.id] || ''}
                  onChange={(e) => updateLifestyle(question.id, e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">Select...</option>
                  {question.options?.map((opt, idx) => (
                    <option key={idx} value={opt.toLowerCase()}>{opt}</option>
                  ))}
                </select>
              ) : (
                <Input
                  value={formData.lifestyle[question.id] || ''}
                  onChange={(e) => updateLifestyle(question.id, e.target.value)}
                  className="mt-1"
                  placeholder={question.placeholder || ''}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Section: Treatment Objectives */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 border-b border-[#9F87C4]/30 pb-2 mb-4">Treatment Objectives / Reason for Seeking Treatment</h3>
        
        <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-lg">
          {options.treatment_objectives.map((objective) => (
            <label key={objective} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.treatment_objectives.includes(objective)}
                onChange={() => handleCheckboxArray('treatment_objectives', objective)}
                className="rounded border-slate-300"
              />
              <span className={formData.treatment_objectives.includes(objective) ? 'text-[#9F87C4] font-medium' : 'text-slate-700'}>
                {objective}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700">Other objectives not listed</label>
          <Input value={formData.treatment_objectives_other} onChange={(e) => setFormData({ ...formData, treatment_objectives_other: e.target.value })} className="mt-1" placeholder="Please specify..." />
        </div>
      </section>

      {/* Section: Modifications to Treatment */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 border-b border-[#9F87C4]/30 pb-2 mb-4">Modifications to Treatment</h3>
        <div>
          <label className="text-sm font-medium text-slate-700">Recommended Treatment Frequency</label>
          <Input value={formData.recommended_frequency} onChange={(e) => setFormData({ ...formData, recommended_frequency: e.target.value })} className="mt-1" placeholder="e.g. Weekly, fortnightly, monthly..." />
        </div>
      </section>

      {/* Section: Declarations & Consent */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 border-b border-[#9F87C4]/30 pb-2 mb-4">Declarations & Consent</h3>
        <div className="space-y-2 mb-6 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
          <p>• I have given you my medical history to the best of my knowledge.</p>
          <p>• I have been advised of possible contra-actions and been given after care advice.</p>
          <p>• I accept responsibility for any contra-actions to the treatment.</p>
        </div>
        
        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 block mb-2">I give permission for you to contact me by:</label>
          <div className="flex gap-4">
            {['Text', 'Email', 'Phone'].map((method) => (
              <label key={method} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.contact_preferences.includes(method.toLowerCase())}
                  onChange={() => handleCheckboxArray('contact_preferences', method.toLowerCase())}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">{method}</span>
              </label>
            ))}
          </div>
        </div>
        
        <label className="flex items-center gap-2 cursor-pointer mb-6">
          <input type="checkbox" checked={formData.consent_data_storage} onChange={(e) => setFormData({ ...formData, consent_data_storage: e.target.checked })} className="rounded border-slate-300" />
          <span className="text-sm text-slate-700">I consent to you keeping required personal data securely for treatment purposes only.</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            <h4 className="text-sm font-semibold text-slate-700">Client Signature</h4>
            <SignaturePad
              label="Draw signature"
              value={formData.client_signature_image}
              onChange={(img) => setFormData({ ...formData, client_signature_image: img })}
            />
            <div>
              <label className="text-sm text-slate-600">Print Name</label>
              <Input value={formData.client_signature} onChange={(e) => setFormData({ ...formData, client_signature: e.target.value })} className="mt-1" placeholder="Type full name" />
            </div>
            <div>
              <label className="text-sm text-slate-600">Date</label>
              <Input type="date" value={formData.client_signature_date} onChange={(e) => setFormData({ ...formData, client_signature_date: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            <h4 className="text-sm font-semibold text-slate-700">Therapist Signature</h4>
            <SignaturePad
              label="Draw signature"
              value={formData.therapist_signature_image}
              onChange={(img) => setFormData({ ...formData, therapist_signature_image: img })}
            />
            <div>
              <label className="text-sm text-slate-600">Print Name</label>
              <Input value={formData.therapist_signature} onChange={(e) => setFormData({ ...formData, therapist_signature: e.target.value })} className="mt-1" placeholder="Type full name" />
            </div>
            <div>
              <label className="text-sm text-slate-600">Date</label>
              <Input type="date" value={formData.therapist_signature_date} onChange={(e) => setFormData({ ...formData, therapist_signature_date: e.target.value })} className="mt-1" />
            </div>
          </div>
        </div>
      </section>

      {/* Submit Buttons */}
      <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-[#9F87C4] hover:bg-[#8A6EB5]">
          {saving ? 'Saving...' : 'Save Consultation'}
        </Button>
      </div>
    </form>
  );
}

// View consultation component
export function ConsultationView({ consultation, onClose }) {
  const [options, setOptions] = useState({ lifestyle_questions: [] });

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const response = await publicApi.getSettings();
      const consultationOptions = response.data.settings?.consultation_options || {};
      setOptions({
        lifestyle_questions: consultationOptions.lifestyle_questions || []
      });
    } catch (error) {
      console.error('Failed to load options:', error);
    }
  };

  if (!consultation) return null;

  const Section = ({ title, children }) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-slate-800 border-b border-[#9F87C4]/30 pb-2 mb-3">{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value }) => (
    <div className="mb-2">
      <span className="text-sm text-slate-500">{label}:</span>{' '}
      <span className="text-sm text-slate-800">{value || 'N/A'}</span>
    </div>
  );

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB') : 'N/A';

  return (
    <div className="max-h-[75vh] overflow-y-auto px-1">
      <Section title="Client Information">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4">
          <Field label="Client Code" value={consultation.client_code} />
          <Field label="Gender" value={consultation.gender} />
          <Field label="DOB" value={consultation.dob} />
          <Field label="Telephone" value={consultation.telephone} />
          <Field label="Age of Children" value={consultation.age_of_children} />
          <Field label="Consultation Date" value={formatDate(consultation.consultation_date)} />
        </div>
        <Field label="Address" value={consultation.address} />
      </Section>

      <Section title="GP Details">
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="GP Name" value={consultation.gp_name} />
          <Field label="GP Telephone" value={consultation.gp_telephone} />
          <Field label="Permission to Contact" value={consultation.gp_permission ? 'Yes' : 'No'} />
        </div>
        <Field label="GP Address" value={consultation.gp_address} />
      </Section>

      <Section title="Occupation">
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Occupation" value={consultation.occupation} />
          <Field label="Type" value={consultation.occupation_type} />
        </div>
      </Section>

      <Section title="Contra-indications">
        {consultation.contra_indications?.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {consultation.contra_indications.map((c, i) => (
              <span key={i} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">{c}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 mb-3">None reported</p>
        )}
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Covid Symptoms" value={consultation.covid_symptoms ? 'Yes' : 'No'} />
          <Field label="Recent Covid Test" value={consultation.recent_covid_test ? 'Yes' : 'No'} />
        </div>
        {consultation.contra_indications_other && (
          <Field label="Other" value={consultation.contra_indications_other} />
        )}
      </Section>

      <Section title="Lifestyle">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4">
          {options.lifestyle_questions.map((q) => (
            <Field key={q.id} label={q.label} value={consultation.lifestyle?.[q.id]} />
          ))}
        </div>
      </Section>

      <Section title="Treatment Objectives">
        {consultation.treatment_objectives?.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {consultation.treatment_objectives.map((t, i) => (
              <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">{t}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 mb-3">None specified</p>
        )}
        {consultation.treatment_objectives_other && (
          <Field label="Other" value={consultation.treatment_objectives_other} />
        )}
      </Section>

      <Section title="Modifications to Treatment">
        <Field label="Recommended Frequency" value={consultation.recommended_frequency} />
      </Section>

      <Section title="Consent & Signatures">
        <div className="grid grid-cols-2 gap-x-4 mb-3">
          <Field label="Contact Preferences" value={consultation.contact_preferences?.join(', ')} />
          <Field label="Data Storage Consent" value={consultation.consent_data_storage ? 'Yes' : 'No'} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-700 mb-2">Client Signature</p>
            {consultation.client_signature_image ? (
              <div className="bg-white border border-slate-200 rounded-lg p-2 mb-2">
                <img 
                  src={consultation.client_signature_image} 
                  alt="Client signature" 
                  className="h-[80px] w-auto"
                />
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic mb-2">No signature drawn</p>
            )}
            <p className="text-sm text-slate-800">{consultation.client_signature || 'Name not provided'}</p>
            <p className="text-xs text-slate-500">{formatDate(consultation.client_signature_date)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-700 mb-2">Therapist Signature</p>
            {consultation.therapist_signature_image ? (
              <div className="bg-white border border-slate-200 rounded-lg p-2 mb-2">
                <img 
                  src={consultation.therapist_signature_image} 
                  alt="Therapist signature" 
                  className="h-[80px] w-auto"
                />
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic mb-2">No signature drawn</p>
            )}
            <p className="text-sm text-slate-800">{consultation.therapist_signature || 'Name not provided'}</p>
            <p className="text-xs text-slate-500">{formatDate(consultation.therapist_signature_date)}</p>
          </div>
        </div>
      </Section>

      <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t flex justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
