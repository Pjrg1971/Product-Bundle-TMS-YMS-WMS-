/**
 * Auth Middleware
 * Verifies Supabase JWT and attaches user + tenant context to req
 */
const { createClient } = require('@supabase/supabase-js');

// Service-role client — bypasses RLS for server-side ops only
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Verifies the Bearer JWT sent by the Supabase client.
 * Uses supabaseAdmin.auth.getUser() — works with both HS256 and ECC signing keys.
 * Attaches req.user, req.tenantId, req.userRole to every authenticated request.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Extract tenant + role from app_metadata (set at signup)
    const tenantId = user.app_metadata?.tenant_id;
    const role     = user.app_metadata?.role;

    if (!tenantId) {
      return res.status(403).json({ error: 'User is not associated with a tenant' });
    }

    req.user     = user;
    req.userId   = user.id;
    req.tenantId = tenantId;
    req.userRole = role || 'viewer';

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role-based access control factory.
 * Usage: requireRole('admin', 'yard_manager')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        error: `Role '${req.userRole}' is not authorized for this action. Required: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
}

/**
 * Creates a per-request Supabase client that operates as the authenticated user.
 * This means RLS policies run automatically — no need to filter by tenant_id in routes.
 */
function getUserClient(token) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

/**
 * Write an audit log entry (uses service role to bypass RLS on audit_log)
 */
async function writeAudit(tenantId, userId, action, entityType, entityId, metadata = {}, ip = null) {
  await supabaseAdmin.from('audit_log').insert({
    tenant_id: tenantId,
    user_id: userId || null,
    action,
    entity_type: entityType || null,
    entity_id: entityId ? String(entityId) : null,
    metadata,
    ip_address: ip || null
  });
}

module.exports = { requireAuth, requireRole, getUserClient, writeAudit, supabaseAdmin };
