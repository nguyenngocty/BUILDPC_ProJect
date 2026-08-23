import { useUserManagementController } from "../../../../controllers/userController";

import {
  getInitials,
  getRoleLabel,
  getStatusLabel,
  formatCurrency,
} from "../../../../models/UserModel";

import "./UserManagement.css";

function UserManagement() {
  const {
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

    isSuperAdmin,

    canManageUser,
    canChangeUserRole,

    setRefreshKey,

    handleOpenDetail,
    handleRoleChange,
    handleStatusChange,

    handleOpenAddModal,
    handleAddFormChange,
    handleAddUser,
  } = useUserManagementController();

  /* =====================================================
     PAGINATION
  ===================================================== */

  const renderPagination = () => {
    if (totalPages <= 1) {
      return [];
    }

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = [1];

    if (currentPage > 4) {
      pages.push("left-dots");
    }

    const start = Math.max(2, currentPage - 1);

    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      pages.push(pageNumber);
    }

    if (currentPage < totalPages - 3) {
      pages.push("right-dots");
    }

    pages.push(totalPages);

    return pages;
  };

  return (
    <>
      <div className="adm-user-page">
        {/* =================================================
            HEADER
        ================================================= */}

        <section className="adm-user-header">
          <div>
            <span className="adm-user-kicker">
              <i className="bi bi-people-fill" />
              Tài khoản
            </span>

            <h1>Quản lý người dùng</h1>

            <p>
              Theo dõi thông tin tài khoản, cập nhật vai trò và kiểm soát trạng
              thái truy cập của người dùng trong hệ thống.
            </p>
          </div>

          <button
            className="adm-user-btn adm-user-btn--primary"
            type="button"
            onClick={handleOpenAddModal}
          >
            <i className="bi bi-person-plus-fill" />
            Thêm người dùng
          </button>
        </section>

        {/* =================================================
            ERROR
        ================================================= */}

        {pageError && (
          <div className="adm-user-page-error" role="alert">
            <span>
              <i className="bi bi-exclamation-triangle-fill" />

              {pageError}
            </span>

            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              <i className="bi bi-arrow-clockwise" />
              Thử lại
            </button>
          </div>
        )}

        {/* =================================================
            STATISTICS
        ================================================= */}

        <section className="adm-user-stats" aria-label="Thống kê người dùng">
          <article className="adm-user-stat">
            <span className="adm-user-stat__icon adm-user-stat__icon--blue">
              <i className="bi bi-people-fill" />
            </span>

            <div>
              <span className="adm-user-stat__label">Tổng người dùng</span>

              <strong>{statistics.total}</strong>

              <small>Tất cả tài khoản</small>
            </div>
          </article>

          <article className="adm-user-stat">
            <span className="adm-user-stat__icon adm-user-stat__icon--green">
              <i className="bi bi-person-check-fill" />
            </span>

            <div>
              <span className="adm-user-stat__label">Đang hoạt động</span>

              <strong>{statistics.active}</strong>

              <small>Có thể truy cập</small>
            </div>
          </article>

          <article className="adm-user-stat">
            <span className="adm-user-stat__icon adm-user-stat__icon--yellow">
              <i className="bi bi-person-gear" />
            </span>

            <div>
              <span className="adm-user-stat__label">Quản trị viên</span>

              <strong>{statistics.admin}</strong>

              <small>Đã cấp quyền quản trị</small>
            </div>
          </article>

          <article className="adm-user-stat">
            <span className="adm-user-stat__icon adm-user-stat__icon--red">
              <i className="bi bi-person-x-fill" />
            </span>

            <div>
              <span className="adm-user-stat__label">Đã khóa</span>

              <strong>{statistics.blocked}</strong>

              <small>Không thể truy cập</small>
            </div>
          </article>
        </section>

        {/* =================================================
            LIST CARD
        ================================================= */}

        <section className="adm-user-card">
          {/* HEADER */}

          <div className="adm-user-card__header">
            <div className="adm-user-card__heading">
              <span className="adm-user-card__icon">
                <i className="bi bi-person-lines-fill" />
              </span>

              <div>
                <h2>Danh sách người dùng</h2>

                <p>
                  {totalUsers === 0
                    ? "Không tìm thấy người dùng phù hợp."
                    : `Tìm thấy ${totalUsers} người dùng phù hợp.`}

                  {refreshing && (
                    <span className="adm-user-refreshing">
                      <i className="bi bi-arrow-repeat" />
                      Đang cập nhật
                    </span>
                  )}
                </p>
              </div>
            </div>

            <span className="adm-user-result-count">
              {totalUsers} tài khoản
            </span>
          </div>

          {/* =================================================
              FILTER
          ================================================= */}

          <div className="adm-user-filter">
            <label className="adm-user-search">
              <i className="bi bi-search" />

              <input
                type="search"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="Tên, email hoặc mã người dùng..."
                autoComplete="off"
                aria-label="Tìm người dùng"
              />

              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword("")}
                  aria-label="Xóa tìm kiếm"
                >
                  <i className="bi bi-x-circle-fill" />
                </button>
              )}
            </label>

            <div className="adm-user-filter-select">
              <i className="bi bi-person-badge" />

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                aria-label="Lọc theo vai trò"
              >
                <option value="all">Tất cả vai trò</option>

                <option value="customer">Khách hàng</option>

                <option value="admin">Quản trị viên</option>

                <option value="super_admin">Quản trị viên cấp cao</option>
              </select>
            </div>

            <div className="adm-user-filter-select">
              <i className="bi bi-sliders" />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Lọc theo trạng thái"
              >
                <option value="all">Tất cả trạng thái</option>

                <option value="active">Hoạt động</option>

                <option value="blocked">Đã khóa</option>
              </select>
            </div>

            <button
              type="button"
              className="adm-user-filter-reset"
              title="Làm mới dữ liệu"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              <i className="bi bi-arrow-clockwise" />
            </button>
          </div>

          {/* =================================================
              TABLE
          ================================================= */}

          <div className="adm-user-table-wrap">
            <table className="adm-user-table">
              <thead>
                <tr>
                  <th>Mã người dùng</th>

                  <th>Người dùng</th>

                  <th>Vai trò</th>

                  <th>Ngày tham gia</th>

                  <th>Đơn hàng</th>

                  <th>Trạng thái</th>

                  <th className="adm-user-text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="adm-user-table-state">
                      <div className="adm-user-loading">
                        <span className="adm-user-spinner" />

                        <strong>Đang tải danh sách người dùng...</strong>

                        <p>Hệ thống đang lấy dữ liệu từ máy chủ.</p>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="adm-user-table-state">
                      <div className="adm-user-empty">
                        <span>
                          <i className="bi bi-people" />
                        </span>

                        <strong>Không tìm thấy người dùng</strong>

                        <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      {/* CODE */}

                      <td>
                        <span className="adm-user-code">{user.userCode}</span>
                      </td>

                      {/* USER */}

                      <td>
                        <div className="adm-user-identity">
                          <span
                            className={`adm-user-avatar ${
                              user.avatarClass || ""
                            }`}
                          >
                            {user.avatar ? (
                              <img src={user.avatar} alt="" />
                            ) : (
                              <span className="adm-user-avatar__fallback">
                                {getInitials(user.name)}
                              </span>
                            )}
                          </span>

                          <div>
                            <strong>{user.name}</strong>

                            <span>{user.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* ROLE */}

                      <td>
                        {canChangeUserRole(user) ? (
                          <select
                            className={`adm-user-inline-select adm-user-role-select adm-user-role-select--${user.role}`}
                            value={user.role}
                            disabled={updatingKey === `role-${user.id}`}
                            onChange={(event) =>
                              handleRoleChange(user, event.target.value)
                            }
                          >
                            <option value="customer">Khách hàng</option>

                            <option value="admin">Quản trị viên</option>
                          </select>
                        ) : (
                          <span
                            className={`adm-user-role-badge adm-user-role-badge--${user.role}`}
                          >
                            {getRoleLabel(user.role)}
                          </span>
                        )}
                      </td>

                      {/* DATE */}

                      <td>
                        <span className="adm-user-date">
                          {user.joinedDate || "Chưa có"}
                        </span>
                      </td>

                      {/* ORDER */}

                      <td>
                        <span className="adm-user-order-count">
                          {user.orderCount || 0}
                        </span>
                      </td>

                      {/* STATUS */}

                      <td>
                        {canManageUser(user) ? (
                          <select
                            className={`adm-user-inline-select adm-user-status-select adm-user-status-select--${user.status}`}
                            value={user.status}
                            disabled={updatingKey === `status-${user.id}`}
                            onChange={(event) =>
                              handleStatusChange(user, event.target.value)
                            }
                          >
                            <option value="active">Hoạt động</option>

                            <option value="blocked">Đã khóa</option>
                          </select>
                        ) : (
                          <span
                            className={`adm-user-status-badge adm-user-status-badge--${user.status}`}
                          >
                            <span />

                            {getStatusLabel(user.status)}
                          </span>
                        )}
                      </td>

                      {/* ACTION */}

                      <td className="adm-user-text-right">
                        <button
                          className="adm-user-action-view"
                          type="button"
                          onClick={() => handleOpenDetail(user)}
                          title={`Xem chi tiết ${user.name}`}
                          aria-label={`Xem chi tiết ${user.name}`}
                        >
                          <i className="bi bi-eye" />

                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* =================================================
              FOOTER / PAGINATION
          ================================================= */}

          {!loading && totalUsers > 0 && (
            <div className="adm-user-pagination">
              <div className="adm-user-pagination__info">
                Hiển thị <strong>{pagination.startResult}</strong> -{" "}
                <strong>{pagination.endResult}</strong> trong tổng{" "}
                <strong>{totalUsers}</strong> người dùng
              </div>

              {totalPages > 1 && (
                <nav
                  className="adm-user-pagination__controls"
                  aria-label="Phân trang người dùng"
                >
                  <button
                    type="button"
                    disabled={currentPage === 1 || loading}
                    onClick={() =>
                      setCurrentPage((current) => Math.max(1, current - 1))
                    }
                  >
                    <i className="bi bi-chevron-left" />
                  </button>

                  {renderPagination().map((page, index) =>
                    typeof page === "string" ? (
                      <span
                        key={`${page}-${index}`}
                        className="adm-user-pagination__dots"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        className={
                          page === currentPage
                            ? "adm-user-pagination__active"
                            : ""
                        }
                        disabled={loading}
                        onClick={() => setCurrentPage(page)}
                        aria-current={page === currentPage ? "page" : undefined}
                      >
                        {page}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    disabled={currentPage === totalPages || loading}
                    onClick={() =>
                      setCurrentPage((current) =>
                        Math.min(totalPages, current + 1),
                      )
                    }
                  >
                    <i className="bi bi-chevron-right" />
                  </button>
                </nav>
              )}
            </div>
          )}
        </section>
      </div>

      {/* =================================================
          DETAIL MODAL
      ================================================= */}

      {selectedUser && (
        <div
          className="adm-user-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admUserDetailTitle"
          onMouseDown={() => setSelectedUser(null)}
        >
          <div
            className="adm-user-modal adm-user-modal--detail"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="adm-user-modal__header">
              <div>
                <span className="adm-user-modal__kicker">Hồ sơ tài khoản</span>

                <h2 id="admUserDetailTitle">Chi tiết người dùng</h2>
              </div>

              <button
                type="button"
                className="adm-user-modal__close"
                onClick={() => setSelectedUser(null)}
                aria-label="Đóng"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="adm-user-modal__body">
              {/* PROFILE */}

              <section className="adm-user-detail-profile">
                <span
                  className={`adm-user-detail-avatar ${
                    selectedUser.avatarClass || ""
                  }`}
                >
                  {selectedUser.avatar ? (
                    <img
                      src={selectedUser.avatar}
                      alt={`Ảnh đại diện của ${selectedUser.name}`}
                    />
                  ) : (
                    <span>{getInitials(selectedUser.name)}</span>
                  )}
                </span>

                <div className="adm-user-detail-profile__content">
                  <div>
                    <h3>{selectedUser.name}</h3>

                    <p>{selectedUser.email}</p>
                  </div>

                  <div className="adm-user-detail-profile__badges">
                    <span
                      className={`adm-user-role-badge adm-user-role-badge--${selectedUser.role}`}
                    >
                      {getRoleLabel(selectedUser.role)}
                    </span>

                    <span
                      className={`adm-user-status-badge adm-user-status-badge--${selectedUser.status}`}
                    >
                      <span />

                      {getStatusLabel(selectedUser.status)}
                    </span>
                  </div>
                </div>
              </section>

              {/* DETAIL */}

              <div className="adm-user-detail-grid">
                <section className="adm-user-detail-card">
                  <h3>
                    <i className="bi bi-person-vcard" />
                    Thông tin cá nhân
                  </h3>

                  <dl className="adm-user-detail-list">
                    <div>
                      <dt>Mã người dùng</dt>

                      <dd>{selectedUser.userCode}</dd>
                    </div>

                    <div>
                      <dt>Họ và tên</dt>

                      <dd>{selectedUser.name}</dd>
                    </div>

                    <div>
                      <dt>Ngày sinh</dt>

                      <dd>{selectedUser.birthDate || "Chưa cập nhật"}</dd>
                    </div>

                    <div>
                      <dt>Giới tính</dt>

                      <dd>{selectedUser.gender || "Chưa cập nhật"}</dd>
                    </div>
                  </dl>
                </section>

                <section className="adm-user-detail-card">
                  <h3>
                    <i className="bi bi-telephone" />
                    Liên hệ
                  </h3>

                  <dl className="adm-user-detail-list">
                    <div>
                      <dt>Email</dt>

                      <dd>{selectedUser.email}</dd>
                    </div>

                    <div>
                      <dt>Số điện thoại</dt>

                      <dd>{selectedUser.phone || "Chưa cập nhật"}</dd>
                    </div>

                    <div className="adm-user-detail-list__full">
                      <dt>Địa chỉ</dt>

                      <dd>{selectedUser.address || "Chưa cập nhật"}</dd>
                    </div>
                  </dl>
                </section>

                <section className="adm-user-detail-card adm-user-detail-card--full">
                  <h3>
                    <i className="bi bi-activity" />
                    Hoạt động tài khoản
                  </h3>

                  <div className="adm-user-activity">
                    <div>
                      <span>Ngày tham gia</span>

                      <strong>{selectedUser.joinedDate || "Chưa có"}</strong>
                    </div>

                    <div>
                      <span>Đơn hàng đã đặt</span>

                      <strong>{selectedUser.orderCount || 0}</strong>
                    </div>

                    <div>
                      <span>Tổng chi tiêu</span>

                      <strong>{formatCurrency(selectedUser.totalSpent)}</strong>
                    </div>

                    <div>
                      <span>Đăng nhập gần nhất</span>

                      <strong>
                        {selectedUser.lastLogin || "Chưa đăng nhập"}
                      </strong>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="adm-user-modal__footer">
              <button
                type="button"
                className="adm-user-btn adm-user-btn--light"
                onClick={() => setSelectedUser(null)}
              >
                <i className="bi bi-x-lg" />
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          ADD USER MODAL
      ================================================= */}

      {isAddModalOpen && (
        <div
          className="adm-user-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admAddUserTitle"
          onMouseDown={() => !submitting && setIsAddModalOpen(false)}
        >
          <form
            className="adm-user-modal adm-user-modal--add"
            onSubmit={handleAddUser}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="adm-user-modal__header">
              <div>
                <span className="adm-user-modal__kicker">Tài khoản mới</span>

                <h2 id="admAddUserTitle">Thêm người dùng</h2>

                <p>
                  Khởi tạo tài khoản mới và thiết lập quyền truy cập hệ thống.
                </p>
              </div>

              <button
                type="button"
                className="adm-user-modal__close"
                disabled={submitting}
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Đóng"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="adm-user-modal__body">
              {addFormError && (
                <div className="adm-user-form-error" role="alert">
                  <i className="bi bi-exclamation-circle-fill" />

                  <span>{addFormError}</span>
                </div>
              )}

              <div className="adm-user-form-grid">
                <label className="adm-user-field">
                  <span>
                    Họ và tên
                    <b>*</b>
                  </span>

                  <div className="adm-user-input-wrap">
                    <i className="bi bi-person" />

                    <input
                      name="fullName"
                      value={addForm.fullName}
                      onChange={handleAddFormChange}
                      placeholder="Nhập họ và tên"
                      required
                      maxLength="255"
                    />
                  </div>
                </label>

                <label className="adm-user-field">
                  <span>
                    Email
                    <b>*</b>
                  </span>

                  <div className="adm-user-input-wrap">
                    <i className="bi bi-envelope" />

                    <input
                      type="email"
                      name="email"
                      value={addForm.email}
                      onChange={handleAddFormChange}
                      placeholder="example@email.com"
                      required
                      maxLength="255"
                    />
                  </div>
                </label>

                <label className="adm-user-field">
                  <span>
                    Mật khẩu
                    <b>*</b>
                  </span>

                  <div className="adm-user-input-wrap">
                    <i className="bi bi-lock" />

                    <input
                      type="password"
                      name="password"
                      value={addForm.password}
                      onChange={handleAddFormChange}
                      placeholder="Tối thiểu 8 ký tự"
                      required
                      minLength="8"
                      maxLength="72"
                    />
                  </div>
                </label>

                <label className="adm-user-field">
                  <span>
                    Xác nhận mật khẩu
                    <b>*</b>
                  </span>

                  <div className="adm-user-input-wrap">
                    <i className="bi bi-shield-lock" />

                    <input
                      type="password"
                      name="confirmPassword"
                      value={addForm.confirmPassword}
                      onChange={handleAddFormChange}
                      placeholder="Nhập lại mật khẩu"
                      required
                      minLength="8"
                      maxLength="72"
                    />
                  </div>
                </label>

                <label className="adm-user-field">
                  <span>Số điện thoại</span>

                  <div className="adm-user-input-wrap">
                    <i className="bi bi-telephone" />

                    <input
                      name="phone"
                      value={addForm.phone}
                      onChange={handleAddFormChange}
                      placeholder="Nhập số điện thoại"
                      maxLength="15"
                    />
                  </div>
                </label>

                <label className="adm-user-field">
                  <span>Ngày sinh</span>

                  <div className="adm-user-input-wrap">
                    <i className="bi bi-calendar3" />

                    <input
                      type="date"
                      name="birthDate"
                      value={addForm.birthDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={handleAddFormChange}
                    />
                  </div>
                </label>

                <label className="adm-user-field">
                  <span>Giới tính</span>

                  <div className="adm-user-input-wrap">
                    <i className="bi bi-gender-ambiguous" />

                    <select
                      name="gender"
                      value={addForm.gender}
                      onChange={handleAddFormChange}
                    >
                      <option value="">Chưa chọn</option>

                      <option value="Nam">Nam</option>

                      <option value="Nữ">Nữ</option>

                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                </label>

                <label className="adm-user-field">
                  <span>
                    Vai trò
                    <b>*</b>
                  </span>

                  <div className="adm-user-input-wrap">
                    <i className="bi bi-person-badge" />

                    <select
                      name="role"
                      value={addForm.role}
                      onChange={handleAddFormChange}
                    >
                      <option value="customer">Khách hàng</option>

                      {isSuperAdmin && (
                        <option value="admin">Quản trị viên</option>
                      )}
                    </select>
                  </div>
                </label>

                <label className="adm-user-field">
                  <span>
                    Trạng thái
                    <b>*</b>
                  </span>

                  <div className="adm-user-input-wrap">
                    <i className="bi bi-toggle-on" />

                    <select
                      name="status"
                      value={addForm.status}
                      onChange={handleAddFormChange}
                    >
                      <option value="active">Hoạt động</option>

                      <option value="blocked">Đã khóa</option>
                    </select>
                  </div>
                </label>

                <label className="adm-user-field adm-user-field--full">
                  <span>Địa chỉ</span>

                  <div className="adm-user-input-wrap">
                    <i className="bi bi-geo-alt" />

                    <input
                      name="address"
                      value={addForm.address}
                      onChange={handleAddFormChange}
                      placeholder="Nhập địa chỉ"
                      maxLength="255"
                    />
                  </div>
                </label>
              </div>
            </div>

            <div className="adm-user-modal__footer">
              <button
                type="button"
                className="adm-user-btn adm-user-btn--light"
                disabled={submitting}
                onClick={() => setIsAddModalOpen(false)}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="adm-user-btn adm-user-btn--primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="adm-user-spinner adm-user-spinner--button" />
                    Đang thêm...
                  </>
                ) : (
                  <>
                    <i className="bi bi-person-plus-fill" />
                    Thêm người dùng
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================
          TOAST
      ================================================= */}

      <div
        className={
          toastMessage
            ? "adm-user-toast adm-user-toast--show"
            : "adm-user-toast"
        }
        role="status"
        aria-live="polite"
      >
        <i className="bi bi-check-circle-fill" />

        <span>{toastMessage}</span>
      </div>
    </>
  );
}

export default UserManagement;
