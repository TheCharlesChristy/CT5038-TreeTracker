import { getItem, removeItem } from "./authStorage";
import { API_BASE, ENDPOINTS } from "@/config/api";

export type UserRole = "registered_user" | "guardian" | "admin";

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: AuthUser | null;
}

export async function validateSession(): Promise<AuthState> {
  try {
    const token = await getItem("accessToken");
    const storedUser = await getItem("user");

    if (!token || !storedUser) {
      return {
        isLoggedIn: false,
        user: null,
      };
    }

    const response = await fetch(API_BASE + ENDPOINTS.VALIDATE_SESSION, {
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

    return {
      isLoggedIn: true,
      user: JSON.parse(storedUser),
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
// Used when the app starts or page refreshes
export async function getAuthState(): Promise<AuthState> {
  try {
    const token = await getItem("accessToken");
    const storedUser = await getItem("user");

    return {
      isLoggedIn: !!token,
      user: storedUser ? JSON.parse(storedUser) : null,
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
    const storedUser = await getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("User fetch error:", error);
    return null;
  }
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
