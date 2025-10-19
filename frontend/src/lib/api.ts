import axios from 'axios';
import { API_BASE_URL } from './constants';
import type {
  CheckpointSegment,
  ChoiceOption,
  EmotionHint,
  StartResponse,
  ContinueResponse,
  StartRequest,
  ContinueRequest,
  EvaluationResponse,
} from './types';

type BackendSegment = {
  // what your Worker returns from createSegmentWithAudio
  // (these names exist based on your server code)
  text: string;
  emotion_hint: EmotionHint;
  audio_url: string;
};

type BackendBranch = {
  id?: 'A' | 'B';         // if present
  label?: string;         // human text
  // the next segment if this choice is selected:
  segment: BackendSegment;
};

type BackendStartInteractiveResponse = {
  session_id: string;
  segment: BackendSegment;            // first segment (checkpoint 0)
  next_branches?: BackendBranch[];    // two choices (optional during async generation)
  story_complete: false;
};

type BackendStartNonInteractiveResponse = {
  session_id: string;
  segment: BackendSegment;            // whole story as one segment
  story_complete: true;
};

type BackendContinueMidResponse = {
  segment: BackendSegment;            // the segment that just played
  next_branches?: BackendBranch[];    // next two choices (optional during async generation)
  story_complete: false;
};

type BackendContinueFinalResponse = {
  segment: BackendSegment;            // the final segment that just played
  story_complete: true;
};

function seg0(b: BackendSegment): CheckpointSegment {
  return {
    checkpoint_index: 0,
    text: b.text,
    emotion_hint: b.emotion_hint,
    audio_url: b.audio_url,
  };
}

function asChoiceOptionsFromBranches(
  branches: BackendBranch[],
  from: number,
  to: number
): ChoiceOption[] {
  const ids: ('A'|'B')[] = ['A', 'B'];
  return branches.slice(0, 2).map((br, i) => ({
    id: (br.id ?? ids[i]),
    label: br.label ?? (ids[i] === 'A' ? 'Choice A' : 'Choice B'),
    segment: {
      // we only need emotion + audio for preview UI;
      // from/to used for the visual hint
      from_checkpoint: from,
      to_checkpoint: to,
      text: br.segment.text,
      emotion_hint: br.segment.emotion_hint,
      audio_url: br.segment.audio_url,
    },
  }));
}

// --- Backend request shape (what the Worker actually wants) ---
type BackendStartRequest = {
  child: {
    name: string;
    gender: 'male' | 'female';
    age_range: '4-6' | '7-9' | '10-12';
    interests: string; // comma-separated
    context?: string;
  };
  moral_focus: 'kindness' | 'honesty' | 'courage' | 'sharing' | 'perseverance';
  story_length: 1 | 2 | 3;
  interactive: boolean;
};

// Adapter: front form -> backend payload
function toBackendStartPayload(req: StartRequest): BackendStartRequest {
  // 1) map age_group → age_range for backend
  const age_group =
    (req as any).child?.age_group ??
    (req as any).child?.ageGroup ??
    (req as any).age_group ??
    (req as any).ageGroup;

  const age_range: BackendStartRequest['child']['age_range'] =
    age_group && ['4-6','7-9','10-12'].includes(age_group)
      ? age_group
      : '7-9';

  // 2) interests → comma-separated string
  const interestsValue =
    (req as any).child?.interests ?? (req as any).interests ?? [];
  const interests =
    Array.isArray(interestsValue) ? interestsValue.join(', ') : String(interestsValue ?? '');

  // 3) gender passthrough
  const gender = (req as any).child?.gender ?? (req as any).gender;

  // 4) moral focus with fallback
  const moral_focus =
    (req as any).moral_focus ??
    (req as any).moralFocus ??
    'kindness';

  // 5) **THIS IS THE BUG**: map duration_min → story_length (1|2|3)
  const dur =
    (req as any).duration_min ??
    (req as any).durationMin ??
    (req as any).story_length ??
    (req as any).storyLength;

  const story_length: 1 | 2 | 3 = ([1, 2, 3] as const).includes(dur) ? dur : 2;

  // 6) interactive flag
  const interactive: boolean = (req as any).interactive ?? true;

  return {
    child: {
      name: (req as any).child?.name ?? (req as any).name,
      gender,              // 'male' | 'female'
      age_range,           // '4-6' | '7-9' | '10-12'
      interests,           // comma-separated
      context: (req as any).child?.context ?? (req as any).context ?? '',
    },
    moral_focus,           // required
    story_length,          // 1 | 2 | 3
    interactive,           // boolean
  };
}

// Axios client
const apiClient = axios.create({
  baseURL: API_BASE_URL, // e.g., http://localhost:8787
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// Add auth token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  /**
   * Start a new story session
   */
  startStory: async (request: StartRequest): Promise<StartResponse> => {
    try {
      const backendPayload = toBackendStartPayload(request);
      const { data } = await apiClient.post('/api/story/start', backendPayload);
      if (backendPayload.interactive === false) {
        // Backend non-interactive: { session_id, segment, story_complete: true }
        const nonInteractive = data as BackendStartNonInteractiveResponse;
        const first: CheckpointSegment = {
          checkpoint_index: 1, // single part; show as Part 1
          text: nonInteractive.segment.text,
          emotion_hint: nonInteractive.segment.emotion_hint,
          audio_url: nonInteractive.segment.audio_url,
        };
        return {
          session_id: nonInteractive.session_id,
          settings: {
            duration_min: backendPayload.story_length,
            interactive: false,
            age_group: request.child.age_group,
          },
          segments: [first],
        };
      }

      // Backend interactive: { session_id, segment, next_branches, story_complete: false }
      const interactive = data as BackendStartInteractiveResponse;
      const current = seg0(interactive.segment);
      // next_branches may be undefined during async generation
      const next_options = interactive.next_branches
        ? asChoiceOptionsFromBranches(interactive.next_branches, 0, 1)
        : [];

      return {
        session_id: interactive.session_id,
        settings: {
          duration_min: backendPayload.story_length,
          interactive: true,
          age_group: request.child.age_group,
        },
        current_segment: current,
        next_options,
        history: [{
          segment: current,
          chosenOption: undefined, // First segment has no choice
        }],
        // purely cosmetic estimate for the UI badge
        remaining_checkpoints: backendPayload.story_length,
      } as any; // matches StartResponseInteractive
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          (error.response?.data as any)?.message ||
          (error.response?.data as any)?.error ||
          'Failed to start story. Please try again.'
        );
      }
      throw error;
    }
  },

  /**
   * Continue the story (interactive mode)
   */
  continueStory: async (request: ContinueRequest): Promise<ContinueResponse> => {
    try {
      // Backend expects: { session_id, checkpoint, chosen_branch }
      const wire = {
        session_id: request.session_id,
        checkpoint: request.from_checkpoint + 1,   // backend compares to current_checkpoint + 1
        chosen_branch: request.chosen,            // 'A' | 'B'
      };
      const { data } = await apiClient.post('/api/story/continue', wire);

      // Mid response
      if (data?.story_complete === false) {
        const mid = data as BackendContinueMidResponse;
        const from = request.from_checkpoint;
        const to = from + 1;
        return {
          ack: {
            played_id: wire.chosen_branch,
            played_segment: {
              from_checkpoint: from,
              to_checkpoint: to,
              text: mid.segment.text,
              emotion_hint: mid.segment.emotion_hint,
              audio_url: mid.segment.audio_url,
            },
          },
          // next_branches may be undefined during async generation
          next_options: mid.next_branches
            ? asChoiceOptionsFromBranches(mid.next_branches, to, to + 1)
            : [],
          reached_final: false,
        };
      }
      // Final response
      const fin = data as BackendContinueFinalResponse;
      const from = request.from_checkpoint;
      const to = from + 1;
      return {
        ack: {
          played_id: wire.chosen_branch,
          played_segment: {
            from_checkpoint: from,
            to_checkpoint: to,
            text: fin.segment.text,
            emotion_hint: fin.segment.emotion_hint,
            audio_url: fin.segment.audio_url,
          },
        },
        reached_final: true,
        ending: {
          // Backend doesn’t send a reflection today; provide a friendly default.
          reflection: 'The end — nice choices! Sleep tight 🌙',
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          (error.response?.data as any)?.message ||
          (error.response?.data as any)?.error ||
          'Failed to continue story. Please try again.'
        );
      }
      throw error;
    }
  },

  /**
   * Check if next branches are ready for a session
   */
  checkBranchStatus: async (sessionId: string): Promise<{
    branches_ready: boolean;
    generation_in_progress: boolean;
    current_checkpoint: number;
  }> => {
    try {
      const { data } = await apiClient.get(`/api/story/status/${sessionId}`);
      return data;
    } catch (error) {
      console.error('Failed to check branch status:', error);
      return {
        branches_ready: false,
        generation_in_progress: false,
        current_checkpoint: 0,
      };
    }
  },

  /**
   * Get pre-generated branches for a checkpoint
   */
  getBranches: async (sessionId: string, checkpoint: number): Promise<{
    branches: BackendBranch[];
    branches_ready: boolean;
  }> => {
    try {
      const { data } = await apiClient.get(`/api/story/branches/${sessionId}/${checkpoint}`);
      return data;
    } catch (error) {
      console.error('Failed to get branches:', error);
      return {
        branches: [],
        branches_ready: false,
      };
    }
  },

  /**
   * Health check endpoint (worker uses "/")
   */
  healthCheck: async (): Promise<boolean> => {
    try {
      await apiClient.get('/'); // was '/health' – backend exposes '/'
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get evaluation for a completed story
   */
  getEvaluation: async (sessionId: string): Promise<EvaluationResponse> => {
    try {
      const { data } = await apiClient.post('/api/story/evaluate', {
        session_id: sessionId,
      });
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          (error.response?.data as any)?.message ||
          (error.response?.data as any)?.error ||
          'Failed to get evaluation. Please try again.'
        );
      }
      throw error;
    }
  },

  /**
   * Get a saved story by ID
   */
  getStory: async (storyId: string): Promise<{ story: any; session: any }> => {
    try {
      const { data } = await apiClient.get(`/api/stories/${storyId}`);
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          (error.response?.data as any)?.message ||
          (error.response?.data as any)?.error ||
          'Failed to load story. Please try again.'
        );
      }
      throw error;
    }
  },
};

export default api;
