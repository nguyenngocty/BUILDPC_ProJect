import "./css/CategoryTable.css";
import CategoryStatusSwitch from "./CategoryStatusSwitch";
import CategoryActionMenu from "./CategoryActionMenu";

function CategoryTable({
  categories = [],
  loading = false,
  viewMode = "all",
  selectedCategories = [],
  onSelectCategory,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onRestore,
  onForceDelete,
  onToggleStatus,
}) {
  if (loading) {
    return (
      <div className="category-table-wrapper">
        <div className="category-table-loading">
          <i className="bi bi-arrow-repeat spin"></i>
          <span>Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="category-table-wrapper">
      <table className="category-table">
        <thead>
          <tr>
            <th width="50">
              <input
                type="checkbox"
                checked={
                  categories.length > 0 &&
                  selectedCategories.length === categories.length
                }
                onChange={onSelectAll}
              />
            </th>

            <th width="90">Ảnh</th>

            <th>Tên danh mục</th>

            <th width="180">Slug</th>

            <th>Mô tả</th>

            <th width="140">Trạng thái</th>

            <th width="140">Ngày tạo</th>

            <th width="90">Thao tác</th>
          </tr>
        </thead>

        <tbody>
          {categories.length === 0 ? (
            <tr>
              <td colSpan="8">
                <div className="category-empty">
                  <i className="bi bi-folder2-open"></i>

                  <p>Không có danh mục nào.</p>
                </div>
              </td>
            </tr>
          ) : (
            categories.map((category) => (
              <tr key={category.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => onSelectCategory(category.id)}
                  />
                </td>

                <td>
                  {category.image ? (
                    <img
                      src={`http://localhost:5000${category.image}`}
                      alt={category.name}
                      className="category-image"
                    />
                  ) : (
                    <div className="category-no-image">
                      <i className="bi bi-image"></i>
                    </div>
                  )}
                </td>

                <td>
                  <div className="category-name">{category.name}</div>
                </td>

                <td>
                  <code>{category.slug}</code>
                </td>

                <td>
                  <div className="category-description">
                    {category.description
                      ? category.description.length > 60
                        ? category.description.slice(0, 60) + "..."
                        : category.description
                      : "--"}
                  </div>
                </td>
                <td>
                  <CategoryStatusSwitch
                    status={category.status}
                    onToggle={() => onToggleStatus(category)}
                  />
                </td>

                <td>
                  {new Date(category.created_at).toLocaleDateString("vi-VN")}
                </td>

                <td className="category-action">
                  <CategoryActionMenu
                    category={category}
                    viewMode={viewMode}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onRestore={onRestore}
                    onForceDelete={onForceDelete}
                    onToggleStatus={onToggleStatus}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default CategoryTable;
