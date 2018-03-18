import { ChatMessage } from "./message.interface";

export interface CreateChannelRequest {
  name: string;
  server_id: string;
}

export interface ChatChannel {
  _id: string;
  name: string;
  server_id?: string;
  user_ids?: string[];
  messages?: ChatMessage[];
}

export interface ChannelList {
  server_id: string;
  channels: ChatChannel[];
  users?: any;
}

export interface JoinedChannelResponse {
  channel_id: string;
  messages: ChatMessage[];
}