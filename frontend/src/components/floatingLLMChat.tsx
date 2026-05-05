import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import llmService, { type ChatMessage, type LLMProvider } from '../services/llmService';
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
  const [provider, setProvider] = useState<LLMProvider>('local');
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);
  const [externalModels, setExternalModels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [requestsRemaining, setRequestsRemaining] = useState<number | 'unlimited'>('unlimited');
  const [width, setWidth] = useState(() => Math.min(420, Math.floor(window.innerWidth * 0.55)));
  const [height, setHeight] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modelsLoadedRef = useRef(false);
  const externalModelsLoadedRef = useRef(false);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  }, []);

  // Load local models on auth
  useEffect(() => {
    if (!isAuthenticated) {
      modelsLoadedRef.current = false;
      return;
    }
    if (modelsLoadedRef.current) return;
    modelsLoadedRef.current = true;

    const loadData = async () => {
      try {
        const models = await llmService.getAvailableModels('local');
        setAvailableModels(models);
        if (models.length > 0) setSelectedModel(models[0]);
      } catch (err) {
        console.error('Failed to load LLM data:', err);
      }
    };
    loadData();
  }, [isAuthenticated]);

  // Load external models once
  useEffect(() => {
    if (!isAuthenticated || externalModelsLoadedRef.current) return;
    externalModelsLoadedRef.current = true;
    llmService
      .getAvailableModels('external')
      .then(setExternalModels)
      .catch(() => {
        setExternalModels([
          'ai-sage/GigaChat3-10B-A1.8B',
          'zai-org/GLM-4.7-Flash',
          'zai-org/GLM-4.7',
          'Qwen/Qwen3-Coder-Next',
          't-tech/T-pro-it-2.1',
        ]);
      });
  }, [isAuthenticated]);

  // When provider switches, update selected model to first in new list
  useEffect(() => {
    const list = provider === 'external' ? externalModels : availableModels;
    if (list.length > 0) setSelectedModel(list[0]);
  }, [provider, externalModels, availableModels]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Открытие по Enter (когда чат закрыт и фокус не в поле ввода)
  useEffect(() => {
    if (isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = (e.target as HTMLElement).isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) return;
      e.preventDefault();
      setIsOpen(true);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showPrivacyWarning && !showClearConfirm) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showPrivacyWarning, showClearConfirm]);

  // Закрытие по клику вне окна чата
  useEffect(() => {
    if (!isOpen || isResizing || showPrivacyWarning || showClearConfirm) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    // Небольшая задержка, чтобы клик по кнопке открытия не закрывал сразу
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isResizing, showPrivacyWarning, showClearConfirm]);

  // Обработка resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = rect.width + (rect.left - e.clientX);
      const newHeight = rect.height + (rect.top - e.clientY);

      const MIN_WIDTH = 300;
      const MIN_HEIGHT = 300;
      const MAX_WIDTH = Math.floor(window.innerWidth * 0.55);
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

  const handleProviderChange = (next: LLMProvider) => {
    if (next === 'external') {
      setShowPrivacyWarning(true);
    } else {
      setProvider('local');
    }
  };

  const confirmExternalProvider = () => {
    setProvider('external');
    setShowPrivacyWarning(false);
  };

  const cancelExternalProvider = () => {
    setShowPrivacyWarning(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

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
    let focusHandledByAction = false;

    try {
      const userMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        question: userQuestion,
        answer: '',
        model_name: selectedModel,
        timestamp: Date.now(),
        provider,
      };

      setMessages((prev) => [...prev, userMessage]);

      const response = await llmService.getActionCode(userQuestion, selectedModel, provider);

      if (response.requests_remaining !== undefined) {
        setRequestsRemaining(response.requests_remaining);
      }
      refreshUserProfile();

      const {
        action_code,
        action_description,
        is_fallback,
        fallback_answer,
        filters,
        weather_city,
      } = response;

      // Fallback: модель не распознала навигационный запрос →
      // показываем генеративный ответ в чате, без навигации
      if (is_fallback && fallback_answer) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === userMessage.id ? { ...msg, answer: fallback_answer } : msg))
        );
        return;
      }

      // Успешно распознанное действие
      const isTheme = action_code === '100' || action_code === '101';
      const isCatalogue = action_code === '004';
      const isWeather = action_code === '007';
      const isCloseChat = action_code === '200';
      const isClearChat = action_code === '201';

      let answer: string;
      if (isTheme) {
        answer = `✅ Применяю: ${action_description}`;
      } else if (isCloseChat) {
        answer = `✅ Чат свёрнут`;
      } else if (isClearChat) {
        answer = `🧹 История чата очищена`;
      } else if (isWeather && weather_city) {
        answer = `✅ Перехожу: ${action_description}\n🌤️ Город: ${weather_city}`;
      } else if (isCatalogue && filters && Object.keys(filters).length > 0) {
        const filterLabels: Record<string, string> = {
          search: '🔍',
          min_price: 'от',
          max_price: 'до',
          in_stock: 'наличие',
          category_name: '📂',
          status: 'статус',
        };
        const statusLabels: Record<string, string> = {
          published: 'опубликован',
          draft: 'черновик',
          archived: 'архив',
        };
        const parts = Object.entries(filters).map(([key, value]) => {
          const label = filterLabels[key] ?? key;
          if (key === 'in_stock') return `${label}: ${value ? 'в наличии' : 'нет'}`;
          if (key === 'status') return `${label}: ${statusLabels[String(value)] ?? value}`;
          return `${label}: ${value}`;
        });
        answer = `✅ Перехожу: ${action_description}\n📋 Фильтры: ${parts.join(' · ')}`;
      } else {
        answer = `✅ Перехожу: ${action_description}`;
      }

      setMessages((prev) =>
        prev.map((msg) => (msg.id === userMessage.id ? { ...msg, answer } : msg))
      );

      const actionHandlers = createActionHandlers(navigate, filters, weather_city, {
        closeChat: () => setTimeout(() => setIsOpen(false), 600),
        clearChat: () => setTimeout(() => setMessages([]), 800),
      });
      focusHandledByAction = true;
      setTimeout(() => {
        executeAction(action_code, actionHandlers, (err) => {
          console.error('Action execution failed:', err);
          setError(`Ошибка выполнения действия: ${err.message}`);
        });
        // Фокус после выполнения действия (не для закрытия чата)
        if (action_code !== '200') {
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }, 800);
    } catch (err) {
      console.error('Error getting response:', err);
      if (err instanceof Error && err.message.includes('403')) {
        setError('У вас нет доступа к выбранной модели.');
      } else if (err instanceof Error && err.message.includes('503')) {
        setError('Внешний LLM временно недоступен. Попробуйте локальный.');
      } else {
        setError('Ошибка при получении ответа. Попробуйте ещё раз.');
      }
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      // Возвращаем фокус для fallback-ответов и ошибок
      if (!focusHandledByAction) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  const currentModels = provider === 'external' ? externalModels : availableModels;

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
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          <div
            ref={resizeRef}
            className="resize-handle"
            onMouseDown={() => setIsResizing(true)}
            title="Перетягивайте для изменения размера"
          />

          <div className="floating-chat-header">
            {/* Первая строка: заголовок + кнопка закрыть */}
            <div className="header-top">
              <h3>Ассистент ИИ</h3>
              <button className="close-button" onClick={() => setIsOpen(false)} title="Закрыть чат">
                ✗
              </button>
            </div>

            {/* Вторая строка: провайдер + badge + модель */}
            <div className="header-controls">
              {/* Provider toggle */}
              <div className="provider-toggle" title="Выбор провайдера LLM">
                <button
                  className={`provider-btn ${provider === 'local' ? 'active' : ''}`}
                  onClick={() => handleProviderChange('local')}
                  disabled={loading}
                  title="Локальный LLM — анонимно"
                >
                  🔒 Локальный
                </button>
                <button
                  className={`provider-btn ${provider === 'external' ? 'active external' : ''}`}
                  onClick={() => handleProviderChange('external')}
                  disabled={loading}
                  title="Внешний LLM (Cloud.ru / Сбер GigaChat) — без гарантии конфиденциальности"
                >
                  🌐 Внешний
                </button>
              </div>

              {/* Privacy badge for external */}
              {provider === 'external' && (
                <span
                  className="privacy-badge"
                  title="Запросы передаются на серверы Cloud.ru / Сбер GigaChat"
                >
                  ⚠ Cloud.ru
                </span>
              )}

              {/* Model selector */}
              {currentModels.length > 0 && (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="model-selector"
                  disabled={loading}
                >
                  {currentModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* External provider warning banner */}
          {provider === 'external' && (
            <div className="external-warning-banner" role="alert">
              🌐 Используется Cloud.ru Foundation Models (Сбер GigaChat). Не передавайте
              персональные данные.
            </div>
          )}

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
                <p>👋 Скажите, что вам нужно</p>
                <p className="empty-subtitle">Я выполню нужное действие на сайте</p>
                <p className="empty-hint">
                  💡 «открой каталог» · «тёмная тема» · «погода в Лондоне» · «закрой чат» · «очисти
                  чат»
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="message-group">
                  {/* Вопрос пользователя */}
                  <div className="message user-message">
                    <p className="message-text">{msg.question}</p>
                    {msg.provider === 'external' && (
                      <span className="message-provider-tag">🌐</span>
                    )}
                    <button
                      className={`copy-btn${copiedId === `${msg.id}-q` ? ' copied' : ''}`}
                      onClick={() => handleCopy(msg.question, `${msg.id}-q`)}
                      title="Копировать"
                    >
                      {copiedId === `${msg.id}-q` ? '✓' : '⎘'}
                    </button>
                  </div>

                  {/* Ответ ассистента */}
                  {msg.answer && (
                    <div className="message ai-message">
                      <div className="message-text markdown-body">
                        <ReactMarkdown>{msg.answer}</ReactMarkdown>
                      </div>
                      <button
                        className={`copy-btn${copiedId === `${msg.id}-a` ? ' copied' : ''}`}
                        onClick={() => handleCopy(msg.answer, `${msg.id}-a`)}
                        title="Копировать"
                      >
                        {copiedId === `${msg.id}-a` ? '✓' : '⎘'}
                      </button>
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
              ref={inputRef}
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
                onClick={() => setShowClearConfirm(true)}
                className="clear-button"
                title="Очистить чат"
              >
                🗑️
              </button>
            )}
          </form>
        </div>
      )}

      {/* Privacy warning modal */}
      <GlassConfirmModal
        open={showPrivacyWarning}
        title="Внешний LLM провайдер"
        message="Ваши запросы будут отправляться на серверы Cloud.ru Foundation Models (Сбер GigaChat и другие модели). Не передавайте персональные данные — мы не гарантируем их конфиденциальность на стороне провайдера. Продолжить?"
        confirmLabel="Понимаю, продолжить"
        cancelLabel="Отмена"
        variant="warning"
        icon="⚠️"
        onConfirm={confirmExternalProvider}
        onCancel={cancelExternalProvider}
      />

      <GlassConfirmModal
        open={showClearConfirm}
        title="Очистить чат?"
        message="Все сообщения будут удалены. Это действие нельзя отменить."
        confirmLabel="Очистить"
        cancelLabel="Отмена"
        variant="warning"
        icon="🧹"
        onConfirm={() => {
          setMessages([]);
          setError(null);
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

export default FloatingLLMChat;
