export interface Endpoint {
  id: string;
  name?: string;
  responseStatus: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
  createdAt: string; // ISO String
  expiresAt: string; // ISO String
}

export interface CapturedRequest {
  id: string;
  endpointId: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  query: Record<string, any>;
  timestamp: string; // ISO String
  ip: string;
}