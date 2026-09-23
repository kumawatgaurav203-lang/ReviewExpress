'use client';

import React from 'react';
import {
  X,
  Scale,
  Sparkles,
  Star,
  Globe,
  CreditCard,
  Package,
  Smartphone,
  ShieldCheck,
  Trash2,
  Calendar,
  UserCheck,
  Ban,
  Server,
  Code2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sections = [
    {
      num: 1,
      title: 'SERVICE',
      icon: Scale,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      paragraphs: [
        'This SaaS is a review-management and review-assistance platform designed to help businesses collect customer feedback, facilitate Google review activity, and analyse review-related data through the dashboard.',
        'The service does not guarantee increased sales, customers, revenue, Google ranking, rating, or business growth.',
      ],
    },
    {
      num: 2,
      title: 'AI REVIEW ASSISTANCE',
      icon: Sparkles,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      paragraphs: [
        'The SaaS may generate AI-assisted review suggestions based on information provided by the user.',
        'AI-generated content is provided as assistance/draft only. The customer is responsible for checking the content and ensuring that any review submitted represents a genuine customer experience and complies with applicable Google policies.',
        'A maximum of 5 AI review generations is included for the applicable usage/session. Additional generations are not included unless separately offered.',
        'The SaaS does not guarantee that Google will publish, retain, or display any review.',
      ],
    },
    {
      num: 3,
      title: 'RATINGS & CUSTOMER FEEDBACK',
      icon: Star,
      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      paragraphs: [
        'The SaaS may provide 1–5 star feedback options.',
        'Customers should provide feedback based on their genuine experience. False, fabricated, or misleading reviews must not be submitted through the service.',
      ],
    },
    {
      num: 4,
      title: 'GOOGLE & THIRD-PARTY SERVICES',
      icon: Globe,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      paragraphs: [
        'The SaaS is an independent service and is not owned, operated, or endorsed by Google unless expressly stated otherwise.',
        'Google may change its policies, systems, algorithms, or review decisions at any time. The provider is not responsible for Google removing, rejecting, filtering, or restricting reviews or accounts.',
        'The SaaS may also depend on third-party services such as Supabase, Resend, Cloudflare, hosting, and domain providers. Their outages or policy changes may affect service availability.',
      ],
    },
    {
      num: 5,
      title: 'PRICING, PAYMENT & STRICT 100% NO-REFUND POLICY',
      icon: CreditCard,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      paragraphs: [
        'The applicable service fee will be communicated and confirmed before the account is created/activated.',
        'Once the customer confirms the price and the account/service is created, the agreed price for that service period cannot be renegotiated.',
        'STRICT NO-REFUND / NO MONEY-RETURN POLICY: Once our service is availed, payment is submitted, and the merchant account is activated or the customized NFC & QR smart review card is programmed/dispatched, all payments and fees are strictly 100% Non-Refundable under all circumstances.',
        'Under no circumstances will any demand for money return, refund, chargeback, or partial fee reversal be entertained or fulfilled once the service has been ordered or activated.',
        'No refund or money return requests based on change of mind, business closure, personal circumstances, third-party Google review policy changes, or temporary beta glitches will be accepted.',
        'Applicable service and maintenance charges must be paid according to the agreed terms.',
      ],
    },
    {
      num: 6,
      title: 'WHAT IS INCLUDED',
      icon: Package,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      paragraphs: [
        'Unless otherwise agreed in writing, the service fee includes:',
      ],
      bullets: [
        'SaaS dashboard access',
        'Review-management / review-assistance service',
        'One NFC & QR Review Card',
        'Applicable SaaS service for the agreed period',
      ],
      note: 'Only one NFC & QR Review Card is included in the standard fee.',
    },
    {
      num: 7,
      title: 'ADDITIONAL OR REPLACEMENT CARD',
      icon: Smartphone,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      paragraphs: [
        'Additional NFC & QR Review Cards require additional payment.',
        'If the original card is lost, damaged, broken, or becomes unusable, a replacement card will also require additional payment.',
        'Additional or replacement cards are not provided free of charge unless specifically agreed by the provider.',
      ],
    },
    {
      num: 8,
      title: 'ACCOUNT SECURITY',
      icon: ShieldCheck,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      paragraphs: [
        'The SaaS may use security measures such as OTP verification, authentication controls, database security, and bot protection.',
        'Users must keep their login credentials secure and must not attempt to access another user’s account or business data.',
        'No internet-based service can guarantee absolute security.',
      ],
    },
    {
      num: 9,
      title: 'ACCOUNT DELETION & TERMINATION',
      icon: Trash2,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      paragraphs: [
        'Complete account deletion may not be available directly from the customer dashboard. If the customer wants the account permanently deleted, they must contact the person/team that created or manages the account and request deletion.',
        'If the customer fails to pay the applicable service or maintenance fee, the provider may suspend or terminate the account after applicable notice.',
        'After termination, data may be deleted subject to applicable legal, accounting, security, or retention requirements. Customers should not assume that deleted data can be recovered.',
      ],
    },
    {
      num: 10,
      title: 'ANNUAL MAINTENANCE',
      icon: Calendar,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      paragraphs: [
        'Where applicable, an annual maintenance fee will be communicated before it becomes due.',
      ],
      bullets: [
        'Email',
        'SMS',
        'WhatsApp',
        'Phone call',
      ],
      note: 'If the customer does not pay the confirmed maintenance fee within the applicable period, the service may be suspended or permanently terminated. Any revised maintenance fee will be communicated before the applicable renewal period.',
    },
    {
      num: 11,
      title: 'CUSTOMER RESPONSIBILITY',
      icon: UserCheck,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      paragraphs: [
        'The customer is responsible for:',
      ],
      bullets: [
        'Providing correct business information',
        'Keeping login credentials secure',
        'Using the service lawfully',
        'Complying with applicable Google policies',
        'Paying applicable fees',
        'Ensuring submitted reviews and information are genuine and accurate',
      ],
    },
    {
      num: 12,
      title: 'PROHIBITED USE',
      icon: Ban,
      color: 'text-red-400 bg-red-500/10 border-red-500/20',
      paragraphs: [
        'The SaaS must not be used for:',
      ],
      bullets: [
        'Fake or fabricated reviews',
        'Fraudulent activity',
        'Impersonation',
        'Spam or automated abuse',
        'Unauthorised access',
        'Illegal activity',
        'Attempting to manipulate or attack Google or the SaaS',
      ],
      note: 'The provider may suspend or terminate accounts involved in prohibited activity.',
    },
    {
      num: 13,
      title: 'BETA VERSION, SERVICE AVAILABILITY & CONTINUOUS IMPROVEMENTS',
      icon: Server,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      paragraphs: [
        'BETA VERSION NOTICE: The ReviewXpress SaaS platform is currently operating in an active Beta release. While the core system is fully functional, users may occasionally experience minor technical glitches, visual anomalies, or temporary interruptions.',
        'GLITCH LOGGING & RESOLUTION: Any glitches, bugs, or performance issues reported by merchants or detected by our monitoring systems will be logged, prioritized, and resolved in scheduled future platform updates and maintenance cycles.',
        'NO REFUND FOR BETA GLITCHES: The presence of temporary glitches or minor technical defects in this Beta version shall under no circumstances serve as grounds for any refund, money-back claim, fee reduction, or cancellation demand.',
        'The provider will make reasonable efforts to keep the SaaS available and maintain reliable service, but does not guarantee 100% uninterrupted uptime.',
        'Temporary interruptions may occur because of maintenance, hosting, database, internet, security, or third-party service issues.',
        'The provider does not guarantee specific business results, sales, profits, Google ranking, rating increases, or a specific number of published reviews.',
        'Nothing in these Terms excludes liability that cannot legally be excluded under applicable Indian laws.',
      ],
    },
    {
      num: 14,
      title: 'SAAS OWNERSHIP',
      icon: Code2,
      color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
      paragraphs: [
        'The SaaS software, source code, design, branding, and system remain the property of the provider or applicable licensors.',
        'Customers receive a right to use the service during the applicable service period and do not receive ownership of the underlying software.',
      ],
    },
    {
      num: 15,
      title: 'CHANGES TO THE SERVICE',
      icon: RefreshCw,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      paragraphs: [
        'The provider may update or modify features for security, maintenance, technical improvements, legal compliance, or product development.',
        'Reasonable efforts will be made to minimise disruption to active customers.',
      ],
    },
    {
      num: 16,
      title: 'ACCEPTANCE',
      icon: CheckCircle2,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      paragraphs: [
        'By confirming the service, creating/activating an account, making payment, receiving or using the NFC & QR Review Card, or using the SaaS, the customer confirms acceptance of these Terms & Conditions.',
      ],
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                Terms & Conditions
              </h2>
              <p className="text-[11px] text-slate-400 truncate">ReviewXpress Platform Policies & User Agreement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close Terms modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-xs sm:text-sm text-slate-300 leading-relaxed custom-scrollbar">
          
          {/* Important Notice Alert */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/10 border border-amber-500/40 flex items-start gap-2.5 sm:gap-3 text-amber-200">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] sm:text-xs space-y-1">
              <span className="font-bold text-amber-300">Mandatory Agreement: Beta Version & Strict 100% No-Refund Policy</span>
              <p className="text-amber-200/90 leading-normal">
                ReviewXpress is currently in active <strong>Beta</strong>. Minor glitches will be recorded and resolved in future updates. By availing this service or activating an account, you strictly agree that once service is initiated or cards are customized, all fees are <strong>100% Non-Refundable</strong> and no money-return demands will be entertained under any circumstances.
              </p>
            </div>
          </div>

          {/* 16 Sections */}
          <div className="space-y-3.5">
            {sections.map((sec) => {
              const IconComp = sec.icon;
              return (
                <div
                  key={sec.num}
                  className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-800 transition-colors space-y-2"
                >
                  <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                    <div className={`p-1.5 rounded-lg border shrink-0 ${sec.color}`}>
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span>{sec.num}. {sec.title}</span>
                  </div>

                  {sec.paragraphs.map((p, idx) => (
                    <p key={idx} className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                      {p}
                    </p>
                  ))}

                  {sec.bullets && (
                    <ul className="space-y-1 pl-2 text-[10.5px] sm:text-[11.5px] text-slate-400">
                      {sec.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2">
                          <span className="text-indigo-400 font-bold shrink-0">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {sec.note && (
                    <p className="text-[10.5px] sm:text-xs text-slate-400 italic pt-0.5 border-t border-slate-800/60">
                      {sec.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Modal Footer - Clean & Touch Friendly */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <span className="text-[10px] sm:text-[11px] text-slate-400 text-center sm:text-left">
            Questions regarding terms? Contact: <a href="mailto:reviewxpressindia@gmail.com" className="text-indigo-400 hover:text-indigo-300 underline font-medium">reviewxpressindia@gmail.com</a>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer text-center"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
