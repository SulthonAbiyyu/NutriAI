import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppProviders from "./src/providers/AppProviders";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <AppProviders>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AppProviders>
  );
}
