import { ROUTES_CONFIG } from '../config/routers';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
      const response = await fetch(`${API_URL}/api/llm/ask/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question,
          model: model,
          mode: 'navigate',
        }),
      });

      if (!response.ok) {
        console.error('LLM request failed:', response.statusText);
        return { action_code: '001', action_description: 'Главная страница' };
      }

      const data: LLMResponse = await response.json();
      return {
        action_code: data.action_code || '001',
        action_description: data.action_description || 'Главная страница',
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
      const response = await fetch(`${API_URL}/api/llm/actions/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch actions map:', response.statusText);
        return {};
      }

      const data = await response.json();
      return data.actions || {};
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
      const response = await fetch(`${API_URL}/api/llm/ask/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: params.question,
          model: params.model,
          mode: 'chat',
        }),
      });

      if (!response.ok) {
        console.error('LLM request failed:', response.statusText);
        return 'Ошибка: Не удалось получить ответ';
      }

      const data: LLMResponse = await response.json();
      return data.answer || 'Ответ не получен';
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
      const response = await fetch(`${API_URL}/api/llm/models/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch models:', response.statusText);
        return ['alibayram/smollm3'];
      }

      const data = await response.json();
      return data.models || ['alibayram/smollm3'];
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
