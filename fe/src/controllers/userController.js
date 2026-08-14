import { useCallback, useEffect, useRef, useState } from "react";
import userService from "../services/userService";
import {
  PAGE_SIZE,
  EMPTY_STATISTICS,
  EMPTY_PAGINATION,
  EMPTY_ADD_FORM,
  createOptimisticRoleUser,
  createOptimisticStatusUser,
  canManageUser,
  canChangeUserRole,
} from "../models/UserModel";
import useAuth from "../hooks/useAuth";

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export function useUserManagementController() {
  const { currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [statistics, setStatistics] = useState(EMPTY_STATISTICS);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [addFormError, setAddFormError] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingKey, setUpdatingKey] = useState("");
  const [pageError, setPageError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [toastMessage, setToastMessage] = useState("");
  const toastTimer = useRef(null);
  const hasLoadedUsers = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchKeyword.trim());
      setCurrentPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter]);

  const fetchUsers = useCallback(
    async (signal) => {
      const isFirstLoad = !hasLoadedUsers.current;

      try {
        if (isFirstLoad) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setPageError("");

        const response = await userService.getUsers(
          {
            page: currentPage,
            limit: PAGE_SIZE,
            search: debouncedSearch || undefined,
            role: roleFilter,
            status: statusFilter,
          },
          signal
        );

        if (!response?.success) {
          throw new Error(
            response?.message || "Không thể lấy danh sách người dùng."
          );
        }

        const data = response.data || {};

        setUsers(Array.isArray(data.users) ? data.users : []);
        setStatistics(data.statistics || EMPTY_STATISTICS);
        setPagination(data.pagination || EMPTY_PAGINATION);

        if (
          data.pagination?.totalPages &&
          currentPage > data.pagination.totalPages
        ) {
          setCurrentPage(data.pagination.totalPages);
        }
      } catch (error) {
        if (
          error?.code === "ERR_CANCELED" ||
          error?.name === "CanceledError"
        ) {
          return;
        }

        console.error("Lỗi lấy danh sách người dùng:", error);
        setPageError(
          getErrorMessage(
            error,
            "Không thể kết nối đến máy chủ để lấy người dùng."
          )
        );
      } finally {
        if (!signal?.aborted) {
          hasLoadedUsers.current = true;
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentPage, debouncedSearch, roleFilter, statusFilter, refreshKey]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchUsers(controller.signal);

    return () => controller.abort();
  }, [fetchUsers]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      setSelectedUser(null);
      setIsAddModalOpen(false);
    }

    if (selectedUser || isAddModalOpen) {
      window.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [selectedUser, isAddModalOpen]);

  useEffect(() => {
    return () => {
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message) {
    setToastMessage(message);
    window.clearTimeout(toastTimer.current);

    toastTimer.current = window.setTimeout(() => {
      setToastMessage("");
    }, 3000);
  }

  function replaceUser(updatedUser) {
    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === updatedUser.id ? updatedUser : user
      )
    );

    setSelectedUser((currentUser) =>
      currentUser?.id === updatedUser.id ? updatedUser : currentUser
    );
  }

  async function handleOpenDetail(user) {
    setSelectedUser(user);

    try {
      const response = await userService.getUserById(user.id);

      if (response?.success && response?.data?.user) {
        setSelectedUser(response.data.user);
      }
    } catch (error) {
      showToast(
        getErrorMessage(error, "Không thể tải chi tiết người dùng.")
      );
    }
  }

  async function handleRoleChange(user, nextRole) {
    if (!canChangeUserRole(currentUser, user)) {
      showToast("Bạn không có quyền thay đổi vai trò của tài khoản này.");
      return;
    }
    if (nextRole === user.role) {
      return;
    }

    const key = `role-${user.id}`;
    const previousUser = { ...user };
    const previousRole = user.role;
    const optimisticUser = createOptimisticRoleUser(user, nextRole);

    replaceUser(optimisticUser);

    setStatistics((currentStatistics) => {
      const adminDelta =
        previousRole !== "admin" && nextRole === "admin"
          ? 1
          : previousRole === "admin" && nextRole !== "admin"
            ? -1
            : 0;

      return {
        ...currentStatistics,
        admin: Math.max(
          0,
          Number(currentStatistics.admin || 0) + adminDelta
        ),
      };
    });

    try {
      setUpdatingKey(key);

      const response = await userService.updateRole(user.id, nextRole);

      if (!response?.success || !response?.data?.user) {
        throw new Error(response?.message || "Không thể đổi vai trò.");
      }

      replaceUser(response.data.user);

      // Khi đang lọc riêng, chuyển về tất cả để dòng vừa đổi không bị ẩn.
      if (roleFilter !== "all") {
        setCurrentPage(1);
        setRoleFilter("all");
      }

      showToast(response.message || `Đã đổi vai trò của ${user.name}.`);
    } catch (error) {
      replaceUser(previousUser);

      setStatistics((currentStatistics) => {
        const rollbackDelta =
          previousRole !== "admin" && nextRole === "admin"
            ? -1
            : previousRole === "admin" && nextRole !== "admin"
              ? 1
              : 0;

        return {
          ...currentStatistics,
          admin: Math.max(
            0,
            Number(currentStatistics.admin || 0) + rollbackDelta
          ),
        };
      });

      showToast(getErrorMessage(error, "Không thể đổi vai trò người dùng."));
    } finally {
      setUpdatingKey("");
    }
  }

  async function handleStatusChange(user, nextStatus) {
    if (!canManageUser(currentUser, user)) {
      showToast("Bạn chỉ được quản lý tài khoản có quyền thấp hơn mình.");
      return;
    }
    if (nextStatus === user.status) {
      return;
    }

    const key = `status-${user.id}`;
    const previousUser = { ...user };
    const previousStatus = user.status;
    const optimisticUser = createOptimisticStatusUser(user, nextStatus);

    replaceUser(optimisticUser);

    setStatistics((currentStatistics) => {
      const becameActive =
        previousStatus !== "active" && nextStatus === "active";
      const becameBlocked =
        previousStatus === "active" && nextStatus === "blocked";

      return {
        ...currentStatistics,
        active: Math.max(
          0,
          Number(currentStatistics.active || 0) +
            (becameActive ? 1 : becameBlocked ? -1 : 0)
        ),
        blocked: Math.max(
          0,
          Number(currentStatistics.blocked || 0) +
            (becameBlocked ? 1 : becameActive ? -1 : 0)
        ),
      };
    });

    try {
      setUpdatingKey(key);

      const response = await userService.updateStatus(user.id, nextStatus);

      if (!response?.success || !response?.data?.user) {
        throw new Error(response?.message || "Không thể đổi trạng thái.");
      }

      replaceUser(response.data.user);

      if (statusFilter !== "all") {
        setCurrentPage(1);
        setStatusFilter("all");
      }

      showToast(response.message || "Đã cập nhật trạng thái người dùng.");
    } catch (error) {
      replaceUser(previousUser);

      setStatistics((currentStatistics) => {
        const wasActivated =
          previousStatus !== "active" && nextStatus === "active";
        const wasBlocked =
          previousStatus === "active" && nextStatus === "blocked";

        return {
          ...currentStatistics,
          active: Math.max(
            0,
            Number(currentStatistics.active || 0) +
              (wasActivated ? -1 : wasBlocked ? 1 : 0)
          ),
          blocked: Math.max(
            0,
            Number(currentStatistics.blocked || 0) +
              (wasBlocked ? -1 : wasActivated ? 1 : 0)
          ),
        };
      });

      showToast(
        getErrorMessage(error, "Không thể cập nhật trạng thái người dùng.")
      );
    } finally {
      setUpdatingKey("");
    }
  }

  function handleOpenAddModal() {
    setAddForm(EMPTY_ADD_FORM);
    setAddFormError("");
    setSelectedUser(null);
    setIsAddModalOpen(true);
  }

  function handleAddFormChange(event) {
    const { name, value } = event.target;

    setAddForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleAddUser(event) {
    event.preventDefault();
    setAddFormError("");

    if (addForm.password !== addForm.confirmPassword) {
      setAddFormError("Xác nhận mật khẩu không khớp.");
      return;
    }

    if (addForm.role === "admin" && !isSuperAdmin) {
      setAddFormError("Chỉ quản trị viên cấp cao được tạo tài khoản Admin.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await userService.createUser({
        fullName: addForm.fullName.trim(),
        email: addForm.email.trim(),
        password: addForm.password,
        phone: addForm.phone.trim(),
        address: addForm.address.trim(),
        birthDate: addForm.birthDate || null,
        gender: addForm.gender || null,
        role: addForm.role,
        status: addForm.status,
      });

      if (!response?.success) {
        throw new Error(response?.message || "Không thể thêm người dùng.");
      }

      setIsAddModalOpen(false);
      setAddForm(EMPTY_ADD_FORM);
      setCurrentPage(1);
      setRefreshKey((current) => current + 1);
      showToast(response.message || "Thêm người dùng thành công.");
    } catch (error) {
      setAddFormError(getErrorMessage(error, "Không thể thêm người dùng."));
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages = Math.max(1, Number(pagination.totalPages || 1));
  const totalUsers = Number(pagination.total || 0);

  return {
    currentUser,
    isSuperAdmin,
    canManageUser: (targetUser) => canManageUser(currentUser, targetUser),
    canChangeUserRole: (targetUser) => canChangeUserRole(currentUser, targetUser),
    users,
    statistics,
    pagination,
    searchKeyword,
    setSearchKeyword,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    selectedUser,
    setSelectedUser,
    isAddModalOpen,
    setIsAddModalOpen,
    addForm,
    addFormError,
    loading,
    refreshing,
    submitting,
    updatingKey,
    pageError,
    toastMessage,
    totalPages,
    totalUsers,
    setRefreshKey,
    handleOpenDetail,
    handleRoleChange,
    handleStatusChange,
    handleOpenAddModal,
    handleAddFormChange,
    handleAddUser,
  };
}