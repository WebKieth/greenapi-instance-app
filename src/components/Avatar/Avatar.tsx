import styles from './Avatar.module.css';

export default function Avatar({ title }: { title: string }) {
  return (
    <div className={styles.avatar} aria-hidden="true">
      {title.trim().charAt(0).toUpperCase() || '?'}
    </div>
  );
}
