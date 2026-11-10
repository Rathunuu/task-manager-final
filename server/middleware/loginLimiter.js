// Login brute-force protection, per EMAIL (not per IP).
//
// Rule: after MAX_FAILED wrong attempts for the same email, further
// logins for that email are blocked for LOCK_MINUTES. A correct login
// before the limit clears the counter.
//
// Counters live in memory. That is fine for a single Render instance;
// a restart clears them. With several servers this would need a shared
// store such as the database or Redis.

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const LOCK_MS = LOCK_MINUTES * 60 * 1000;

// email -> { count, lockedUntil }
const attempts = new Map();

function keyFor(email) {
    return String(email || "").toLowerCase().trim();
}

// Runs BEFORE the login handler: refuses locked emails
export function loginLockout(req, res, next) {
    const key = keyFor(req.body && req.body.email);
    const entry = attempts.get(key);

    if (entry && entry.lockedUntil) {
        const remaining = entry.lockedUntil - Date.now();

        if (remaining > 0) {
            const minutes = Math.ceil(remaining / 60000);

            return res.status(429).json({
                message: `Too many failed login attempts. Try again in ${minutes} minute(s).`
            });
        }

        // Cooldown over: start fresh
        attempts.delete(key);
    }

    next();
}

// Called by the login handler on a wrong password
export function recordFailedLogin(email) {
    const key = keyFor(email);
    const entry = attempts.get(key) || { count: 0, lockedUntil: null };

    entry.count += 1;

    if (entry.count >= MAX_FAILED) {
        entry.lockedUntil = Date.now() + LOCK_MS;
    }

    attempts.set(key, entry);
}

// Called by the login handler on a successful login
export function clearFailedLogins(email) {
    attempts.delete(keyFor(email));
}

// Used by tests to start from a clean state
export function resetLoginAttempts() {
    attempts.clear();
}
