import { useCallback, useEffect, useState } from "react";
import "./App.css";

const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const statusUrl = `${apiBase}/api/status`;
const memosUrl = `${apiBase}/api/memos`;

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

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function App() {
  const [status, setStatus] = useState("checking");
  const [databaseConnected, setDatabaseConnected] = useState(false);
  const [latency, setLatency] = useState(null);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [error, setError] = useState("");
  const [memos, setMemos] = useState([]);
  const [memoContent, setMemoContent] = useState("");
  const [memosLoading, setMemosLoading] = useState(true);
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoError, setMemoError] = useState("");

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
      setDatabaseConnected(Boolean(data.databaseConnected));
      setLatency(Math.round(performance.now() - startedAt));
    } catch (requestError) {
      setStatus("disconnected");
      setDatabaseConnected(false);
      setLatency(null);
      setError(requestError instanceof Error ? requestError.message : "Unknown error");
    } finally {
      setLastCheckedAt(new Date());
    }
  }, []);

  const loadMemos = useCallback(async () => {
    setMemosLoading(true);
    setMemoError("");

    try {
      const response = await fetch(memosUrl, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setMemos(Array.isArray(data.memos) ? data.memos : []);
    } catch (requestError) {
      setMemoError(requestError instanceof Error ? requestError.message : "메모 조회 실패");
    } finally {
      setMemosLoading(false);
    }
  }, []);

  const submitMemo = async (event) => {
    event.preventDefault();

    const content = memoContent.trim();
    if (!content || memoSaving) {
      return;
    }

    setMemoSaving(true);
    setMemoError("");

    try {
      const response = await fetch(memosUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setMemos((currentMemos) => [data.memo, ...currentMemos]);
      setMemoContent("");
    } catch (requestError) {
      setMemoError(requestError instanceof Error ? requestError.message : "메모 저장 실패");
    } finally {
      setMemoSaving(false);
    }
  };

  useEffect(() => {
    checkBackend();
    loadMemos();
  }, [checkBackend, loadMemos]);

  return (
    <main className="app">
      <section className="shell" aria-label="Backend connection status">
        <header className="header">
          <p className="eyebrow">Heimdall Pipeline Test</p>
          <h1>Frontend ↔ Backend ↔ DB</h1>
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
              <dt>Database</dt>
              <dd>{databaseConnected ? "Postgres 연결 완료" : "-"}</dd>
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

        <section className="memo-panel" aria-label="Memo database test">
          <div className="memo-header">
            <div>
              <p className="eyebrow">Postgres Memo</p>
              <h2>메모 작성 / 조회</h2>
            </div>
            <button className="secondary-button" type="button" onClick={loadMemos}>
              새로고침
            </button>
          </div>

          <form className="memo-form" onSubmit={submitMemo}>
            <textarea
              aria-label="메모 내용"
              maxLength={500}
              placeholder="DB에 저장할 메모를 입력하세요."
              value={memoContent}
              onChange={(event) => setMemoContent(event.target.value)}
            />
            <button className="save-button" type="submit" disabled={!memoContent.trim() || memoSaving}>
              {memoSaving ? "저장 중" : "저장"}
            </button>
          </form>

          {memoError ? <p className="error memo-error">메모 오류: {memoError}</p> : null}

          <div className="memo-list" aria-live="polite">
            {memosLoading ? (
              <p className="empty-state">메모 조회 중</p>
            ) : memos.length === 0 ? (
              <p className="empty-state">아직 저장된 메모가 없습니다.</p>
            ) : (
              <ul>
                {memos.map((memo) => (
                  <li key={memo.id}>
                    <p>{memo.content}</p>
                    <time dateTime={memo.createdAt}>{formatDateTime(memo.createdAt)}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
