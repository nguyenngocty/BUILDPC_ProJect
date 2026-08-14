import { Toaster, ToastBar, toast } from "react-hot-toast";

function AppToaster() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={12}
      toastOptions={{
        duration: 2500,

        style: {
          background: "#fff",
          color: "#111827",
          borderRadius: "12px",
          padding: "16px",
          fontSize: "14px",
          boxShadow: "0 10px 25px rgba(0,0,0,.15)",
        },

        success: {
          iconTheme: {
            primary: "#22c55e",
            secondary: "#fff",
          },
        },

        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
        },
      }}
    >
      {(currentToast) => (
        <ToastBar toast={currentToast}>
          {({ icon, message }) => (
            <>
              {icon}

              <div
                style={{
                  flex: 1,
                  marginRight: "8px",
                }}
              >
                {message}
              </div>

              {currentToast.type !== "loading" && (
                <button
                  type="button"
                  aria-label="Đóng thông báo"
                  title="Đóng"
                  onClick={() => toast.dismiss(currentToast.id)}
                  style={{
                    width: "28px",
                    height: "28px",
                    padding: 0,
                    border: "none",
                    borderRadius: "50%",
                    background: "transparent",
                    color: "#6b7280",
                    fontSize: "22px",
                    lineHeight: 1,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  &times;
                </button>
              )}
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}

export default AppToaster;