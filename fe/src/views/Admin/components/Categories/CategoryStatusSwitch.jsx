import "./css/CategoryStatusSwitch.css";

function CategoryStatusSwitch({ status, onToggle }) {
  return (
    <button
      className={`category-status-switch ${
        Number(status) === 1 ? "active" : "inactive"
      }`}
      onClick={onToggle}
    >
      <span className="switch-dot"></span>

      <span className="switch-text">
        {Number(status) === 1 ? "Hoạt động" : "Tạm khóa"}
      </span>
    </button>
  );
}

export default CategoryStatusSwitch;
