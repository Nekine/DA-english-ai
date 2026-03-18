import { apiService } from './api';

export interface ChatMessage {
  FromUser: boolean;
  Message: string;
}

export interface ChatRequest {
  ChatHistory: ChatMessage[];
  Question: string;
  ImagesAsBase64: string[] | null;
}

export interface ChatResponse {
  data: string;
  message: string;
  status: number;
  success: boolean;
}

// Rate limit tracking
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 3000; // 3 seconds

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const chatService = {
  // Send a message to the chatbot and get a response
  generateAnswer: async (
    request: ChatRequest,
    username: string,
    gender: string,
    age: number,
    englishLevel: number,
    enableReasoning: boolean = false,
    enableSearching: boolean = false,
    provider: 'gemini' | 'openai' = 'gemini'
  ): Promise<string> => {
    // Rate limiting: ensure minimum time between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before next request`);
      await sleep(waitTime);
    }
    lastRequestTime = Date.now();

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt}/${MAX_RETRIES} after ${RETRY_DELAY}ms`);
          await sleep(RETRY_DELAY * attempt); // Exponential backoff
        }

        // Construct the query parameters
        const params = new URLSearchParams({
          username,
          gender,
          age: age.toString(),
          englishLevel: englishLevel.toString(),
          enableReasoning: enableReasoning.toString(),
          enableSearching: enableSearching.toString(),
          provider: provider
        });

        // Get the raw response
        const response = await fetch(`${apiService.getBaseUrl()}/api/Chatbot/GenerateAnswer?${params.toString()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...apiService.getHeaders()
          },
          body: JSON.stringify(request)
        });

        // Handle rate limit error (429)
        if (response.status === 429) {
          const errorText = await response.text();
          console.error(`❌ Rate limit error (429) on attempt ${attempt + 1}:`, errorText);
          
          if (attempt === MAX_RETRIES) {
            throw new Error('🕐 API đang quá tải. Vui lòng đợi 1-2 phút và thử lại. Nếu vấn đề vẫn tiếp diễn, hãy làm mới cuộc trò chuyện.');
          }
          
          // Continue to retry
          lastError = new Error('RATE_LIMIT_429');
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error ${response.status}: ${errorText}`);
        }

        // Handle the response
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          // If it's JSON, parse it
          const jsonData = await response.json();
          return jsonData.data || jsonData;
        } else {
          // If it's text, return it directly
          const text = await response.text();
          
          // Check if response contains rate limit error
          if (text.includes('429') || text.includes('RESOURCE_EXHAUSTED') || text.includes('rate limit')) {
            console.error('❌ Rate limit detected in response text');
            
            if (attempt === MAX_RETRIES) {
              throw new Error('🕐 API đang quá tải. Vui lòng đợi 1-2 phút và thử lại.');
            }
            
            lastError = new Error('RATE_LIMIT_IN_TEXT');
            continue;
          }
          
          return text;
        }
      } catch (error) {
        console.error(`Error on attempt ${attempt + 1}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If it's the last attempt, throw the error
        if (attempt === MAX_RETRIES) {
          break;
        }
      }
    }

    // If we got here, all retries failed
    throw lastError || new Error('Không thể kết nối đến server sau nhiều lần thử');
  },

  // Save conversation to localStorage for persistence
  saveConversation: (messages: ChatMessage[]): void => {
    try {
      localStorage.setItem('chat_history', JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving conversation to localStorage:', error);
    }
  },

  // Load conversation from localStorage
  loadConversation: (): ChatMessage[] => {
    try {
      const savedMessages = localStorage.getItem('chat_history');
      return savedMessages ? JSON.parse(savedMessages) : [];
    } catch (error) {
      console.error('Error loading conversation from localStorage:', error);
      return [];
    }
  },

  // Clear conversation from localStorage
  clearConversation: (): void => {
    try {
      localStorage.removeItem('chat_history');
    } catch (error) {
      console.error('Error clearing conversation from localStorage:', error);
    }
  }
};