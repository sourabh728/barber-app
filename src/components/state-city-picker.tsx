import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  citiesForState,
  INDIA_STATES,
  normalizeLocationName,
} from "@/constants/india-locations";

const OTHER_CITY = "Other (type manually)";
const OTHER_STATE = "Other (type manually)";

function Dropdown({
  value,
  placeholder,
  options,
  title,
  disabled,
  onSelect,
  accessibilityLabel,
}: {
  value: string;
  placeholder: string;
  options: string[];
  title: string;
  disabled?: boolean;
  onSelect: (value: string) => void;
  accessibilityLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.field, disabled ? styles.fieldDisabled : null]}
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#777" />
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={close}
      >
        <Pressable style={styles.backdrop} onPress={close} />
        <SafeAreaView style={styles.sheet} edges={["bottom"]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={close} hitSlop={12}>
              <Ionicons name="close" size={24} color="#111" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.search}
            placeholder="Search"
            placeholderTextColor="#777"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.empty}>No matches</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  onSelect(item);
                  close();
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    item === value ? styles.optionActive : null,
                  ]}
                >
                  {item}
                </Text>
                {item === value ? (
                  <Ionicons name="checkmark" size={18} color="#0B5A47" />
                ) : null}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

/**
 * State dropdown (all Indian states/UTs) followed by a city dropdown that
 * depends on the chosen state. Changing the state clears the city.
 */
export function StateCityPicker({
  state,
  city,
  onChange,
  disabled,
  labelStyle,
  inputStyle,
}: {
  state: string;
  city: string;
  onChange: (next: { state: string; city: string }) => void;
  disabled?: boolean;
  labelStyle?: object;
  inputStyle?: object;
}) {
  const cities = useMemo(() => citiesForState(state), [state]);
  const stateIsListed = INDIA_STATES.some(
    (s) => s.toLowerCase() === state.trim().toLowerCase(),
  );
  const cityIsListed = cities.some(
    (c) => c.toLowerCase() === city.trim().toLowerCase(),
  );
  const [manualState, setManualState] = useState(false);
  const [manualCity, setManualCity] = useState(false);
  const showManualState = manualState || (Boolean(state) && !stateIsListed);
  // An unlisted state has no city list, so the city must be typed too.
  const showManualCity =
    showManualState || manualCity || (Boolean(city) && !cityIsListed);

  return (
    <>
      <Text style={labelStyle}>State</Text>
      <Dropdown
        title="Select state"
        placeholder="Select state"
        accessibilityLabel="State"
        value={showManualState ? OTHER_STATE : state}
        options={[...INDIA_STATES, OTHER_STATE]}
        disabled={disabled}
        onSelect={(next) => {
          setManualCity(false);
          if (next === OTHER_STATE) {
            setManualState(true);
            onChange({ state: "", city: "" });
          } else {
            setManualState(false);
            onChange({ state: next, city: next === state ? city : "" });
          }
        }}
      />
      {showManualState ? (
        <TextInput
          style={[inputStyle, { marginTop: 8 }]}
          placeholder="Enter state name"
          placeholderTextColor="#777"
          value={state}
          onChangeText={(value) => onChange({ state: value, city })}
          onBlur={() =>
            onChange({
              state: normalizeLocationName(state, INDIA_STATES),
              city,
            })
          }
          autoCapitalize="words"
          editable={!disabled}
          accessibilityLabel="State name"
        />
      ) : null}

      <Text style={labelStyle}>City</Text>
      {showManualState ? null : (
        <Dropdown
          title="Select city"
          placeholder={state ? "Select city" : "Select state first"}
          accessibilityLabel="City"
          value={showManualCity ? OTHER_CITY : city}
          options={[...cities, OTHER_CITY]}
          disabled={disabled || !state}
          onSelect={(next) => {
            if (next === OTHER_CITY) {
              setManualCity(true);
              onChange({ state, city: "" });
            } else {
              setManualCity(false);
              onChange({ state, city: next });
            }
          }}
        />
      )}
      {showManualCity ? (
        <TextInput
          style={[inputStyle, { marginTop: 8 }]}
          placeholder="Enter city name"
          placeholderTextColor="#777"
          value={city}
          onChangeText={(value) => onChange({ state, city: value })}
          onBlur={() =>
            onChange({ state, city: normalizeLocationName(city, cities) })
          }
          autoCapitalize="words"
          editable={!disabled}
          accessibilityLabel="City name"
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 4,
  },
  fieldDisabled: { opacity: 0.6 },
  value: { color: "#111", fontSize: 16 },
  placeholder: { color: "#777", fontSize: 16 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    padding: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  search: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111",
    marginBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  optionText: { fontSize: 16, color: "#111" },
  optionActive: { fontWeight: "700", color: "#0B5A47" },
  empty: { textAlign: "center", color: "#777", marginTop: 20 },
});
