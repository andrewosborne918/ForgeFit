// src/lib/authErrorHandler.ts
// Custom Firebase Auth error message handler

export interface FirebaseAuthError {
  code?: string;
  message?: string;
}

export function getAuthErrorMessage(error: FirebaseAuthError): string {
  const code = error.code;
  
  switch (code) {
    // Sign In Errors
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    
    // Sign Up Errors
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    
    // Password Reset Errors
    case 'auth/expired-action-code':
      return 'The password reset link has expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return 'The password reset link is invalid. Please request a new one.';
    
    // Google Sign-In Errors
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups and try again.';
    case 'auth/cancelled-popup-request':
      return 'Another sign-in popup is already open. Please close it and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google sign-in. Please contact support.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled. Please contact support.';
    
    // Generic fallback
    default:
      // Remove "Firebase: " prefix and "Error (auth/...)" format if present
      let message = error.message || 'An unexpected error occurred. Please try again.';
      
      // Clean up Firebase error messages
      message = message.replace(/^Firebase:\s*/i, '');
      message = message.replace(/\s*\(auth\/[^)]+\)\.?$/, '');
      
      // If the message is still technical or empty, provide a generic message
      if (message.length < 10 || message.includes('auth/')) {
        message = 'An unexpected error occurred. Please try again.';
      }
      
      return message;
  }
}
