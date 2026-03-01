export type ToolCallLoggerConfig = {
  webhookUrl?: string;
};

export interface Envelope {
  hook: string;
  timestamp: string;
  event: unknown;
}

export interface WebhookApprovalResponse {
  approve: boolean;
  reason?: string;
}
