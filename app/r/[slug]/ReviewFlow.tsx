'use client';

import React, { useState } from 'react';
import { Business, GenerateReviewResponse } from '@/lib/types';
import {
  Star,
  Sparkles,
  Copy,
  ExternalLink,
  CheckCircle2,
  Phone,
  MessageSquare,
  RefreshCw,
  HeartHandshake,
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface ReviewFlowProps {
  business: Business;
}

export default function ReviewFlow({ business }: ReviewFlowProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [reviewDraft, setReviewDraft] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1-2 star private feedback form state
  const [complaintText, setComplaintText] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [isComplaintSubmitted, setIsComplaintSubmitted] = useState<boolean>(false);

  // Business initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Toggle tag selection (Max 3 tags)
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length < 3) {
        setSelectedTags([...selectedTags, tag]);
      }
    }
  };

  // Generate review via Gemini API route
  const handleGenerateReview = async () => {
    if (selectedTags.length === 0) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: business.name,
          tags: selectedTags,
          rating: rating || 5,
        }),
      });

      const data: GenerateReviewResponse = await res.json();
      if (data.review) {
        setReviewDraft(data.review);
      }
    } catch (err) {
      console.error('Error triggering AI generation:', err);
      setReviewDraft(
        `Great experience at ${business.name}! Loved the ${selectedTags.join(' and ')}, highly recommended.`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy review to clipboard when user clicks "Copy & Post on Google"
  const handleCopyReview = async () => {
    const textToCopy = reviewDraft || `Excellent service and experience at ${business.name}!`;

    // 1. Copy to clipboard synchronously
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
    } catch (clipErr) {
      console.error('Clipboard copy failed:', clipErr);
      setIsCopied(true);
    }

    // 2. Log submission asynchronously (fire-and-forget)
    try {
      fetch('/api/submit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          rating: rating,
          selectedTags: selectedTags,
          reviewText: textToCopy,
          postedToGoogle: true,
        }),
      }).catch(() => {});
    } catch (logErr) {
      console.error('Failed to log review analytics:', logErr);
    }
  };

  // Handle private feedback submission for 1-2 stars
  const handlePrivateFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim()) return;

    setIsSubmitting(true);
    try {
      await fetch('/api/submit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          rating: rating,
          customerFeedback: complaintText,
          customerPhone: customerPhone,
          postedToGoogle: false,
        }),
      });
      setIsComplaintSubmitted(true);
    } catch (err) {
      console.error('Failed to submit private feedback:', err);
      setIsComplaintSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 pb-12 flex flex-col items-center">
      {/* Business Header Card */}
      <div className="w-full text-center mb-6 pt-2">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-blue-500/20 mb-3 border-2 border-white">
          <span className="text-2xl font-black tracking-wider">
            {getInitials(business.name)}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {business.name}
        </h1>
        <div className="flex items-center justify-center gap-1.5 mt-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified Google Review Partner</span>
        </div>
      </div>

      {/* Main Interactive Card */}
      <div className="w-full bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-100 p-6 transition-all duration-300">
        {/* Rating Prompt Header */}
        <div className="text-center mb-5">
          <h2 className="text-lg font-bold text-slate-800">
            {rating === 0
              ? 'How was your experience today?'
              : rating >= 4
              ? 'Awesome! We are thrilled to hear that!'
              : rating === 3
              ? 'Thank you! Help us share the good word.'
              : 'Oh no! We apologize for falling short.'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {rating === 0
              ? 'Tap a star to rate your visit'
              : 'Tap stars again if you wish to adjust'}
          </p>
        </div>

        {/* 5-Star Interactive Selector */}
        <div className="flex justify-center items-center gap-2 py-2 mb-6">
          {[1, 2, 3, 4, 5].map((starValue) => {
            const isFilled =
              hoveredRating >= starValue || (!hoveredRating && rating >= starValue);
            return (
              <button
                key={starValue}
                type="button"
                onClick={() => {
                  setRating(starValue);
                  if (starValue >= 3 && selectedTags.length === 0 && business.tags.length > 0) {
                    setSelectedTags([business.tags[0]]);
                  }
                }}
                onMouseEnter={() => setHoveredRating(starValue)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 sm:p-2 rounded-xl transition-all duration-150 hover:scale-110 active:scale-95 focus:outline-none"
                aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
              >
                <Star
                  className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                    isFilled
                      ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                      : 'text-slate-200 fill-slate-100 hover:text-amber-200'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* BRANCH A: 3, 4, or 5 STARS (Google Review + AI Flow)              */}
        {/* ----------------------------------------------------------------- */}
        {rating >= 3 && (
          <div className="space-y-5 animate-slide-up">
            {/* Step 1: Select Tags */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  What did you like the most?
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  Select 1 to 3 ({selectedTags.length}/3)
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {business.tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs font-medium px-3.5 py-2 rounded-full border transition-all duration-200 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 scale-[1.02]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: AI Generate Button (Only when at least 1 tag is selected) */}
            {selectedTags.length > 0 && !reviewDraft && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleGenerateReview}
                  disabled={isGenerating}
                  className="w-full relative overflow-hidden group py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Writing your authentic review...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>Generate Review with AI</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-slate-400 mt-1.5">
                  AI crafts a natural 2-sentence draft in seconds
                </p>
              </div>
            )}

            {/* Step 3: Editable Review Area (Rendered after AI generation or ready for custom input) */}
            {reviewDraft && (
              <div className="space-y-2 pt-1 animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Review Draft (Tap to edit):
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateReview}
                    disabled={isGenerating}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={reviewDraft}
                  onChange={(e) => setReviewDraft(e.target.value)}
                  className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all leading-relaxed"
                  placeholder="Your review draft will appear here..."
                />

                {/* Step 4: Primary Native Action - Copy & Open Google Reviews Dialog */}
                <a
                  href={business.google_review_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleCopyReview}
                  className="w-full mt-3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-center cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-white animate-bounce" />
                      <span>Review Copied! Opening Google Review...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-emerald-100" />
                      <span>Copy & Open Google Review Dialog</span>
                      <ExternalLink className="w-4 h-4 text-emerald-100 ml-0.5" />
                    </>
                  )}
                </a>

                {isCopied && (
                  <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 text-slate-800 space-y-2 animate-fade-in text-left mt-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Review Copied to Clipboard!</span>
                    </div>
                    <ol className="text-xs text-slate-700 space-y-1 list-decimal list-inside pl-1 font-medium">
                      <li>Google's <strong>Review Box</strong> opens in a new tab.</li>
                      <li>Select your <strong>5 Stars (⭐⭐⭐⭐⭐)</strong>.</li>
                      <li><strong>Long-press & Paste</strong> in the review box.</li>
                      <li>Tap <strong>Post / Submit</strong>!</li>
                    </ol>
                    <a
                      href={business.google_review_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold text-center hover:bg-slate-800 transition-colors mt-2"
                    >
                      Re-open Google Review Dialog
                    </a>
                  </div>
                )}

                {!isCopied && (
                  <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-100/80 text-[11px] text-amber-900 text-center flex items-center justify-center gap-1.5">
                    <span className="font-semibold">💡 Instant Review:</span>
                    <span>Tapping the button copies the text and opens the Google 5-star review box!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* BRANCH B: 1 or 2 STARS (INTERCEPTED PRIVATE FEEDBACK)              */}
        {/* ----------------------------------------------------------------- */}
        {rating > 0 && rating <= 2 && (
          <div className="space-y-4 animate-slide-up">
            {!isComplaintSubmitted ? (
              <form onSubmit={handlePrivateFeedbackSubmit} className="space-y-3.5">
                {/* Apology Banner */}
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-center">
                  <div className="inline-flex p-2 bg-rose-100 rounded-full text-rose-600 mb-1.5">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-rose-900">
                    We're sorry we didn't meet your expectations
                  </h3>
                  <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                    Your satisfaction is our top priority. Please tell our management directly so we can resolve this for you immediately.
                  </p>
                </div>

                {/* Complaint textarea */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    What went wrong? <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                    placeholder="Tell us what happened with service, quality, or staff..."
                    className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all leading-relaxed placeholder:text-slate-400"
                  />
                </div>

                {/* Customer Phone Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98765 43210 (For resolution callback)"
                      className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Our store manager will contact you directly to make things right.
                  </p>
                </div>

                {/* Submit Feedback Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !complaintText.trim()}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Sending to management...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      <span>Submit Private Feedback</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Confirmation Card */
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center animate-fade-in">
                <div className="inline-flex p-3 bg-emerald-100 rounded-full text-emerald-600 mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-emerald-950">
                  Feedback Received
                </h3>
                <p className="text-xs text-emerald-800 mt-2 leading-relaxed">
                  Thank you for letting us know. Your remarks have been sent directly to the owner and management team. We will take corrective measures immediately.
                </p>
                <div className="mt-4 pt-4 border-t border-emerald-200/60 flex items-center justify-center gap-1.5 text-xs text-emerald-700">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{business.name} Management</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Powered by Footer */}
      <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>Powered by Smart Tap AI Review Platform</span>
      </div>
    </div>
  );
}
