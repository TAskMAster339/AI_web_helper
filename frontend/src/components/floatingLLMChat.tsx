import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import llmService, { type ChatMessage } from '../services/llmService';
import { useAuthStore } from '../store/authStore';
import { createActionHandlers, executeAction } from '../utils/actionHandlers';
import GlassConfirmModal from './GlassConfirmModal';
import './llmChat.css';

const FloatingLLMChat: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, refreshUserProfile } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('alibayram/smollm3');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [requestsRemaining, setRequestsRemaining] = useState<number | 'unlimited'>('unlimited');
  const [width, setWidth] = useState(420);
  const [height, setHeight] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modelsLoadedRef = useRef(false);

  // Load available models once when the user first becomes authenticated.
  // We intentionally keep `isAuthenticated` as the only dependency so that
  // a new `user` object reference (caused by profile refreshes / me/ calls)
  // does NOT trigger another models/ request.
  useEffect(() => {
    if (!isAuthenticated) {
      // Reset so models are re-fetched after a fresh login
      modelsLoadedRef.current = false;
      return;
    }
    if (modelsLoadedRef.current) return;

    modelsLoadedRef.current = true;
    const loadData = async () => {
      try {
        const models = await llmService.getAvailableModels();
        setAvailableModels(models);
        if (models.length > 0) {
          setSelectedModel(models[0]);
        }
      } catch (err) {
        console.error('Failed to load LLM data:', err);
      }
    };

    loadData();

    return undefined;
  }, [isAuthenticated]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Обработка resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = rect.width + (rect.left - e.clientX);
      const newHeight = rect.height + (rect.top - e.clientY);

      const MIN_WIDTH = 300;
      const MIN_HEIGHT = 300;
      const MAX_WIDTH = window.innerWidth - 40;
      const MAX_HEIGHT = window.innerHeight - 150;

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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) return;

    // Check if user can make request
    if (requestsRemaining !== 'unlimited' && requestsRemaining <= 0) {
      setError(
        'Вы достигли лимита запросов на сегодня. Обновите подписку для неограниченного доступа.'
      );
      return;
    }

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

      setMessages((prev) => [...prev, userMessage]); // Получаем код действия у LLM
      const response = await llmService.getActionCode(userQuestion, selectedModel);

      // Update requests remaining from response
      if (response.requests_remaining !== undefined) {
        setRequestsRemaining(response.requests_remaining);
      }

      // Обновляем профиль пользователя для синхронизации данных
      refreshUserProfile();

      const { action_code, action_description } = response;
      const answer = `✅ ${action_description}`;
      setMessages((prev) =>
        prev.map((msg) => (msg.id === userMessage.id ? { ...msg, answer } : msg))
      );

      // Создаём обработчики действий (на основе navigate и внутренних утилит)
      const actionHandlers = createActionHandlers(navigate);

      // Выполнить действие с обработкой ошибок
      setTimeout(() => {
        executeAction(action_code, actionHandlers, (err) => {
          console.error('Action execution failed:', err);
          setError(`Ошибка выполнения действия: ${err.message}`);
        });
      }, 800);
    } catch (err) {
      console.error('Error getting response:', err);
      if (err instanceof Error && err.message.includes('403')) {
        setError('У вас нет доступа к выбранной модели.');
      } else {
        setError('Ошибка при получении ответа. Попробуйте ещё раз.');
      }
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setShowClearConfirm(true);
  };

  const confirmClearChat = () => {
    setMessages([]);
    setError(null);
    setShowClearConfirm(false);
  };

  return (
    <div className="floating-chat-wrapper">
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

      {isOpen && (
        <div
          ref={containerRef}
          className="floating-chat-container"
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
        >
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
                ✗
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="error-close">
                ✗
              </button>
            </div>
          )}

          <div className="floating-chat-messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>👋 Начните разговор с ассистентом ИИ</p>
                <p className="empty-subtitle">Сообщения хранятся локально</p>
                <p className="empty-hint">
                  💡 Например: &quot;смени на темный&quot; или &quot;перейди в профиль&quot;
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="message-group">
                  <div className="message user-message">
                    <p className="message-text">{msg.question}</p>
                  </div>
                  {msg.answer && (
                    <div className="message ai-message">
                      <p className="message-text">{msg.answer}</p>
                    </div>
                  )}
                  {!msg.answer && (
                    <div className="message ai-message loading">
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

          <form onSubmit={handleSubmit} className="floating-chat-form">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Спросите меня о чём-нибудь..."
              disabled={loading}
              className="question-input"
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

      <GlassConfirmModal
        open={showClearConfirm}
        title="Очистить чат?"
        message="Все сообщения будут удалены. Это действие нельзя отменить."
        confirmLabel="Очистить"
        cancelLabel="Отмена"
        variant="warning"
        icon="🧹"
        onConfirm={confirmClearChat}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

export default FloatingLLMChat;
