// src/utils/phone.js

/**
 * Strips everything but digits and returns the last 10 digits
 * (works whether the input has a leading 0, +91, 91, spaces, dashes, etc.)
 */
const normalizePhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.slice(-10);
};

/**
 * True if the input contains a valid 10-digit Indian mobile number.
 */
const isValidIndianPhone = (phone) => {
  const last10 = normalizePhone(phone);
  return /^[6-9]\d{9}$/.test(last10);
};

/**
 * Builds a https://wa.me/91XXXXXXXXXX link for a valid Indian mobile number,
 * or null if the number isn't valid.
 */
const buildWhatsAppLink = (phone) => {
  if (!isValidIndianPhone(phone)) return null;
  return `https://wa.me/91${normalizePhone(phone)}`;
};

module.exports = { normalizePhone, isValidIndianPhone, buildWhatsAppLink };
