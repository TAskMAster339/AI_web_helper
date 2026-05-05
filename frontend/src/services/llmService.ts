import api from '../api/axios';
import { ROUTES_CONFIG } from '../config/routers';

export type LLMProvider = 'local' | 'external';

export interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  model_name: string;
  timestamp: number;
  provider: LLMProvider;
}

export interface LLMResponse {
  question: string;
  action_code?: string;
  action_description?: string;
  is_fallback?: boolean;
  answer?: string;
  filters?: Record<string, string | number | boolean>;
  weather_city?: string;
  mode: 'navigate' | 'chat';
  model: string;
  provider: LLMProvider;
  error?: string;
  requests_remaining?: number | 'unlimited';
}

export interface AskQuestionParams {
  question: string;
  model: string;
  provider: LLMProvider;
}

export interface ActionsMap {
  [key: string]: string;
}

class LLMService {
  /**
   * Получить код действия на основе вопроса
   * @param question вопрос пользователя
   * @param model модель LLM
   * @param provider провайдер LLM
   * @returns объект с кодом и описанием
   */
  async getActionCode(
    question: string,
    model: string = 'alibayram/smollm3',
    provider: LLMProvider = 'local'
  ): Promise<{
    action_code: string;
    action_description: string;
    is_fallback: boolean;
    fallback_answer?: string;
    filters?: Record<string, string | number | boolean>;
    weather_city?: string;
    requests_remaining?: number | 'unlimited';
  }> {
    try {
      const response = await api.post<LLMResponse>('/llm/ask/', {
        question,
        model,
        mode: 'navigate',
        provider,
      });

      return {
        action_code: response.data.action_code || '001',
        action_description: response.data.action_description || 'Главная страница',
        is_fallback: response.data.is_fallback ?? false,
        fallback_answer: response.data.answer,
        filters: response.data.filters,
        weather_city: response.data.weather_city,
        requests_remaining: response.data.requests_remaining,
      };
    } catch (error) {
      console.error('Action code fetch error:', error);
      throw error;
    }
  }

  /**
   * Получить список доступных действий
   * @returns словарь кодов действий
   */
  async getActionsMap(): Promise<ActionsMap> {
    try {
      const response = await api.get<{ actions: ActionsMap }>('/llm/actions/');
      return response.data.actions || {};
    } catch (error) {
      console.error('Actions map fetch error:', error);
      return {};
    }
  }

  /**
   * Отправить вопрос к LLM и получить ответ
   * @param params объект с question и model
   * @returns ответ от LLM
   */
  async askQuestion(params: AskQuestionParams): Promise<string> {
    try {
      const response = await api.post<LLMResponse>('/llm/ask/', {
        question: params.question,
        model: params.model,
        mode: 'chat',
        provider: params.provider,
      });

      return response.data.answer || 'Ответ не получен';
    } catch (error) {
      console.error('LLM Service error:', error);
      throw new Error('Ошибка при обращении к LLM');
    }
  }

  /**
   * Получить список моделей для заданного провайдера
   * @param provider провайдер LLM
   * @returns список имён моделей
   */
  async getAvailableModels(provider: LLMProvider = 'local'): Promise<string[]> {
    try {
      const response = await api.get<{ models: string[] }>('/llm/models/', {
        params: { provider },
      });
      return response.data.models || ['alibayram/smollm3'];
    } catch (error) {
      console.error('Error fetching models:', error);
      return provider === 'external'
        ? [
            'ai-sage/GigaChat3-10B-A1.8B',
            'zai-org/GLM-4.7-Flash',
            'zai-org/GLM-4.7',
            'Qwen/Qwen3-Coder-Next',
            't-tech/T-pro-it-2.1',
          ]
        : ['alibayram/smollm3'];
    }
  }

  /**
   * Отправить сообщение к LLM для навигации
   * @param message текст сообщения
   * @param model модель LLM
   * @param provider провайдер LLM
   * @returns путь для навигации или '/'
   */
  async getNavigationRoute(
    message: string,
    model: string = 'alibayram/smollm3',
    provider: LLMProvider = 'local'
  ): Promise<string> {
    try {
      const result = await this.getActionCode(message, model, provider);
      const actionCode = result.action_code || '001';

      // Преобразовать код в путь
      const route = ROUTES_CONFIG[actionCode as keyof typeof ROUTES_CONFIG];
      return route || '/';
    } catch (error) {
      console.error('Navigation route error:', error);
      return '/';
    }
  }
}

export default new LLMService();
