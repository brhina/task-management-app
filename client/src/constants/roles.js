/**
 * User role constants
 */
export const ROLES = {
    ADMIN: 'Admin',
    MEMBER: 'Member'
};

/**
 * Check if user has admin role
 */
export const isAdmin = (user) => {
    return user?.role === ROLES.ADMIN;
};

/**
 * Check if user has member role
 */
export const isMember = (user) => {
    return user?.role === ROLES.MEMBER;
};

