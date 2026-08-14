import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

import {
  getInitials,
  getRoleLabel,
} from "../../../models/UserModel";

import { useProfileController } from "../../../controllers/accountController";

import "./ProfileForm.css";

function normalizeSearchText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function filterLocations(items = [], query = "") {
  const keyword = normalizeSearchText(query);

  if (!keyword) {
    return items;
  }

  return items.filter((item) => {
    const code = String(item?.code || "");
    const name = normalizeSearchText(item?.name);

    return (
      code.includes(keyword) ||
      name.includes(keyword)
    );
  });
}

function FieldError({ message }) {
  if (!message) return null;

  return (
    <small
      className="profile-field-error"
      role="alert"
    >
      <i className="bi bi-exclamation-circle" />
      {message}
    </small>
  );
}

function LocationCombobox({
  id,
  label,
  items,
  selectedCode,
  selectedName,
  placeholder,
  loadingText,
  emptyText,
  disabled = false,
  loading = false,
  required = false,
  error,
  onSelect,
  onClear,
}) {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const [query, setQuery] = useState(
    selectedName || ""
  );

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] =
    useState(-1);

  const filteredItems = useMemo(
    () => filterLocations(items, query),
    [items, query]
  );

  useEffect(() => {
    setQuery(selectedName || "");
  }, [selectedCode, selectedName]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);

        if (selectedCode) {
          setQuery(selectedName || "");
        }
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [selectedCode, selectedName]);

  const listboxId = `${id}-listbox`;
  const labelId = `${id}-label`;

  const canOpen =
    !disabled && !loading && items.length > 0;

  function openDropdown() {
    if (!canOpen) return;

    setIsOpen(true);
    setActiveIndex(
      filteredItems.length > 0 ? 0 : -1
    );
  }

  function handleInputFocus(event) {
    openDropdown();
    event.currentTarget.select();
  }

  function handleInputChange(event) {
    const nextQuery = event.target.value;

    setQuery(nextQuery);
    setIsOpen(true);
    setActiveIndex(0);

    if (
      selectedCode &&
      normalizeSearchText(nextQuery) !==
        normalizeSearchText(selectedName)
    ) {
      onClear();
    }
  }

  function handleSelect(item) {
    setQuery(item.name);
    setIsOpen(false);
    setActiveIndex(-1);
    onSelect(item);
  }

  function handleClear() {
    setQuery("");
    setIsOpen(canOpen);
    setActiveIndex(canOpen ? 0 : -1);
    onClear();

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function handleToggle() {
    if (!canOpen) return;

    setIsOpen((current) => !current);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function handleKeyDown(event) {
    if (disabled || loading) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isOpen) {
        openDropdown();
        return;
      }

      setActiveIndex((current) => {
        if (filteredItems.length === 0) {
          return -1;
        }

        return Math.min(
          current + 1,
          filteredItems.length - 1
        );
      });

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!isOpen) {
        openDropdown();
        return;
      }

      setActiveIndex((current) => {
        if (filteredItems.length === 0) {
          return -1;
        }

        return Math.max(current - 1, 0);
      });

      return;
    }

    if (event.key === "Enter") {
      if (!isOpen) return;

      event.preventDefault();

      const item =
        filteredItems[
          activeIndex >= 0 ? activeIndex : 0
        ];

      if (item) {
        handleSelect(item);
      }

      return;
    }

    if (event.key === "Escape") {
      if (!isOpen) return;

      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);

      if (selectedCode) {
        setQuery(selectedName || "");
      }

      return;
    }

    if (event.key === "Tab") {
      setIsOpen(false);
      setActiveIndex(-1);

      if (selectedCode) {
        setQuery(selectedName || "");
      }
    }
  }

  const inputPlaceholder = loading
    ? loadingText
    : placeholder;

  return (
    <div
      className="account-field profile-combobox-field"
      ref={wrapperRef}
    >
      <span id={labelId}>
        {label}

        {required && (
          <b
            className="required-mark"
            aria-label="bắt buộc"
          >
            *
          </b>
        )}
      </span>

      <div
        className={[
          "profile-combobox",
          isOpen && "is-open",
          error && "has-error",
          disabled && "is-disabled",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <i
          className="bi bi-search profile-combobox-search-icon"
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          value={query}
          placeholder={inputPlaceholder}
          disabled={disabled || loading}
          autoComplete="off"
          aria-labelledby={labelId}
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
          aria-activedescendant={
            isOpen && activeIndex >= 0
              ? `${id}-option-${activeIndex}`
              : undefined
          }
          onFocus={handleInputFocus}
          onClick={openDropdown}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />

        <div className="profile-combobox-actions">
          {query && !disabled && !loading && (
            <button
              type="button"
              className="profile-combobox-clear"
              onClick={handleClear}
              aria-label={`Xóa ${label}`}
              title="Xóa"
            >
              <i className="bi bi-x-lg" />
            </button>
          )}

          <button
            type="button"
            className="profile-combobox-toggle"
            onClick={handleToggle}
            disabled={!canOpen}
            aria-label={
              isOpen
                ? `Đóng danh sách ${label}`
                : `Mở danh sách ${label}`
            }
            title={
              isOpen
                ? "Đóng danh sách"
                : "Mở danh sách"
            }
          >
            <i
              className={`bi ${
                loading
                  ? "bi-arrow-repeat profile-spin"
                  : isOpen
                    ? "bi-chevron-up"
                    : "bi-chevron-down"
              }`}
            />
          </button>
        </div>

        {isOpen && (
          <div
            id={listboxId}
            className="profile-combobox-dropdown"
            role="listbox"
            aria-labelledby={labelId}
          >
            {filteredItems.length > 0 ? (
              <>
                <div className="profile-combobox-results">
                  {filteredItems.map(
                    (item, index) => (
                      <button
                        id={`${id}-option-${index}`}
                        key={item.code}
                        type="button"
                        className={[
                          "profile-combobox-option",
                          index === activeIndex &&
                            "active",
                          String(item.code) ===
                            String(selectedCode) &&
                            "selected",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        role="option"
                        aria-selected={
                          String(item.code) ===
                          String(selectedCode)
                        }
                        onMouseEnter={() =>
                          setActiveIndex(index)
                        }
                        onMouseDown={(event) =>
                          event.preventDefault()
                        }
                        onClick={() =>
                          handleSelect(item)
                        }
                      >
                        <span>
                          <i className="bi bi-geo-alt" />
                          {item.name}
                        </span>

                        {String(item.code) ===
                          String(selectedCode) && (
                          <i className="bi bi-check-lg" />
                        )}
                      </button>
                    )
                  )}
                </div>

                <div className="profile-combobox-footer">
                  {filteredItems.length} kết quả
                </div>
              </>
            ) : (
              <div className="profile-combobox-empty">
                <i className="bi bi-search" />
                <span>{emptyText}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <FieldError message={error} />
    </div>
  );
}

function ProfileForm({ admin = false }) {
  const {
    currentUser,
    formData,
    message,
    messageType,
    fieldErrors,
    submitting,
    avatarUploading,
    provinces,
    wards,
    provincesLoading,
    wardsLoading,
    locationError,
    maxBirthDate,
    handleChange,
    handleProvinceChange,
    handleWardChange,
    handleSubmit,
    handleAvatarChange,
  } = useProfileController();

  const avatarInputId = admin
    ? "adminAvatarInput"
    : "clientAvatarInput";

  const provinceInputId = admin
    ? "adminProvinceCombobox"
    : "clientProvinceCombobox";

  const wardInputId = admin
    ? "adminWardCombobox"
    : "clientWardCombobox";

  const changePasswordPath = admin
    ? "/admin/change-password"
    : "/account/change-password";

  const fullName =
    currentUser?.fullName ||
    currentUser?.name ||
    "Người dùng";

  useEffect(() => {
    if (!message || messageType !== "success") {
      return;
    }

    toast.success(message, {
      id: "profile-success",
    });
  }, [message, messageType]);

  function selectProvince(province) {
    handleProvinceChange({
      target: {
        value: String(province.code),
      },
    });
  }

  function clearProvince() {
    handleProvinceChange({
      target: {
        value: "",
      },
    });
  }

  function selectWard(ward) {
    handleWardChange({
      target: {
        value: String(ward.code),
      },
    });
  }

  function clearWard() {
    handleWardChange({
      target: {
        value: "",
      },
    });
  }

  return (
    <section
      className={`account-card ${
        admin ? "account-card-admin" : ""
      }`}
    >
      <div className="account-card-heading">
        <div className="account-avatar-editor">
          <div className="account-avatar-large">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt="Ảnh đại diện"
              />
            ) : (
              getInitials(fullName)
            )}
          </div>

          <label
            className={`account-avatar-upload ${
              avatarUploading ? "uploading" : ""
            }`}
            htmlFor={avatarInputId}
            title="Tải ảnh đại diện"
          >
            <i
              className={`bi ${
                avatarUploading
                  ? "bi-arrow-repeat profile-spin"
                  : "bi-camera-fill"
              }`}
            />

            <input
              id={avatarInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              disabled={avatarUploading}
            />
          </label>
        </div>

        <div>
          <span className="account-kicker">
            Hồ sơ tài khoản
          </span>

          <h1>Thông tin cá nhân</h1>

          <p>{getRoleLabel(currentUser?.role)}</p>

          <small className="account-avatar-note">
            Nhấn biểu tượng máy ảnh để cập nhật avatar ·
            JPG, PNG hoặc WebP · tối đa 2 MB
          </small>
        </div>
      </div>

      {message && (
        <div
          className={`account-message ${messageType}`}
          role="alert"
        >
          {message}
        </div>
      )}

      <form
        className="account-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="account-form-grid">
          <label className="account-field">
            <span>
              Họ và tên
              <b
                className="required-mark"
                aria-label="bắt buộc"
              >
                *
              </b>
            </span>

            <input
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              disabled={submitting}
              required
              aria-invalid={Boolean(
                fieldErrors.fullName
              )}
            />

            <FieldError
              message={fieldErrors.fullName}
            />
          </label>

          <label className="account-field">
            <span>
              Email
              <b
                className="required-mark"
                aria-label="bắt buộc"
              >
                *
              </b>
            </span>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={submitting}
              required
              aria-invalid={Boolean(
                fieldErrors.email
              )}
            />

            <FieldError message={fieldErrors.email} />
          </label>

          <label className="account-field">
            <span>
              Số điện thoại
              <b
                className="required-mark"
                aria-label="bắt buộc"
              >
                *
              </b>
            </span>

            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              maxLength="18"
              disabled={submitting}
              placeholder="Ví dụ: 0912345678"
              autoComplete="tel"
              required
              aria-invalid={Boolean(
                fieldErrors.phone
              )}
            />

            <FieldError message={fieldErrors.phone} />
          </label>

          <label className="account-field">
            <span>Ngày sinh</span>

            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              min="1900-01-01"
              max={maxBirthDate}
              onChange={handleChange}
              disabled={submitting}
              aria-invalid={Boolean(
                fieldErrors.birthDate
              )}
            />

            <small>
              Người dùng phải từ đủ 15 tuổi trở lên.
            </small>

            <FieldError
              message={fieldErrors.birthDate}
            />
          </label>

          <LocationCombobox
            id={provinceInputId}
            label="Tỉnh/Thành phố"
            items={provinces}
            selectedCode={formData.provinceCode}
            selectedName={formData.provinceName}
            placeholder="Gõ để tìm Tỉnh/Thành phố..."
            loadingText="Đang tải Tỉnh/Thành phố..."
            emptyText="Không tìm thấy Tỉnh/Thành phố phù hợp."
            loading={provincesLoading}
            disabled={submitting}
            required
            error={fieldErrors.provinceCode}
            onSelect={selectProvince}
            onClear={clearProvince}
          />

          <LocationCombobox
            id={wardInputId}
            label="Phường/Xã/Đặc khu"
            items={wards}
            selectedCode={formData.wardCode}
            selectedName={formData.wardName}
            placeholder={
              formData.provinceCode
                ? "Gõ để tìm Phường/Xã/Đặc khu..."
                : "Chọn Tỉnh/Thành phố trước"
            }
            loadingText="Đang tải Phường/Xã..."
            emptyText="Không tìm thấy Phường/Xã/Đặc khu phù hợp."
            loading={wardsLoading}
            disabled={
              submitting || !formData.provinceCode
            }
            required
            error={fieldErrors.wardCode}
            onSelect={selectWard}
            onClear={clearWard}
          />

          <label className="account-field profile-address-field">
            <span>
              Đường, số nhà
              <b
                className="required-mark"
                aria-label="bắt buộc"
              >
                *
              </b>
            </span>

            <input
              name="streetAddress"
              value={formData.streetAddress}
              onChange={handleChange}
              maxLength="255"
              disabled={submitting}
              placeholder="Ví dụ: 123 Nguyễn Huệ"
              autoComplete="street-address"
              required
              aria-invalid={Boolean(
                fieldErrors.streetAddress
              )}
            />

            <small>
              Địa chỉ sẽ được ghép theo thứ tự:
              đường/số nhà, phường/xã, tỉnh/thành phố.
            </small>

            <FieldError
              message={fieldErrors.streetAddress}
            />
          </label>
        </div>

        {locationError && (
          <div
            className="profile-location-error"
            role="alert"
          >
            <i className="bi bi-wifi-off" />
            {locationError}
          </div>
        )}

        <div className="account-form-actions">
          <Link
            className="account-secondary-button"
            to={changePasswordPath}
          >
            <i className="bi bi-shield-lock" />
            Đổi mật khẩu
          </Link>

          <button
            className="account-primary-button"
            type="submit"
            disabled={
              submitting ||
              provincesLoading ||
              wardsLoading
            }
          >
            <i
              className={`bi ${
                submitting
                  ? "bi-arrow-repeat profile-spin"
                  : "bi-check-circle-fill"
              }`}
            />

            {submitting
              ? "Đang lưu..."
              : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ProfileForm;