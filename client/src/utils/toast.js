/**
 * Unified Toast Utilities
 * Provides consistent toast notifications across the app
 */

import toast from 'react-hot-toast';

// Consistent toast styling
const baseStyle = {
  background: '#18181b',
  color: '#fafafa',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '12px 16px',
  fontSize: '14px',
  fontWeight: '500',
};

// Success toast with checkmark
export const showSuccess = (message, options = {}) => {
  return toast.success(message, {
    duration: 3000,
    style: {
      ...baseStyle,
      border: '1px solid rgba(34, 197, 94, 0.3)',
    },
    iconTheme: {
      primary: '#22c55e',
      secondary: '#18181b',
    },
    ...options,
  });
};

// Error toast with X
export const showError = (message, options = {}) => {
  return toast.error(message, {
    duration: 4000,
    style: {
      ...baseStyle,
      border: '1px solid rgba(239, 68, 68, 0.3)',
    },
    iconTheme: {
      primary: '#ef4444',
      secondary: '#18181b',
    },
    ...options,
  });
};

// Loading toast (returns ID for updating)
export const showLoading = (message, options = {}) => {
  return toast.loading(message, {
    style: {
      ...baseStyle,
      border: '1px solid rgba(99, 102, 241, 0.3)',
    },
    ...options,
  });
};

// Info toast with icon
export const showInfo = (message, icon = 'ℹ️', options = {}) => {
  return toast(message, {
    duration: 3000,
    icon,
    style: {
      ...baseStyle,
      border: '1px solid rgba(99, 102, 241, 0.3)',
    },
    ...options,
  });
};

// Warning toast
export const showWarning = (message, options = {}) => {
  return toast(message, {
    duration: 4000,
    icon: '⚠️',
    style: {
      ...baseStyle,
      border: '1px solid rgba(245, 158, 11, 0.3)',
    },
    ...options,
  });
};

// Update existing toast (e.g., loading -> success)
export const updateToast = (toastId, type, message) => {
  switch (type) {
    case 'success':
      toast.success(message, { id: toastId, duration: 3000 });
      break;
    case 'error':
      toast.error(message, { id: toastId, duration: 4000 });
      break;
    default:
      toast(message, { id: toastId });
  }
};

// Dismiss toast
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

// Common toast messages for consistency
export const toastMessages = {
  // Auth
  loginSuccess: (name) => `Welcome back, ${name}!`,
  loginRequired: 'Please log in to continue',
  logoutSuccess: 'Logged out successfully',
  
  // Sync
  syncStart: 'Syncing with Google Classroom...',
  syncSuccess: 'Sync complete! Dashboard updated.',
  syncError: 'Sync failed. Please try again.',
  
  // AI Generation
  generating: (mode) => `Generating ${mode}...`,
  generateSuccess: (mode) => `${mode} generated successfully!`,
  generateError: 'Generation failed. Please try again.',
  rateLimitError: (waitTime) => `Rate limit exceeded. Please wait ${waitTime}.`,
  
  // Save/Submit
  saving: 'Saving...',
  saveSuccess: 'Saved successfully!',
  saveError: 'Failed to save. Please try again.',
  submitSuccess: 'Submitted successfully!',
  submitError: 'Submission failed. Please try again.',
  
  // Files
  uploadStart: 'Uploading file...',
  uploadSuccess: 'File uploaded successfully!',
  uploadError: 'Upload failed. Please try again.',
  downloadStart: 'Downloading...',
  downloadSuccess: 'Download complete!',
  
  // Settings
  settingsSaved: 'Settings saved!',
  apiKeyRequired: 'API Key not set. Please add it in Settings.',
  apiKeyInvalid: 'Invalid API Key. Please check and try again.',
  
  // Error fallbacks
  genericError: 'Something went wrong. Please try again.',
  networkError: 'Network error. Check your connection.',
  serverError: 'Server error. Please try again later.',
};

export default {
  success: showSuccess,
  error: showError,
  loading: showLoading,
  info: showInfo,
  warning: showWarning,
  update: updateToast,
  dismiss: dismissToast,
  messages: toastMessages,
};
