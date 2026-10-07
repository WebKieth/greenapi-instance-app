import { useEffect, useRef, useState, type FormEvent } from 'react';
import { formatPhone } from '../../utils/phone';
import { errorMessage } from '../../utils/errors';
import type { Chat, MessageStatus } from '../../types';
import Avatar from '../Avatar/Avatar';
import styles from './ChatWindow.module.css';

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusIcon({ status }: { status?: MessageStatus }) {
  if (!status) return null;
  if (status === 'sending') {
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 14" />
      </svg>
    );
  }
  if (status === 'failed') {
    return (
      <svg className={styles.failed} viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="13" />
        <line x1="12" y1="16.5" x2="12.01" y2="16.5" />
      </svg>
    );
  }
  // sent: одна галочка, delivered/read: две (read — выделенная)
  return (
    <svg
      className={status === 'read' ? styles.read : undefined}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 12.5 8 16.5 15 8" />
      {(status === 'delivered' || status === 'read') && <polyline points="11 15 12.5 16.5 19.5 8" />}
    </svg>
  );
}

interface ChatWindowProps {
  chat: Chat | null;
  onSend: (chatId: string, text: string) => Promise<void>;
}

export default function ChatWindow({ chat, onSend }: ChatWindowProps) {
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messageCount = chat?.messages.length ?? 0;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.chatId, messageCount]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = text.trim();
    if (!message || !chat || sending) return;
    setSendError('');
    setSending(true);
    try {
      await onSend(chat.chatId, message);
      setText('');
    } catch (err) {
      setSendError(`Не отправлено: ${errorMessage(err)}`);
    } finally {
      setSending(false);
    }
  };

  if (!chat) {
    return (
      <main className={`${styles.window} ${styles.empty}`}>
        <p>Выберите чат или создайте новый по номеру телефона</p>
      </main>
    );
  }

  const title = chat.name || (chat.phone ? formatPhone(chat.phone) : `Чат ${chat.chatId}`);

  return (
    <main className={styles.window}>
      <header className={styles.header}>
        <Avatar title={title} />
        <div className={styles.info}>
          <span className={styles.title}>{title}</span>
          <span className={styles.subtitle}>MAX</span>
        </div>
      </header>

      <div className={styles.messages}>
        {chat.messages.length === 0 && (
          <p className={styles.emptyMessages}>Напишите первое сообщение — оно уйдет в MAX получателю</p>
        )}
        {chat.messages.map((msg) => (
          <div key={msg.id} className={`${styles.bubble} ${msg.outgoing ? styles.outgoing : styles.incoming}`}>
            <span>{msg.text}</span>
            <span className={styles.meta}>
              <time>{formatTime(msg.timestamp)}</time>
              {msg.outgoing && <StatusIcon status={msg.status} />}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className={styles.composer} onSubmit={handleSend}>
        {sendError && (
          <p className={styles.error} role="alert">
            {sendError}
          </p>
        )}
        <div className={styles.row}>
          <input
            type="text"
            placeholder="Сообщение"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Текст сообщения"
          />
          <button
            className={styles.sendButton}
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Отправить сообщение"
            title="Отправить"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M3.4 20.4l17.4-7.5c.8-.35.8-1.45 0-1.8L3.4 3.6c-.66-.29-1.39.2-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .72.73 1.2 1.39.91z" />
            </svg>
          </button>
        </div>
      </form>
    </main>
  );
}
