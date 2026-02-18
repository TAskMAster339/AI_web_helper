import api from '../api/axios';
import { ROUTES_CONFIG } from '../config/routers';

export interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  model_name: string;
  timestamp: number;
}

export interface LLMResponse {
  question: string;
  action_code?: string;
  action_description?: string;
  answer?: string;
  mode: 'navigate' | 'chat';
  model: string;
  error?: string;
}

export interface AskQuestionParams {
  question: string;
  model: string;
}

export interface ActionsMap {
  [key: string]: string;
}

class LLMService {
  /**
   * Получить код действия на основе вопроса
   * @param question вопрос пользователя
   * @param model модель LLM
   * @returns объект с кодом и описанием
   */
  async getActionCode(
    question: string,
    model: string = 'alibayram/smollm3'
  ): Promise<{ action_code: string; action_description: string }> {
    try {
      const response = await api.post<LLMResponse>('/llm/ask/', {
        question: question,
        model: model,
        mode: 'navigate',
      });

      return {
        action_code: response.data.action_code || '001',
        action_description: response.data.action_description || 'Главная страница',
      };
    } catch (error) {
      console.error('Action code fetch error:', error);
      return { action_code: '001', action_description: 'Главная страница' };
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
      });

      return response.data.answer || 'Ответ не получен';
    } catch (error) {
      console.error('LLM Service error:', error);
      throw new Error('Ошибка при обращении к LLM');
    }
  }

  /**
   * Получить список доступных моделей
   * @returns список имён моделей
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await api.get<{ models: string[] }>('/llm/models/');
      return response.data.models || ['alibayram/smollm3'];
    } catch (error) {
      console.error('Error fetching models:', error);
      return ['alibayram/smollm3'];
    }
  }

  /**
   * Отправить сообщение к LLM для навигации
   * @param message текст сообщения
   * @param model модель LLM
   * @returns путь для навигации или '/'
   */
  async getNavigationRoute(message: string, model: string = 'alibayram/smollm3'): Promise<string> {
    try {
      const result = await this.getActionCode(message, model);
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
