import React, { useState, useEffect, useRef } from 'react';
import llmService, { type ChatMessage } from '../services/llmService';
import './llmChat.css';

const FloatingLLMChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('alibayram/smollm3');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [width, setWidth] = useState(420);
  const [height, setHeight] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Загрузить доступные модели при монтировании компонента
  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await llmService.getAvailableModels();
        setAvailableModels(models);
        if (models.length > 0) {
          setSelectedModel(models[0]);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };

    loadModels();

    // Отслеживать изменение темы
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    checkDarkMode();

    // Слушать изменения класса dark
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Обработка resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();

      // Для левого верхнего угла: уменьшаем ширину слева и высоту сверху
      const newWidth = rect.width + (rect.left - e.clientX);
      const newHeight = rect.height + (rect.top - e.clientY);

      // Ограничения размера
      const MIN_WIDTH = 300;
      const MIN_HEIGHT = 300;
      const MAX_WIDTH = window.innerWidth - 40;
      const MAX_HEIGHT = window.innerHeight - 150; // 150px место для кнопки и UI

      // Проверяем минимальные и максимальные размеры
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }

      if (newHeight >= MIN_HEIGHT && newHeight <= MAX_HEIGHT) {
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const cleanResponse = (text: string): string => {
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) return;

    const userQuestion = question.trim();
    setQuestion('');
    setError(null);
    setLoading(true);

    try {
      const userMessage: ChatMessage = {
        id: generateId(),
        question: userQuestion,
        answer: '',
        model_name: selectedModel,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);

      let answer = await llmService.askQuestion({
        question: userQuestion,
        model: selectedModel,
      });

      // Очистить ответ от тегов <think>
      answer = cleanResponse(answer);

      setMessages((prev) =>
        prev.map((msg) => (msg.id === userMessage.id ? { ...msg, answer } : msg))
      );
    } catch (error) {
      console.error('Error getting response:', error);
      setError('Ошибка при получении ответа. Попробуйте ещё раз.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Вы уверены, что хотите очистить всё сообщения?')) {
      setMessages([]);
      setError(null);
    }
  };

  return (
    <div className="floating-chat-wrapper">
      {/* Плавающая кнопка */}
      {!isOpen && (
        <button
          className="floating-chat-button"
          onClick={() => setIsOpen(true)}
          title="Открыть ассистента"
        >
          <span className="chat-icon">💬</span>
          {messages.length > 0 && <span className="chat-badge">{messages.length}</span>}
        </button>
      )}

      {/* Окно чата с поддержкой resize */}
      {isOpen && (
        <div
          ref={containerRef}
          className={`floating-chat-container ${isDarkMode ? 'dark' : ''}`}
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
        >
          {/* Resize handle в правом верхнем углу */}
          <div
            ref={resizeRef}
            className="resize-handle"
            onMouseDown={() => setIsResizing(true)}
            title="Перетягивайте для изменения размера"
          />

          <div className="floating-chat-header">
            <h3>Ассистент ИИ</h3>
            <div className="header-controls">
              {availableModels.length > 0 && (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="model-selector"
                  disabled={loading}
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              )}
              <button className="close-button" onClick={() => setIsOpen(false)} title="Закрыть чат">
                ✕
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="error-close">
                ✕
              </button>
            </div>
          )}

          <div className={`floating-chat-messages ${isDarkMode ? 'dark' : ''}`}>
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>👋 Начните разговор с ассистентом ИИ</p>
                <p className="empty-subtitle">Сообщения хранятся локально</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="message-group">
                  <div className="message user-message">
                    <p className="message-text">{msg.question}</p>
                  </div>
                  {msg.answer && (
                    <div className={`message ai-message ${isDarkMode ? 'dark' : ''}`}>
                      <p className="message-text">{msg.answer}</p>
                    </div>
                  )}
                  {!msg.answer && (
                    <div className={`message ai-message loading ${isDarkMode ? 'dark' : ''}`}>
                      <span className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className={`floating-chat-form ${isDarkMode ? 'dark' : ''}`}
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Спросите меня о чём-нибудь..."
              disabled={loading}
              className={`question-input ${isDarkMode ? 'dark' : ''}`}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="send-button"
              title="Отправить сообщение"
            >
              {loading ? '⏳' : '📤'}
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="clear-button"
                title="Очистить чат"
              >
                🗑️
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default FloatingLLMChat;
