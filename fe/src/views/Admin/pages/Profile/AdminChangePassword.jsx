import ChangePasswordForm from "../../../components/Account/ChangePasswordForm";
import "../../../pages/Account/Account.css";

function AdminChangePassword() {
  return <div className="admin-account-page"><ChangePasswordForm admin /></div>;
}

export default AdminChangePassword;