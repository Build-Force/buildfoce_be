import {
  ADMIN_DISPUTES_MOCK,
  ADMIN_HR_MOCK,
  ADMIN_JOBS_MOCK,
  ADMIN_OVERVIEW_MOCK,
  ADMIN_PAYMENTS_MOCK,
  ADMIN_SETTINGS_MOCK,
  ADMIN_SUPPORT_MOCK,
  ADMIN_USERS_MOCK,
} from '../constants';

export const adminService = {
  getOverview() {
    return ADMIN_OVERVIEW_MOCK;
  },

  getUsers() {
    return ADMIN_USERS_MOCK;
  },

  getHrAccounts() {
    return ADMIN_HR_MOCK;
  },

  getJobs() {
    return ADMIN_JOBS_MOCK;
  },

  getPayments() {
    return ADMIN_PAYMENTS_MOCK;
  },

  getDisputes() {
    return ADMIN_DISPUTES_MOCK;
  },

  getSettings() {
    return ADMIN_SETTINGS_MOCK;
  },

  getSupportTickets() {
    return ADMIN_SUPPORT_MOCK;
  },
};
