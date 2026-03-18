import { apiService as api } from './api';

// Types
export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  fullName: string;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
  rememberMe?: boolean;
}

export interface OAuthLoginRequest {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  fullName?: string;
  avatar?: string;
}

export interface UserDto {
  userId: number;
  email: string;
  username?: string;
  fullName?: string;
  avatar?: string;
  role: string;
  status: string;
  emailVerified: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: UserDto;
}

// Auth Service
class AuthService {
  private readonly TOKEN_KEY = 'engace_token';
  private readonly USER_KEY = 'engace_user';

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse, RegisterRequest>('/api/auth/register', data);
    
    if (response.success && response.token) {
      this.saveAuth(response.token, response.user);
    }
    
    return response;
  }

  /**
   * Login with email/username and password
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse, LoginRequest>('/api/auth/login', data);
    
    if (response.success && response.token) {
      this.saveAuth(response.token, response.user);
    }
    
    return response;
  }

  /**
   * Login with OAuth (Google/Facebook)
   */
  async oauthLogin(data: OAuthLoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse, OAuthLoginRequest>('/api/auth/oauth-login', data);
    
    if (response.success && response.token) {
      this.saveAuth(response.token, response.user);
    }
    
    return response;
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get current user
   */
  getUser(): UserDto | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Save auth data to localStorage
   */
  private saveAuth(token: string, user?: UserDto): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    if (user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  /**
   * Get Authorization header for API requests
   */
  getAuthHeader(): { Authorization: string } | {} {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Refresh current user data from server
   */
  async refreshUser(): Promise<UserDto | null> {
    try {
      const token = this.getToken();
      if (!token) {
        return null;
      }

      const response = await api.get<{ success: boolean; user: UserDto }>('/api/auth/me');
      
      if (response.success && response.user) {
        // Update local storage with fresh user data
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
        return response.user;
      }
      
      return null;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
