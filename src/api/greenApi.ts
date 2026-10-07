/**
 * Минимальный клиент GREEN-API (v3, мессенджер MAX).
 * Документация: https://green-api.com/v3/docs/
 */
import type {
  CheckAccountResponse,
  Credentials,
  DeleteNotificationResponse,
  Notification,
  SendMessageResponse,
  StateInstanceResponse,
} from '../types';

const DEFAULT_API_URL = 'https://api.green-api.com';

function baseUrl(creds: Credentials): string {
  const apiUrl = (creds.apiUrl || DEFAULT_API_URL).replace(/\/+$/, '');
  return `${apiUrl}/waInstance${creds.idInstance}`;
}

async function request<T>(
  creds: Credentials,
  method: string,
  httpMethod: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: unknown,
  query = '',
): Promise<T> {
  const url = `${baseUrl(creds)}/${method}/${creds.apiTokenInstance}${query}`;
  const options: RequestInit = { method: httpMethod };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = (await response.json()) as { message?: string; error?: string; reason?: string };
      message = data?.message || data?.error || data?.reason || message;
    } catch {
      // ответ не JSON — оставляем HTTP-код
    }
    throw new Error(message);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Состояние инстанса: authorized / notAuthorized / starting / ... */
export function getStateInstance(creds: Credentials): Promise<StateInstanceResponse> {
  return request(creds, 'getStateInstance', 'GET');
}

/**
 * Настройка получения уведомлений по технологии HTTP API:
 * webhookUrl должен быть пустым, входящие вебхуки включены.
 */
export function setSettings(creds: Credentials): Promise<{ saveSettings: boolean }> {
  return request(creds, 'setSettings', 'POST', {
    webhookUrl: '',
    outgoingWebhook: 'yes',
    stateWebhook: 'yes',
    incomingWebhook: 'yes',
  });
}

/** Проверка номера: { exist, chatId } */
export function checkAccount(creds: Credentials, phoneNumber: string): Promise<CheckAccountResponse> {
  return request(creds, 'checkAccount', 'POST', { phoneNumber: Number(phoneNumber) });
}

/** Отправка текстового сообщения: { idMessage } */
export function sendMessage(creds: Credentials, chatId: string, message: string): Promise<SendMessageResponse> {
  return request(creds, 'sendMessage', 'POST', { chatId, message });
}

/** Ожидание следующего уведомления из очереди (long poll). null при таймауте. */
export function receiveNotification(creds: Credentials, receiveTimeout = 20): Promise<Notification | null> {
  return request(creds, 'receiveNotification', 'GET', undefined, `?receiveTimeout=${receiveTimeout}`);
}

/** Удаление обработанного уведомления из очереди. */
export function deleteNotification(creds: Credentials, receiptId: number): Promise<DeleteNotificationResponse> {
  return request(creds, 'deleteNotification', 'DELETE', undefined, `/${receiptId}`);
}
