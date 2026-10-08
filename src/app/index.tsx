import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚀 LinkFlow</Text>
      <Text style={styles.subtitle}>
        My React Native app is working!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#161618",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 18,
    color: "#d1d5db",
  },
});
