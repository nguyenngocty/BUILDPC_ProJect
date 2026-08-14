import "./css/ProductTable.css";
import ProductActionMenu from "./ProductActionMenu";
import ProductStatusSwitch from "./ProductStatusSwitch";

function ProductTable({
  products,
  loading,
  viewMode,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onStock,
  onStockHistory,
  onToggleStatus,
  onRestore,
  onForceDelete,
}) {
  console.log("ProductTable Render");
  const formatPrice = (price) => {
    return Number(price || 0).toLocaleString("vi-VN") + " ₫";
  };
  if (loading) {
    return <div className="product-table-loading">Đang tải dữ liệu...</div>;
  }
  return (
    <div className="product-table-wrapper">
      <table className="product-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={
                  products.length > 0 &&
                  selectedProducts.length === products.length
                }
                onChange={onSelectAll}
              />
            </th>

            <th>Ảnh</th>

            <th>SKU</th>

            <th>Tên sản phẩm</th>

            <th>Danh mục</th>

            <th>Giá</th>

            <th>Tồn kho</th>

            <th>Trạng thái</th>

            <th>Ngày tạo</th>

            <th>Thao tác</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            [...Array(10)].map((_, index) => (
              <tr key={index}>
                <td>
                  <div className="skeleton skeleton-checkbox"></div>
                </td>

                <td>
                  <div className="skeleton skeleton-image"></div>
                </td>

                <td>
                  <div className="skeleton skeleton-text short"></div>
                </td>

                <td>
                  <div className="skeleton skeleton-text"></div>
                </td>

                <td>
                  <div className="skeleton skeleton-tag"></div>
                </td>

                <td>
                  <div className="skeleton skeleton-price"></div>
                </td>

                <td>
                  <div className="skeleton skeleton-stock"></div>
                </td>

                <td>
                  <div className="skeleton skeleton-switch"></div>
                </td>

                <td>
                  <div className="skeleton skeleton-date"></div>
                </td>

                <td>
                  <div className="skeleton skeleton-action"></div>
                </td>
              </tr>
            ))
          ) : products.length === 0 ? (
            <tr>
              <td colSpan={10} className="empty-table">
                Chưa có sản phẩm
              </td>
            </tr>
          ) : (
            products.map((product) => (
              <tr key={product.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => onSelectProduct(product.id)}
                  />
                </td>

                <td>
                  <img
                    src={
                      product.thumbnail
                        ? `http://localhost:5000${product.thumbnail}`
                        : "/images/no-image.png"
                    }
                    alt={product.name}
                    className="product-thumb"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/no-image.png";
                    }}
                  />
                </td>

                <td>
                  <span className="product-sku">{product.sku}</span>
                </td>

                <td>
                  <div className="product-name1">{product.name}</div>
                </td>

                <td>
                  <span className="category-tag">{product.category_name}</span>
                </td>

                <td>
                  <div className="price-column">
                    <span className="sale-price">
                      {formatPrice(product.sale_price || product.price)}
                    </span>

                    {product.sale_price && (
                      <del>{formatPrice(product.price)}</del>
                    )}
                  </div>
                </td>

                <td>
                  <span
                    className={
                      product.remaining <= 0
                        ? "stock-badge out"
                        : product.remaining <= 5
                          ? "stock-badge low"
                          : "stock-badge normal"
                    }
                  >
                    {product.remaining <= 0
                      ? "Hết SP"
                      : `${product.remaining} SP`}
                  </span>
                </td>

                <td>
                  <ProductStatusSwitch
                    checked={product.status === 1}
                    loading={false}
                    onChange={() => onToggleStatus(product)}
                  />
                </td>

                <td>
                  {new Date(product.created_at).toLocaleDateString("vi-VN")}
                </td>

                <td>
                  <ProductActionMenu
                    viewMode={viewMode}
                    onView={() => onView(product)}
                    onEdit={() => onEdit(product)}
                    onDuplicate={() => onDuplicate(product)}
                    onStock={() => onStock(product)}
                    onStockHistory={() => onStockHistory(product)}
                    onDelete={() => onDelete(product)}
                    onRestore={() => onRestore(product)}
                    onForceDelete={() => onForceDelete(product)}
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

export default ProductTable;
