/* =========================
   AUTH STORAGE KEYS
========================= */

const USERS_KEY = "task-manager-users";
const SESSION_KEY = "task-manager-current-user";


/* =========================
   SIMPLE HASH
   (Not cryptographically secure -
   fine for a client-only student
   project. Never use this for a
   real production login system.)
========================= */

function simpleHash(text) {

    let hash = 0;

    for (let i = 0; i < text.length; i++) {

        hash =
            (hash << 5) -
            hash +
            text.charCodeAt(i);

        hash |= 0;
    }

    return hash.toString(36);
}


/* =========================
   LOAD / SAVE USERS
========================= */

export function loadUsers() {

    const stored =
        localStorage.getItem(USERS_KEY);

    if (!stored) {
        return [];
    }

    try {

        const users =
            JSON.parse(stored);

        return Array.isArray(users)
            ? users
            : [];

    } catch (error) {

        console.error(
            "Could not load users:",
            error
        );

        return [];
    }
}


function saveUsers(users) {

    localStorage.setItem(
        USERS_KEY,
        JSON.stringify(users)
    );
}


/* =========================
   REGISTER

   AUTO-ADMIN RULE:
   The very first account ever
   created automatically becomes
   Admin. Every other public signup
   is a plain "user". Only the admin
   dashboard (which passes role
   explicitly) can create more admins.
========================= */

export function registerUser(
    username,
    password,
    role = "user"
) {

    username =
        String(username || "").trim();

    if (!username || !password) {

        return {
            success: false,
            message:
                "Username and password are required."
        };
    }

    const users = loadUsers();

    const alreadyExists =
        users.some(
            user =>
                user.username.toLowerCase() ===
                username.toLowerCase()
        );

    if (alreadyExists) {

        return {
            success: false,
            message:
                "That username is already taken."
        };
    }

    const finalRole =
        users.length === 0
            ? "admin"
            : (
                role === "admin"
                    ? "admin"
                    : "user"
            );

    users.push({
        username,
        passwordHash:
            simpleHash(password),
        role: finalRole
    });

    saveUsers(users);

    return {
        success: true,
        role: finalRole
    };
}


/* =========================
   LOGIN
========================= */

export function loginUser(
    username,
    password
) {

    username =
        String(username || "").trim();

    const users = loadUsers();

    const user =
        users.find(
            item =>
                item.username.toLowerCase() ===
                username.toLowerCase()
        );

    if (
        !user ||
        user.passwordHash !==
            simpleHash(password)
    ) {

        return {
            success: false,
            message:
                "Invalid username or password."
        };
    }

    sessionStorage.setItem(
        SESSION_KEY,
        user.username
    );

    return { success: true };
}


/* =========================
   CURRENT USER / SESSION
========================= */

export function getCurrentUser() {

    return sessionStorage.getItem(
        SESSION_KEY
    );
}


export function logoutUser() {

    sessionStorage.removeItem(
        SESSION_KEY
    );
}


/* =========================
   ROLES
========================= */

export function getCurrentUserRole() {

    const username =
        getCurrentUser();

    if (!username) {
        return null;
    }

    const users = loadUsers();

    const user =
        users.find(
            item =>
                item.username ===
                username
        );

    return user
        ? (user.role || "user")
        : "user";
}


export function getAllUsers() {

    return loadUsers().map(
        user => ({
            username:
                user.username,
            role:
                user.role || "user"
        })
    );
}