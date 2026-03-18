import { useState, useEffect } from 'react';
import { authService, UserDto, RegisterRequest, LoginRequest, OAuthLoginRequest } from '../services/authService';
import { useToast } from './use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  // Check authentication on mount
  useEffect(() => {
    const currentUser = authService.getUser();
    if (currentUser) {
      setUser(currentUser);
      setIsAuthenticated(true);
    }
  }, []);

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.register(data);
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        
        toast({
          title: "Registration Successful!",
          description: "Welcome to EngAce!",
          variant: "default",
        });
        
        return { success: true, user: response.user };
      } else {
        toast({
          title: "Registration Failed",
          description: response.message || "Please try again",
          variant: "destructive",
        });
        
        return { success: false, message: response.message };
      }
    } catch (error: any) {
      const errorMessage = error.message || "An error occurred during registration";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        
        toast({
          title: "Login Successful!",
          description: `Welcome back, ${response.user.fullName || response.user.email}!`,
          variant: "default",
        });
        
        return { success: true, user: response.user };
      } else {
        toast({
          title: "Login Failed",
          description: response.message || "Invalid credentials",
          variant: "destructive",
        });
        
        return { success: false, message: response.message };
      }
    } catch (error: any) {
      const errorMessage = error.message || "An error occurred during login";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const oauthLogin = async (data: OAuthLoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.oauthLogin(data);
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        
        toast({
          title: "Login Successful!",
          description: `Welcome, ${response.user.fullName || response.user.email}!`,
          variant: "default",
        });
        
        return { success: true, user: response.user };
      } else {
        toast({
          title: "OAuth Login Failed",
          description: response.message || "Please try again",
          variant: "destructive",
        });
        
        return { success: false, message: response.message };
      }
    } catch (error: any) {
      const errorMessage = error.message || "An error occurred during OAuth login";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
      variant: "default",
    });
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    register,
    login,
    oauthLogin,
    logout,
  };
};
