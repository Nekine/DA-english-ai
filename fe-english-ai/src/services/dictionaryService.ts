import { apiService } from './api';

export interface WordDefinition {
  word: string;
  phonetic?: string;
  translations: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
  examples: string[];
  relatedWords?: string[];
}

export interface SearchHistoryItem {
  word: string;
  timestamp: string;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export const dictionaryService = {
  // Search for a word
  searchWord: async (keyword: string, provider: 'gemini' | 'openai' = 'gemini'): Promise<string | WordDefinition | null> => {
    console.log('DictionaryService: Searching for word:', keyword, 'using provider:', provider);

    try {
      console.log('API URL:', `${apiService.getBaseUrl()}/api/Dictionary/Search?keyword=${encodeURIComponent(keyword)}&provider=${provider}`);
      console.log('Headers:', apiService.getHeaders());

      // Get the raw response first
      const response = await fetch(`${apiService.getBaseUrl()}/api/Dictionary/Search?keyword=${encodeURIComponent(keyword)}&provider=${provider}`, {
        method: 'GET',
        headers: apiService.getHeaders(),
      });

      console.log('Response status:', response.status);
      console.log('Response status text:', response.statusText);
      console.log('Content-Type:', response.headers.get('content-type'));

      if (!response.ok) {
        console.error('Error response:', response);
        throw new Error(`Server responded with status: ${response.status}`);
      }

      // Check the content type to determine how to process the response
      const contentType = response.headers.get('content-type');
      console.log('Content type:', contentType);

      let result;
      if (contentType && contentType.includes('application/json')) {
        // If it's JSON, parse it as JSON
        const jsonData = await response.json();
        console.log('JSON response:', jsonData);
        result = jsonData.data || jsonData;
      } else {
        // If it's not JSON, treat it as text
        const textData = await response.text();
        console.log('Text response (first 100 chars):', textData.substring(0, 100) + '...');
        result = textData;
      }

      console.log('Final processed result type:', typeof result);
      return result;
    } catch (error) {
      console.error('Error searching word:', error);
      throw error;
    }
  },

  // Get search history
  getSearchHistory: async (): Promise<SearchHistoryItem[]> => {
    try {
      const response = await apiService.get<ApiResponse<SearchHistoryItem[]>>('/api/Dictionary/History');
      return (response as ApiResponse<SearchHistoryItem[]>).data || [];
    } catch (error) {
      console.error('Error fetching search history:', error);
      throw error;
    }
  },

  // Add word to favorites
  addToFavorites: async (word: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiService.post<ApiResponse<{ success: boolean }>>(
        '/api/Dictionary/Favorites',
        { word }
      );
      return (response as ApiResponse<{ success: boolean }>).data || { success: true };
    } catch (error) {
      console.error('Error adding word to favorites:', error);
      throw error;
    }
  },

  // Get favorite words
  getFavorites: async (): Promise<string[]> => {
    try {
      const response = await apiService.get<ApiResponse<string[]>>('/api/Dictionary/Favorites');
      return (response as ApiResponse<string[]>).data || [];
    } catch (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }
  },

  // Remove word from favorites
  removeFromFavorites: async (word: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiService.delete<ApiResponse<{ success: boolean }>>(
        `/api/Dictionary/Favorites/${encodeURIComponent(word)}`
      );
      return (response as ApiResponse<{ success: boolean }>).data || { success: true };
    } catch (error) {
      console.error('Error removing word from favorites:', error);
      throw error;
    }
  }
};