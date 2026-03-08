import { query, body, param } from 'express-validator';

const pagingValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('page phải là số nguyên >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit phải từ 1 đến 100'),
];

export const dashboardQueryValidator = [
  query('range').optional().isIn(['7d', '30d', '90d']).withMessage('range chỉ nhận 7d | 30d | 90d'),
];

export const dashboardExportQueryValidator = [
  ...dashboardQueryValidator,
  query('format').optional().isIn(['csv']).withMessage('format hiện chỉ hỗ trợ csv'),
];

export const usersListValidator = [
  ...pagingValidators,
  query('search').optional().isString().isLength({ max: 100 }),
  query('role').optional().isIn(['USER', 'HR', 'ADMIN']),
  query('status').optional().isIn(['ACTIVE', 'SUSPENDED', 'DELETED']),
];

export const mongoIdParamValidator = [
  param('id').isMongoId().withMessage('id không hợp lệ'),
];

export const updateUserStatusValidator = [
  ...mongoIdParamValidator,
  body('status').exists().isIn(['ACTIVE', 'SUSPENDED', 'DELETED']),
];

export const hrListValidator = [
  ...pagingValidators,
  query('search').optional().isString().isLength({ max: 100 }),
  query('status').optional().isIn(['PENDING', 'VERIFIED', 'REJECTED']),
  query('blacklisted').optional().isBoolean(),
];

export const hrVerificationValidator = [
  ...mongoIdParamValidator,
  body('verificationStatus').exists().isIn(['PENDING', 'VERIFIED', 'REJECTED']),
  body('reason').optional().isString().isLength({ max: 500 }),
];

export const hrBlacklistValidator = [
  ...mongoIdParamValidator,
  body('isBlacklisted').exists().isBoolean(),
  body('reason').optional().isString().isLength({ max: 500 }),
];

export const jobsListValidator = [
  ...pagingValidators,
  query('search').optional().isString().isLength({ max: 100 }),
  query('status').optional().isIn(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'FILLED', 'CLOSED', 'COMPLETED']),
  query('region').optional().isString().isLength({ max: 100 }),
  query('jobType').optional().isIn(['ENGINEER', 'WORKER']),
];

export const rejectJobValidator = [
  ...mongoIdParamValidator,
  body('reason').exists().isString().isLength({ min: 2, max: 500 }),
];

export const disputesListValidator = [
  ...pagingValidators,
  query('status').optional().isIn(['OPEN', 'INVESTIGATING', 'RESOLVED']),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
];

export const disputeStatusValidator = [
  ...mongoIdParamValidator,
  body('status').exists().isIn(['OPEN', 'INVESTIGATING', 'RESOLVED']),
  body('note').optional().isString().isLength({ max: 1000 }),
];

export const updateSettingsValidator = [
  body('maintenanceMode').optional().isBoolean(),
  body('emailAlertEnabled').optional().isBoolean(),
  body('adminSessionHours').optional().isInt({ min: 1, max: 168 }),
];

export const supportListValidator = [
  ...pagingValidators,
  query('search').optional().isString().isLength({ max: 100 }),
  query('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'CLOSED']),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
];

export const supportStatusValidator = [
  ...mongoIdParamValidator,
  body('status').exists().isIn(['OPEN', 'IN_PROGRESS', 'CLOSED']),
  body('reply').optional().isString().isLength({ max: 2000 }),
];
