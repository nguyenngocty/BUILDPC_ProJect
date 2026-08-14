// V5: hồ sơ có địa chỉ hành chính 2 cấp và validation chi tiết.
import {
  useEffect,
  useRef,
  useState,
} from "react";

import * as authController from "./authController";
import useAuth from "../hooks/useAuth";
import locationService from "../services/locationService";
import {
  EMPTY_CHANGE_PASSWORD_FORM,
  EMPTY_PROFILE_FORM,
  createProfileForm,
  getMaximumBirthDate,
  validateProfileForm,
} from "../models/UserModel";

export function useProfileController() {
  const { currentUser, setCurrentUser } = useAuth();

  const [formData, setFormData] = useState(
    EMPTY_PROFILE_FORM
  );

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("success");

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] =
    useState(false);

  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [provincesLoading, setProvincesLoading] =
    useState(true);

  const [wardsLoading, setWardsLoading] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  const wardRequestIdRef = useRef(0);

  const maxBirthDate = getMaximumBirthDate();

  useEffect(() => {
    let active = true;

    async function loadProvinces() {
      setProvincesLoading(true);
      setLocationError("");

      try {
        const result =
          await locationService.getProvinces();

        if (active) {
          setProvinces(result);
        }
      } catch (error) {
        console.error(
          "Không thể tải danh sách tỉnh/thành:",
          error
        );

        if (active) {
          setLocationError(
            "Không thể tải danh sách Tỉnh/Thành phố. Vui lòng thử lại."
          );
        }
      } finally {
        if (active) {
          setProvincesLoading(false);
        }
      }
    }

    loadProvinces();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const nextForm = createProfileForm(currentUser);
    const provinceCode = nextForm.provinceCode;

    setFormData(nextForm);
    setFieldErrors({});
    setMessage("");

    if (!provinceCode) {
      setWards([]);
      setWardsLoading(false);

      return () => {
        active = false;
      };
    }

    async function restoreWards() {
      const requestId = ++wardRequestIdRef.current;
      setWardsLoading(true);
      setLocationError("");

      try {
        const result =
          await locationService.getWardsByProvince(
            provinceCode
          );

        if (
          active &&
          requestId === wardRequestIdRef.current
        ) {
          setWards(result);
        }
      } catch (error) {
        console.error(
          "Không thể khôi phục danh sách phường/xã:",
          error
        );

        if (active) {
          setWards([]);
          setLocationError(
            "Không thể tải danh sách Phường/Xã. Vui lòng chọn lại Tỉnh/Thành phố."
          );
        }
      } finally {
        if (
          active &&
          requestId === wardRequestIdRef.current
        ) {
          setWardsLoading(false);
        }
      }
    }

    restoreWards();

    return () => {
      active = false;
    };
  }, [currentUser]);

  function clearFieldError(fieldName) {
    setFieldErrors((current) => {
      if (!current[fieldName]) {
        return current;
      }

      const next = { ...current };
      delete next[fieldName];

      return next;
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    clearFieldError(name);
    setMessage("");
  }

  async function handleProvinceChange(event) {
    const provinceCode = String(
      event.target.value || ""
    );

    const province = provinces.find(
      (item) => String(item.code) === provinceCode
    );

    setFormData((current) => ({
      ...current,
      provinceCode,
      provinceName: province?.name || "",
      wardCode: "",
      wardName: "",
    }));

    setWards([]);
    clearFieldError("provinceCode");
    clearFieldError("wardCode");
    setMessage("");
    setLocationError("");

    if (!provinceCode) {
      setWardsLoading(false);
      return;
    }

    const requestId = ++wardRequestIdRef.current;
    setWardsLoading(true);

    try {
      const result =
        await locationService.getWardsByProvince(
          provinceCode
        );

      if (requestId === wardRequestIdRef.current) {
        setWards(result);
      }
    } catch (error) {
      console.error(
        "Không thể tải danh sách phường/xã:",
        error
      );

      if (requestId === wardRequestIdRef.current) {
        setLocationError(
          "Không thể tải danh sách Phường/Xã. Vui lòng thử lại."
        );
      }
    } finally {
      if (requestId === wardRequestIdRef.current) {
        setWardsLoading(false);
      }
    }
  }

  function handleWardChange(event) {
    const wardCode = String(
      event.target.value || ""
    );

    const ward = wards.find(
      (item) => String(item.code) === wardCode
    );

    setFormData((current) => ({
      ...current,
      wardCode,
      wardName: ward?.name || "",
    }));

    clearFieldError("wardCode");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) return;

    const validationErrors =
      validateProfileForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setMessage(Object.values(validationErrors)[0]);
      setMessageType("error");
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setMessage("");

    try {
      const result =
        await authController.updateProfile(formData);

      if (result.user) {
        setCurrentUser(result.user);
        setFormData(
          createProfileForm(result.user)
        );
      }

      setMessage(
        result.message ||
          "Cập nhật hồ sơ thành công."
      );

      setMessageType("success");
    } catch (error) {
      if (error.fieldErrors) {
        setFieldErrors(error.fieldErrors);
      }

      setMessage(
        error.message ||
          "Không thể cập nhật hồ sơ."
      );

      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || avatarUploading) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage(
        "Ảnh đại diện chỉ nhận JPG, PNG hoặc WebP."
      );

      setMessageType("error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage(
        "Ảnh đại diện không được vượt quá 2 MB."
      );

      setMessageType("error");
      return;
    }

    setAvatarUploading(true);
    setMessage("");

    try {
      const result =
        await authController.updateAvatar(file);

      if (result.user) {
        setCurrentUser(result.user);
      }

      setMessage(
        result.message ||
          "Cập nhật ảnh đại diện thành công."
      );

      setMessageType("success");
    } catch (error) {
      setMessage(
        error.message ||
          "Không thể cập nhật ảnh đại diện."
      );

      setMessageType("error");
    } finally {
      setAvatarUploading(false);
    }
  }

  return {
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
  };
}

export function useChangePasswordController() {
  const [formData, setFormData] = useState(
    EMPTY_CHANGE_PASSWORD_FORM
  );

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("error");

  const [submitting, setSubmitting] =
    useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setMessage("");

    try {
      const result =
        await authController.changePassword(formData);

      setMessage(
        result.message ||
          "Đổi mật khẩu thành công."
      );

      setMessageType("success");
      setFormData(EMPTY_CHANGE_PASSWORD_FORM);
    } catch (error) {
      setMessage(
        error.message ||
          "Không thể đổi mật khẩu."
      );

      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  return {
    formData,
    message,
    messageType,
    submitting,
    handleChange,
    handleSubmit,
  };
}