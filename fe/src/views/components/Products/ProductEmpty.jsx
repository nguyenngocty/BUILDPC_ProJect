function ProductEmpty({ onClear }) {
  return (
    <div className="empty-products">
      <i className="bi bi-search"></i>

      <h3>Không tìm thấy sản phẩm</h3>

      <p>Không có sản phẩm nào phù hợp với bộ lọc hiện tại.</p>

      <button className="clear-filter" type="button" onClick={onClear}>
        Xóa bộ lọc
      </button>
    </div>
  );
}

export default ProductEmpty;
