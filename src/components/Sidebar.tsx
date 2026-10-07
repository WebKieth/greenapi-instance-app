import { useRef, useState, type FormEvent } from 'react';
import { formatPhone } from '../utils/phone';
import { errorMessage } from '../utils/errors';
import type { Chat } from '../types';

function Avatar({ title }: { title: string }) {
  const letter = title.trim().charAt(0).toUpperCase() || '?';
  return (
    <div className="avatar" aria-hidden="true">
      {letter}
    </div>
  );
}

function chatTitle(chat: Chat): string {
  return chat.name || (chat.phone ? formatPhone(chat.phone) : `Чат ${chat.chatId}`);
}

function lastMessage(chat: Chat): string {
  const msg = chat.messages[chat.messages.length - 1];
  if (!msg) return 'Нет сообщений';
  return (msg.outgoing ? 'Вы: ' : '') + msg.text;
}

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: (rawPhone: string) => Promise<void>;
  onLogout: () => void;
  instanceState: string | null;
  idInstance: string;
}

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
  onLogout,
  instanceState,
  idInstance,
}: SidebarProps) {
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setCreating(true);
    try {
      await onCreateChat(phone);
      setPhone('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="sidebar">
      <nav className="rail" aria-label="Навигация">
        <button className="rail-button rail-button--active" title="Чаты" aria-label="Чаты">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
            <path d="M12 2C6.48 2 2 5.94 2 10.8c0 2.64 1.35 5.02 3.5 6.61L5 22l4.9-2.45c.67.1 1.37.15 2.1.15 5.52 0 10-3.94 10-8.9C22 5.94 17.52 2 12 2z" />
          </svg>
        </button>
        <button
          className="rail-button rail-button--bottom"
          onClick={onLogout}
          title="Выйти из инстанса"
          aria-label="Выйти"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </nav>

      <div className="sidebar-content">
        <header className="sidebar-header">
          <span className="sidebar-title">Чаты</span>
          <button
            className="plus-button"
            onClick={() => phoneInputRef.current?.focus()}
            title="Новый чат"
            aria-label="Новый чат"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </header>

        <form className="new-chat" onSubmit={handleCreate}>
          <input
            ref={phoneInputRef}
            type="tel"
            placeholder="Номер телефона получателя"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-label="Номер телефона получателя"
          />
          {phone.trim() && (
            <button className="button-primary button-compact" type="submit" disabled={creating}>
              {creating ? '...' : 'Создать'}
            </button>
          )}
        </form>
        {error && (
          <p className="sidebar-error" role="alert">
            {error}
          </p>
        )}

        <ul className="chat-list">
          {chats.length === 0 && (
            <li className="chat-list-empty">Введите номер телефона, чтобы создать чат</li>
          )}
          {chats.map((chat) => (
            <li key={chat.chatId}>
              <button
                type="button"
                className={`chat-item${chat.chatId === activeChatId ? ' chat-item--active' : ''}`}
                onClick={() => onSelectChat(chat.chatId)}
              >
                <Avatar title={chatTitle(chat)} />
                <span className="chat-item-body">
                  <span className="chat-item-title">{chatTitle(chat)}</span>
                  <span className="chat-item-preview">{lastMessage(chat)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <footer className="sidebar-footer">
          <span
            className={`status-dot ${instanceState === 'authorized' ? 'status-dot--ok' : 'status-dot--warn'}`}
            aria-hidden="true"
          />
          <span className="sidebar-footer-text">
            Инстанс {idInstance} — {instanceState || 'проверка...'}
          </span>
        </footer>
      </div>
    </aside>
  );
}
