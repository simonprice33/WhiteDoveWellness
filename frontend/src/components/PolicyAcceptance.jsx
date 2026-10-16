import { useState, useEffect } from 'react';
import { publicApi } from '../lib/api';
import { X, FileText } from 'lucide-react';

export const REQUIRED_POLICY_SLUGS = ['cancellation-policy', 'terms-of-service'];

const inline = (text) => text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
  if (part.startsWith('**')) return <strong key={i} className="text-slate-800">{part.slice(2, -2)}</strong>;
  if (part.startsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
  return part;
});

export const renderPolicyContent = (content = '') => content.split('\n').map((line, i) => {
  if (line.startsWith('# ')) return <h1 key={i} className="font-serif text-2xl text-slate-800 mb-3">{line.slice(2)}</h1>;
  if (line.startsWith('## ')) return <h2 key={i} className="font-serif text-xl text-slate-800 mt-5 mb-2">{line.slice(3)}</h2>;
  if (line.startsWith('### ')) return <h3 key={i} className="font-serif text-lg text-slate-800 mt-4 mb-2">{line.slice(4)}</h3>;
  if (/^(-{2,}|\*{3,}|_{3,})\s*$/.test(line.trim())) return <hr key={i} className="my-4 border-slate-200" />;
  if (/^[-*•]\s+/.test(line)) return <p key={i} className="text-slate-600 text-sm mb-1 pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-[#9F87C4]">{inline(line.replace(/^[-*•]\s+/, ''))}</p>;
  if (line.trim() === '') return <div key={i} className="h-2" />;
  return <p key={i} className="text-slate-600 text-sm mb-2">{inline(line)}</p>;
});

const renderContent = renderPolicyContent;

export const PolicyPopup = ({ policy, onClose }) => (
  <div className="absolute inset-0 z-20 bg-white rounded-2xl flex flex-col" data-testid="policy-popup">
    <div className="flex items-center justify-between p-4 border-b">
      <h3 className="font-serif text-lg text-slate-800 flex items-center gap-2"><FileText size={18} className="text-[#9F87C4]" />{policy.title}</h3>
      <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100" data-testid="close-policy-popup-btn"><X size={20} /></button>
    </div>
    <div className="flex-1 overflow-y-auto p-6">{renderContent(policy.content)}</div>
    <div className="p-4 border-t">
      <button type="button" onClick={onClose} className="w-full bg-[#9F87C4] hover:bg-[#8A74B0] text-white rounded-lg py-2.5 font-medium" data-testid="policy-popup-done-btn">Back to booking</button>
    </div>
  </div>
);

export default function PolicyAcceptance({ accepted, onChange, onPoliciesLoaded, onViewPolicy }) {
  const [policies, setPolicies] = useState([]);

  useEffect(() => {
    publicApi.getPolicies()
      .then((res) => {
        const list = (res.data.policies || []).filter((p) => REQUIRED_POLICY_SLUGS.includes(p.slug) && p.is_active !== false);
        setPolicies(list);
        onPoliciesLoaded(list.map((p) => p.slug));
      })
      .catch(() => onPoliciesLoaded([]));
  }, [onPoliciesLoaded]);

  if (policies.length === 0) return null;

  return (
    <div className="space-y-3 p-4 bg-[#F5F3FA] rounded-xl" data-testid="policy-acceptance">
      {policies.map((policy) => (
        <label key={policy.slug} className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!accepted[policy.slug]}
            onChange={(e) => onChange({ ...accepted, [policy.slug]: e.target.checked })}
            className="mt-0.5 w-5 h-5 rounded border-slate-300 text-[#9F87C4] focus:ring-[#9F87C4]"
            data-testid={`accept-${policy.slug}`}
          />
          <span className="text-sm text-slate-700">
            I have read and agree to the{' '}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onViewPolicy(policy); }}
              className="text-[#9F87C4] font-medium underline underline-offset-2 hover:text-[#8A74B0]"
              data-testid={`view-${policy.slug}`}
            >
              {policy.title}
            </button>
            {' '}*
          </span>
        </label>
      ))}
    </div>
  );
}
