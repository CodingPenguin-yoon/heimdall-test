import { useCallback, useEffect, useState } from "react";
import "./App.css";

const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const statusUrl = `${apiBase}/api/status`;

const statusText = {
  checking: "연결 확인 중",
  connected: "연결 완료",
  disconnected: "연결 X",
};

function formatTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

export default function App() {
  const [status, setStatus] = useState("checking");
  const [latency, setLatency] = useState(null);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [error, setError] = useState("");

  const checkBackend = useCallback(async () => {
    const startedAt = performance.now();

    setStatus("checking");
    setError("");

    try {
      const response = await fetch(statusUrl, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.connected) {
        throw new Error("Backend returned disconnected state");
      }

      setStatus("connected");
      setLatency(Math.round(performance.now() - startedAt));
    } catch (requestError) {
      setStatus("disconnected");
      setLatency(null);
      setError(requestError instanceof Error ? requestError.message : "Unknown error");
    } finally {
      setLastCheckedAt(new Date());
    }
  }, []);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  return (
    <main className="app">
      <section className="shell" aria-label="Backend connection status">
        <header className="header">
          <p className="eyebrow">Heimdall Pipeline Test</p>
          <h1>Frontend ↔ Backend</h1>
        </header>

        <div className="panel">
          <div className="status-row">
            <span className={`status-light ${status}`} aria-hidden="true" />
            <div className="status-copy">
              <p className="status-label">백엔드 연결 상태</p>
              <p className="status-value">{statusText[status]}</p>
            </div>
            <button
              className="refresh-button"
              type="button"
              onClick={checkBackend}
              disabled={status === "checking"}
            >
              다시 확인
            </button>
          </div>

          <dl className="details">
            <div className="detail">
              <dt>API</dt>
              <dd>{statusUrl}</dd>
            </div>
            <div className="detail">
              <dt>응답 시간</dt>
              <dd>{latency === null ? "-" : `${latency}ms`}</dd>
            </div>
            <div className="detail">
              <dt>마지막 확인</dt>
              <dd>{formatTime(lastCheckedAt)}</dd>
            </div>
          </dl>

          {error ? <p className="error">오류: {error}</p> : null}
        </div>
      </section>
    </main>
  );
}
