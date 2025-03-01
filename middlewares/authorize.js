const authorize = (...allowedRoles) => {
    return (req, res, next) => {
      console.log(`[AUTHORIZATION] Checking access for user: ${req.user?.role || 'Unknown'}`);
  
      // Log allowed roles for this route
      console.log(`[AUTHORIZATION] Allowed roles for this route: ${allowedRoles.join(', ')}`);
  
      // If user is missing or their role is not in the allowed roles, deny access
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        console.warn(`[AUTHORIZATION] Access denied. User role: ${req.user?.role || 'None'}`);
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      }
  
      console.log(`[AUTHORIZATION] Access granted for user role: ${req.user.role}`);
      next();
    };
  };
  
  module.exports = authorize;
  