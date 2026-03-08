// API Base Paths
export const API_PATHS = {
  BASE: '/api',
  FULL_BASE: '/api',
} as const;

// Auth Routes
export const AUTH_PATHS = {
  BASE: '/auth',
  REGISTER: '/register',
  LOGIN: '/login',
  LOGOUT: '/logout',
  REFRESH: '/refresh',
  FORGOT_PASSWORD: '/forgot-password',
  VERIFY_RESET_OTP: '/verify-reset-otp',
  RESET_PASSWORD: '/reset-password',
  VERIFY_LINK_EMAIL: '/verify-link-email',
  RESEND_OTP: '/resend-otp',
  VERIFY_OTP: '/verify-otp',
  VERIFY_EMAIL_CHANGE: '/verify-email-change',
  CHECK_VERIFICATION: '/check-verification',
  GOOGLE: '/google',
  GOOGLE_CALLBACK: '/google/callback',
  GOOGLE_MOBILE: '/google/mobile',
  FACEBOOK: '/facebook',
  FACEBOOK_CALLBACK: '/facebook/callback',
  FACEBOOK_MOBILE: '/facebook/mobile',
  CHANGE_PASSWORD: '/change-password',
} as const;

// User / Employee Profile Routes
export const USER_PATHS = {
  BASE: '/users',
  GET_PROFILE: '/profile',
  UPDATE_PROFILE: '/profile',
  UPLOAD_AVATAR: '/avatar',
  UPLOAD_CCCD: '/cccd',     // Specifically for employee verification
  DELETE_ACCOUNT: '/delete',
  VERIFY_ACCOUNT: '/verify',
  CHANGE_EMAIL: '/change-email',
  VERIFY_EMAIL_CHANGE: '/verify-email-change',
  CHANGE_PASSWORD: '/change-password',
  // Employee specific
  EMPLOYEE_PROFILE: '/employee',
  APPLIED_JOBS: '/jobs/applied',
} as const;

// HR Routes
export const HR_PATHS = {
  BASE: '/hr',
  GET_PROFILE: '/profile',
  UPDATE_PROFILE: '/profile',
  PUBLIC_PROFILE: '/:id/public', // For employees to check HR rep
  PACKAGES: '/packages', // Package purchases
  CANDIDATES: '/candidates', // View and manage applicant processing
} as const;

// Job / Project Routes
export const JOB_PATHS = {
  BASE: '/jobs',
  LIST: '/',
  CREATE: '/',
  GET_BY_ID: '/:id',
  UPDATE: '/:id',
  DELETE: '/:id',
  SEARCH: '/search',
  APPLY: '/:id/apply',
  APPLICANTS: '/:id/applicants', // HR to view list
  UPDATE_APPLICANT_STATUS: '/:id/applicants/:applicantId', // HR to approve/reject
  MATCHING: '/matching', // AI match candidates based on role and location
} as const;

// Chat / Communication Routes
export const CHAT_PATHS = {
  BASE: '/chat',
  CONVERSATIONS: '/',
  SEND_MESSAGE: '/:conversationId',
  MESSAGES: '/:conversationId/messages',
} as const;

// Review & Dispute Routes
export const REVIEW_PATHS = {
  BASE: '/reviews',
  CREATE: '/',
  GET_BY_TARGET: '/target/:id', // Target can be HR or Employee ID
  REPORT: '/:id/report',
} as const;

export const DISPUTE_PATHS = {
  BASE: '/disputes',
  CREATE: '/',
  GET_USER_DISPUTES: '/',
  GET_BY_ID: '/:id',
} as const;

// Admin Routes
export const ADMIN_PATHS = {
  BASE: '/admin',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  HR_ACCOUNTS: '/hr',
  JOBS_PENDING: '/jobs/pending',
  JOBS_APPROVE: '/jobs/:id/approve',
  JOBS_REJECT: '/jobs/:id/reject',
  VERIFY_HR: '/verify/hr/:id',
  VERIFY_CCCD: '/verify/cccd/:id',
  DISPUTES: '/disputes',
  DISPUTES_RESOLVE: '/disputes/:id/resolve',
  PACKAGES: '/packages',
  PAYMENTS: '/payments',
  ANALYTICS: '/analytics',
} as const;

// File Upload Routes
export const UPLOAD_PATHS = {
  BASE: '/upload',
  IMAGE: '/image',
  AVATAR: '/avatar',
  DOCUMENT: '/document',
  CCCD: '/cccd',    // Sensitive ID storage vs external mapping
  CONTRACT: '/contract', // Uploading handshake details/contracts
} as const;

// Payments Routes (SePay integration)
export const PAYMENTS_PATHS = {
  BASE: '/payments',
  PACKAGES: '/packages',
  MY_PACKAGE: '/my-package',
  CREATE: '/create',
  CONFIRM: '/confirm',
  HISTORY: '/history',
  SEED: '/seed-packages',
  SESSION: '/session/:sessionId',
} as const;

// Utility function to build full API paths
export const buildApiPath = (path: string): string => {
  return `${API_PATHS.FULL_BASE}${path}`;
};

// Utility function to build admin paths
export const buildAdminPath = (path: string): string => {
  return `${API_PATHS.FULL_BASE}${ADMIN_PATHS.BASE}${path}`;
};
