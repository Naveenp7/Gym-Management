/**
 * Calculates the number of days remaining until an expiry date.
 * This function is designed to handle various date inputs, including
 * JavaScript Date objects and Firebase Timestamp objects.
 *
 * @param {object | Date | string | number} expiryDate - The expiration date.
 * @returns {number} The number of days remaining, rounded up. Returns 0 if the date has passed.
 */
export const calculateDaysRemaining = (expiryDate) => {
  if (!expiryDate) {
    return 0;
  }

  // Handle Firestore Timestamp objects by converting them to JS Date objects
  const date = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate);
  const today = new Date();

  const diffTime = date.getTime() - today.getTime();

  // If the difference is not positive, it has expired or is today
  return diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
};