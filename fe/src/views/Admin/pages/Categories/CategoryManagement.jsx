// import PageTitle from "../../components/";

import { useEffect, useState } from "react";

import toast from "react-hot-toast";

// Components
import CategoryDashboard from "../../components/Categories/CategoryDashboard";
import CategoryToolbar from "../../components/Categories/CategoryToolbar";
import CategoryTable from "../../components/Categories/CategoryTable";
import CategoryPagination from "../../components/Categories/CategoryPagination";
import CategoryFilter from "../../components/Categories/CategoryFilter";
import CategoryModal from "../../components/Categories/CategoryModal";
import CategoryViewModal from "../../components/Categories/CategoryViewModal";
import CategoryConfirmModal from "../../components/Categories/CategoryConfirmModal";
import CategoryBulkToolbar from "../../components/Categories/CategoryBulkToolbar";

import useCategories from "../../../../hooks/useCategories";

import categoryService from "../../../../services/categoryService";
function CategoryManagement() {
  const [viewMode, setViewMode] = useState("all");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const {
    categories,
    loading,
    statistics,
    pagination,
    filters,
    setFilters,
    refresh,
  } = useCategories(viewMode);

  useEffect(() => {
    setSelectedCategories([]);
  }, [categories]);

  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmType, setConfirmType] = useState("delete");
  const [bulkMode, setBulkMode] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);

  const handleSelectCategory = (id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
      return;
    }

    setSelectedCategories(categories.map((item) => item.id));
  };

  const handleView = async (category) => {
    try {
      const res = await categoryService.getCategoryById(category.id);

      setSelectedCategory(res.data);

      setOpenViewModal(true);
    } catch (err) {
      toast.error("Không thể tải thông tin danh mục.");
    }
  };

  const handleAdd = () => {
    setModalMode("create");
    setSelectedCategory(null);
    setOpenModal(true);
  };

  const openConfirm = (type, category) => {
    setBulkMode(false);

    setConfirmType(type);

    setSelectedCategory(category);

    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);

    setSelectedCategory(null);
  };

  const openBulkConfirm = (type) => {
    setBulkMode(true);

    setConfirmType(type);

    setConfirmOpen(true);
  };

  const handleEdit = async (category) => {
    try {
      const res = await categoryService.getCategoryById(category.id);

      setModalMode("edit");

      setSelectedCategory(res.data);

      setOpenModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (category) => {
    openConfirm("delete", category);
  };

  const handleRestore = (category) => {
    openConfirm("restore", category);
  };

  const handleForceDelete = (category) => {
    openConfirm("force", category);
  };

  const handleConfirm = async () => {
    try {
      setConfirmLoading(true);

      let res;

      if (bulkMode) {
        switch (confirmType) {
          case "delete":
            res = await categoryService.bulkDelete(selectedCategories);
            break;

          case "restore":
            res = await categoryService.bulkRestore(selectedCategories);
            break;

          case "force":
            res = await categoryService.bulkForceDelete(selectedCategories);
            break;

          case "status":
            res = await categoryService.bulkToggleStatus(selectedCategories);
            break;

          default:
            return;
        }

        toast.success(res.message);

        setSelectedCategories([]);

        closeConfirm();

        refresh();

        return;
      }

      if (!selectedCategory) return;

      switch (confirmType) {
        case "delete":
          res = await categoryService.deleteCategory(selectedCategory.id);
          break;

        case "restore":
          res = await categoryService.restoreCategory(selectedCategory.id);
          break;

        case "force":
          res = await categoryService.forceDeleteCategory(selectedCategory.id);
          break;

        default:
          return;
      }

      toast.success(res.message);

      closeConfirm();

      refresh();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Không thể thực hiện thao tác.",
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleToggleStatus = async (category) => {
    try {
      const res = await categoryService.toggleStatus(category.id);

      toast.success(res.message);

      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể đổi trạng thái.");
    }
  };

  const handleBulkDelete = () => {
    openBulkConfirm("delete");
  };

  const handleBulkRestore = () => {
    openBulkConfirm("restore");
  };

  const handleBulkForceDelete = () => {
    openBulkConfirm("force");
  };

  const handleBulkToggleStatus = () => {
    openBulkConfirm("status");
  };

  const handleChangeView = (mode) => {
    setViewMode(mode);

    setSelectedCategories([]);

    setFilters((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  const handleRefresh = async () => {
    setSelectedCategories([]);

    await refresh();
  };

  return (
    <>
      {/* <PageTitle
        title="Quản lý danh mục"
        subtitle="Quản lý danh mục linh kiện và danh mục sản phẩm."
      /> */}

      <CategoryDashboard statistics={statistics} />

      <CategoryToolbar
        viewMode={viewMode}
        onChangeView={handleChangeView}
        filters={filters}
        setFilters={setFilters}
        refresh={handleRefresh}
        onAdd={handleAdd}
      />

      <CategoryBulkToolbar
        selectedCount={selectedCategories.length}
        viewMode={viewMode}
        onDelete={handleBulkDelete}
        onRestore={handleBulkRestore}
        onForceDelete={handleBulkForceDelete}
        onToggleStatus={handleBulkToggleStatus}
        onClear={() => setSelectedCategories([])}
      />

      <CategoryFilter
        filters={filters}
        setFilters={setFilters}
        pagination={pagination}
      />

      <CategoryTable
        categories={categories}
        loading={loading}
        viewMode={viewMode}
        selectedCategories={selectedCategories}
        onSelectCategory={handleSelectCategory}
        onSelectAll={handleSelectAll}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRestore={handleRestore}
        onForceDelete={handleForceDelete}
        onToggleStatus={handleToggleStatus}
      />

      <CategoryPagination
        pagination={pagination}
        filters={filters}
        setFilters={setFilters}
      />

      <CategoryModal
        open={openModal}
        mode={modalMode}
        category={selectedCategory}
        onClose={() => {
          setOpenModal(false);
          setSelectedCategory(null);
        }}
        onSuccess={() => {
          refresh();

          setOpenModal(false);

          setSelectedCategory(null);
        }}
      />

      <CategoryConfirmModal
        open={confirmOpen}
        type={confirmType}
        loading={confirmLoading}
        category={bulkMode ? null : selectedCategory}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        title={
          bulkMode
            ? confirmType === "delete"
              ? `Xóa ${selectedCategories.length} danh mục`
              : confirmType === "restore"
                ? `Khôi phục ${selectedCategories.length} danh mục`
                : confirmType === "force"
                  ? `Xóa vĩnh viễn ${selectedCategories.length} danh mục`
                  : `Đổi trạng thái ${selectedCategories.length} danh mục`
            : confirmType === "delete"
              ? "Xóa danh mục"
              : confirmType === "restore"
                ? "Khôi phục danh mục"
                : "Xóa vĩnh viễn"
        }
        message={
          bulkMode
            ? "Bạn có chắc chắn muốn thực hiện thao tác hàng loạt?"
            : confirmType === "delete"
              ? "Danh mục sẽ được chuyển vào Thùng rác."
              : confirmType === "restore"
                ? "Danh mục sẽ được khôi phục."
                : "Hành động này không thể hoàn tác."
        }
      />

      <CategoryViewModal
        open={openViewModal}
        category={selectedCategory}
        onClose={() => {
          setOpenViewModal(false);
          setSelectedCategory(null);
        }}
      />
    </>
  );
}

export default CategoryManagement;
