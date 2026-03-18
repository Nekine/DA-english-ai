import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, RefreshCw, ArrowLeft } from 'lucide-react';
import Header from '@/components/Navbar';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { chatService, ChatMessage } from '@/services/consultationService';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/components/AuthContext';

// Định nghĩa interface Message cho UI
interface Message {
  id: number;
  content: string;
  isUser: boolean;
  timestamp: string;
}

const Consultation: React.FC = () => {
  const { success, error } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lấy thông tin người dùng từ AuthContext
  const userSettings = {
    username: user?.username || user?.fullName || 'User',
    gender: 'Nam', // Có thể thêm trường này vào User interface nếu cần
    age: 20, // Có thể thêm trường này vào User interface nếu cần
    englishLevel: 1, // Có thể thêm trường này vào User interface nếu cần
    enableReasoning: false,
    enableSearching: false
  };

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setHasError(true);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Load initial messages
  useEffect(() => {
    const loadInitialMessages = async () => {
      try {
        setIsLoading(true);

        // Load conversation from localStorage
        const savedChatHistory = chatService.loadConversation();

        if (savedChatHistory.length > 0) {
          // Convert saved chat history to our Message format
          const formattedMessages = savedChatHistory.map((chatMsg, index) => ({
            id: index + 1,
            content: chatMsg.Message,
            isUser: chatMsg.FromUser,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));

          setMessages(formattedMessages);
        } else {
          // Set default welcome message
          const welcomeMessage: Message = {
            id: 1,
            content: 'Chào! Mình là EngBuddy, trợ lý ảo được thiết kế riêng để hỗ trợ bạn học tiếng Anh nè. 😊\n\nMình luôn cố gắng hỗ trợ bạn tốt nhất, nhưng đôi khi vẫn có thể mắc sai sót, nên bạn nhớ kiểm tra lại những thông tin quan trọng nha!',
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          setMessages([welcomeMessage]);

          // Save welcome message to localStorage
          chatService.saveConversation([
            {
              FromUser: false,
              Message: welcomeMessage.content
            }
          ]);
        }
      } catch (err) {
        console.error('Error loading conversation history:', err);
        error('Không thể tải lịch sử trò chuyện', 'Vui lòng thử lại sau');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialMessages();
  }, [error]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    console.log('📤 Sending message:', message);
    console.log('📊 Current messages count:', messages.length);

    // Create new user message
    const newUserMessage: Message = {
      id: Date.now(),
      content: message,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add user message to the UI
    setMessages(prev => [...prev, newUserMessage]);

    // Clear input field
    setMessage('');

    // Prepare for API request
    setIsLoading(true);
    
    // Add a temporary "waiting" message if rate limited
    const waitingMessageId = Date.now() + 0.5;
    setTimeout(() => {
      if (isLoading) {
        setMessages(prev => [...prev, {
          id: waitingMessageId,
          content: '⏳ Đang xử lý yêu cầu... (có thể mất vài giây do giới hạn tốc độ)',
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    }, 3000); // Show after 3 seconds

    try {
      // Convert current message history to format expected by API
      const chatHistory: ChatMessage[] = messages.map(msg => ({
        FromUser: msg.isUser,
        Message: msg.content
      }));

      // Add the new user message to chat history
      chatHistory.push({
        FromUser: true,
        Message: newUserMessage.content
      });

      // Create request object
      const request = {
        ChatHistory: chatHistory,
        Question: newUserMessage.content,
        ImagesAsBase64: null
      };

      // Send request to API
      const response = await chatService.generateAnswer(
        request,
        userSettings.username,
        userSettings.gender,
        userSettings.age,
        userSettings.englishLevel,
        userSettings.enableReasoning,
        userSettings.enableSearching,
        aiProvider
      );

      // Validate response
      if (!response || typeof response !== 'string') {
        console.error('❌ Invalid response from API:', response);
        throw new Error('Phản hồi không hợp lệ từ server');
      }

      // Create bot response message
      const botResponse: Message = {
        id: Date.now() + 1,
        content: response.trim(),
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      // Add bot response to UI - use functional update to ensure we have latest state
      setMessages(prev => {
        // Remove waiting message if exists
        const filtered = prev.filter(m => m.id !== waitingMessageId);
        
        // Safety check
        if (!Array.isArray(filtered)) {
          console.error('❌ Messages state is not an array!');
          return [newUserMessage, botResponse];
        }
        return [...filtered, botResponse];
      });

      // Save updated conversation to localStorage
      const updatedChatHistory = [
        ...chatHistory,
        { FromUser: false, Message: botResponse.content }
      ];
      chatService.saveConversation(updatedChatHistory);

    } catch (err) {
      console.error('Error sending message:', err);
      
      // Create error message for user
      const errorMessage: Message = {
        id: Date.now() + 1,
        content: '❌ Lỗi: Không thể gửi tin nhắn. Vui lòng thử lại sau. Nếu vấn đề tiếp diễn, hãy làm mới cuộc trò chuyện.',
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      // Remove waiting message if exists
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== waitingMessageId);
        if (!Array.isArray(filtered)) return [errorMessage];
        return [...filtered, errorMessage];
      });
      
      error('Không thể gửi tin nhắn', err instanceof Error ? err.message : 'Vui lòng thử lại sau');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearConversation = async () => {
    try {
      setIsLoading(true);

      // Clear conversation in localStorage
      chatService.clearConversation();

      // Add new welcome message
      const welcomeMessage: Message = {
        id: Date.now(),
        content: 'Cuộc trò chuyện đã được làm mới. Bạn có thể bắt đầu cuộc trò chuyện mới!',
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages([welcomeMessage]);

      // Save welcome message to localStorage
      chatService.saveConversation([
        { FromUser: false, Message: welcomeMessage.content }
      ]);

      success('Đã xóa cuộc trò chuyện', 'Cuộc trò chuyện đã được làm mới');
    } catch (err) {
      console.error('Error clearing conversation:', err);
      error('Không thể xóa cuộc trò chuyện', 'Vui lòng thử lại sau');
    } finally {
      setIsLoading(false);
    }
  };

  // Error fallback UI
  if (hasError) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-soft">
        <Header />
        <main className="flex-1 container max-w-screen-xl mx-auto py-4 px-4 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-6xl">😞</div>
            <h2 className="text-2xl font-bold text-foreground">Có lỗi xảy ra</h2>
            <p className="text-muted-foreground">Trang chat gặp sự cố. Vui lòng tải lại trang.</p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw size={16} className="mr-2" />
              Tải lại trang
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft">
      <Header />
      <main className="flex-1 container max-w-screen-xl mx-auto py-4 px-4 flex flex-col">
        <div className="flex-1 bg-card dark:bg-card rounded-lg shadow-sm overflow-hidden flex flex-col border border-border">
          <div className="border-b border-border bg-card dark:bg-card">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="hover:bg-muted"
                >
                  <ArrowLeft size={20} />
                </Button>
                <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                  <MessageSquare size={20} color="white" />
                </div>
                <h2 className="font-semibold text-lg text-foreground">Chat AI</h2>
              </div>
              <div className="flex items-center gap-2">
                {/* AI Provider Selector */}
                <div className="flex items-center gap-2 mr-2 px-3 py-1.5 rounded-md bg-muted/50">
                  <button
                    onClick={() => setAiProvider('gemini')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                      aiProvider === 'gemini'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🤖 Gemini
                  </button>
                  <button
                    onClick={() => setAiProvider('openai')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                      aiProvider === 'openai'
                        ? 'bg-green-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    ✨ ChatGPT
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={handleClearConversation}
                  disabled={isLoading}
                >
                  <RefreshCw size={16} className="mr-2" />
                  Làm mới
                </Button>
              </div>
            </div>
            
            {/* Rate limit warning */}
            {isLoading && (
              <div className="px-4 pb-3">
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⏳ <strong>Lưu ý:</strong> Để tránh lỗi quá tải, hãy đợi ít nhất 2-3 giây giữa các tin nhắn.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background dark:bg-background">
            {Array.isArray(messages) && messages.length > 0 ? (
              messages.map(msg => {
                // Safety check for each message
                if (!msg || !msg.content) {
                  console.warn('Invalid message detected:', msg);
                  return null;
                }
                
                return (
                  <div
                    key={msg.id}
                    className={`max-w-3xl ${msg.isUser ? 'ml-auto' : ''}`}
                  >
                <div
                  className={`rounded-2xl p-4 ${msg.isUser
                    ? 'bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 text-right text-foreground'
                    : 'bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 text-foreground'
                    }`}
                >
                  {msg.isUser ? (
                    <p className="whitespace-pre-line">{msg.content || ''}</p>
                  ) : (
                    <div className="prose prose-sm prose-pink max-w-none dark:prose-invert text-left">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-lg font-bold text-foreground mb-2">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-base font-bold text-foreground mt-3 mb-2">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-sm font-semibold text-foreground mt-2 mb-1">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-foreground leading-relaxed mb-2">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside space-y-1 mb-2 text-foreground">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside space-y-1 mb-2 text-foreground">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-relaxed">
                              {children}
                            </li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-primary">
                              {children}
                            </strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic text-foreground">
                              {children}
                            </em>
                          ),
                          code: ({ children }) => (
                            <code className="bg-accent px-1.5 py-0.5 rounded text-sm font-mono">
                              {children}
                            </code>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-primary pl-3 py-1 my-2 bg-accent/50 rounded-r">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {msg.timestamp}
                </div>
              </div>
                );
              })
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Chưa có tin nhắn nào
              </div>
            )}
            {isLoading && (
              <div className="max-w-3xl">
                <div className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"></div>
                    <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-border p-4 bg-card dark:bg-card">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Nhập tin nhắn của bạn..."
                  className="pr-10 py-6 rounded-xl bg-background dark:bg-background"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
              </div>
              <Button
                className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl px-4"
                onClick={handleSendMessage}
                disabled={isLoading || !message.trim()}
              >
                <Send size={20} />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Consultation;