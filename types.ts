import { Timestamp } from 'firebase/firestore';

export interface Endpoint {
  id: string;
  userId: string;
  name?: string;
  responseStatus: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface CapturedRequest {
  id: string;
  endpointId: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  query: Record<string, any>;
  timestamp: Timestamp;
  ip: string;
}
