import axios from 'axios';
import { API_BASE_URL } from './constants';
import {
  StartRequest,
  StartResponse,
  ContinueRequest,
  ContinueResponse,
  StartResponseSchema,
  ContinueResponseSchema,
} from './types';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds for AI generation
});

// API Methods
export const api = {
  /**
   * Start a new story session
   */
  startStory: async (request: StartRequest): Promise<StartResponse> => {
    try {
      const response = await apiClient.post<StartResponse>('/start', request);

      // Validate response with Zod
      const validated = StartResponseSchema.parse(response.data);
      return validated;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message ||
          'Failed to start story. Please try again.'
        );
      }
      throw error;
    }
  },

  /**
   * Continue the story with a choice
   */
  continueStory: async (request: ContinueRequest): Promise<ContinueResponse> => {
    try {
      const response = await apiClient.post<ContinueResponse>('/continue', request);

      // Validate response with Zod
      const validated = ContinueResponseSchema.parse(response.data);
      return validated;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message ||
          'Failed to continue story. Please try again.'
        );
      }
      throw error;
    }
  },

  /**
   * Health check endpoint
   */
  healthCheck: async (): Promise<boolean> => {
    try {
      await apiClient.get('/health');
      return true;
    } catch {
      return false;
    }
  },
};

export default api;
