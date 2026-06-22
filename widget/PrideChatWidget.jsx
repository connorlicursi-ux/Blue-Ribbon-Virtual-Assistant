import { useState, useRef, useEffect } from "react";

const PROXY_URL = "https://pride-landscape-virtual-assistant.vercel.app/api/chat";
const MAX_SESSION_MESSAGES = 10; // per session limit

const PrideChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm Pride Landscaping's assistant. Ask me anything about our services, service area, or how to get a free estimate!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (sessionCount >= MAX_SESSION_MESSAGES) {
      setError("You've reached the session limit. Please call Nick directly at 440-622-2693!");
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setError(null);

    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const history = newMessages.slice(1, -1); // exclude intro message and latest user msg

      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, history }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please call 440-622-2693.");
        setMessages(newMessages.slice(0, -1)); // remove failed user message
        return;
      }

      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      setSessionCount((c) => c + 1);
    } catch {
      setError("Connection error. Please call Nick at 440-622-2693.");
      setMessages(newMessages.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat bubble toggle button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "#C9A86C",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        aria-label="Open Pride Landscaping assistant"
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0d1a10" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0d1a10" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "96px",
            right: "24px",
            zIndex: 9998,
            width: "340px",
            maxHeight: "520px",
            background: "#0d1a10",
            borderRadius: "16px",
            boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
            border: "1px solid rgba(201,168,108,0.2)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "'Syne', sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #0d1a10, #1a3020)",
              padding: "14px 16px",
              borderBottom: "1px solid rgba(201,168,108,0.15)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#C9A86C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d1a10" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <div style={{ color: "#e8f0e9", fontWeight: 700, fontSize: "14px", letterSpacing: "0.02em" }}>
                Pride Landscaping
              </div>
              <div style={{ color: "#C9A86C", fontSize: "11px", letterSpacing: "0.05em" }}>
                ● Online now
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxHeight: "340px",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 13px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user" ? "#C9A86C" : "rgba(255,255,255,0.06)",
                    color: msg.role === "user" ? "#0d1a10" : "#e8f0e9",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    border: msg.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none",
                    fontWeight: msg.role === "user" ? 600 : 400,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "14px 14px 14px 4px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    gap: "5px",
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#C9A86C",
                        animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: "rgba(255,80,80,0.12)",
                  border: "1px solid rgba(255,80,80,0.2)",
                  borderRadius: "10px",
                  padding: "10px 13px",
                  color: "#ff9090",
                  fontSize: "12px",
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "12px",
              borderTop: "1px solid rgba(201,168,108,0.1)",
              display: "flex",
              gap: "8px",
              background: "rgba(0,0,0,0.2)",
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 400))}
              onKeyDown={handleKeyDown}
              placeholder="Ask about services, pricing..."
              disabled={isLoading || sessionCount >= MAX_SESSION_MESSAGES}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "9px 12px",
                color: "#e8f0e9",
                fontSize: "13px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim() || sessionCount >= MAX_SESSION_MESSAGES}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: input.trim() && !isLoading ? "#C9A86C" : "rgba(201,168,108,0.3)",
                border: "none",
                cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d1a10" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "6px",
              textAlign: "center",
              fontSize: "10px",
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "0.05em",
            }}
          >
            POWERED BY LICURSI STUDIOS
          </div>
        </div>
      )}

      {/* Bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
};

export default PrideChatWidget;
