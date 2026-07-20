import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../context/AuthContext";

export default function AppProviders({ children }) {
  return (
    <SafeAreaProvider>
      {}
      <AuthProvider>
        {}
        {children}
        {}
      </AuthProvider>
      {}
    </SafeAreaProvider>
  );
}
