const TOKEN_KEY = "task-manager-token";
const USER_KEY = "task-manager-user";

export function saveAuth(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function getCurrentUser() {
    const storedUser = localStorage.getItem(USER_KEY);

    if (!storedUser) {
        return null;
    }

    try {
        return JSON.parse(storedUser);
    } catch {
        return null;
    }
}

export function getCurrentUserRole() {
    const user = getCurrentUser();
    return user?.role || null;
}

export function logoutUser() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function isLoggedIn() {
    return Boolean(localStorage.getItem(TOKEN_KEY));
}