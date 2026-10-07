/** Учетные данные инстанса GREEN-API (берутся в личном кабинете). */
export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
  /** Хост API, например https://3100.api.green-api.com */
  apiUrl: string;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  text: string;
  /** Метка времени, миллисекунды */
  timestamp: number;
  outgoing: boolean;
  status?: MessageStatus;
}

export interface Chat {
  chatId: string;
  /** Номер телефона собеседника (только цифры), если известен */
  phone: string;
  /** Имя собеседника из MAX, если известно */
  name: string;
  messages: Message[];
}

/* ---------- Ответы GREEN-API ---------- */

export interface StateInstanceResponse {
  stateInstance: string;
}

export interface CheckAccountResponse {
  exist: boolean;
  chatId: string;
  fromCache?: boolean;
}

export interface SendMessageResponse {
  idMessage: string;
}

export interface DeleteNotificationResponse {
  result: boolean;
  reason: string;
}

/* ---------- Входящие уведомления ---------- */

export interface SenderData {
  chatId: string;
  chatName?: string;
  chatType?: string;
  sender?: string;
  senderName?: string;
  senderType?: string;
  senderContactName?: string;
  senderPhoneNumber?: number;
}

export interface TextMessageData {
  textMessage: string;
  isForwarded?: boolean;
  forwardingScore?: number;
}

export interface ExtendedTextMessageData {
  text?: string;
  textMessage?: string;
}

export interface MessageData {
  typeMessage: string;
  textMessageData?: TextMessageData;
  extendedTextMessageData?: ExtendedTextMessageData;
}

/**
 * Тело уведомления. Поля опциональны, т.к. формат зависит от typeWebhook
 * (incomingMessageReceived / outgoingMessageReceived / outgoingMessageStatus /
 * stateInstanceChanged и др.).
 */
export interface WebhookBody {
  typeWebhook: string;
  timestamp?: number;
  idMessage?: string;
  senderData?: SenderData;
  messageData?: MessageData;
  /** outgoingMessageStatus: sent | delivered | read | failed */
  status?: string;
  /** stateInstanceChanged */
  stateInstance?: string;
}

export interface Notification {
  receiptId: number;
  body: WebhookBody;
}
