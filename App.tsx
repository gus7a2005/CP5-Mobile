import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider } from "./src/contexts/AuthContext";
import { useAuth } from "./src/hooks/useAuth";
import {
  navigationRef,
  type RootStackParamList,
} from "./src/navigation/navigationRef";
import { Loading } from "./src/components/Loading";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { ConversationsScreen } from "./src/screens/ConversationsScreen";
import { UsersScreen } from "./src/screens/UsersScreen";
import { GroupFormScreen } from "./src/screens/GroupFormScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

// Com usuário logado -> telas do app. Sem usuário (logout) -> login/cadastro.
// Ao deslogar, as telas protegidas desmontam e todos os listeners são removidos.
function Routes() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;

  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen
            name="Conversations"
            component={ConversationsScreen}
            options={{ title: "Conversas" }}
          />
          <Stack.Screen
            name="Users"
            component={UsersScreen}
            options={{ title: "Usuários" }}
          />
          <Stack.Screen
            name="GroupForm"
            component={GroupFormScreen}
            options={{ title: "Grupo" }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ title: "" }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: "Perfil" }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: "Criar conta" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="dark" />
        <Routes />
      </NavigationContainer>
    </AuthProvider>
  );
}
