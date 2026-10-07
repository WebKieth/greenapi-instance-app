import { useState, type FormEvent } from 'react';
import { getStateInstance } from '../../api/greenApi';
import { errorMessage } from '../../utils/errors';
import type { Credentials } from '../../types';
import styles from './LoginScreen.module.css';

const DEFAULT_API_URL = 'https://api.green-api.com';

interface LoginScreenProps {
  onLogin: (creds: Credentials) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const id = idInstance.trim();
    const token = apiTokenInstance.trim();
    if (!/^\d+$/.test(id)) {
      setError('idInstance должен содержать только цифры');
      return;
    }
    if (!token) {
      setError('Введите apiTokenInstance');
      return;
    }

    const creds: Credentials = {
      idInstance: id,
      apiTokenInstance: token,
      apiUrl: apiUrl.trim() || DEFAULT_API_URL,
    };
    setLoading(true);
    try {
      const state = await getStateInstance(creds);
      const status = state?.stateInstance;
      if (status && status !== 'authorized') {
        setError(
          `Инстанс не авторизован (статус: ${status}). ` +
            'Авторизуйте инстанс в личном кабинете GREEN-API и повторите.',
        );
        return;
      }
      onLogin(creds);
    } catch (err) {
      setError(`Не удалось подключиться: ${errorMessage(err)}. Проверьте idInstance и apiTokenInstance.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.logo} aria-hidden="true">
          <svg viewBox="0 0 48 48" width="44" height="44">
            <circle cx="24" cy="24" r="22" fill="url(#loginGradient)" />
            <circle cx="24" cy="24" r="12" fill="none" stroke="#fff" strokeWidth="4" />
            <defs>
              <linearGradient id="loginGradient" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0" stopColor="#0077ff" />
                <stop offset="1" stopColor="#7b61ff" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className={styles.title}>MAX чат</h1>
        <p className={styles.subtitle}>Войдите с учетными данными инстанса GREEN-API</p>

        <label className={styles.field}>
          <span className={styles.label}>idInstance</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="1101000001"
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            autoComplete="off"
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>apiTokenInstance</span>
          <input
            type="password"
            placeholder="••••••••••••••••"
            value={apiTokenInstance}
            onChange={(e) => setApiTokenInstance(e.target.value)}
            autoComplete="off"
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>apiUrl (из личного кабинета)</span>
          <input
            type="text"
            placeholder={DEFAULT_API_URL}
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            autoComplete="off"
          />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? 'Подключение...' : 'Войти'}
        </button>

        <p className={styles.hint}>
          Данные берутся в{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личном кабинете GREEN-API
          </a>
        </p>
      </form>
    </div>
  );
}
