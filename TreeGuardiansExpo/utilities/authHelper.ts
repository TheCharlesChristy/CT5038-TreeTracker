import { getItem, removeItem, saveItem } from "./authStorage";
import { API_BASE, ENDPOINTS } from "@/config/api";
import { buildApiUrl } from '@/config/api';

export type UserRole = "registered_user" | "guardian" | "admin";
export type AppUserRole = "user" | "guardian" | "admin";

export interface AuthUser {
  id: number;
  username: string;
  email?: string | null;
  role: UserRole;
  verified: boolean;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: AuthUser | null;
}

type AccountUserResponse = {
  message?: string;
  user: AuthUser;
};

type MessageResponse = {
  message?: string;
};

function formatApiError(prefix: string, response: Response, rawBody: string, explicitError?: string): string {
  const errorMessage = explicitError || 'No explicit error field returned.';
  const responseBody = rawBody.trim().length > 0 ? rawBody : '<empty body>';

  return `${prefix}\nStatus: ${response.status} ${response.statusText}\nError: ${errorMessage}\nResponse Body: ${responseBody}`;
}

async function getAuthHeaders(includeJson = false): Promise<Record<string, string>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Authentication required.');
  }

  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function validateSession(): Promise<AuthState> {
  try {
    const token = await getItem("accessToken");

    if (!token) {
      return {
        isLoggedIn: false,
        user: null,
      };
    }

    const response = await fetch(API_BASE + ENDPOINTS.USERS_ME, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      await logoutUser();

      return {
        isLoggedIn: false,
        user: null,
      };
    }

    const user = (await response.json()) as AuthUser;
    await saveItem("user", JSON.stringify(user));

    return {
      isLoggedIn: true,
      user,
    };
  } catch (error) {
    console.error("Session validation error:", error);

    await logoutUser();

    return {
      isLoggedIn: false,
      user: null,
    };
  }
}

// Load authentication state
export async function getAuthState(): Promise<AuthState> {
  try {
    const token = await getItem("accessToken");
    const storedUser = await getItem("user");
    const parsedUser = storedUser ? (JSON.parse(storedUser) as AuthUser) : null;

    return {
      isLoggedIn: Boolean(token && parsedUser),
      user: token ? parsedUser : null,
    };
  } catch (error) {
    console.error("Auth state error:", error);

    return {
      isLoggedIn: false,
      user: null,
    };
  }
}

// Return current logged-in user
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const token = await getItem("accessToken");
    const storedUser = await getItem("user");
    const cachedUser = storedUser ? (JSON.parse(storedUser) as AuthUser) : null;

    if (!token) {
      return null;
    }

    try {
      const response = await fetch(API_BASE + ENDPOINTS.USERS_ME, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const user = (await response.json()) as AuthUser;
        await saveItem("user", JSON.stringify(user));
        return user;
      }

      if (response.status === 401 || response.status === 403) {
        await logoutUser();
        return null;
      }
    } catch (error) {
      console.warn("User refresh error:", error);
    }

    return cachedUser;
  } catch (error) {
    console.error("User fetch error:", error);
    return null;
  }
}

export function normalizeUserRole(role: UserRole | null | undefined): AppUserRole {
  if (role === "guardian" || role === "admin") {
    return role;
  }
  return "user";
}

// Return stored access token
export async function getAccessToken(): Promise<string | null> {
  try {
    return await getItem("accessToken");
  } catch (error) {
    console.error("Token fetch error:", error);
    return null;
  }
}

// Logout user
export async function logoutUser(): Promise<boolean> {
  try {
    const refreshToken = await getItem("refreshToken");

    if (refreshToken) {
      try {
        const response = await fetch(API_BASE + ENDPOINTS.LOGOUT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          console.warn("Remote logout request failed:", response.status, response.statusText);
        }
      } catch (error) {
        console.warn("Remote logout request failed:", error);
      }
    }

    await Promise.all([
      removeItem("accessToken"),
      removeItem("refreshToken"),
      removeItem("user"),
    ]);

    return true;
  } catch (error) {
    console.error("Logout error:", error);
    return false;
  }
}

async function getAuthorizedHeaders(): Promise<HeadersInit> {
  const token = await getItem("accessToken");

  if (!token) {
    throw new Error("You must be logged in to perform this action.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseErrorResponse(response: Response, fallbackMessage: string): Promise<never> {
  try {
    const data = await response.json();
    throw new Error(data?.error || data?.message || fallbackMessage);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(fallbackMessage);
  }
}

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = await getAuthorizedHeaders();

  const response = await fetch(API_BASE + path, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    await logoutUser();
    throw new Error("Your session has expired. Please sign in again.");
  }

  return response;
}

export async function updateUsername(payload: {
  username: string;
}): Promise<AuthUser> {
  const username = payload.username.trim();

  if (!username) {
    throw new Error("Username is required.");
  }

  const response = await fetchWithAuth(ENDPOINTS.ACCOUNT_USERNAME, {
    method: "PUT",
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    await parseErrorResponse(response, "Failed to update username.");
  }

  const data = (await response.json()) as AccountUserResponse;

  if (!data?.user) {
    const refreshedUser = await getCurrentUser();

    if (!refreshedUser) {
      throw new Error("Username updated, but failed to refresh user data.");
    }

    return refreshedUser;
  }

  await saveItem("user", JSON.stringify(data.user));
  return data.user;
}

export async function updateEmail(payload: {
  email: string;
}): Promise<AuthUser> {
  const email = payload.email.trim();

  if (!email) {
    throw new Error("Email is required.");
  }

  const response = await fetchWithAuth(ENDPOINTS.ACCOUNT_EMAIL, {
    method: "PUT",
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    await parseErrorResponse(response, "Failed to update email.");
  }

  const data = (await response.json()) as AccountUserResponse;

  if (!data?.user) {
    const refreshedUser = await getCurrentUser();

    if (!refreshedUser) {
      throw new Error("Email updated, but failed to refresh user data.");
    }

    return refreshedUser;
  }

  await saveItem("user", JSON.stringify(data.user));
  return data.user;
}

export async function updatePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<boolean> {
  const currentPassword = payload.currentPassword;
  const newPassword = payload.newPassword;

  if (!currentPassword) {
    throw new Error("Current password is required.");
  }

  if (!newPassword) {
    throw new Error("New password is required.");
  }

  const response = await fetchWithAuth(ENDPOINTS.ACCOUNT_PASSWORD, {
    method: "PUT",
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  if (!response.ok) {
    await parseErrorResponse(response, "Failed to update password.");
  }

  await response.json().catch(() => null as MessageResponse | null);
  return true;
}

export async function deleteAccount(payload: {
  currentPassword: string;
}): Promise<void> {
  const currentPassword = payload.currentPassword.trim();

  if (!currentPassword) {
    throw new Error("Current password is required.");
  }

  const response = await fetchWithAuth(ENDPOINTS.ACCOUNT_DELETE, {
    method: "DELETE",
    body: JSON.stringify({ currentPassword }),
  });

  if (!response.ok) {
    await parseErrorResponse(response, "Failed to delete account.");
  }

  // Server returns JSON; we don't depend on the shape.
  await response.json().catch(() => null as MessageResponse | null);
}

export async function resendVerificationEmail(): Promise<void> {
  const response = await fetch(buildApiUrl('auth/resend-verification'), {
    method: 'POST',
    headers: await getAuthHeaders(true),
  });

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(formatApiError('Failed to resend verification email.', response, rawBody));
  }
}