/**
 * User Durable Object
 * Stores user accounts, OAuth accounts, child profiles, and saved stories
 */

import { DurableObject } from 'cloudflare:workers';
import type {
  User,
  ChildProfile,
  SavedStory,
  Session,
  ClonedVoice,
} from '../schemas/auth/user';

export interface UserDOEnv {
  USER_DO: DurableObjectNamespace;
}

/**
 * Storage keys:
 * - user:{userId} -> User
 * - profile:{profileId} -> ChildProfile
 * - profiles:user:{userId} -> string[] (profile IDs)
 * - story:{storyId} -> SavedStory
 * - stories:user:{userId} -> string[] (story IDs)
 * - session:{sessionId} -> Session
 * - email_index:{email} -> userId (for lookup)
 * - cloned_voice:{voiceId} -> ClonedVoice
 * - cloned_voices:user:{userId} -> string[] (voice IDs)
 */

export class UserDO extends DurableObject {
  constructor(ctx: DurableObjectState, env: UserDOEnv) {
    super(ctx, env);
  }

  // ============================================================================
  // User Management
  // ============================================================================

  async createUser(user: User): Promise<User> {
    // Check if email already exists
    const existingUserId = await this.ctx.storage.get<string>(`email_index:${user.email}`);
    if (existingUserId) {
      throw new Error('Email already in use');
    }

    // Store user
    await this.ctx.storage.put(`user:${user.id}`, user);
    await this.ctx.storage.put(`email_index:${user.email}`, user.id);

    return user;
  }

  async getUserById(userId: string): Promise<User | null> {
    return (await this.ctx.storage.get<User>(`user:${userId}`)) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const userId = await this.ctx.storage.get<string>(`email_index:${email}`);
    if (!userId) return null;
    return this.getUserById(userId);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;

    const updatedUser = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await this.ctx.storage.put(`user:${user.id}`, updatedUser);
    return updatedUser;
  }

  // ============================================================================
  // Child Profile Management
  // ============================================================================

  async createChildProfile(profile: ChildProfile): Promise<ChildProfile> {
    await this.ctx.storage.put(`profile:${profile.id}`, profile);

    // Add to user's profile list
    const userProfileIds =
      (await this.ctx.storage.get<string[]>(`profiles:user:${profile.user_id}`)) || [];
    userProfileIds.push(profile.id);
    await this.ctx.storage.put(`profiles:user:${profile.user_id}`, userProfileIds);

    return profile;
  }

  async getChildProfile(profileId: string): Promise<ChildProfile | null> {
    return (await this.ctx.storage.get<ChildProfile>(`profile:${profileId}`)) || null;
  }

  async getUserChildProfiles(userId: string): Promise<ChildProfile[]> {
    const profileIds =
      (await this.ctx.storage.get<string[]>(`profiles:user:${userId}`)) || [];
    const profiles: ChildProfile[] = [];

    for (const profileId of profileIds) {
      const profile = await this.getChildProfile(profileId);
      if (profile) profiles.push(profile);
    }

    return profiles;
  }

  async updateChildProfile(
    profileId: string,
    updates: Partial<ChildProfile>
  ): Promise<ChildProfile | null> {
    const profile = await this.getChildProfile(profileId);
    if (!profile) return null;

    const updatedProfile = {
      ...profile,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await this.ctx.storage.put(`profile:${profileId}`, updatedProfile);
    return updatedProfile;
  }

  async deleteChildProfile(profileId: string, userId: string): Promise<boolean> {
    const profile = await this.getChildProfile(profileId);
    if (!profile || profile.user_id !== userId) return false;

    // Remove from storage
    await this.ctx.storage.delete(`profile:${profileId}`);

    // Remove from user's profile list
    const profileIds =
      (await this.ctx.storage.get<string[]>(`profiles:user:${userId}`)) || [];
    const updatedIds = profileIds.filter((id) => id !== profileId);
    await this.ctx.storage.put(`profiles:user:${userId}`, updatedIds);

    return true;
  }

  // ============================================================================
  // Saved Story Management
  // ============================================================================

  async saveStory(story: SavedStory): Promise<SavedStory> {
    await this.ctx.storage.put(`story:${story.id}`, story);

    // Add to user's story list
    const userStoryIds =
      (await this.ctx.storage.get<string[]>(`stories:user:${story.user_id}`)) || [];
    userStoryIds.unshift(story.id); // Add to beginning (most recent first)
    await this.ctx.storage.put(`stories:user:${story.user_id}`, userStoryIds);

    return story;
  }

  async getStory(storyId: string): Promise<SavedStory | null> {
    return (await this.ctx.storage.get<SavedStory>(`story:${storyId}`)) || null;
  }

  async getUserStories(userId: string, limit = 50): Promise<SavedStory[]> {
    const storyIds = (await this.ctx.storage.get<string[]>(`stories:user:${userId}`)) || [];
    const stories: SavedStory[] = [];

    for (const storyId of storyIds.slice(0, limit)) {
      const story = await this.getStory(storyId);
      if (story) stories.push(story);
    }

    return stories;
  }

  async updateStory(storyId: string, updates: Partial<SavedStory>): Promise<SavedStory | null> {
    const story = await this.getStory(storyId);
    if (!story) return null;

    const updatedStory = {
      ...story,
      ...updates,
    };

    await this.ctx.storage.put(`story:${storyId}`, updatedStory);

    return updatedStory;
  }

  async deleteStory(storyId: string, userId: string): Promise<boolean> {
    const story = await this.getStory(storyId);
    if (!story || story.user_id !== userId) return false;

    // Remove from storage
    await this.ctx.storage.delete(`story:${storyId}`);

    // Remove from user's story list
    const storyIds = (await this.ctx.storage.get<string[]>(`stories:user:${userId}`)) || [];
    const updatedIds = storyIds.filter((id) => id !== storyId);
    await this.ctx.storage.put(`stories:user:${userId}`, updatedIds);

    return true;
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  async createSession(session: Session): Promise<Session> {
    await this.ctx.storage.put(`session:${session.id}`, session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const session = await this.ctx.storage.get<Session>(`session:${sessionId}`);
    if (!session) return null;

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      await this.ctx.storage.delete(`session:${sessionId}`);
      return null;
    }

    return session;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await this.ctx.storage.delete(`session:${sessionId}`);
    return true;
  }

  // ============================================================================
  // Cloned Voice Management
  // ============================================================================

  async createClonedVoice(voice: ClonedVoice): Promise<ClonedVoice> {
    await this.ctx.storage.put(`cloned_voice:${voice.id}`, voice);

    // Add to user's voice list
    const userVoiceIds =
      (await this.ctx.storage.get<string[]>(`cloned_voices:user:${voice.user_id}`)) || [];
    userVoiceIds.unshift(voice.id); // Add to beginning (most recent first)
    await this.ctx.storage.put(`cloned_voices:user:${voice.user_id}`, userVoiceIds);

    return voice;
  }

  async getClonedVoice(voiceId: string): Promise<ClonedVoice | null> {
    return (await this.ctx.storage.get<ClonedVoice>(`cloned_voice:${voiceId}`)) || null;
  }

  async getUserClonedVoices(userId: string): Promise<ClonedVoice[]> {
    const voiceIds =
      (await this.ctx.storage.get<string[]>(`cloned_voices:user:${userId}`)) || [];
    const voices: ClonedVoice[] = [];

    for (const voiceId of voiceIds) {
      const voice = await this.getClonedVoice(voiceId);
      if (voice) voices.push(voice);
    }

    return voices;
  }

  async deleteClonedVoice(voiceId: string, userId: string): Promise<boolean> {
    const voice = await this.getClonedVoice(voiceId);
    if (!voice || voice.user_id !== userId) return false;

    // Remove from storage
    await this.ctx.storage.delete(`cloned_voice:${voiceId}`);

    // Remove from user's voice list
    const voiceIds =
      (await this.ctx.storage.get<string[]>(`cloned_voices:user:${userId}`)) || [];
    const updatedIds = voiceIds.filter((id) => id !== voiceId);
    await this.ctx.storage.put(`cloned_voices:user:${userId}`, updatedIds);

    return true;
  }
}
