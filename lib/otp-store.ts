const globalAny: any = global;
export const otpStore: Map<string, { otp: string; expiresAt: number }> = globalAny.otpStore || new Map();
if (!globalAny.otpStore) {
  globalAny.otpStore = otpStore;
}

// Clean up expired OTPs periodically to prevent memory leaks (simple approach)
setInterval(() => {
  const now = Date.now();
  otpStore.forEach((data, email) => {
    if (now > data.expiresAt) {
      otpStore.delete(email);
    }
  });
}, 60 * 1000 * 5); // Run every 5 minutes
