import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
} from "@expo/vector-icons";

export default function Profile() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Text style={styles.profileTitle}>Profile</Text>

          <TouchableOpacity style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.userRow}>
          <Image
            source={require("@/assets/images/profile.png")}
            style={styles.avatar}
          />

          <View>
            <Text style={styles.name}>Peri Kumar</Text>
            <Text style={styles.phone}>+91 9876543210</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>1</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <Text style={styles.statNumber}>45</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: "#D4AF37" }]}>150</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <MenuItem
          icon={<Ionicons name="person" size={22} color="#2563EB" />}
          title="Edit Profile"
        />

        <MenuItem
          icon={<Ionicons name="heart" size={22} color="#EF4444" />}
          title="Favorite Shops"
        />

        <MenuItem
          icon={<Ionicons name="wallet" size={22} color="#22C55E" />}
          title="Payment Methods"
        />

        <MenuItem
          icon={<Feather name="help-circle" size={22} color="#475569" />}
          title="Help & Support"
        />

        <MenuItem
          icon={<MaterialIcons name="logout" size={22} color="#DC2626" />}
          title="Logout"
        />
      </View>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem}>
      <View style={styles.iconCircle}>{icon}</View>

      <Text style={styles.menuTitle}>{title}</Text>

      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  header: {
    backgroundColor: "#0B5A47",
    paddingTop: 60,
    paddingHorizontal: 25,
    paddingBottom: 35,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  profileTitle: {
    color: "white",
    fontSize: 34,
    fontWeight: "700",
  },

  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 35,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginRight: 18,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.4)",
  },

  name: {
    color: "white",
    fontSize: 30,
    fontWeight: "700",
  },

  phone: {
    color: "white",
    fontSize: 17,
    marginTop: 6,
  },

  statsContainer: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: -28,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 22,
    elevation: 4,
  },

  stat: {
    alignItems: "center",
    flex: 1,
  },

  divider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },

  statNumber: {
    fontSize: 28,
    fontWeight: "700",
  },

  statLabel: {
    marginTop: 8,
    color: "#6B7280",
  },

  menu: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 25,
    paddingVertical: 12,
    elevation: 3,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },

  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
  },

  menuTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
});