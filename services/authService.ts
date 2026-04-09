import type { User } from '../types';

const USERS_STORAGE_KEY = 'sora-prompter-users'; // Array of all users
const CURRENT_USER_EMAIL_KEY = 'sora-prompter-current-user-email'; // Email of logged-in user

// NOTE: This is a simple localStorage-based auth simulation for this frontend-only app.
// It does not use real authentication or passwords. DO NOT use this in production.

// Helper to get all users
function getAllUsers(): User[] {
    try {
        const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
        if (!usersJson) return [];
        return JSON.parse(usersJson) as User[];
    } catch (e) {
        console.error("Failed to parse users from localStorage", e);
        return [];
    }
}

// Helper to save all users
function saveAllUsers(users: User[]): void {
    try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
        console.error("Failed to save users to localStorage", e);
    }
}

/**
 * Simulates a social sign-in flow.
 * If the user exists, it logs them in.
 * If the user doesn't exist, it creates a new account and logs them in.
 */
export function signInOrSignUp(name: string, email: string): User {
    if (!name || !email) {
        throw new Error("Name and email are required.");
    }

    const users = getAllUsers();
    const normalizedEmail = email.toLowerCase().trim();
    let user = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (user) {
        // User exists, just ensure they are set as current.
    } else {
        // User does not exist, sign them up.
        const newUser: User = {
            name: name.trim(),
            email: email.trim(),
            avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(normalizedEmail)}`,
            usageCount: 0,
            isPremium: false,
        };
        users.push(newUser);
        saveAllUsers(users);
        user = newUser;
    }

    localStorage.setItem(CURRENT_USER_EMAIL_KEY, user.email);
    return user;
}


export function logout(): void {
    try {
        localStorage.removeItem(CURRENT_USER_EMAIL_KEY);
    } catch (e) {
        console.error("Failed to remove current user from localStorage", e);
    }
}

export function getCurrentUser(): User | null {
    try {
        const currentUserEmail = localStorage.getItem(CURRENT_USER_EMAIL_KEY);
        if (!currentUserEmail) return null;

        const users = getAllUsers();
        const normalizedEmail = currentUserEmail.toLowerCase();
        
        return users.find(u => u.email.toLowerCase() === normalizedEmail) || null;
    } catch (e) {
        console.error("Failed to get current user from localStorage", e);
        // If parsing fails, clear the invalid data
        localStorage.removeItem(CURRENT_USER_EMAIL_KEY);
        return null;
    }
}

export function incrementUsage(userEmail: string): User | null {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.email === userEmail);
    if (userIndex > -1) {
        users[userIndex].usageCount += 1;
        saveAllUsers(users);
        return users[userIndex];
    }
    return null;
}

export function upgradeToPremium(userEmail: string): User | null {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.email === userEmail);
    if (userIndex > -1) {
        users[userIndex].isPremium = true;
        saveAllUsers(users);
        return users[userIndex];
    }
    return null;
}