// User Roles
export const USER_ROLES = {
    USER: 'user', // Employee
    HR: 'hr', // Employer/Company
    ADMIN: 'admin',
} as const;

// Define base type for roles mapping to their string values
export type RoleType = typeof USER_ROLES[keyof typeof USER_ROLES];

// Permission type based on guild.txt specs
export type Permission =
    | 'read:own_profile'
    | 'update:own_profile'
    | 'read:jobs'
    | 'apply:job'
    | 'read:hr_public_profile'
    | 'create:job'
    | 'update:own_job'
    | 'delete:own_job'
    | 'read:candidates'
    | 'manage:candidates'
    | 'chat:candidate'
    | 'chat:hr'
    | 'review:employee'
    | 'review:hr'
    | 'access:admin_panel'
    | 'manage:users'
    | 'manage:jobs'
    | 'manage:payments'
    | 'manage:disputes'
    | 'manage:settings';

// Role Permissions
export const ROLE_PERMISSIONS: Record<RoleType, Permission[]> = {
    [USER_ROLES.USER]: [
        'read:own_profile',
        'update:own_profile',
        'read:jobs',
        'apply:job',
        'read:hr_public_profile',
        'chat:hr',
        'review:hr'
    ],
    [USER_ROLES.HR]: [
        'read:own_profile',
        'update:own_profile',
        'create:job',
        'update:own_job',
        'delete:own_job',
        'read:candidates',
        'manage:candidates',
        'chat:candidate',
        'review:employee'
    ],
    [USER_ROLES.ADMIN]: [
        'access:admin_panel',
        'manage:users',
        'manage:jobs',
        'manage:payments',
        'manage:disputes',
        'manage:settings',
        'read:jobs',
        'read:candidates'
    ],
};

// Role Hierarchy
export const ROLE_HIERARCHY: Record<RoleType, number> = {
    [USER_ROLES.USER]: 1,
    [USER_ROLES.HR]: 2,
    [USER_ROLES.ADMIN]: 3,
};

// Check if user has permission
export const hasPermission = (userRole: RoleType, permission: Permission): boolean => {
    const permissions = ROLE_PERMISSIONS[userRole];
    return permissions ? permissions.includes(permission) : false;
};

// Check if user role can access resource
export const canAccessResource = (userRole: RoleType, resourceOwnerRole: RoleType): boolean => {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const ownerLevel = ROLE_HIERARCHY[resourceOwnerRole] || 0;
    return userLevel >= ownerLevel;
};
