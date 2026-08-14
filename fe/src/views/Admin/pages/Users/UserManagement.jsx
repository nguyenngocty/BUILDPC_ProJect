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

  return (
    <>
      <div className="user-management-page">
        <section className="user-page-heading">
          <div>
            <span className="page-kicker">Tài khoản</span>
            <h1>Quản lý người dùng</h1>
            <p>
              Theo dõi thông tin, cập nhật vai trò và trạng thái tài khoản
              trong hệ thống.
            </p>
          </div>

          <button
            className="primary-action"
            type="button"
            onClick={handleOpenAddModal}
          >
            <i className="bi bi-person-plus-fill" />
            Thêm người dùng
          </button>
        </section>

        {pageError && (
          <div className="user-page-error" role="alert">
            <span>
              <i className="bi bi-exclamation-triangle-fill" /> {pageError}
            </span>

            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              Thử lại
            </button>
          </div>
        )}

        <section className="user-stat-grid" aria-label="Thống kê người dùng">
          <article className="user-stat-card stat-card-blue">
            <span className="stat-icon icon-blue">
              <i className="bi bi-people-fill" />
            </span>

            <div>
              <span className="stat-label">Tổng người dùng</span>
              <strong>{statistics.total}</strong>
              <small className="stat-description-blue">Tất cả tài khoản</small>
            </div>
          </article>

          <article className="user-stat-card stat-card-green">
            <span className="stat-icon icon-green">
              <i className="bi bi-person-check-fill" />
            </span>

            <div>
              <span className="stat-label">Đang hoạt động</span>
              <strong>{statistics.active}</strong>
              <small className="stat-description-green">Có thể truy cập</small>
            </div>
          </article>

          <article className="user-stat-card stat-card-yellow">
            <span className="stat-icon icon-yellow">
              <i className="bi bi-person-gear" />
            </span>

            <div>
              <span className="stat-label">Quản trị viên</span>
              <strong>{statistics.admin}</strong>
              <small className="stat-description-yellow">
                Đã cấp quyền quản trị
              </small>
            </div>
          </article>

          <article className="user-stat-card stat-card-red">
            <span className="stat-icon icon-red">
              <i className="bi bi-person-x-fill" />
            </span>

            <div>
              <span className="stat-label">Đã khóa</span>
              <strong>{statistics.blocked}</strong>
              <small className="stat-description-red">
                Đã khóa quyền truy cập
              </small>
            </div>
          </article>
        </section>

        <section className="admin-panel user-list-panel">
          <div className="panel-head user-list-head">
            <div>
              <h2>Danh sách người dùng</h2>
              <p>
                {totalUsers === 0
                  ? "Không tìm thấy người dùng phù hợp."
                  : `Tìm thấy ${totalUsers} người dùng phù hợp.`}

                {refreshing && (
                  <span className="user-refreshing-note">
                    <i className="bi bi-arrow-repeat" /> Đang cập nhật
                  </span>
                )}
              </p>
            </div>

            <div className="user-toolbar">
              <label className="toolbar-search">
                <i className="bi bi-search" />

                <input
                  type="search"
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Tên, email hoặc mã người dùng"
                  autoComplete="off"
                  aria-label="Tìm người dùng"
                />
              </label>

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
          </div>

          <div className="user-table-wrap">
            <table className="admin-table user-table">
              <thead>
                <tr>
                  <th>Mã người dùng</th>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Ngày tham gia</th>
                  <th>Đơn hàng</th>
                  <th>Trạng thái</th>
                  <th className="user-actions-heading">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="user-table-message">
                      <i className="bi bi-arrow-repeat user-loading-icon" />
                      Đang tải danh sách người dùng...
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <span className="user-code">{user.userCode}</span>
                      </td>

                      <td>
                        <div className="user-identity">
                          <span
                            className={`user-avatar ${user.avatarClass}`}
                            aria-hidden="true"
                          >
                            {user.avatar ? (
                              <img src={user.avatar} alt="" />
                            ) : (
                              <span className="avatar-fallback">
                                {getInitials(user.name)}
                              </span>
                            )}
                          </span>

                          <div>
                            <strong>{user.name}</strong>
                            <span className="user-email">{user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        {canChangeUserRole(user) ? (
                          <select
                            className={`inline-select role-select role-${user.role}`}
                            value={user.role}
                            disabled={updatingKey === `role-${user.id}`}
                            onChange={(event) =>
                              handleRoleChange(user, event.target.value)
                            }
                            aria-label={`Vai trò của ${user.name}`}
                          >
                            <option value="customer">Khách hàng</option>
                            <option value="admin">Quản trị viên</option>
                          </select>
                        ) : (
                          <span className={`role-badge role-${user.role}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        )}
                      </td>

                      <td>{user.joinedDate || "Chưa có"}</td>
                      <td>{user.orderCount || 0}</td>

                      <td>
                        {canManageUser(user) ? (
                          <select
                            className={`inline-select status-select status-${user.status}`}
                            value={user.status}
                            disabled={updatingKey === `status-${user.id}`}
                            onChange={(event) =>
                              handleStatusChange(user, event.target.value)
                            }
                            aria-label={`Trạng thái của ${user.name}`}
                          >
                            <option value="active">Hoạt động</option>
                            <option value="blocked">Đã khóa</option>
                          </select>
                        ) : (
                          <span className={`user-status status-${user.status}`}>
                            {getStatusLabel(user.status)}
                          </span>
                        )}
                      </td>

                      <td className="user-actions-cell">
                        <button
                          className="action-view"
                          type="button"
                          onClick={() => handleOpenDetail(user)}
                          title={`Xem chi tiết ${user.name}`}
                          aria-label={`Xem chi tiết ${user.name}`}
                        >
                          <i className="bi bi-eye-fill" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {!loading && users.length === 0 && (
              <div className="empty-state">
                <span>
                  <i className="bi bi-people" />
                </span>

                <h3>Không tìm thấy người dùng phù hợp</h3>
                <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
              </div>
            )}
          </div>

          <div className="table-footer">
            <span>
              {totalUsers === 0
                ? "Hiển thị 0 kết quả"
                : `Hiển thị ${pagination.startResult}–${pagination.endResult} trong tổng số ${totalUsers} người dùng`}
            </span>

            {totalPages > 1 && (
              <nav className="pagination-nav" aria-label="Phân trang người dùng">
                <button
                  type="button"
                  disabled={currentPage === 1 || loading}
                  onClick={() =>
                    setCurrentPage((current) => Math.max(1, current - 1))
                  }
                  aria-label="Trang trước"
                >
                  <i className="bi bi-chevron-left" />
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (page) => (
                    <button
                      key={page}
                      type="button"
                      className={page === currentPage ? "active" : ""}
                      disabled={loading}
                      onClick={() => setCurrentPage(page)}
                      aria-label={`Trang ${page}`}
                      aria-current={page === currentPage ? "page" : undefined}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={currentPage === totalPages || loading}
                  onClick={() =>
                    setCurrentPage((current) =>
                      Math.min(totalPages, current + 1)
                    )
                  }
                  aria-label="Trang sau"
                >
                  <i className="bi bi-chevron-right" />
                </button>
              </nav>
            )}
          </div>
        </section>
      </div>

      {selectedUser && (
        <div
          className="user-modal user-modal-react"
          role="dialog"
          aria-modal="true"
          aria-labelledby="userDetailModalLabel"
          onMouseDown={() => setSelectedUser(null)}
        >
          <div
            className="modal-dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <span className="modal-kicker">Hồ sơ tài khoản</span>
                  <h2 className="modal-title" id="userDetailModalLabel">
                    Chi tiết người dùng
                  </h2>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setSelectedUser(null)}
                  aria-label="Đóng cửa sổ chi tiết"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="modal-body">
                <section className="detail-profile-card">
                  <span className={`detail-avatar ${selectedUser.avatarClass}`}>
                    {selectedUser.avatar ? (
                      <img
                        src={selectedUser.avatar}
                        alt={`Ảnh đại diện của ${selectedUser.name}`}
                      />
                    ) : (
                      <span aria-hidden="true">
                        {getInitials(selectedUser.name)}
                      </span>
                    )}
                  </span>
                  <div className="detail-profile-content">
                    <div className="detail-profile-main">
                      <h3>{selectedUser.name}</h3>
                      <p>{selectedUser.email}</p>
                    </div>

                    <div className="detail-badge-group">
                      <span className={`role-badge role-${selectedUser.role}`}>
                        {getRoleLabel(selectedUser.role)}
                      </span>

                      <span
                        className={`user-status status-${selectedUser.status}`}
                      >
                        {getStatusLabel(selectedUser.status)}
                      </span>
                    </div>
                  </div>
                </section>

                <div className="detail-grid">
                  <section className="detail-section">
                    <h3>
                      <i className="bi bi-person-vcard" />
                      Thông tin cá nhân
                    </h3>

                    <dl className="detail-list">
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

                  <section className="detail-section">
                    <h3>
                      <i className="bi bi-telephone" />
                      Liên hệ
                    </h3>

                    <dl className="detail-list">
                      <div>
                        <dt>Email</dt>
                        <dd>{selectedUser.email}</dd>
                      </div>

                      <div>
                        <dt>Số điện thoại</dt>
                        <dd>{selectedUser.phone || "Chưa cập nhật"}</dd>
                      </div>

                      <div className="detail-list-wide">
                        <dt>Địa chỉ</dt>
                        <dd>{selectedUser.address || "Chưa cập nhật"}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="detail-section detail-section-wide">
                    <h3>
                      <i className="bi bi-activity" />
                      Hoạt động tài khoản
                    </h3>

                    <div className="activity-summary">
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

              <div className="modal-footer">
                <button
                  type="button"
                  className="ghost-action"
                  onClick={() => setSelectedUser(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div
          className="user-modal user-modal-react"
          role="dialog"
          aria-modal="true"
          aria-labelledby="addUserModalLabel"
          onMouseDown={() => !submitting && setIsAddModalOpen(false)}
        >
          <div
            className="modal-dialog add-user-dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <form className="modal-content" onSubmit={handleAddUser}>
              <div className="modal-header">
                <div>
                  <span className="modal-kicker">Tài khoản mới</span>
                  <h2 className="modal-title" id="addUserModalLabel">
                    Thêm người dùng
                  </h2>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  disabled={submitting}
                  onClick={() => setIsAddModalOpen(false)}
                  aria-label="Đóng cửa sổ thêm người dùng"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="modal-body">
                {addFormError && (
                  <div className="add-user-error" role="alert">
                    <i className="bi bi-exclamation-circle-fill" />
                    {addFormError}
                  </div>
                )}

                <div className="user-form-grid">
                  <label className="user-form-field">
                    <span>Họ và tên *</span>
                    <input
                      name="fullName"
                      value={addForm.fullName}
                      onChange={handleAddFormChange}
                      required
                      maxLength="255"
                    />
                  </label>

                  <label className="user-form-field">
                    <span>Email *</span>
                    <input
                      type="email"
                      name="email"
                      value={addForm.email}
                      onChange={handleAddFormChange}
                      required
                      maxLength="255"
                    />
                  </label>

                  <label className="user-form-field">
                    <span>Mật khẩu *</span>
                    <input
                      type="password"
                      name="password"
                      value={addForm.password}
                      onChange={handleAddFormChange}
                      required
                      minLength="8"
                      maxLength="72"
                    />
                  </label>

                  <label className="user-form-field">
                    <span>Xác nhận mật khẩu *</span>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={addForm.confirmPassword}
                      onChange={handleAddFormChange}
                      required
                      minLength="8"
                      maxLength="72"
                    />
                  </label>

                  <label className="user-form-field">
                    <span>Số điện thoại</span>
                    <input
                      name="phone"
                      value={addForm.phone}
                      onChange={handleAddFormChange}
                      maxLength="15"
                    />
                  </label>

                  <label className="user-form-field">
                    <span>Ngày sinh</span>
                    <input
                      type="date"
                      name="birthDate"
                      value={addForm.birthDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={handleAddFormChange}
                    />
                  </label>

                  <label className="user-form-field">
                    <span>Giới tính</span>
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
                  </label>

                  <label className="user-form-field">
                    <span>Vai trò *</span>
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
                  </label>

                  <label className="user-form-field">
                    <span>Trạng thái *</span>
                    <select
                      name="status"
                      value={addForm.status}
                      onChange={handleAddFormChange}
                    >
                      <option value="active">Hoạt động</option>
                      <option value="blocked">Đã khóa</option>
                    </select>
                  </label>

                  <label className="user-form-field user-form-field-wide">
                    <span>Địa chỉ</span>
                    <input
                      name="address"
                      value={addForm.address}
                      onChange={handleAddFormChange}
                      maxLength="255"
                    />
                  </label>
                </div>
              </div>

              <div className="modal-footer add-user-actions">
                <button
                  type="button"
                  className="ghost-action"
                  disabled={submitting}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="primary-action"
                  disabled={submitting}
                >
                  <i
                    className={`bi ${submitting ? "bi-arrow-repeat" : "bi-person-plus-fill"
                      }`}
                  />
                  {submitting ? "Đang thêm..." : "Thêm người dùng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div
        className={`save-toast ${toastMessage ? "show" : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <i className="bi bi-check-circle-fill" />
        <span>{toastMessage}</span>
      </div>
    </>
  );
}

export default UserManagement;