import axios from 'axios';

const API_BASE_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  model_name: string;
  timestamp: number;
}

export interface ChatRequest {
  question: string;
  model?: string;
}

const llmService = {
  async askQuestion(data: ChatRequest): Promise<string> {
    const response = await axios.post(`${API_BASE_URL}/llm/ask/`, data);
    return response.data.answer;
  },

  async getAvailableModels(): Promise<string[]> {
    const response = await axios.get(`${API_BASE_URL}/llm/models/`);
    return response.data.models;
  },
};

export default llmService;
