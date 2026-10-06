import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CreditCard, Calendar, CheckCircle2 } from 'lucide-react';
import { helpSections } from './helpContent';

const icons = { sumup: CreditCard, 'google-calendar': Calendar };

export default function AdminHelp() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className="space-y-8 max-w-4xl" data-testid="admin-help-page">
      <div>
        <h1 className="font-serif text-3xl text-slate-800">Help &amp; Setup Guides</h1>
        <p className="text-slate-500 mt-1">Step-by-step instructions for connecting SumUp payments and Google Calendar.</p>
        <div className="flex gap-3 mt-4">
          {helpSections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="text-sm px-3 py-1.5 rounded-full bg-[#F5F3FA] text-[#7B6BA8] hover:bg-[#E9E3F5] transition-colors" data-testid={`help-nav-${section.id}`}>
              {section.title}
            </a>
          ))}
        </div>
      </div>

      {helpSections.map((section) => {
        const Icon = icons[section.id];
        return (
          <section key={section.id} id={section.id} className="bg-white rounded-xl shadow-sm border p-6 space-y-6 scroll-mt-6" data-testid={`help-section-${section.id}`}>
            <div className="flex items-start gap-3 border-b pb-4">
              <div className="p-2 bg-[#F5F3FA] rounded-lg"><Icon size={20} className="text-[#9F87C4]" /></div>
              <div>
                <h2 className="font-serif text-xl text-slate-800">{section.title}</h2>
                <p className="text-sm text-slate-500 mt-1">{section.intro}</p>
              </div>
            </div>
            {section.steps.map((step) => (
              <div key={step.heading}>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">{step.heading}</h3>
                <ul className="space-y-2">
                  {step.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-slate-600">
                      <CheckCircle2 size={16} className="text-[#9F87C4] mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
