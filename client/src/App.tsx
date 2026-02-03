import { useState, useEffect } from 'react';
import styles from './App.module.css';

function App() {
  const [apiStatus, setApiStatus] = useState<string>('Checking...');

  useEffect(() => {
    fetch('/api/test')
      .then(res => res.json())
      .then(data => setApiStatus(data.message))
      .catch(() => setApiStatus('API connection failed'));
  }, []);

  return (
    <div className={styles.app}>
      <h1>🎲 Place-A-Bet</h1>
      <p>A simple betting app for parties and events</p>
      <div className={styles.status}>
        <strong>API Status:</strong> {apiStatus}
      </div>
    </div>
  );
}

export default App;
