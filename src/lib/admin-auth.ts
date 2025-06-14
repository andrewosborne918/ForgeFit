// src/lib/admin-auth.ts
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

// Admin email list - in production, store these in environment variables or database
const ADMIN_EMAILS = [
  'andrewosborne918@gmail.com', // Primary admin
  // Add more admin emails as needed
];

export interface AdminUser {
  uid: string;
  email: string;
  isAdmin: boolean;
}

/**
 * Check if a user is an admin
 * @param email User's email address
 * @returns Whether the user is an admin
 */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Get current admin user if authenticated and is admin
 * @returns AdminUser object or null
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    if (!app) return null;
    
    const auth = getAuth(app);
    const user = auth.currentUser;
    
    if (!user || !user.email) return null;
    
    // Check if user is in admin list
    if (!isAdminEmail(user.email)) return null;
    
    return {
      uid: user.uid,
      email: user.email,
      isAdmin: true
    };
  } catch (error) {
    console.error('Error checking admin status:', error);
    return null;
  }
}

/**
 * React hook to get admin status
 */
export async function useAdminAuth() {
  const admin = await getCurrentAdmin();
  return {
    isAdmin: !!admin,
    admin: admin,
    loading: false
  };
}

/**
 * Verify admin access for API routes
 * @param email User email to verify
 * @returns Whether user has admin access
 */
export function verifyAdminAccess(email?: string): boolean {
  if (!email) return false;
  return isAdminEmail(email);
}
