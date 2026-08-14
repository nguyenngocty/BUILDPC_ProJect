import "./ProductManagement.css";
import { useState } from "react";

import toast from "react-hot-toast";

import ProductDashboard from "../../components/Products/ProductDashboard";
import ProductToolbar from "../../components/Products/ProductToolbar";
import ProductFilter from "../../components/Products/ProductFilter";
import ProductPagination from "../../components/Products/ProductPagination";
import ProductTable from "../../components/Products/ProductTable";
import ProductModal from "../../components/Products/ProductModal";
import DeleteConfirmModal from "../../components/Products/DeleteConfirmModal";
import ProductViewModal from "../../components/Products/ProductViewModal";
import ProductBulkAction from "../../components/Products/ProductBulkAction";
import ProductStockModal from "../../components/Products/ProductStockModal";
import ProductStockHistoryModal from "../../components/Products/ProductStockHistoryModal";

import useProducts from "../../../../hooks/useProducts";
import productService from "../../../../services/productService";

function ProductManagement() {
  const [viewMode, setViewMode] = useState("all");
  const {
    products,
    setProducts,
    statistics,
    loading,
    refresh,
    filters,
    setFilters,
    pagination,
  } = useProducts(viewMode);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [duplicating, setDuplicating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState(null);

  const handleChangeView = (mode) => {
    setSelectedProducts([]);

    setViewMode(mode);

    setFilters((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // Product Modal
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [openViewModal, setOpenViewModal] = useState(false);

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Restore Modal
  const [restoreModal, setRestoreModal] = useState(false);
  const [restoreProduct, setRestoreProduct] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Bulk Action
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState(null); // delete | restore
  const [bulkLoading, setBulkLoading] = useState(false);

  // Stock Modal
  const [stockModal, setStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);

  const [forceDeleteModal, setForceDeleteModal] = useState(false);
  const [forceDeleteProduct, setForceDeleteProduct] = useState(null);
  const [forceDeleteLoading, setForceDeleteLoading] = useState(false);

  /* ===========================
        Checkbox
  ============================ */

  const handleSelectProduct = (id) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProducts(products.map((item) => item.id));
    } else {
      setSelectedProducts([]);
    }
  };

  /* ===========================
          Add
  ============================ */

  const handleAddProduct = () => {
    setModalMode("create");
    setSelectedProduct(null);
    setOpenModal(true);
  };

  /* ===========================
          Edit
  ============================ */

  const handleEditProduct = async (product) => {
    try {
      console.log("ID =", product.id);

      const res = await productService.getProductById(product.id);

      console.log("FULL RESPONSE", res);
      console.log("DATA", res.data);

      setModalMode("edit");

      setSelectedProduct(res.data);

      setOpenModal(true);
    } catch (err) {
      console.error("ERROR =", err);

      toast.error("Không tải được thông tin sản phẩm.");
    }
  };

  /* ===========================
          Views
  ============================ */
  const handleViewProduct = async (product) => {
    try {
      const res = await productService.getProductById(product.id);

      setSelectedProduct(res.data);

      setOpenViewModal(true);
    } catch (err) {
      console.error(err);
      toast.error("Không tải được chi tiết sản phẩm.");
    }
  };

  /* ===========================
        Delete
  ============================ */

  const handleDeleteClick = (product) => {
    setDeleteProduct(product);
    setDeleteModal(true);
  };

  const handleRestore = (product) => {
    setRestoreProduct(product);
    setRestoreModal(true);
  };

  const handleForceDelete = (product) => {
    setForceDeleteProduct(product);
    setForceDeleteModal(true);
  };

  const handleConfirmForceDelete = async () => {
    if (!forceDeleteProduct) return;

    try {
      setForceDeleteLoading(true);

      const res = await productService.forceDeleteProduct(
        forceDeleteProduct.id,
      );

      toast.success(res.message);

      setForceDeleteModal(false);
      setForceDeleteProduct(null);

      refresh();
    } catch (err) {
      console.error(err);

      toast.error(
        err.response?.data?.message || "Không thể xóa vĩnh viễn sản phẩm.",
      );
    } finally {
      setForceDeleteLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteProduct) return;

    try {
      setDeleteLoading(true);

      await productService.deleteProduct(deleteProduct.id);

      toast.success("Đã xóa sản phẩm thành công.");

      setDeleteModal(false);
      setDeleteProduct(null);

      refresh();
    } catch (err) {
      console.error(err);

      toast.error(err.response?.data?.message || "Không thể xóa sản phẩm.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreProduct) return;

    try {
      setRestoreLoading(true);

      const res = await productService.restoreProduct(restoreProduct.id);

      toast.success(res.message);

      setRestoreModal(false);
      setRestoreProduct(null);

      refresh();
    } catch (err) {
      console.error(err);

      toast.error(
        err.response?.data?.message || "Không thể khôi phục sản phẩm.",
      );
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedProducts.length === 0) return;

    setBulkAction("delete");
    setBulkModal(true);
  };

  const handleBulkRestore = () => {
    if (selectedProducts.length === 0) return;

    setBulkAction("restore");
    setBulkModal(true);
  };

  const handleConfirmBulk = async () => {
    try {
      setBulkLoading(true);

      let res;

      switch (bulkAction) {
        case "delete":
          res = await productService.bulkDeleteProducts(selectedProducts);
          break;

        case "restore":
          res = await productService.bulkRestoreProducts(selectedProducts);
          break;

        case "force-delete":
          res = await productService.bulkForceDeleteProducts(selectedProducts);
          break;

        default:
          return;
      }

      toast.success(res.message);

      setSelectedProducts([]);

      setBulkModal(false);

      setBulkAction(null);

      refresh();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Không thể thực hiện thao tác.",
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkForceDelete = () => {
    if (selectedProducts.length === 0) return;

    setBulkAction("force-delete");
    setBulkModal(true);
  };

  /* ===========================
      Duplicate
  ============================ */

  const handleDuplicate = async (product) => {
    if (duplicating) return;

    try {
      setDuplicating(true);

      const res = await productService.duplicateProduct(product.id);

      toast.success(res.message);

      refresh();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Không thể nhân bản sản phẩm.",
      );
    } finally {
      setDuplicating(false);
    }
  };

  /* ===========================
      Stock
  ============================ */

  const handleOpenStockHistory = (product) => {
    setHistoryProduct(product);

    setHistoryOpen(true);
  };

  const handleCloseStockHistory = () => {
    setHistoryOpen(false);

    setHistoryProduct(null);
  };

  const handleStock = (product) => {
    setStockProduct(product);
    setStockModal(true);
  };
  /* ===========================
      Toggle Status
  ============================ */

  const handleToggleStatus = async (product) => {
    try {
      const res = await productService.toggleStatus(product.id);

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                status: item.status === 1 ? 0 : 1,
              }
            : item,
        ),
      );

      toast.success(res.message);
    } catch (err) {
      console.error(err);

      toast.error(
        err.response?.data?.message || "Không thể thay đổi trạng thái.",
      );
    }
  };

  return (
    <div className="product-page">
      <div className="product-content">
        <ProductDashboard statistics={statistics} />

        <ProductToolbar
          viewMode={viewMode}
          onChangeView={handleChangeView}
          onRefresh={refresh}
          onImport={() => {}}
          onExport={() => {}}
          onAdd={handleAddProduct}
        />

        <ProductFilter
          filters={filters}
          setFilters={setFilters}
          viewMode={viewMode}
        />

        {selectedProducts.length > 0 && (
          <ProductBulkAction
            selectedCount={selectedProducts.length}
            viewMode={viewMode}
            onDelete={handleBulkDelete}
            onRestore={handleBulkRestore}
            onForceDelete={handleBulkForceDelete}
            onClear={() => setSelectedProducts([])}
          />
        )}

        <ProductTable
          products={products}
          viewMode={viewMode}
          loading={loading}
          selectedProducts={selectedProducts}
          onSelectProduct={handleSelectProduct}
          onSelectAll={handleSelectAll}
          onView={handleViewProduct}
          onEdit={handleEditProduct}
          onDelete={handleDeleteClick}
          onDuplicate={handleDuplicate}
          onStock={handleStock}
          onStockHistory={handleOpenStockHistory}
          onToggleStatus={handleToggleStatus}
          onRestore={handleRestore}
          onForceDelete={handleForceDelete}
        />

        <ProductPagination
          pagination={pagination}
          filters={filters}
          setFilters={setFilters}
        />

        <ProductModal
          open={openModal}
          mode={modalMode}
          product={selectedProduct}
          onClose={() => {
            setOpenModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            refresh();
            setSelectedProducts([]);
          }}
        />
        <ProductStockModal
          open={stockModal}
          product={stockProduct}
          loading={stockLoading}
          onClose={() => {
            setStockModal(false);
            setStockProduct(null);
          }}
          onSuccess={async () => {
            await refresh();
          }}
        />

        <DeleteConfirmModal
          open={forceDeleteModal}
          loading={forceDeleteLoading}
          title="Xóa vĩnh viễn sản phẩm"
          titleClass="delete-title-danger"
          message={
            forceDeleteProduct
              ? `Bạn sắp XÓA VĨNH VIỄN "${forceDeleteProduct.name}". Hành động này không thể hoàn tác.`
              : ""
          }
          icon="bi-exclamation-triangle-fill"
          iconClass="delete-icon-danger"
          confirmText="Xóa vĩnh viễn"
          confirmClass="delete-modal-danger-btn"
          loadingText="Đang xóa vĩnh viễn..."
          onCancel={() => {
            setForceDeleteModal(false);
            setForceDeleteProduct(null);
          }}
          onConfirm={handleConfirmForceDelete}
        />

        <DeleteConfirmModal
          open={restoreModal}
          loading={restoreLoading}
          title="Khôi phục sản phẩm"
          titleClass="delete-title-success"
          message={
            restoreProduct
              ? `Bạn có chắc muốn khôi phục "${restoreProduct.name}"?`
              : ""
          }
          icon="bi-arrow-counterclockwise"
          iconClass="delete-icon-success"
          confirmText="Khôi phục"
          confirmClass="delete-modal-success-btn"
          loadingText="Đang khôi phục..."
          onCancel={() => {
            setRestoreModal(false);
            setRestoreProduct(null);
          }}
          onConfirm={handleConfirmRestore}
        />
        <DeleteConfirmModal
          open={bulkModal}
          loading={bulkLoading}
          title={
            bulkAction === "delete"
              ? "Xóa nhiều sản phẩm"
              : bulkAction === "force-delete"
                ? "Xóa vĩnh viễn nhiều sản phẩm"
                : "Khôi phục nhiều sản phẩm"
          }
          titleClass={
            bulkAction === "restore"
              ? "delete-title-success"
              : "delete-title-danger"
          }
          message={
            bulkAction === "delete"
              ? `Bạn có chắc muốn xóa ${selectedProducts.length} sản phẩm đã chọn?`
              : bulkAction === "force-delete"
                ? `Bạn có chắc muốn XÓA VĨNH VIỄN ${selectedProducts.length} sản phẩm đã chọn? Hành động này không thể hoàn tác.`
                : `Bạn có chắc muốn khôi phục ${selectedProducts.length} sản phẩm đã chọn?`
          }
          icon={
            bulkAction === "restore"
              ? "bi-arrow-counterclockwise"
              : "bi-trash3-fill"
          }
          iconClass={
            bulkAction === "restore"
              ? "delete-icon-success"
              : "delete-icon-danger"
          }
          confirmText={
            bulkAction === "delete"
              ? "Xóa"
              : bulkAction === "force-delete"
                ? "Xóa vĩnh viễn"
                : "Khôi phục"
          }
          confirmClass={
            bulkAction === "restore"
              ? "delete-modal-success-btn"
              : "delete-modal-danger-btn"
          }
          loadingText={
            bulkAction === "delete"
              ? "Đang xóa..."
              : bulkAction === "force-delete"
                ? "Đang xóa vĩnh viễn..."
                : "Đang khôi phục..."
          }
          onCancel={() => {
            setBulkModal(false);
            setBulkAction(null);
          }}
          onConfirm={handleConfirmBulk}
        />

        <ProductStockHistoryModal
          open={historyOpen}
          product={historyProduct}
          onClose={handleCloseStockHistory}
        />

        <ProductViewModal
          open={openViewModal}
          product={selectedProduct}
          onClose={() => {
            setOpenViewModal(false);
            setSelectedProduct(null);
          }}
        />
      </div>
    </div>
  );
}

export default ProductManagement;
