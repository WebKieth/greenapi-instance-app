import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from './api/greenApi';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { normalizePhone } from './utils/phone';
import { errorMessage } from './utils/errors';
import type { Chat, Credentials, Message, MessageData, MessageStatus, WebhookBody } from './types';

const CREDS_KEY = 'maxchat:creds';
const chatsKey = (idInstance: string) => `maxchat:chats:${idInstance}`;
const NOTIFICATION_TIMEOUT = 20;
const ERROR_RETRY_DELAY = 5000;
const MESSAGE_STATUSES: MessageStatus[] = ['sent', 'delivered', 'read', 'failed'];

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Извлекает текст из уведомления о сообщении (только текстовые типы). */
function extractText(messageData: MessageData | undefined): string | null {
  if (!messageData) return null;
  if (messageData.typeMessage === 'textMessage') {
    return messageData.textMessageData?.textMessage ?? null;
  }
  if (messageData.typeMessage === 'extendedTextMessage') {
    const data = messageData.extendedTextMessageData;
    return data?.text ?? data?.textMessage ?? null;
  }
  return null;
}

interface ChatMeta {
  phone?: string;
  name?: string;
}

export default function App() {
  const [creds, setCreds] = useState<Credentials | null>(() =>
    loadJSON<Credentials | null>(CREDS_KEY, null),
  );
  const [chats, setChats] = useState<Chat[]>(() =>
    creds ? loadJSON<Chat[]>(chatsKey(creds.idInstance), []) : [],
  );
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [instanceState, setInstanceState] = useState<string | null>(null);

  // Сохранение чатов между сессиями
  useEffect(() => {
    if (creds) {
      localStorage.setItem(chatsKey(creds.idInstance), JSON.stringify(chats));
    }
  }, [chats, creds]);

  const handleLogin = useCallback((newCreds: Credentials) => {
    setCreds(newCreds);
    localStorage.setItem(CREDS_KEY, JSON.stringify(newCreds));
    setChats(loadJSON<Chat[]>(chatsKey(newCreds.idInstance), []));
    setActiveChatId(null);
  }, []);

  const handleLogout = useCallback(() => {
    setCreds(null);
    setActiveChatId(null);
    setInstanceState(null);
    localStorage.removeItem(CREDS_KEY);
  }, []);

  /** Добавляет сообщение в чат, при необходимости создаёт чат. Дедупликация по id. */
  const appendMessage = useCallback((chatId: string, chatMeta: ChatMeta | null, message: Message) => {
    setChats((prev) => {
      const index = prev.findIndex((c) => c.chatId === chatId);
      if (index !== -1 && prev[index].messages.some((m) => m.id === message.id)) {
        return prev;
      }
      const next = [...prev];
      if (index === -1) {
        next.unshift({
          chatId,
          phone: chatMeta?.phone || '',
          name: chatMeta?.name || chatMeta?.phone || chatId,
          messages: [message],
        });
      } else {
        const chat: Chat = { ...prev[index] };
        if (chatMeta?.name) chat.name = chatMeta.name;
        chat.messages = [...chat.messages, message];
        next[index] = chat;
      }
      return next;
    });
  }, []);

  /** Обновляет статус исходящего сообщения по idMessage */
  const updateMessageStatus = useCallback((idMessage: string, status: MessageStatus) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.messages.some((m) => m.id === idMessage)
          ? {
              ...chat,
              messages: chat.messages.map((m) => (m.id === idMessage ? { ...m, status } : m)),
            }
          : chat,
      ),
    );
  }, []);

  const processNotification = useCallback(
    (body: WebhookBody) => {
      if (body.typeWebhook === 'incomingMessageReceived') {
        const text = extractText(body.messageData);
        const { senderData } = body;
        if (!text || !senderData) return; // обрабатываем только текстовые сообщения
        appendMessage(
          senderData.chatId,
          {
            phone: senderData.senderPhoneNumber ? String(senderData.senderPhoneNumber) : '',
            name: senderData.senderName || senderData.senderContactName || '',
          },
          {
            id: String(body.idMessage ?? `in-${Date.now()}`),
            text,
            timestamp: (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
            outgoing: false,
          },
        );
      } else if (body.typeWebhook === 'outgoingMessageReceived') {
        // Сообщение, отправленное с телефона или через API с другого клиента
        const text = extractText(body.messageData);
        const chatId = body.senderData?.chatId;
        if (!text || !chatId) return;
        appendMessage(chatId, { name: body.senderData?.chatName }, {
          id: String(body.idMessage ?? `out-${Date.now()}`),
          text,
          timestamp: (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
          outgoing: true,
          status: 'sent',
        });
      } else if (body.typeWebhook === 'outgoingMessageStatus') {
        const { idMessage, status } = body;
        if (idMessage && status && MESSAGE_STATUSES.includes(status as MessageStatus)) {
          updateMessageStatus(String(idMessage), status as MessageStatus);
        }
      } else if (body.typeWebhook === 'stateInstanceChanged') {
        setInstanceState(body.stateInstance ?? null);
      }
    },
    [appendMessage, updateMessageStatus],
  );

  // Цикл получения уведомлений (HTTP API: receiveNotification + deleteNotification)
  const processNotificationRef = useRef(processNotification);
  processNotificationRef.current = processNotification;

  useEffect(() => {
    if (!creds) return undefined;
    let stopped = false;

    const loop = async () => {
      // Настройка инстанса для получения уведомлений по HTTP API
      try {
        await api.setSettings(creds);
      } catch (err) {
        console.warn('setSettings:', errorMessage(err));
      }
      try {
        const state = await api.getStateInstance(creds);
        if (!stopped) setInstanceState(state?.stateInstance ?? null);
      } catch (err) {
        console.warn('getStateInstance:', errorMessage(err));
      }

      while (!stopped) {
        try {
          const notification = await api.receiveNotification(creds, NOTIFICATION_TIMEOUT);
          if (stopped) break;
          if (notification?.body) {
            processNotificationRef.current(notification.body);
            await api
              .deleteNotification(creds, notification.receiptId)
              .catch((err) => console.warn('deleteNotification:', errorMessage(err)));
          }
        } catch (err) {
          console.warn('receiveNotification:', errorMessage(err));
          if (stopped) break;
          await new Promise((resolve) => setTimeout(resolve, ERROR_RETRY_DELAY));
        }
      }
    };

    void loop();
    return () => {
      stopped = true;
    };
  }, [creds]);

  /** Создание чата: номер телефона -> checkAccount -> chatId (рекомендованный флоу MAX) */
  const createChat = useCallback(
    async (rawPhone: string) => {
      if (!creds) return;
      const phone = normalizePhone(rawPhone);
      if (!phone) throw new Error('Введите номер телефона');
      const result = await api.checkAccount(creds, phone);
      if (!result?.exist || !result.chatId) {
        throw new Error('Аккаунт MAX не найден на номере +' + phone);
      }
      setChats((prev) => {
        if (prev.some((c) => c.chatId === result.chatId)) return prev;
        return [{ chatId: result.chatId, phone, name: '', messages: [] }, ...prev];
      });
      setActiveChatId(result.chatId);
    },
    [creds],
  );

  const sendText = useCallback(
    async (chatId: string, text: string) => {
      if (!creds) return;
      const localId = `local-${Date.now()}`;
      appendMessage(chatId, null, {
        id: localId,
        text,
        timestamp: Date.now(),
        outgoing: true,
        status: 'sending',
      });
      try {
        const { idMessage } = await api.sendMessage(creds, chatId, text);
        setChats((prev) =>
          prev.map((chat) =>
            chat.chatId === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map((m) =>
                    m.id === localId ? { ...m, id: String(idMessage), status: 'sent' as const } : m,
                  ),
                }
              : chat,
          ),
        );
      } catch (err) {
        updateMessageStatus(localId, 'failed');
        throw err;
      }
    },
    [creds, appendMessage, updateMessageStatus],
  );

  if (!creds) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const activeChat = chats.find((c) => c.chatId === activeChatId) ?? null;

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onCreateChat={createChat}
        onLogout={handleLogout}
        instanceState={instanceState}
        idInstance={creds.idInstance}
      />
      <ChatWindow chat={activeChat} onSend={sendText} />
    </div>
  );
}
