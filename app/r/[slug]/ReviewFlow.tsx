"use client";

import React, { useState, useEffect, useRef } from "react";
import { Business, GenerateReviewResponse } from "@/lib/types";
import { getShuffledCategoryTags } from "@/lib/tags-data";
import {
  Star,
  Sparkles,
  Copy,
  ExternalLink,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  HeartHandshake,
  Building2,
  ShieldCheck,
  Lock,
  Pencil,
} from "lucide-react";
import HumanVerification from "@/components/HumanVerification";

interface ReviewFlowProps {
  business: Business;
  initialSource?: 'qr' | 'nfc';
}

export default function ReviewFlow({ business, initialSource }: ReviewFlowProps) {
  const [source, setSource] = useState<'qr' | 'nfc'>(() => {
    if (initialSource) return initialSource;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('source') === 'nfc' ? 'nfc' : 'qr';
    }
    return 'qr';
  });

  const [isHumanVerified, setIsHumanVerified] = useState<boolean>(false);


  const [visitLogId, setVisitLogId] = useState<string>("");

  // Log scan visitor event once per customer visit session (deduplicated across rapid reloads & camera prefetch)
  const hasLoggedScan = useRef(false);

  useEffect(() => {
    if (!business?.id) return;
    if (typeof window === "undefined") return;
    if (hasLoggedScan.current) return;

    const bizKey = business.id;
    const sessionKey = `rx_scanned_${bizKey}`;
    const localLastScanKey = `rx_last_scan_${bizKey}`;
    const logIdKey = `rx_log_${bizKey}`;

    const now = Date.now();
    const lastScanTime = Number(localStorage.getItem(localLastScanKey) || 0);
    const alreadyScannedInSession = sessionStorage.getItem(sessionKey);

    // If scanned in this browser session or within last 5 minutes from same device, avoid re-logging
    if (alreadyScannedInSession || (now - lastScanTime < 5 * 60 * 1000)) {
      const existingId = sessionStorage.getItem(logIdKey) || localStorage.getItem(logIdKey);
      if (existingId) setVisitLogId(existingId);
      hasLoggedScan.current = true;
      return;
    }

    hasLoggedScan.current = true;
    sessionStorage.setItem(sessionKey, 'true');
    localStorage.setItem(localLastScanKey, String(now));

    fetch('/api/log-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(6000),
      body: JSON.stringify({ businessId: business.id, source }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.logId) {
          setVisitLogId(data.logId);
          sessionStorage.setItem(logIdKey, data.logId);
          localStorage.setItem(logIdKey, data.logId);
        }
      })
      .catch(() => {});
  }, [business?.id, source]);


  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const hasCustomTags = Array.isArray(business.tags) && business.tags.length > 0;

  const [displayTags, setDisplayTags] = useState<string[]>(() => {
    if (hasCustomTags) return business.tags;
    return getShuffledCategoryTags(business.name, business.category);
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (Array.isArray(business.tags) && business.tags.length > 0) {
      setDisplayTags(business.tags);
    }
  }, [business.tags]);

  const handleShuffleTags = () => {
    if (hasCustomTags) {
      const shuffled = [...business.tags].sort(() => Math.random() - 0.5);
      setDisplayTags(shuffled);
      return;
    }
    const fresh = getShuffledCategoryTags(
      business.name,
      business.category,
    );
    setDisplayTags(fresh);
  };
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [reviewDraft, setReviewDraft] = useState<string>("");
  const [regenerationCount, setRegenerationCount] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isGoogleOpened, setIsGoogleOpened] = useState<boolean>(false);
  const [isConfirmedPosted, setIsConfirmedPosted] = useState<boolean>(false);
  const [draftLogId, setDraftLogId] = useState<string>("");
  const [isPostingVerification, setIsPostingVerification] = useState<boolean>(false);
  const [isCustomTyping, setIsCustomTyping] = useState<boolean>(false);

  // 1-2 star private feedback form state
  const [complaintText, setComplaintText] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [isComplaintSubmitted, setIsComplaintSubmitted] =
    useState<boolean>(false);
  const [complaintError, setComplaintError] = useState<string>("");

  // Business initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
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



  // Generate review via Gemini API route (Allows up to 5 regenerations)
  const handleGenerateReview = async () => {
    if (selectedTags.length === 0) return;
    const isRegenerating = Boolean(reviewDraft);
    if (isRegenerating && regenerationCount >= 5) return;

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          businessName: business.name,
          tags: selectedTags,
          rating: rating || 5,
          currentReview: reviewDraft,
          regenerate: isRegenerating,
        }),
      });

      const data: GenerateReviewResponse = await res.json();
      if (data.review) {
        setReviewDraft(data.review);
        if (isRegenerating) {
          setRegenerationCount((prev) => prev + 1);
        }
      }
    } catch (err) {
      console.error("Error triggering AI generation:", err);
      setReviewDraft(
        `Great experience at ${business.name}! Loved the ${selectedTags.join(" and ")}, highly recommended.`,
      );
      if (isRegenerating) {
        setRegenerationCount((prev) => prev + 1);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy review to clipboard and open Google Maps review page immediately (synchronously to prevent mobile popup blocking)
  const handleOpenGoogle = () => {
    const textToCopy =
      reviewDraft || `Excellent service and experience at ${business.name}!`;

    const targetUrl =
      business.slug === "demo"
        ? "https://www.google.com/maps"
        : (business.google_review_link || "https://www.google.com/maps");

    // 1. Open Google Review window synchronously in direct response to user gesture
    // Running this before any async operations prevents mobile browsers (Chrome Android, iOS Safari) from blocking it as a popup
    try {
      const win = window.open(targetUrl, "_blank", "noopener,noreferrer");
      if (!win || win.closed || typeof win.closed === "undefined") {
        window.location.href = targetUrl;
      }
    } catch {
      window.location.href = targetUrl;
    }

    // 2. Copy review text to clipboard
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).catch(() => {});
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
    } catch (clipErr) {
      console.warn("Clipboard copy fallback:", clipErr);
      setIsCopied(true);
    }

    // 3. Mark as completed in UI immediately without intermediate questioning screens
    setIsConfirmedPosted(true);

    // 4. Log review as posted to Google asynchronously in background (keepalive ensures delivery)
    try {
      fetch("/api/submit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          logId: draftLogId || visitLogId || undefined,
          businessId: business.id,
          rating: Math.max(rating || 5, 4),
          selectedTags: selectedTags,
          reviewText: textToCopy,
          postedToGoogle: true,
          source,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.logId) setDraftLogId(data.logId);
        })
        .catch(() => {});
    } catch (err) {
      console.warn("Feedback draft sync notice:", err);
    }
  };

  // Handle private feedback submission for 1-2 stars
  const handlePrivateFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim()) return;

    setComplaintError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/submit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          logId: visitLogId || undefined,
          businessId: business.id,
          rating: rating || 2,
          customerFeedback: complaintText.trim(),
          customerPhone: customerPhone.trim(),
          postedToGoogle: false,
          source,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setIsComplaintSubmitted(true);
      } else {
        setComplaintError(data?.message || "Could not submit feedback. Please try again.");
      }
    } catch (err) {
      console.error("Failed to submit private feedback:", err);
      setComplaintError("Network timeout. Please tap Submit Private Feedback again.");
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
      </div>

      {/* Main Interactive Card */}
      {!isHumanVerified ? (
        <div className="w-full bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-100 p-6 sm:p-8 transition-all duration-300 text-center flex flex-col items-center animate-fade-in">
          <div className="inline-flex p-3.5 bg-blue-50 rounded-2xl text-blue-600 mb-4 border border-blue-100">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1.5">
            Security Check
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">
            Please tap below to verify you are human before accessing the review terminal for <span className="font-semibold text-slate-800">{business.name}</span>.
          </p>

          <HumanVerification
            theme="light"
            label="I am not a robot"
            onVerified={() => {
              setTimeout(() => {
                setIsHumanVerified(true);
              }, 300);
            }}
          />

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Protected by Cloudflare Security System</span>
          </div>
        </div>
      ) : (
        <div className="w-full bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-100 p-6 transition-all duration-300 animate-fade-in">
          {/* Rating Prompt Header */}
          <div className="text-center mb-5">
            <h2 className="text-lg font-bold text-slate-800">
              {rating === 0
                ? "How was your experience today?"
                : rating >= 3
                  ? "Awesome! We are thrilled to hear that!"
                  : "Oh no! We apologize for falling short."}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {rating === 0
                ? "Tap a star to rate your visit"
                : "Tap stars again if you wish to adjust"}
            </p>
          </div>

          {/* 5-Star Interactive Selector */}
          <div className="flex justify-center items-center gap-2 py-2 mb-6">
            {[1, 2, 3, 4, 5].map((starValue) => {
              const isFilled =
                hoveredRating >= starValue ||
                (!hoveredRating && rating >= starValue);
              return (
                <button
                  key={starValue}
                  type="button"
                  onClick={() => {
                    setRating(starValue);
                    if (starValue >= 3 && selectedTags.length === 0) {
                      if (!hasCustomTags) {
                        const freshTags = getShuffledCategoryTags(
                          business.name,
                          business.category,
                        );
                        setDisplayTags(freshTags);
                        if (freshTags.length > 0) setSelectedTags([freshTags[0]]);
                      } else if (displayTags.length > 0) {
                        setSelectedTags([displayTags[0]]);
                      }
                    }
                  }}
                  onMouseEnter={() => setHoveredRating(starValue)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 sm:p-2 rounded-xl transition-all duration-150 hover:scale-110 active:scale-95 focus:outline-none"
                  aria-label={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                      isFilled
                        ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                        : "text-slate-200 fill-slate-100 hover:text-amber-200"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* BRANCH A: 3, 4, or 5 STARS (Positive Google Review Flow)          */}
          {/* ----------------------------------------------------------------- */}
          {rating >= 3 && (
            <div className="space-y-5 animate-slide-up">
              {/* Step 1: Select Tags */}
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    What did you like the most?
                  </label>
                  {displayTags.length > 3 && (
                    <button
                      type="button"
                      onClick={handleShuffleTags}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg hover:bg-indigo-50"
                      title="Shuffle to see more experience highlights"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Shuffle Highlights 🎲</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {displayTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs font-medium px-3.5 py-2 rounded-full border transition-all duration-200 ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 scale-[1.02]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: AI Generate Button & Manual Typing Option (Only when not in draft or manual typing mode) */}
              {selectedTags.length > 0 && !reviewDraft && !isCustomTyping && (
                <div className="pt-1 space-y-2">
                  <button
                    type="button"
                    onClick={handleGenerateReview}
                    disabled={isGenerating}
                    className="w-full relative overflow-hidden group py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98] cursor-pointer transition-all flex items-center justify-center gap-2"
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

                  <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                    <span>⚡ AI creates natural reviews</span>
                    <span className="text-indigo-600 font-semibold">
                      Up to 5 AI regenerations allowed
                    </span>
                  </div>

                  {/* Option to Type Review Manually (Write Myself) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomTyping(true);
                      if (!reviewDraft) {
                        setReviewDraft("");
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Type Review Manually (Write Myself) ✍️</span>
                  </button>
                </div>
              )}

              {/* Step 3: Editable Review Area (Rendered after AI generation or when typing manually) */}
              {(reviewDraft || isCustomTyping) && (
                <div className="space-y-2 pt-1 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      {isCustomTyping && !regenerationCount ? (
                        <>
                          <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Type Your Review:</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Review Draft (Tap to edit):</span>
                        </>
                      )}
                    </span>
                    {regenerationCount < 5 ? (
                      <button
                        type="button"
                        onClick={handleGenerateReview}
                        disabled={isGenerating}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors border border-indigo-200/50"
                        title="Click to generate with AI (up to 5 times)"
                      >
                        <Sparkles
                          className={`w-3 h-3 text-amber-500 ${isGenerating ? "animate-spin" : ""}`}
                        />
                        <span>{reviewDraft && regenerationCount > 0 ? `Regenerate (${regenerationCount}/5)` : "Write with AI ✨"}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                        Regeneration limit reached (5/5)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                    <span>{isCustomTyping && !regenerationCount ? "Write your authentic review below" : "You can edit this draft manually"}</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {reviewDraft.trim() ? `${reviewDraft.trim().split(/\s+/).filter(Boolean).length} words` : "Empty draft"}
                    </span>
                  </div>

                  {/* Confirmation & Thank You Screens */}
                  {isConfirmedPosted ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-3 animate-fade-in shadow-xl">
                      <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-black text-emerald-950">
                        Review Copied & Google Maps Opened! 🎉
                      </h3>
                      <p className="text-xs text-emerald-800 leading-relaxed max-w-xs mx-auto">
                        Your review was copied to your clipboard. Simply <strong>paste</strong> it into Google Maps and tap <strong>Post</strong>.
                      </p>
                      <div className="pt-2 flex flex-col gap-2 items-center justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            const targetUrl =
                              business.slug === "demo"
                                ? "https://www.google.com/maps"
                                : business.google_review_link;
                            window.open(targetUrl, '_blank');
                          }}
                          className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Re-open Google Maps Review Window</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmedPosted(false)}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 cursor-pointer mt-1"
                        >
                          Edit Review Text
                        </button>
                        <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 pt-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Thank you for supporting {business.name}!</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Step 4A: Normal Draft screen with Copy & Open Google button */
                    <>
                      <textarea
                        rows={3}
                        value={reviewDraft}
                        onChange={(e) => setReviewDraft(e.target.value)}
                        className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all leading-relaxed"
                        placeholder={
                          isCustomTyping && !regenerationCount
                            ? "Type your authentic review here... (e.g. Great experience, friendly staff and prompt service!)"
                            : "Your review draft will appear here (tap to edit)..."
                        }
                      />

                      {/* Copy review text, then open Google Maps */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenGoogle();
                        }}
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
                            <span>
                              {business.slug === "demo"
                                ? "Open Google Maps Demo"
                                : "Copy & Open Google Review"}
                            </span>
                            <ExternalLink className="w-4 h-4 text-emerald-100 ml-0.5" />
                          </>
                        )}
                      </button>

                      <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-100/80 text-[11px] text-amber-900 text-center flex items-center justify-center gap-1.5">
                        <span className="font-semibold">💡 Tip:</span>
                        <span>
                          Copies your review & opens Google Maps. Simply paste and tap 'Post'!
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* BRANCH B: 1 or 2 STARS (SHIELDED PRIVATE COMPLAINT INTERCEPT)     */}
          {/* ----------------------------------------------------------------- */}
          {rating > 0 && rating <= 2 && (
            <div className="space-y-4 animate-slide-up">
              {!isComplaintSubmitted ? (
                <form
                  onSubmit={handlePrivateFeedbackSubmit}
                  className="space-y-3.5"
                >
                  {/* Apology Banner */}
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-center">
                    <div className="inline-flex p-2 bg-rose-100 rounded-full text-rose-600 mb-1.5">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-rose-900">
                      We're sorry we didn't meet your expectations
                    </h3>
                    <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                      Your satisfaction is our top priority. Please tell our
                      management directly so we can resolve this for you
                      immediately.
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

                  {complaintError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl text-center">
                      {complaintError}
                    </div>
                  )}

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
                    Thank you for letting us know. Your remarks have been sent
                    directly to the owner and management team. We will take
                    corrective measures immediately.
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
      )}

      {/* Powered by Footer */}
      <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <img
          src="/reviewxpress-icon.png"
          alt="ReviewXpress"
          className="w-5 h-5 rounded-sm object-contain"
        />
        <span>
          Powered by <strong className="text-slate-600">ReviewXpress</strong>
        </span>
      </div>
    </div>
  );
}
