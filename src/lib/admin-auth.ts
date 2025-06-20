/**
 * Admin authentication utilities
 * This file provides helper functions for admin authentication and authorization.
 */

/**
 * Checks if the provided email belongs to an admin user
 * @param email The email to check
 * @returns True if the email belongs to an admin, false otherwise
 */

/**
 * Validates if a request is coming from an admin
 * @param email The email from the request headers
 * @returns True if the request is from an admin, false otherwise
 */

export function isAdminEmail(email: string): boolean {
  const adminEmails = ['andrewosborne918@gmail.com'];
  return !!email && adminEmails.includes(email.toLowerCase());
}

export function validateAdminRequest(email: string | null): boolean {
  if (!email) return false;
  return isAdminEmail(email);
}