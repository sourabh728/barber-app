import React from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning 👋</Text>
          <Text style={styles.location}>📍 Pune, Maharashtra</Text>
        </View>
        <Text style={styles.notification}>🔔</Text>
      </View>

      {/* Hero Image */}
      <Image
        source={require("@/assets/images/hero.jpg")}
        style={styles.heroImage}
      />

      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>
          Look Sharp. Feel Confident.
        </Text>

        <Text style={styles.bannerSubtitle}>
          Premium barber appointments near you.
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => router.push("/bookings")}>
          <Text style={styles.buttonText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        placeholder="Search barber, salon or service..."
        style={styles.search}
      />

      {/* Categories */}
      <Text style={styles.sectionTitle}>Services</Text>

      <View style={styles.categories}>
        {["✂️ Haircut", "🧔 Beard", "💆 Spa", "🎨 Color"].map((item) => (
          <View key={item} style={styles.category}>
            <Text>{item}</Text>
          </View>
        ))}
      </View>

      {/* Shop Card */}
      <Text style={styles.sectionTitle}>Nearby Shops</Text>

      <View style={styles.card}>
        <Image
          source={require("@/assets/images/hero.jpg")}
          style={styles.cardImage}
        />

        <Text style={styles.shopName}>Fade Studio</Text>

        <Text style={styles.shopInfo}>
          ⭐ 4.9 • 1.2 km • Open
        </Text>

        <Text style={styles.price}>Starting from ₹199</Text>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 60,
  },

  greeting: {
    fontSize: 24,
    fontWeight: "700",
  },

  location: {
    color: "gray",
    marginTop: 4,
  },

  notification: {
    fontSize: 26,
  },

  heroImage: {
    width: "92%",
    height: 220,
    alignSelf: "center",
    borderRadius: 18,
  },

  banner: {
    padding: 20,
  },

  bannerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },

  bannerSubtitle: {
    color: "#666",
    marginVertical: 10,
    fontSize: 16,
  },

  button: {
    backgroundColor: "#111",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },

  search: {
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginHorizontal: 20,
    marginBottom: 10,
  },

  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 15,
    marginBottom: 20,
  },

  category: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    margin: 5,
  },

  card: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 18,
    overflow: "hidden",
    elevation: 4,
  },

  cardImage: {
    width: "100%",
    height: 180,
  },

  shopName: {
    fontSize: 22,
    fontWeight: "700",
    paddingHorizontal: 15,
    marginTop: 15,
  },

  shopInfo: {
    color: "gray",
    paddingHorizontal: 15,
    marginTop: 5,
  },

  price: {
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 15,
    marginVertical: 12,
  },
});