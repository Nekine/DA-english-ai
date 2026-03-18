// Base API service for making HTTP requests
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    // Use empty string for relative URLs (Vite proxy will handle routing)
    this.baseUrl = baseUrl;
    console.log('Base URL:', this.baseUrl || 'Using Vite proxy (relative URLs)');
  }

  // POST FormData with upload progress callback (uses XMLHttpRequest)
  postFormDataWithProgress<T = unknown>(endpoint: string, formData: FormData, onProgress?: (percent: number) => void, headers?: Record<string, string>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      try {
        const url = `${this.baseUrl}${endpoint}`;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);

        // Set optional headers (e.g., Authorization)
        if (headers) {
          Object.entries(headers).forEach(([k, v]) => {
            try { xhr.setRequestHeader(k, v); } catch { /* ignore */ }
          });
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            const pct = Math.round((e.loaded / e.total) * 100);
            onProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = xhr.responseText ? JSON.parse(xhr.responseText) : ({} as T);
              resolve(data as T);
            } catch (err) {
              resolve({} as T);
            }
          } else {
            reject(new Error(`Server responded with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during file upload'));
        xhr.send(formData);
      } catch (ex) {
        reject(ex as Error);
      }
    });
  }

  // Get the base URL
  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Get headers
  getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      // Get auth token from localStorage
      const token = localStorage.getItem('engace_token');

      // Default headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Check if the response is successful
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Server responded with status: ${response.status}`
        );
        const errorText = await response.text();
        let errorMessage = errorText || `Server responded with status: ${response.status}`;
        
        // Try to parse as JSON if possible
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData?.message || errorData || errorMessage;
        } catch {
          // If not JSON, use the text as is
        }
        
        const error: any = new Error(errorMessage);
        error.response = { status: response.status, statusText: response.statusText };
        throw error;
      }

      // For 204 No Content responses, return empty object
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  // POST request
  post<T, D = unknown>(endpoint: string, data: D, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  put<T, D = unknown>(endpoint: string, data: D, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // POST request với FormData (để upload ảnh)
  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        method: 'POST',
        // Không đặt Content-Type khi sử dụng FormData vì trình duyệt sẽ tự xử lý
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Server responded with status: ${response.status}`
        );
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error('API form data request failed:', error);
      throw error;
    }
  }
}

// Create a new instance with empty baseUrl (use Vite proxy)
export const apiService = new ApiService("");

export default apiService;
