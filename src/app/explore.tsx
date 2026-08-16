import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import LoginScreen from "@/app/auth/LoginScreen";

export default function Explore() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {!showLogin ? (
        <>
          <Text style={{ fontSize: 40 }}>Explore Screen ✂️</Text>
          <TouchableOpacity onPress={() => setShowLogin(true)}>
            <Text>Login</Text>
          </TouchableOpacity>
        </>
      ) : (
        <LoginScreen />
      )}
    </View>
  );
}