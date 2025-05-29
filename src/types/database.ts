/**
 * Database Types for Spoom AI
 * 
 * This file contains TypeScript interfaces corresponding to the database schema.
 * Use these types when interacting with the database to ensure type safety.
 */

export interface Role {
  id: string; // UUID
  name: 'admin' | 'moderator' | 'user' | string;
  description?: string;
  permissions: Record<string, boolean>;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string; // UUID
  email: string;
  name: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  is_active: boolean;
  is_verified: boolean;
  role_id?: string; // References Role.id
}

export interface UserSettings {
  id: string; // UUID
  user_id: string; // References User.id
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  desktop_notifications: boolean;
  appearance: {
    colorMode: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    density: 'compact' | 'comfortable' | 'spacious';
  };
  privacy_settings: {
    shareStatus: boolean;
    showOnlineStatus: boolean;
    allowDataCollection: boolean;
  };
  created_at: Date;
  updated_at: Date;
}

export interface Workspace {
  id: string; // UUID
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  owner_id: string; // References User.id
  is_personal: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceSettings {
  id: string; // UUID
  workspace_id: string; // References Workspace.id
  notifications_enabled: boolean;
  default_user_role: 'owner' | 'admin' | 'member' | 'guest';
  privacy_level: 'private' | 'team' | 'public';
  allow_guest_access: boolean;
  domain_restriction?: string[];
  security_settings: {
    enforceSSO: boolean;
    requireMFA: boolean;
    sessionTimeout: number;
  };
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceMember {
  id: string; // UUID
  workspace_id: string; // References Workspace.id
  user_id: string; // References User.id
  role: 'owner' | 'admin' | 'member' | 'guest';
  joined_at: Date;
  invitation_status: 'pending' | 'accepted' | 'rejected';
}

export interface Channel {
  id: string; // UUID
  workspace_id: string; // References Workspace.id
  name: string;
  description?: string;
  is_private: boolean;
  created_by: string; // References User.id
  created_at: Date;
  updated_at: Date;
}

export interface ChannelMember {
  id: string; // UUID
  channel_id: string; // References Channel.id
  user_id: string; // References User.id
  role: 'owner' | 'admin' | 'member';
  joined_at: Date;
}

export interface Group {
  id: string; // UUID
  workspace_id: string; // References Workspace.id
  name: string;
  description?: string;
  created_by: string; // References User.id
  created_at: Date;
  updated_at: Date;
}

export interface GroupMember {
  id: string; // UUID
  group_id: string; // References Group.id
  user_id: string; // References User.id
  role: 'owner' | 'admin' | 'member';
  joined_at: Date;
}

export interface Message {
  id: string; // UUID
  channel_id?: string; // References Channel.id
  user_id?: string; // References User.id
  content: string;
  content_type: 'text' | 'code' | 'file' | 'system';
  is_edited: boolean;
  parent_id?: string; // References Message.id (for threads)
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, any>;
}

export interface Credit {
  id: string; // UUID
  user_id: string; // References User.id
  balance: number;
  last_topped_up?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: string; // UUID
  user_id: string; // References User.id
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | string;
  payment_intent_id?: string;
  invoice_id?: string;
  description?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionPlan {
  id: string; // UUID
  name: string;
  description?: string;
  price: number;
  currency: string;
  billing_interval: 'month' | 'year' | 'week' | 'day' | string;
  features: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserSubscription {
  id: string; // UUID
  user_id: string; // References User.id
  plan_id: string; // References SubscriptionPlan.id
  start_date: Date;
  end_date?: Date;
  auto_renew: boolean;
  status: 'active' | 'canceled' | 'expired' | 'paused' | string;
  subscription_id?: string;
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AIGeneratedResponse {
  id: string; // UUID
  user_id?: string; // References User.id
  message_id?: string; // References Message.id
  channel_id?: string; // References Channel.id
  workspace_id?: string; // References Workspace.id
  prompt: string;
  response: string;
  model?: string;
  tokens_used?: number;
  duration_ms?: number;
  feedback?: 'good' | 'bad' | 'neutral' | string;
  rating?: number;
  cost?: number;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface MessageReaction {
  id: string; // UUID
  message_id: string; // References Message.id
  user_id: string; // References User.id
  reaction: string; // Emoji code or name
  created_at: Date;
}

export interface App {
  id: string; // UUID
  name: string;
  description?: string;
  logo_url?: string;
  app_url?: string;
  api_key_required: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, any>;
}

export interface UserApp {
  id: string; // UUID
  user_id: string; // References User.id
  app_id: string; // References App.id
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  is_connected: boolean;
  connection_data: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceApp {
  id: string; // UUID
  workspace_id: string; // References Workspace.id
  app_id: string; // References App.id
  installed_by?: string; // References User.id
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  is_active: boolean;
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AppHistory {
  id: string; // UUID
  user_id: string; // References User.id
  app_id: string; // References App.id
  workspace_id?: string; // References Workspace.id
  action_type: 'install' | 'uninstall' | 'auth' | 'use';
  details: Record<string, any>;
  created_at: Date;
}

export interface DirectMessage {
  id: string; // UUID
  sender_id: string; // References User.id
  recipient_id: string; // References User.id
  content: string;
  is_read: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: string; // UUID
  user_id: string; // References User.id
  title: string;
  content?: string;
  notification_type: 'message' | 'mention' | 'system' | string;
  is_read: boolean;
  source_type?: 'message' | 'channel' | 'workspace' | 'system' | string;
  source_id?: string; // ID of the source (message_id, channel_id, etc.)
  created_at: Date;
}

export interface UserPreference {
  id: string; // UUID
  user_id: string; // References User.id
  preference_key: string;
  preference_value?: string;
  created_at: Date;
  updated_at: Date;
}

export interface File {
  id: string; // UUID
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string; // References User.id
  workspace_id?: string; // References Workspace.id
  channel_id?: string; // References Channel.id
  message_id?: string; // References Message.id
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

// Database schema as a whole, for use with libraries like Prisma or type-safe database access
export interface Database {
  roles: Role[];
  users: User[];
  user_settings: UserSettings[];
  workspaces: Workspace[];
  workspace_settings: WorkspaceSettings[];
  workspace_members: WorkspaceMember[];
  channels: Channel[];
  channel_members: ChannelMember[];
  groups: Group[];
  group_members: GroupMember[];
  messages: Message[];
  message_reactions: MessageReaction[];
  apps: App[];
  user_apps: UserApp[];
  workspace_apps: WorkspaceApp[];
  apps_history: AppHistory[];
  direct_messages: DirectMessage[];
  notifications: Notification[];
  user_preferences: UserPreference[];
  files: File[];
  credits: Credit[];
  payments: Payment[];
  subscription_plans: SubscriptionPlan[];
  user_subscriptions: UserSubscription[];
  ai_generated_responses: AIGeneratedResponse[];
}
