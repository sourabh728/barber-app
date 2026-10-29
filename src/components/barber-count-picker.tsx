import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const OPTIONS = [
  { value: 1, label: "1 barber" },
  { value: 2, label: "2 barbers" },
  { value: 3, label: "3+ barbers" },
];

type Props = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  labelStyle?: object;
};

export function BarberCountPicker({
  value,
  onChange,
  disabled,
  labelStyle,
}: Props) {
  return (
    <View>
      <Text style={labelStyle}>Number of barbers</Text>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange(option.value)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginBottom: 18 },
  chip: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#232336",
    backgroundColor: "#1A1A28",
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: { borderColor: "#F6A623", backgroundColor: "#2A2110" },
  chipText: { color: "#8B8BA7", fontWeight: "600", fontSize: 13 },
  chipTextSelected: { color: "#F6A623" },
});
