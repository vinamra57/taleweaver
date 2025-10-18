import axios from 'axios';
import { API_BASE_URL } from './constants';
import {
  StartRequest,
  StartResponse,
  ContinueRequest,
  ContinueResponse,
  StartResponseInteractiveSchema,
  StartResponseNonInteractiveSchema,
  ContinueResponseMidSchema,
  ContinueResponseFinalSchema,
} from './types';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds for AI generation
});

// API Methods
export const api = {
  /**
   * Start a new story session
   */
  startStory: async (request: StartRequest): Promise<StartResponse> => {
    try {
      const response = await apiClient.post<StartResponse>('/api/story/start', request);
      const data = response.data as StartResponse;

      if (data && (data as any).settings?.interactive === true) {
        return StartResponseInteractiveSchema.parse(data);
      }

      return StartResponseNonInteractiveSchema.parse(data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Failed to start story. Please try again.'
        );
      }
      throw error;
    }
  },

  /**
   * Continue the story with a choice (interactive mode only)
   */
  continueStory: async (request: ContinueRequest): Promise<ContinueResponse> => {
    try {
      const response = await apiClient.post<ContinueResponse>('/api/story/continue', request);

      // Validate response with Zod based on reached_final flag
      const data = response.data as any;
      if (data.reached_final === true) {
        const validated = ContinueResponseFinalSchema.parse(response.data);
        return validated;
      } else {
        const validated = ContinueResponseMidSchema.parse(response.data);
        return validated;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message ||
          error.response?.data?.error ||
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
