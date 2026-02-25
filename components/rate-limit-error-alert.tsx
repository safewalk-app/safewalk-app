import { View, Text, TouchableOpacity } from "react-native";
import { cn } from "@/lib/utils";

interface RateLimitErrorAlertProps {
  visible: boolean;
  message?: string;
  retryAfter?: number;
  onDismiss?: () => void;
}

/**
 * Alert component for rate limit exceeded errors
 * Shows message and countdown timer
 */
export function RateLimitErrorAlert({
  visible,
  message,
  retryAfter = 60,
  onDismiss,
}: RateLimitErrorAlertProps) {
  if (!visible) return null;

  return (
    <View className="bg-error/10 border border-error rounded-lg p-4 mb-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-error font-semibold mb-1">Trop de requêtes</Text>
          <Text className="text-error text-sm">
            {message || "Veuillez réessayer plus tard."}
          </Text>
          {retryAfter && (
            <Text className="text-error text-xs mt-2">
              Réessayez dans {Math.ceil(retryAfter / 1000)} secondes
            </Text>
          )}
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} className="ml-2">
            <Text className="text-error font-bold text-lg">×</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
