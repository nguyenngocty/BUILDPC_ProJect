import React, { useEffect, useState } from "react";
import "./BuildPC.css";

import buildPcService from "../../../services/buildPcService";
import BuildPartRow from "./components/BuildPartRow";
import PartSelectorModal from "./components/PartSelectorModal";

const getListData = (response) => {
  const data = response?.data?.data ?? [];

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
};

const normalizeTypeCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getPartStock = (part) => {
  const stock = Number(part?.product_quantity);

  if (!Number.isFinite(stock)) {
    return 0;
  }

  return Math.max(0, Math.floor(stock));
};

const BuildPC = () => {
  const [partTypes, setPartTypes] = useState([]);
  const [partTypesLoading, setPartTypesLoading] = useState(true);
  const [partTypesError, setPartTypesError] = useState("");

  const [selectedParts, setSelectedParts] = useState({});

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [activePartType, setActivePartType] = useState(null);

  const [availableParts, setAvailableParts] = useState([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsError, setPartsError] = useState("");

  const loadPartTypes = async () => {
    try {
      setPartTypesLoading(true);
      setPartTypesError("");

      const response = await buildPcService.getPartTypes();

      const types = getListData(response)
        .map((type) => ({
          ...type,
          type_code: normalizeTypeCode(type.type_code),
        }))
        .filter((type) => type.id && type.type_code);

      setPartTypes(types);

      setSelectedParts((previous) => {
        const next = {};

        types.forEach((type) => {
          next[type.type_code] = previous[type.type_code] || [];
        });

        return next;
      });
    } catch (error) {
      console.error("Lỗi lấy loại linh kiện:", error);

      setPartTypes([]);
      setSelectedParts({});

      setPartTypesError(
        error?.response?.data?.message ||
          "Không thể tải danh sách loại linh kiện.",
      );
    } finally {
      setPartTypesLoading(false);
    }
  };

  const loadPartsByType = async (partType) => {
    if (!partType?.id) {
      return;
    }

    try {
      setPartsLoading(true);
      setPartsError("");
      setAvailableParts([]);

      const response = await buildPcService.getPartsByType(partType.id);

      setAvailableParts(getListData(response));
    } catch (error) {
      console.error("Lỗi lấy linh kiện:", error);

      setAvailableParts([]);

      setPartsError(
        error?.response?.data?.message || "Không thể tải danh sách linh kiện.",
      );
    } finally {
      setPartsLoading(false);
    }
  };

  useEffect(() => {
    loadPartTypes();
  }, []);

  const handleOpenSelector = async (partType) => {
    if (!partType?.id) {
      return;
    }

    setActivePartType(partType);
    setSelectorOpen(true);

    await loadPartsByType(partType);
  };

  const handleCloseSelector = () => {
    setSelectorOpen(false);
    setActivePartType(null);
    setAvailableParts([]);
    setPartsError("");
  };

  const handleSelectPart = (part) => {
    if (!activePartType || !part) {
      return;
    }

    const typeCode = normalizeTypeCode(activePartType.type_code);

    if (!typeCode) {
      return;
    }

    const stock = getPartStock(part);

    if (stock <= 0) {
      return;
    }

    setSelectedParts((previous) => ({
      ...previous,
      [typeCode]: [
        {
          ...part,
          stock,
          buildQuantity: 1,
        },
      ],
    }));

    handleCloseSelector();
  };

  const handleRemovePart = (typeCode) => {
    const code = normalizeTypeCode(typeCode);

    if (!code) {
      return;
    }

    setSelectedParts((previous) => ({
      ...previous,
      [code]: [],
    }));
  };

  const handleQuantityChange = (typeCode, partIndex, nextQuantity) => {
    const code = normalizeTypeCode(typeCode);

    if (!code) {
      return;
    }

    setSelectedParts((previous) => {
      const items = [...(previous[code] || [])];
      const target = items[partIndex];

      if (!target) {
        return previous;
      }

      const stock = getPartStock(target);

      if (stock <= 0) {
        return previous;
      }

      let quantity = Number(nextQuantity);

      if (!Number.isFinite(quantity)) {
        quantity = 1;
      }

      quantity = Math.max(1, Math.floor(quantity));
      quantity = Math.min(quantity, stock);

      items[partIndex] = {
        ...target,
        buildQuantity: quantity,
      };

      return {
        ...previous,
        [code]: items,
      };
    });
  };

  const hasSelectedParts = Object.values(selectedParts).some(
    (items) => Array.isArray(items) && items.length > 0,
  );

  const handleResetBuild = () => {
    if (!hasSelectedParts) {
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa toàn bộ linh kiện đã chọn?",
    );

    if (!confirmed) {
      return;
    }

    const emptyBuild = {};

    partTypes.forEach((type) => {
      emptyBuild[type.type_code] = [];
    });

    setSelectedParts(emptyBuild);
  };

  return (
    <main className="build-page">
      <div className="build-container">
        <section className="build-hero">
          <div className="build-hero-content">
            <div className="build-badge">
              <span className="build-badge-dot" />
              BUILD PC
            </div>

            <h1>
              Xây dựng chiếc PC
              <span> của riêng bạn</span>
            </h1>

            <p>
              Lựa chọn từng linh kiện phù hợp với nhu cầu và ngân sách. Bạn có
              thể thay đổi lựa chọn bất cứ lúc nào.
            </p>
          </div>

          <button
            type="button"
            className="build-reset-button"
            onClick={handleResetBuild}
            disabled={!hasSelectedParts}
          >
            <span>↻</span>
            Làm mới cấu hình
          </button>
        </section>

        <section className="build-guide">
          <div className="build-guide-number">01</div>

          <div>
            <strong>Chọn từng nhóm linh kiện</strong>
            <p>
              Nhấn “Chọn linh kiện” để xem các sản phẩm có thể sử dụng cho từng
              vị trí trong cấu hình.
            </p>
          </div>
        </section>

        <section className="build-board">
          <div className="build-board-header">
            <div>
              <span className="build-board-label">CẤU HÌNH CỦA BẠN</span>
              <h2>Danh sách linh kiện</h2>
            </div>

            {!partTypesLoading && !partTypesError && (
              <span className="build-board-count">
                {partTypes.length} nhóm linh kiện
              </span>
            )}
          </div>

          {partTypesLoading && (
            <div className="build-state">
              <div className="build-spinner" />
              <strong>Đang tải Build PC</strong>
              <p>Hệ thống đang lấy danh sách linh kiện...</p>
            </div>
          )}

          {!partTypesLoading && partTypesError && (
            <div className="build-state build-state-error">
              <div className="build-state-icon">!</div>

              <strong>Không thể tải dữ liệu Build PC</strong>
              <p>{partTypesError}</p>

              <button type="button" onClick={loadPartTypes}>
                Thử lại
              </button>
            </div>
          )}

          {!partTypesLoading && !partTypesError && partTypes.length === 0 && (
            <div className="build-state">
              <div className="build-state-icon">—</div>

              <strong>Chưa có loại linh kiện</strong>
              <p>
                Hiện chưa có loại linh kiện nào được cấu hình cho chức năng
                Build PC.
              </p>
            </div>
          )}

          {!partTypesLoading && !partTypesError && partTypes.length > 0 && (
            <div className="build-part-list">
              {partTypes.map((partType, index) => {
                const typeCode = normalizeTypeCode(partType.type_code);

                return (
                  <BuildPartRow
                    key={partType.id}
                    index={index + 1}
                    partType={partType}
                    selectedItems={selectedParts[typeCode] || []}
                    onSelect={() => handleOpenSelector(partType)}
                    onReplace={() => handleOpenSelector(partType)}
                    onRemove={() => handleRemovePart(typeCode)}
                    onQuantityChange={(partIndex, quantity) =>
                      handleQuantityChange(typeCode, partIndex, quantity)
                    }
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      <PartSelectorModal
        open={selectorOpen}
        partType={activePartType}
        parts={availableParts}
        selectedParts={
          activePartType
            ? selectedParts[normalizeTypeCode(activePartType.type_code)] || []
            : []
        }
        loading={partsLoading}
        error={partsError}
        onClose={handleCloseSelector}
        onSelect={handleSelectPart}
        onRetry={() => {
          if (activePartType) {
            loadPartsByType(activePartType);
          }
        }}
      />
    </main>
  );
};

export default BuildPC;
