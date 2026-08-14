import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import AppToaster from "./views/components/AppToaster";
import AIChatBox from "./views/components/AIChat/AIChatBox";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppRoutes />

        <AIChatBox />

        <AppToaster />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;