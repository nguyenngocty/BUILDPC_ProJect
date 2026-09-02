import { useEffect, useRef, useState } from "react";

import { isRichTextEmpty, sanitizeRichTextHtml } from "../../../utils/richText";

import "./RichTextEditor.css";

// ============================================================
// RICH TEXT EDITOR
// ============================================================

function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Nhập nội dung...",
  disabled = false,
}) {
  const editorRef = useRef(null);

  const savedSelectionRef = useRef(null);

  const [isEmpty, setIsEmpty] = useState(() => isRichTextEmpty(value));

  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,

    insertUnorderedList: false,
    insertOrderedList: false,

    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
  });

  const [blockFormat, setBlockFormat] = useState("p");

  // ==========================================================
  // SET INITIAL / EXTERNAL VALUE
  // ==========================================================

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    /*
     * Khi đang nhập trong editor, không được liên tục gán
     * innerHTML vì sẽ làm caret nhảy về đầu/cuối.
     */
    if (document.activeElement === editor) {
      return;
    }

    const safeValue = sanitizeRichTextHtml(value || "");

    if (editor.innerHTML !== safeValue) {
      editor.innerHTML = safeValue;
    }

    setIsEmpty(isRichTextEmpty(safeValue));
  }, [value]);

  // ==========================================================
  // EMIT CHANGE
  // ==========================================================

  const emitChange = () => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const rawHtml = editor.innerHTML || "";

    const safeHtml = sanitizeRichTextHtml(rawHtml);

    setIsEmpty(isRichTextEmpty(safeHtml));

    onChange?.(safeHtml);
  };

  // ==========================================================
  // SAVE SELECTION
  // ==========================================================

  const saveSelection = () => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    /*
     * Chỉ lưu selection nếu caret hiện tại thực sự nằm
     * bên trong editor.
     */
    if (
      !editor.contains(range.commonAncestorContainer) &&
      range.commonAncestorContainer !== editor
    ) {
      return;
    }

    savedSelectionRef.current = range.cloneRange();
  };

  // ==========================================================
  // RESTORE SELECTION
  // ==========================================================

  const restoreSelection = () => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.focus();

    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    const savedRange = savedSelectionRef.current;

    if (!savedRange) {
      return;
    }

    try {
      selection.removeAllRanges();

      selection.addRange(savedRange);
    } catch (error) {
      console.warn("Không thể khôi phục vị trí con trỏ:", error);
    }
  };

  // ==========================================================
  // UPDATE TOOLBAR STATE
  // ==========================================================

  const updateToolbarState = () => {
    if (disabled) {
      return;
    }

    try {
      setActiveStates({
        bold: document.queryCommandState("bold"),

        italic: document.queryCommandState("italic"),

        underline: document.queryCommandState("underline"),

        strikeThrough: document.queryCommandState("strikeThrough"),

        insertUnorderedList: document.queryCommandState("insertUnorderedList"),

        insertOrderedList: document.queryCommandState("insertOrderedList"),

        justifyLeft: document.queryCommandState("justifyLeft"),

        justifyCenter: document.queryCommandState("justifyCenter"),

        justifyRight: document.queryCommandState("justifyRight"),

        justifyFull: document.queryCommandState("justifyFull"),
      });
    } catch {
      // Không ảnh hưởng editor nếu browser không hỗ trợ queryCommandState.
    }

    try {
      let format = String(document.queryCommandValue("formatBlock") || "")
        .replace(/[<>]/g, "")
        .toLowerCase();

      if (format === "div") {
        format = "p";
      }

      if (!["p", "h2", "h3", "h4", "blockquote"].includes(format)) {
        format = "p";
      }

      setBlockFormat(format);
    } catch {
      setBlockFormat("p");
    }
  };

  // ==========================================================
  // EXEC COMMAND
  // ==========================================================

  const executeCommand = (command, commandValue = null) => {
    if (disabled) {
      return;
    }

    restoreSelection();

    try {
      document.execCommand(command, false, commandValue);
    } catch (error) {
      console.error(`Rich text command "${command}" error:`, error);
    }

    saveSelection();

    emitChange();

    updateToolbarState();
  };

  // ==========================================================
  // TOOL MOUSE DOWN
  //
  // preventDefault rất quan trọng.
  // Nếu không, click toolbar sẽ làm mất selection trong editor.
  // ==========================================================

  const handleToolMouseDown = (event) => {
    event.preventDefault();

    saveSelection();
  };

  // ==========================================================
  // BLOCK FORMAT
  // ==========================================================

  const handleBlockFormat = (event) => {
    if (disabled) {
      return;
    }

    const format = event.target.value;

    setBlockFormat(format);

    restoreSelection();

    try {
      document.execCommand("formatBlock", false, format);
    } catch (error) {
      console.error("Format block error:", error);
    }

    saveSelection();

    emitChange();

    updateToolbarState();
  };

  // ==========================================================
  // CREATE LINK
  // ==========================================================

  const handleCreateLink = () => {
    if (disabled) {
      return;
    }

    saveSelection();

    const url = window.prompt("Nhập đường dẫn liên kết:", "https://");

    if (!url) {
      restoreSelection();

      return;
    }

    let normalizedUrl = String(url).trim();

    if (!normalizedUrl) {
      return;
    }

    /*
     * Nếu người dùng nhập:
     *
     * google.com
     *
     * thì tự thêm https://.
     */
    if (
      !/^https?:\/\//i.test(normalizedUrl) &&
      !/^mailto:/i.test(normalizedUrl) &&
      !/^tel:/i.test(normalizedUrl)
    ) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    executeCommand("createLink", normalizedUrl);
  };

  // ==========================================================
  // REMOVE LINK
  // ==========================================================

  const handleRemoveLink = () => {
    executeCommand("unlink");
  };

  // ==========================================================
  // CLEAR FORMAT
  // ==========================================================

  const handleClearFormatting = () => {
    if (disabled) {
      return;
    }

    restoreSelection();

    try {
      document.execCommand("removeFormat", false, null);
    } catch (error) {
      console.error("Remove format error:", error);
    }

    /*
     * removeFormat không phải lúc nào cũng xử lý heading.
     * Chuyển block hiện tại về paragraph.
     */
    try {
      document.execCommand("formatBlock", false, "p");
    } catch {
      // Không cần làm gì.
    }

    saveSelection();

    emitChange();

    updateToolbarState();
  };

  // ==========================================================
  // UNDO / REDO
  // ==========================================================

  const handleUndo = () => {
    executeCommand("undo");
  };

  const handleRedo = () => {
    executeCommand("redo");
  };

  // ==========================================================
  // INPUT
  // ==========================================================

  const handleInput = () => {
    saveSelection();

    emitChange();

    updateToolbarState();
  };

  // ==========================================================
  // FOCUS
  // ==========================================================

  const handleFocus = () => {
    saveSelection();

    updateToolbarState();
  };

  // ==========================================================
  // KEY UP
  // ==========================================================

  const handleKeyUp = () => {
    saveSelection();

    updateToolbarState();
  };

  // ==========================================================
  // MOUSE UP
  // ==========================================================

  const handleMouseUp = () => {
    saveSelection();

    updateToolbarState();
  };

  // ==========================================================
  // PASTE
  //
  // Cho phép paste rich text nhưng sanitize trước.
  // ==========================================================

  const handlePaste = (event) => {
    if (disabled) {
      event.preventDefault();

      return;
    }

    event.preventDefault();

    const clipboard = event.clipboardData;

    if (!clipboard) {
      return;
    }

    const html = clipboard.getData("text/html");

    const plainText = clipboard.getData("text/plain");

    if (html) {
      const safeHtml = sanitizeRichTextHtml(html);

      document.execCommand("insertHTML", false, safeHtml);
    } else if (plainText) {
      const escapedText = plainText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");

      document.execCommand("insertHTML", false, escapedText);
    }

    saveSelection();

    emitChange();

    updateToolbarState();
  };

  // ==========================================================
  // TOOL COMPONENT
  // ==========================================================

  const ToolButton = ({ command, icon, title, active = false, onClick }) => {
    return (
      <button
        type="button"
        className={[
          "adm-rich-editor__tool",

          active && "adm-rich-editor__tool--active",
        ]
          .filter(Boolean)
          .join(" ")}
        title={title}
        aria-label={title}
        disabled={disabled}
        onMouseDown={handleToolMouseDown}
        onClick={() => {
          if (onClick) {
            onClick();

            return;
          }

          executeCommand(command);
        }}
      >
        <i className={`bi ${icon}`} />
      </button>
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className={["adm-rich-editor", disabled && "adm-rich-editor--disabled"]
        .filter(Boolean)
        .join(" ")}
    >
      {/* =====================================================
          TOOLBAR
          ===================================================== */}

      <div className="adm-rich-editor__toolbar">
        {/* BLOCK FORMAT */}

        <div className="adm-rich-editor__tool-group">
          <select
            className="adm-rich-editor__format"
            value={blockFormat}
            disabled={disabled}
            onMouseDown={saveSelection}
            onChange={handleBlockFormat}
            aria-label="Kiểu đoạn văn"
            title="Kiểu đoạn văn"
          >
            <option value="p">Đoạn văn</option>

            <option value="h2">Tiêu đề lớn</option>

            <option value="h3">Tiêu đề vừa</option>

            <option value="h4">Tiêu đề nhỏ</option>

            <option value="blockquote">Trích dẫn</option>
          </select>
        </div>

        <span className="adm-rich-editor__separator" />

        {/* TEXT STYLE */}

        <div className="adm-rich-editor__tool-group">
          <ToolButton
            command="bold"
            icon="bi-type-bold"
            title="In đậm"
            active={activeStates.bold}
          />

          <ToolButton
            command="italic"
            icon="bi-type-italic"
            title="In nghiêng"
            active={activeStates.italic}
          />

          <ToolButton
            command="underline"
            icon="bi-type-underline"
            title="Gạch chân"
            active={activeStates.underline}
          />

          <ToolButton
            command="strikeThrough"
            icon="bi-type-strikethrough"
            title="Gạch ngang"
            active={activeStates.strikeThrough}
          />
        </div>

        <span className="adm-rich-editor__separator" />

        {/* LIST */}

        <div className="adm-rich-editor__tool-group">
          <ToolButton
            command="insertUnorderedList"
            icon="bi-list-ul"
            title="Danh sách dấu chấm"
            active={activeStates.insertUnorderedList}
          />

          <ToolButton
            command="insertOrderedList"
            icon="bi-list-ol"
            title="Danh sách đánh số"
            active={activeStates.insertOrderedList}
          />
        </div>

        <span className="adm-rich-editor__separator" />

        {/* ALIGN */}

        <div className="adm-rich-editor__tool-group">
          <ToolButton
            command="justifyLeft"
            icon="bi-text-left"
            title="Căn trái"
            active={activeStates.justifyLeft}
          />

          <ToolButton
            command="justifyCenter"
            icon="bi-text-center"
            title="Căn giữa"
            active={activeStates.justifyCenter}
          />

          <ToolButton
            command="justifyRight"
            icon="bi-text-right"
            title="Căn phải"
            active={activeStates.justifyRight}
          />

          <ToolButton
            command="justifyFull"
            icon="bi-justify"
            title="Căn đều"
            active={activeStates.justifyFull}
          />
        </div>

        <span className="adm-rich-editor__separator" />

        {/* LINK */}

        <div className="adm-rich-editor__tool-group">
          <ToolButton
            icon="bi-link-45deg"
            title="Thêm liên kết"
            onClick={handleCreateLink}
          />

          <ToolButton
            icon="bi-link-45deg"
            title="Xóa liên kết"
            onClick={handleRemoveLink}
          />
        </div>

        <span className="adm-rich-editor__separator" />

        {/* CLEAN */}

        <div className="adm-rich-editor__tool-group">
          <ToolButton
            icon="bi-eraser"
            title="Xóa định dạng"
            onClick={handleClearFormatting}
          />
        </div>

        <span className="adm-rich-editor__separator" />

        {/* HISTORY */}

        <div className="adm-rich-editor__tool-group">
          <ToolButton
            icon="bi-arrow-counterclockwise"
            title="Hoàn tác"
            onClick={handleUndo}
          />

          <ToolButton
            icon="bi-arrow-clockwise"
            title="Làm lại"
            onClick={handleRedo}
          />
        </div>
      </div>

      {/* =====================================================
          EDITOR BODY
          ===================================================== */}

      <div className="adm-rich-editor__body">
        {isEmpty && (
          <div className="adm-rich-editor__placeholder">{placeholder}</div>
        )}

        <div
          ref={editorRef}
          className="adm-rich-editor__content"
          contentEditable={!disabled}
          suppressContentEditableWarning
          spellCheck
          role="textbox"
          aria-multiline="true"
          aria-disabled={disabled}
          onInput={handleInput}
          onFocus={handleFocus}
          onKeyUp={handleKeyUp}
          onMouseUp={handleMouseUp}
          onPaste={handlePaste}
          onBlur={() => {
            saveSelection();

            emitChange();
          }}
        />
      </div>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <div className="adm-rich-editor__footer">
        <span>
          <i className="bi bi-info-circle" />
          Có thể định dạng tiêu đề, văn bản, danh sách và liên kết.
        </span>

        <span>
          <i className="bi bi-shield-check" />
          Nội dung được làm sạch trước khi lưu.
        </span>
      </div>
    </div>
  );
}

export default RichTextEditor;
