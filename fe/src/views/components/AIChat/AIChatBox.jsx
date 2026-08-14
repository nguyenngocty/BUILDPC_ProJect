import React, { useEffect, useRef, useState } from "react";

import "./AIChat.css";

import aiChatService from "../../../services/aiChatService";

// ======================================================
// CONFIG
// ======================================================

const MAX_MESSAGE_LENGTH = 1500;

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Xin chào 👋 Mình là BuildPC AI. Mình có thể tư vấn Build PC, lựa chọn linh kiện, nâng cấp máy tính và giải đáp các vấn đề phần cứng cơ bản.",
};

// ======================================================
// QUICK QUESTIONS
// ======================================================

const QUICK_QUESTIONS = [
  {
    icon: "bi-pc-display-horizontal",
    label: "Build PC 20 triệu",
    message: "Tôi có khoảng 20 triệu, hãy tư vấn cho tôi một bộ PC.",
  },
  {
    icon: "bi-controller",
    label: "PC Gaming",
    message:
      "Tôi muốn build PC gaming, bạn cần tôi cung cấp những thông tin gì?",
  },
  {
    icon: "bi-tools",
    label: "Nâng cấp PC",
    message:
      "Tôi muốn nâng cấp máy tính hiện tại, bạn có thể tư vấn cho tôi không?",
  },
  {
    icon: "bi-cpu",
    label: "Tư vấn linh kiện",
    message: "Tôi cần tư vấn lựa chọn linh kiện máy tính.",
  },
];

// ======================================================
// CREATE MESSAGE ID
// ======================================================

const createMessageId = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

// ======================================================
// COMPONENT
// ======================================================

const AIChatBox = () => {
  // ====================================================
  // CHAT UI
  // ====================================================

  const [isOpen, setIsOpen] = useState(false);

  const [messages, setMessages] = useState([WELCOME_MESSAGE]);

  const [input, setInput] = useState("");

  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  // ====================================================
  // AI STATUS
  // ====================================================

  const [aiAvailable, setAiAvailable] = useState(true);

  const [checkingStatus, setCheckingStatus] = useState(false);

  const [aiInfo, setAiInfo] = useState({
    provider: "gemini",
    model: "",
  });

  // ====================================================
  // GEMINI SESSION
  //
  // Backend trả response_id dạng gem_xxx.
  // Chúng ta giữ nó trong component để AI nhớ hội thoại.
  // ====================================================

  const [previousResponseId, setPreviousResponseId] = useState(null);

  // ====================================================
  // REFS
  // ====================================================

  const messagesEndRef = useRef(null);

  const textareaRef = useRef(null);

  // ====================================================
  // LOAD AI STATUS
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      try {
        setCheckingStatus(true);

        const response = await aiChatService.getStatus();

        if (cancelled) {
          return;
        }

        const data = response?.data?.data;

        setAiAvailable(Boolean(data?.available));

        setAiInfo({
          provider: data?.provider || "gemini",

          model: data?.model || "",
        });
      } catch (statusError) {
        console.error("Không thể kiểm tra trạng thái AI:", statusError);

        if (!cancelled) {
          setAiAvailable(false);
        }
      } finally {
        if (!cancelled) {
          setCheckingStatus(false);
        }
      }
    };

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  // ====================================================
  // AUTO SCROLL
  // ====================================================

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, sending, isOpen]);

  // ====================================================
  // FOCUS INPUT WHEN OPEN
  // ====================================================

  useEffect(() => {
    if (isOpen && aiAvailable && !sending) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [isOpen, aiAvailable, sending]);

  // ====================================================
  // OPEN / CLOSE
  // ====================================================

  const toggleChat = () => {
    setIsOpen((previous) => !previous);

    setError("");
  };

  // ====================================================
  // RESET CHAT
  // ====================================================

  const handleNewChat = () => {
    if (sending) {
      return;
    }

    setMessages([WELCOME_MESSAGE]);

    setPreviousResponseId(null);

    setInput("");

    setError("");

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // ====================================================
  // ADD MESSAGE
  // ====================================================

  const addMessage = (role, content) => {
    const message = {
      id: createMessageId(),
      role,
      content,
    };

    setMessages((previous) => [...previous, message]);

    return message;
  };

  // ====================================================
  // SEND MESSAGE
  // ====================================================

  const sendMessage = async (customMessage = null) => {
    if (sending || !aiAvailable) {
      return;
    }

    const text = String(customMessage ?? input).trim();

    if (!text) {
      return;
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      setError(`Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự.`);

      return;
    }

    // ==================================================
    // USER MESSAGE
    // ==================================================

    addMessage("user", text);

    setInput("");

    setError("");

    setSending(true);

    try {
      const response = await aiChatService.sendMessage({
        message: text,

        previousResponseId,
      });

      const data = response?.data?.data;

      const aiMessage = String(data?.message || "").trim();

      if (!aiMessage) {
        throw new Error("AI không trả về nội dung.");
      }

      // =================================================
      // SAVE GEMINI SESSION
      // =================================================

      if (data?.response_id) {
        setPreviousResponseId(data.response_id);
      }

      // =================================================
      // ASSISTANT MESSAGE
      // =================================================

      addMessage("assistant", aiMessage);
    } catch (requestError) {
      console.error("Lỗi BuildPC AI:", requestError);

      const responseMessage = requestError?.response?.data?.message;

      const responseCode = requestError?.response?.data?.code;

      let displayMessage =
        responseMessage || "BuildPC AI đang gặp sự cố. Vui lòng thử lại.";

      // =================================================
      // FRIENDLY ERRORS
      // =================================================

      if (responseCode === "AI_RATE_LIMIT") {
        displayMessage =
          "Bạn đang gửi tin nhắn hơi nhanh 😅. Vui lòng đợi một chút rồi thử lại.";
      }

      if (responseCode === "AI_QUOTA_EXCEEDED") {
        displayMessage =
          "BuildPC AI đã chạm giới hạn miễn phí tạm thời. Vui lòng thử lại sau.";
      }

      if (responseCode === "AI_SERVICE_UNAVAILABLE") {
        displayMessage =
          "Gemini đang hơi quá tải. Bạn thử lại sau một chút nhé.";
      }

      if (responseCode === "AI_SAFETY_BLOCK") {
        displayMessage =
          "BuildPC AI không thể xử lý nội dung này. Bạn thử diễn đạt câu hỏi theo cách khác nhé.";
      }

      setError(displayMessage);
    } finally {
      setSending(false);
    }
  };

  // ====================================================
  // QUICK QUESTION
  // ====================================================

  const handleQuickQuestion = (question) => {
    sendMessage(question);
  };

  // ====================================================
  // INPUT CHANGE
  // ====================================================

  const handleInputChange = (event) => {
    const value = event.target.value;

    if (value.length <= MAX_MESSAGE_LENGTH) {
      setInput(value);
    }

    if (error) {
      setError("");
    }
  };

  // ====================================================
  // KEY DOWN
  //
  // Enter       => gửi
  // Shift+Enter => xuống dòng
  // ====================================================

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      sendMessage();
    }
  };

  // ====================================================
  // FORMAT MESSAGE
  //
  // Không cần cài thư viện Markdown.
  // CSS white-space: pre-wrap sẽ giữ xuống dòng.
  // ====================================================

  const renderMessage = (content) => {
    return String(content || "");
  };

  // ====================================================
  // SHOW QUICK QUESTIONS?
  // ====================================================

  const showQuickQuestions = messages.length <= 1 && !sending;

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <>
      {/* =================================================
          FLOAT BUTTON
      ================================================= */}

      <button
        type="button"
        className={`ai-chat-floating-button ${isOpen ? "active" : ""}`}
        onClick={toggleChat}
        aria-label={isOpen ? "Đóng BuildPC AI" : "Mở BuildPC AI"}
      >
        {isOpen ? (
          <i className="bi bi-x-lg" />
        ) : (
          <>
            <i className="bi bi-stars ai-chat-main-icon" />

            <span className="ai-chat-pulse" />
          </>
        )}
      </button>

      {/* =================================================
          CHAT WINDOW
      ================================================= */}

      <div className={`ai-chat-window ${isOpen ? "open" : ""}`}>
        {/* ===============================================
            HEADER
        =============================================== */}

        <div className="ai-chat-header">
          <div className="ai-chat-header-info">
            <div className="ai-chat-avatar">
              <i className="bi bi-stars" />
            </div>

            <div>
              <div className="ai-chat-title">
                BuildPC AI
                <span className="ai-chat-ai-badge">AI</span>
              </div>

              <div className="ai-chat-status">
                <span
                  className={`ai-chat-status-dot ${
                    aiAvailable ? "online" : "offline"
                  }`}
                />

                {checkingStatus
                  ? "Đang kiểm tra..."
                  : aiAvailable
                    ? "Sẵn sàng tư vấn"
                    : "Tạm thời không khả dụng"}
              </div>
            </div>
          </div>

          <div className="ai-chat-header-actions">
            <button
              type="button"
              className="ai-chat-header-btn"
              onClick={handleNewChat}
              disabled={sending}
              title="Cuộc trò chuyện mới"
            >
              <i className="bi bi-arrow-clockwise" />
            </button>

            <button
              type="button"
              className="ai-chat-header-btn"
              onClick={toggleChat}
              title="Thu nhỏ"
            >
              <i className="bi bi-dash-lg" />
            </button>
          </div>
        </div>

        {/* ===============================================
            BODY
        =============================================== */}

        <div className="ai-chat-body">
          {/* =============================================
              AI UNAVAILABLE
          ============================================= */}

          {!checkingStatus && !aiAvailable && (
            <div className="ai-chat-unavailable">
              <div className="ai-chat-unavailable-icon">
                <i className="bi bi-robot" />
              </div>

              <strong>BuildPC AI đang tạm nghỉ</strong>

              <p>
                Hệ thống AI hiện chưa khả dụng. Bạn vẫn có thể sử dụng trang
                Liên hệ & Tư vấn để được hỗ trợ.
              </p>
            </div>
          )}

          {/* =============================================
              MESSAGES
          ============================================= */}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`ai-chat-message-row ${
                message.role === "user" ? "user" : "assistant"
              }`}
            >
              {message.role === "assistant" && (
                <div className="ai-chat-message-avatar">
                  <i className="bi bi-stars" />
                </div>
              )}

              <div className={`ai-chat-message ${message.role}`}>
                {renderMessage(message.content)}
              </div>
            </div>
          ))}

          {/* =============================================
              QUICK QUESTIONS
          ============================================= */}

          {showQuickQuestions && aiAvailable && (
            <div className="ai-chat-quick-section">
              <span className="ai-chat-quick-title">Bạn có thể thử hỏi:</span>

              <div className="ai-chat-quick-list">
                {QUICK_QUESTIONS.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    className="ai-chat-quick-item"
                    onClick={() => handleQuickQuestion(item.message)}
                  >
                    <i className={`bi ${item.icon}`} />

                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* =============================================
              AI TYPING
          ============================================= */}

          {sending && (
            <div className="ai-chat-message-row assistant">
              <div className="ai-chat-message-avatar">
                <i className="bi bi-stars" />
              </div>

              <div className="ai-chat-message assistant ai-chat-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          {/* =============================================
              ERROR
          ============================================= */}

          {error && (
            <div className="ai-chat-error">
              <i className="bi bi-exclamation-circle-fill" />

              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ===============================================
            FOOTER INPUT
        =============================================== */}

        <div className="ai-chat-footer">
          <div className="ai-chat-input-wrapper">
            <textarea
              ref={textareaRef}
              className="ai-chat-input"
              placeholder={
                aiAvailable ? "Hỏi BuildPC AI..." : "AI hiện không khả dụng"
              }
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={sending || !aiAvailable}
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
            />

            <button
              type="button"
              className="ai-chat-send-button"
              onClick={() => sendMessage()}
              disabled={sending || !aiAvailable || !input.trim()}
              title="Gửi tin nhắn"
            >
              {sending ? (
                <i className="bi bi-arrow-repeat ai-chat-spin" />
              ) : (
                <i className="bi bi-send-fill" />
              )}
            </button>
          </div>

          <div className="ai-chat-footer-meta">
            <span>
              <i className="bi bi-stars" />
              AI có thể đưa ra thông tin chưa chính xác
            </span>

            <span className={input.length > 1350 ? "warning" : ""}>
              {input.length}/{MAX_MESSAGE_LENGTH}
            </span>
          </div>

          {aiInfo.model && (
            <div className="ai-chat-model-info">Powered by Gemini</div>
          )}
        </div>
      </div>
    </>
  );
};

export default AIChatBox;
