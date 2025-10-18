// backend/middleware/auth.js (Placeholder to prevent MODULE_NOT_FOUND)

/**
 * Middleware placeholder for checking if the user role is 'Guard' or 'Manager'.
 */
function checkGuardOrManagerAccess(req, res, next) {
    // DEV MODE: Extract user details from headers provided by client/app.js
    const userRole = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];

    if (userRole === 'Guard' || userRole === 'Manager') {
        req.userId = userId; // Attach userId for use in issuance
        return next();
    }
    
    return res.status(403).json({ 
        success: false, 
        message: 'Permission denied. Requires Guard or Manager role.' 
    });
}

/**
 * Middleware placeholder for checking if the user role is 'Guard' (Guard OR Manager).
 */
function checkGuardAccess(req, res, next) {
    const userRole = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];

    if (userRole === 'Guard' || userRole === 'Manager') {
        req.userId = userId; // Attach userId for use in issuance
        return next();
    }
    
    return res.status(403).json({ 
        success: false, 
        message: 'Permission denied. Requires Guard role.' 
    });
}

module.exports = {
    checkGuardOrManagerAccess,
    checkGuardAccess
};