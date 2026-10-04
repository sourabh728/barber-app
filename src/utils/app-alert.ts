import { Alert, Platform } from "react-native";

export type AppAlertButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

/**
 * Cross-platform alert. React Native's Alert.alert is unreliable on web,
 * so we fall back to window.alert / window.confirm there.
 */
export function showAppAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  const actions = buttons?.length ? buttons : [{ text: "OK" as const }];

  if (actions.length === 1) {
    window.alert(text);
    actions[0]?.onPress?.();
    return;
  }

  const confirmButton =
    actions.find((button) => button.style !== "cancel") ?? actions[0];
  const cancelButton = actions.find((button) => button.style === "cancel");
  const confirmed = window.confirm(text);

  if (confirmed) {
    confirmButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
