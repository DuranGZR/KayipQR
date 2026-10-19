// Safe web haptics utilities for mobile browsers
export const triggerHaptic = (pattern: number | number[] = 15) => {
  if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration errors on unsupported hardware
    }
  }
};

export const haptic = {
  // Light tap for button clicks / chip selections
  lightTap: () => triggerHaptic(12),
  
  // Success feedback for message sent, QR downloaded, status updated
  success: () => triggerHaptic([15, 40, 25]),
  
  // Warning feedback for lost status, scan alerts
  warning: () => triggerHaptic([30, 50, 30]),
  
  // Error feedback for failed submissions
  error: () => triggerHaptic([40, 40, 40, 40, 60]),
};
