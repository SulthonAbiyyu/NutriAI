import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors, Radius } from "../../theme";

export default function RecentFoods({ recentFoods = [], onAddToCart }) {
  const [porsiMap, setPorsiMap] = useState({});
  const [addedMap, setAddedMap] = useState({});

  const getPorsi = (id) => porsiMap[id] ?? 1;

  const changePorsi = useCallback((id, delta) => {
    setPorsiMap((prev) => ({
      ...prev,
      [id]: Math.min(10, Math.max(1, (prev[id] ?? 1) + delta)),
    }));
  }, []);

  const handleAdd = useCallback(
    (food) => {
      const porsi = getPorsi(food.id);
      onAddToCart({
        ...food,
        porsi,
        base_protein: food.protein,
        base_kalori: food.kalori,
      });
      setAddedMap((prev) => ({ ...prev, [food.id]: true }));
      setTimeout(
        () => setAddedMap((prev) => ({ ...prev, [food.id]: false })),
        900,
      );
      setPorsiMap((prev) => ({ ...prev, [food.id]: 1 }));
    },
    [onAddToCart, porsiMap],
  );

  return (
    <View style={styles.recentSection}>
      {}
      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>Terakhir Ditambahkan</Text>
        {recentFoods.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{recentFoods.length}</Text>
          </View>
        )}
      </View>

      {recentFoods.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={styles.emptyText}>
            Belum ada riwayat makanan.{"\n"}Tambah makanan pertamamu!
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentScroll}
        >
          {recentFoods.map((food, i) => {
            const porsi = getPorsi(food.id);
            const added = !!addedMap[food.id];
            const kal = Math.round((food.kalori || 0) * porsi);
            const prot = Math.round((food.protein || 0) * porsi * 10) / 10;

            return (
              <View
                key={food.id || i}
                style={[styles.recentChip, added && styles.recentChipAdded]}
              >
                {}
                <Text style={styles.recentChipName} numberOfLines={1}>
                  {food.nama_makanan}
                </Text>

                {}
                <Text style={styles.recentChipMacro}>
                  🔥 {kal} kcal · 💪 {prot}g
                </Text>

                {}
                <View style={styles.porsiRow}>
                  <TouchableOpacity
                    onPress={() => changePorsi(food.id, -1)}
                    disabled={porsi <= 1}
                    style={[styles.porsiBtn, porsi <= 1 && styles.porsiBtnOff]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text
                      style={[
                        styles.porsiBtnTxt,
                        porsi <= 1 && styles.porsiBtnTxtOff,
                      ]}
                    >
                      −
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.porsiVal}>{porsi}×</Text>

                  <TouchableOpacity
                    onPress={() => changePorsi(food.id, +1)}
                    disabled={porsi >= 10}
                    style={[styles.porsiBtn, porsi >= 10 && styles.porsiBtnOff]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text
                      style={[
                        styles.porsiBtnTxt,
                        porsi >= 10 && styles.porsiBtnTxtOff,
                      ]}
                    >
                      +
                    </Text>
                  </TouchableOpacity>
                </View>

                {}
                <TouchableOpacity
                  style={[styles.addBtn, added && styles.addBtnDone]}
                  onPress={() => handleAdd(food)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.addBtnTxt}>
                    {added ? "✓" : "+ Tambah"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  recentSection: { marginBottom: 16 },

  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  recentTitle: { fontSize: 14, fontWeight: "800", color: Colors.text },
  countBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 24,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  emptyIcon: { fontSize: 28, marginBottom: 8 },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  recentScroll: { gap: 10, paddingRight: 4 },

  recentChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: 148,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  recentChipAdded: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight || "#F0FBF4",
  },

  recentChipName: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  recentChipMacro: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  porsiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  porsiBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.bgMuted || "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  porsiBtnOff: { opacity: 0.3 },
  porsiBtnTxt: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 19,
  },
  porsiBtnTxtOff: { color: Colors.textMuted },
  porsiVal: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.text,
    minWidth: 20,
    textAlign: "center",
  },
  addBtn: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 6,
    alignItems: "center",
  },
  addBtnDone: {
    backgroundColor: Colors.success || "#22C55E",
  },
  addBtnTxt: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
