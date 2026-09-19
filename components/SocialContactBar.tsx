'use client';

import React from 'react';
import { Mail, Instagram, Facebook } from 'lucide-react';

interface SocialContactBarProps {
  className?: string;
  showLabels?: boolean;
}

export default function SocialContactBar({
  className = '',
  showLabels = false,
}: SocialContactBarProps) {
  const email = 'reviewxpressindia@gmail.com';
  const facebookUrl = 'https://www.facebook.com/share/1Ei5LacEKQ/';
  const instagramUrl = 'https://www.instagram.com/review_xpress_?stkn=czhsZXE4MWp2em5y';

  return (
    <div className={`inline-flex items-center gap-1.5 sm:gap-2 ${className}`}>
      {/* Email Icon / Link */}
      <a
        href={`mailto:${email}`}
        className={
          showLabels
            ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700/70 text-xs font-medium transition-all hover:scale-105 shadow-sm group"
            : "p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700/70 transition-all hover:scale-110 shadow-sm flex items-center justify-center group"
        }
        title={`Email: ${email}`}
      >
        <Mail className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-300 transition-colors" />
        {showLabels && <span className="text-[11px] font-medium">{email}</span>}
      </a>

      {/* Instagram Icon / Link */}
      <a
        href={instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={
          showLabels
            ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700/70 text-xs font-medium transition-all hover:scale-105 shadow-sm group"
            : "p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-pink-400 border border-slate-700/70 transition-all hover:scale-110 shadow-sm flex items-center justify-center group"
        }
        title="Instagram: @review_xpress_"
      >
        <Instagram className="w-3.5 h-3.5 text-pink-400 group-hover:text-pink-300 transition-colors" />
        {showLabels && <span className="text-[11px] font-medium">@review_xpress_</span>}
      </a>

      {/* Facebook Icon / Link */}
      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={
          showLabels
            ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700/70 text-xs font-medium transition-all hover:scale-105 shadow-sm group"
            : "p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-blue-400 border border-slate-700/70 transition-all hover:scale-110 shadow-sm flex items-center justify-center group"
        }
        title="Facebook Page"
      >
        <Facebook className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300 transition-colors" />
        {showLabels && <span className="text-[11px] font-medium">Facebook</span>}
      </a>
    </div>
  );
}
