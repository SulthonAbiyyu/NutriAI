import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import BackButtonFloating from "../../components/common/BackButtonFloating";
import { ICONS } from "../../constants";
import { useApi } from "../../hooks/useApi";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";
import { getFoods } from "../../services/FoodService";
import {
  createTemplate,
  deleteTemplate,
  getTemplates,
  useTemplate,
} from "../../services/TemplateService";
import { Radius, Spacing } from "../../theme";

const WAKTU_OPTS = ["Pagi", "Siang", "Sore", "Malam"];
const BG_TOP = "#0B160F";
const BG_MID = "#060D08";
const BG_BOTTOM = "#020602";
const CARD_TOP = "#122217";
const CARD_MID = "#0A160C";
const CARD_BOTTOM = "#050C06";

const NOISE_DOTS = Array.from({ length: 60 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.3 + Math.random() * 0.6,
  o: 0.02 + Math.random() * 0.04,
  dark: Math.random() > 0.5,
}));

function BgTexture() {
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 220"
      preserveAspectRatio="none"
    >
      {NOISE_DOTS.map((d, i) => (
        <Circle
          key={i}
          cx={d.cx}
          cy={d.cy * 2.2}
          r={d.r}
          fill={d.dark ? `rgba(0,0,0,${d.o})` : `rgba(255,255,255,${d.o})`}
        />
      ))}
    </Svg>
  );
}
function ShadowOverlay({ opacity = 0.3 }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={["rgba(0,0,0,0)", `rgba(0,0,0,${opacity})`]}
      start={{ x: 0.12, y: 0.05 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

function DepthStack({ radius = 16, layers }) {
  const L = layers || [
    { dx: 1.2, dy: 2, color: "rgba(0,0,0,0.55)" },
    { dx: 2.4, dy: 4, color: "rgba(0,0,0,0.40)" },
    { dx: 4, dy: 6, color: "rgba(0,0,0,0.26)" },
    { dx: 5.5, dy: 8.5, color: "rgba(0,0,0,0.15)" },
  ];

  return (
    <>
      {L.map((l, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: radius,
              backgroundColor: l.color,
              transform: [{ translateX: l.dx }, { translateY: l.dy }],
            },
          ]}
        />
      ))}
    </>
  );
}

const ICON_NOISE_DOTS = Array.from({ length: 30 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.3 + Math.random() * 0.5,
  o: 0.03 + Math.random() * 0.05,
  dark: Math.random() > 0.55,
}));

function IconTexture({ opacity = 1 }) {
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
    >
      {ICON_NOISE_DOTS.map((d, i) => (
        <Circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={
            d.dark
              ? `rgba(0,0,0,${d.o * opacity})`
              : `rgba(255,255,255,${d.o * opacity})`
          }
        />
      ))}
    </Svg>
  );
}
function Card3D({ children, style, contentStyle, radius = 20 }) {
  return (
    <View style={[{ borderRadius: radius }, style]}>
      <DepthStack radius={radius} />
      <LinearGradient
        colors={[CARD_TOP, CARD_MID, CARD_BOTTOM]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={[styles.cardInner, { borderRadius: radius }, contentStyle]}
      >
        <ShadowOverlay opacity={0.22} />
        <IconTexture opacity={0.5} />
        {children}
      </LinearGradient>
    </View>
  );
}
function CtaButton({
  label,
  onPress,
  disabled,
  loading,
  colors,
  style,
  textStyle,
  small,
}) {
  const isBlocked = disabled || loading;
  return (
    <View style={[small ? styles.ctaOuterSmall : styles.ctaOuter, style]}>
      <DepthStack
        radius={small ? Radius.full : Radius.md}
        layers={[
          { dx: 1, dy: 1.6, color: "rgba(0,0,0,0.5)" },
          { dx: 2, dy: 3.2, color: "rgba(0,0,0,0.35)" },
          { dx: 3, dy: 4.6, color: "rgba(0,0,0,0.20)" },
        ]}
      />

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={isBlocked}
        style={{ borderRadius: small ? Radius.full : Radius.md }}
      >
        <LinearGradient
          colors={colors || ["#4ADE80", "#15803D"]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[
            small ? styles.ctaInnerSmall : styles.ctaInner,
            isBlocked && styles.ctaDisabled,
          ]}
        >
          <ShadowOverlay opacity={0.25} />
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              style={[small ? styles.ctaTextSmall : styles.ctaText, textStyle]}
            >
              {label}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}
function MacroPill({ icon, text, tone }) {
  const tones = {
    green: {
      bg: "rgba(34,197,94,0.14)",
      border: "rgba(74,222,128,0.4)",
      color: "#4ADE80",
    },
    orange: {
      bg: "rgba(249,115,22,0.14)",
      border: "rgba(251,146,60,0.4)",
      color: "#FB923C",
    },
    blue: {
      bg: "rgba(59,130,246,0.14)",
      border: "rgba(96,165,250,0.4)",
      color: "#60A5FA",
    },
  }[tone];
  return (
    <View
      style={[
        styles.macroPill,
        { backgroundColor: tones.bg, borderColor: tones.border },
      ]}
    >
      <Text style={[styles.macroPillText, { color: tones.color }]}>
        {icon} {text}
      </Text>
    </View>
  );
}
function FoodAvatar({ image }) {
  return (
    <View style={styles.foodAvatarOuter}>
      <LinearGradient
        colors={["#1E8449", "#052E16"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.foodAvatarInner}
      >
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.foodAvatarImg}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ fontSize: 18 }}>🍽️</Text>
        )}
      </LinearGradient>
    </View>
  );
}

function TemplateCard({ template, onUse, onDelete }) {
  const [using, setUsing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showWaktu, setShowWaktu] = useState(false);

  const totalProtein =
    template.items?.reduce((a, i) => a + (i.food?.protein || 0) * i.porsi, 0) ||
    0;
  const totalKalori =
    template.items?.reduce((a, i) => a + (i.food?.kalori || 0) * i.porsi, 0) ||
    0;

  const handleUse = async (waktu) => {
    setShowWaktu(false);
    setUsing(true);
    try {
      await useTemplate(template.id, waktu);
      onUse();
      Alert.alert(
        "✅ Berhasil",
        `Template "${template.nama}" ditambahkan ke ${waktu}`,
      );
    } catch (e) {
      Alert.alert(
        "Error",
        e?.response?.data?.error || "Gagal menggunakan template",
      );
    } finally {
      setUsing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Hapus Template", `Hapus template "${template.nama}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteTemplate(template.id);
            onDelete(template.id);
          } catch (e) {
            Alert.alert("Error", "Gagal menghapus");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Card3D style={styles.templateCardOuter}>
        {}
        <View style={styles.templateHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.templateName}>{template.nama}</Text>
            {template.deskripsi ? (
              <Text style={styles.templateDesc}>{template.deskripsi}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.75}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#F87171" />
            ) : (
              <Text style={styles.deleteBtnText}>🗑</Text>
            )}
          </TouchableOpacity>
        </View>

        {}
        <View style={styles.macroRow}>
          <MacroPill icon="💪" text={`${totalProtein}g protein`} tone="green" />
          <MacroPill icon="🔥" text={`${totalKalori} kcal`} tone="orange" />
          <MacroPill
            icon="📦"
            text={`${template.items?.length || 0} item`}
            tone="blue"
          />
        </View>

        {}
        {template.items?.map((item, i) => (
          <View key={i} style={styles.templateItem}>
            <FoodAvatar image={item.food?.image} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.templateItemName} numberOfLines={1}>
                {item.food?.nama_makanan}
              </Text>
            </View>
            <Text style={styles.templateItemMeta}>
              {item.porsi}x · {(item.food?.protein || 0) * item.porsi}g ·{" "}
              {(item.food?.kalori || 0) * item.porsi} kcal
            </Text>
          </View>
        ))}

        {}
        <CtaButton
          label="▶ Gunakan Template"
          loading={using}
          disabled={using}
          onPress={() => setShowWaktu(true)}
          style={{ marginTop: 16, width: "100%" }}
        />
      </Card3D>

      {}
      <Modal
        visible={showWaktu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWaktu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWaktu(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={styles.waktuModalOuter}
          >
            <DepthStack
              radius={22}
              layers={[
                { dx: 1.5, dy: 2.5, color: "rgba(0,0,0,0.5)" },
                { dx: 3, dy: 5, color: "rgba(0,0,0,0.35)" },
              ]}
            />
            <LinearGradient
              colors={[CARD_TOP, CARD_MID, CARD_BOTTOM]}
              locations={[0, 0.55, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={styles.waktuModal}
            >
              <ShadowOverlay opacity={0.2} />
              <Text style={styles.waktuModalTitle}>Tambah ke waktu makan:</Text>
              {WAKTU_OPTS.map((w) => (
                <TouchableOpacity
                  key={w}
                  style={styles.waktuOpt}
                  onPress={() => handleUse(w)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.waktuOptText}>{w}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.waktuCancel}
                onPress={() => setShowWaktu(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.waktuCancelText}>Batal</Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function CreateTemplateModal({ visible, onClose, onCreated }) {
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef(null);

  const handleSearch = (text) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await getFoods(text, 1, 10);
        setResults(res.data || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const addItem = (food) => {
    const exists = items.find((i) => i.food_id === food.id);
    if (exists) {
      setItems((prev) =>
        prev.map((i) =>
          i.food_id === food.id
            ? { ...i, porsi: Math.min(10, i.porsi + 1) }
            : i,
        ),
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          food_id: food.id,
          nama: food.nama_makanan,
          protein: food.protein,
          kalori: food.kalori,
          porsi: 1,
        },
      ]);
    }
    setSearch("");
    setResults([]);
  };

  const removeItem = (food_id) =>
    setItems((prev) => prev.filter((i) => i.food_id !== food_id));
  const changePorsi = (food_id, v) =>
    setItems((prev) =>
      prev.map((i) => (i.food_id === food_id ? { ...i, porsi: v } : i)),
    );

  const resetForm = () => {
    setNama("");
    setDeskripsi("");
    setItems([]);
    setSearch("");
    setResults([]);
  };

  const handleSave = async () => {
    if (!nama.trim()) return Alert.alert("Error", "Nama template wajib diisi");
    if (!items.length)
      return Alert.alert("Error", "Tambahkan minimal 1 makanan");
    setSaving(true);
    try {
      await createTemplate({
        nama: nama.trim(),
        deskripsi: deskripsi.trim(),
        items: items.map((i) => ({ food_id: i.food_id, porsi: i.porsi })),
      });
      resetForm();
      onCreated();
    } catch (e) {
      Alert.alert(
        "Error",
        e?.response?.data?.error || "Gagal menyimpan template",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const totalProtein = items.reduce((a, i) => a + i.protein * i.porsi, 0);
  const totalKalori = items.reduce((a, i) => a + i.kalori * i.porsi, 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <LinearGradient
        colors={[BG_TOP, BG_MID, BG_BOTTOM]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ flex: 1, paddingTop: 52 }}
      >
        <BgTexture />

        {}
        <View style={styles.createHeader}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.createCloseBtn}
            activeOpacity={0.75}
          >
            <Text style={styles.createCloseTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.createTitle}>Buat Template Baru</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }}
            keyboardShouldPersistTaps="handled"
          >
            {}
            <Text style={styles.fieldLabel}>Nama Template</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.inputText}
                placeholder="Contoh: Sarapan High Protein"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={nama}
                onChangeText={setNama}
              />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
              Deskripsi (opsional)
            </Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.inputText}
                placeholder="Catatan singkat..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={deskripsi}
                onChangeText={setDeskripsi}
              />
            </View>

            {}
            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
              Cari & Tambah Makanan
            </Text>
            <View style={styles.searchBox}>
              <Text style={{ fontSize: 14, marginRight: 8 }}>🔍</Text>
              <TextInput
                style={styles.inputText}
                placeholder="Cari makanan..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={search}
                onChangeText={handleSearch}
              />

              {searching && <ActivityIndicator size="small" color="#4ADE80" />}
            </View>

            {results.map((food) => (
              <TouchableOpacity
                key={food.id}
                style={styles.searchResult}
                onPress={() => addItem(food)}
                activeOpacity={0.75}
              >
                <FoodAvatar image={food.image} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.resultName}>{food.nama_makanan}</Text>
                  <Text style={styles.resultMeta}>
                    {food.protein}g protein · {food.kalori} kcal
                  </Text>
                </View>
                <View style={styles.addChip}>
                  <Text style={{ color: "#4ADE80", fontWeight: "800" }}>+</Text>
                </View>
              </TouchableOpacity>
            ))}

            {}
            {items.length > 0 && (
              <Card3D style={{ marginTop: 16 }} radius={18}>
                <View style={styles.cartHead}>
                  <Text style={styles.cartTitle}>
                    📦 Item Template ({items.length})
                  </Text>
                  <Text style={styles.cartMacro}>
                    {totalProtein}g · {totalKalori} kcal
                  </Text>
                </View>
                {items.map((item) => (
                  <View key={item.food_id} style={styles.cartRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartName} numberOfLines={1}>
                        {item.nama}
                      </Text>
                      <Text style={styles.cartMeta}>
                        {item.protein * item.porsi}g ·{" "}
                        {item.kalori * item.porsi} kcal
                      </Text>
                    </View>
                    <View style={styles.porsiCtrl}>
                      <TouchableOpacity
                        style={styles.porsiBtn}
                        onPress={() =>
                          changePorsi(item.food_id, Math.max(1, item.porsi - 1))
                        }
                      >
                        <Text style={styles.porsiBtnTxt}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.porsiVal}>{item.porsi}x</Text>
                      <TouchableOpacity
                        style={styles.porsiBtn}
                        onPress={() =>
                          changePorsi(
                            item.food_id,
                            Math.min(10, item.porsi + 1),
                          )
                        }
                      >
                        <Text style={styles.porsiBtnTxt}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeItem(item.food_id)}
                      style={{ paddingLeft: 10 }}
                    >
                      <Text style={{ color: "#F87171", fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </Card3D>
            )}

            <CtaButton
              label="Simpan Template"
              loading={saving}
              onPress={handleSave}
              disabled={saving || !nama.trim() || items.length === 0}
              style={{ marginTop: 22, width: "100%" }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Modal>
  );
}

export default function MealTemplatesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const openCreate = useCallback(() => setCreateVisible(true), []);
  const closeCreate = useCallback(() => setCreateVisible(false), []);

  const { data: templates, loading, execute } = useApi(getTemplates);

  useRefreshOnFocus(execute);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await execute().catch(() => {});
    setRefreshing(false);
  }, [execute]);

  const onDelete = useCallback(() => {
    execute();
  }, [execute]);

  return (
    <LinearGradient
      colors={[BG_TOP, BG_MID, BG_BOTTOM]}
      locations={[0, 0.5, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <BgTexture />

      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <View style={styles.titleIconOuter}>
            <DepthStack radius={16} />
            <LinearGradient
              colors={["#173C22", "#050B06"]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.titleIconInner}
            >
              <ShadowOverlay opacity={0.28} />
              <IconTexture opacity={0.6} />
              <Image
                source={ICONS.mealTemplateTitle}
                style={styles.titleIconImg}
                resizeMode="contain"
              />
            </LinearGradient>
          </View>
          <View style={styles.titleStack}>
            <Text style={styles.titleShadow}>Meal Templates</Text>
            <Text style={styles.title}>Meal Templates</Text>
          </View>
        </View>

        <CtaButton label="+ Buat" onPress={openCreate} small />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4ADE80"
          />
        }
      >
        {}
        <Card3D style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>💡 Apa itu Meal Template?</Text>
              <Text style={styles.infoText}>
                Simpan kombinasi makanan favoritmu sebagai template. Satu tap
                untuk langsung tambahkan ke daily log — hemat waktu input!
              </Text>
            </View>
            <View style={styles.infoIconWrap}>
              <Text style={{ fontSize: 30 }}>📋</Text>
            </View>
          </View>
        </Card3D>

        {loading && !templates ? (
          <ActivityIndicator
            size="large"
            color="#4ADE80"
            style={{ marginTop: 40 }}
          />
        ) : !templates || templates.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Belum ada template</Text>
            <Text style={styles.emptyDesc}>
              Buat template dari kombinasi makananmu yang sering dimakan
            </Text>
            <CtaButton
              label="+ Buat Template Pertama"
              onPress={openCreate}
              style={{ marginTop: 20, width: "100%" }}
            />
          </View>
        ) : (
          templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onUse={execute}
              onDelete={onDelete}
            />
          ))
        )}
      </ScrollView>

      {}
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(2,6,2,0)",
          "rgba(2,6,2,0.22)",
          "rgba(2,6,2,0.55)",
          "rgba(2,6,2,0.82)",
          BG_BOTTOM,
        ]}
        locations={[0, 0.28, 0.55, 0.8, 1]}
        style={[styles.footerBox, { height: insets.bottom + 100 }]}
      />

      <BackButtonFloating
        bottom={insets.bottom + 30}
        left={20}
        onPress={() => navigation.goBack()}
      />

      <CreateTemplateModal
        visible={createVisible}
        onClose={closeCreate}
        onCreated={() => {
          closeCreate();
          execute();
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: 16,
    paddingBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  titleIconOuter: {
    width: 44,
    height: 44,
    borderRadius: 14,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.6)",
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  titleIconInner: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.10)",
    borderLeftColor: "rgba(255,255,255,0.10)",
    borderRightColor: "rgba(0,0,0,0.55)",
    borderBottomColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  titleIconImg: { width: 26, height: 26 },
  titleStack: { position: "relative", justifyContent: "center" },
  titleShadow: {
    position: "absolute",
    top: 1.5,
    left: 1,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "rgba(0,0,0,0.55)",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "#FFFFFF",
    textShadowColor: "rgba(61,255,143,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  footerBox: { position: "absolute", left: 0, right: 0, bottom: 0 },
  cardInner: {
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.10)",
    borderLeftColor: "rgba(255,255,255,0.10)",
    borderRightColor: "rgba(0,0,0,0.55)",
    borderBottomColor: "rgba(0,0,0,0.55)",
    padding: 18,
    overflow: "hidden",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4ADE80",
    marginBottom: 8,
  },
  infoText: { fontSize: 12.5, color: "rgba(255,255,255,0.65)", lineHeight: 19 },
  infoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    marginLeft: 12,
    backgroundColor: "rgba(74,222,128,0.10)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  templateCardOuter: { marginBottom: 16 },
  templateHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  templateName: { fontSize: 17, fontWeight: "900", color: "#FFFFFF" },
  templateDesc: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.5)",
    marginTop: 3,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,113,113,0.12)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
  },
  deleteBtnText: { fontSize: 16 },

  macroRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  macroPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  macroPillText: { fontSize: 12, fontWeight: "800" },

  templateItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  templateItemName: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  templateItemMeta: { fontSize: 11.5, color: "#4ADE80", fontWeight: "700" },

  foodAvatarOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOffset: { width: 1.5, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  foodAvatarInner: {
    flex: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  foodAvatarImg: { width: "100%", height: "100%" },
  ctaOuter: { position: "relative", borderRadius: Radius.md },
  ctaOuterSmall: { position: "relative", borderRadius: Radius.full },
  ctaInner: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.35)",
    borderLeftColor: "rgba(255,255,255,0.35)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.5)",
    overflow: "hidden",
  },
  ctaInnerSmall: {
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.35)",
    borderLeftColor: "rgba(255,255,255,0.35)",
    borderRightColor: "rgba(0,0,0,0.4)",
    borderBottomColor: "rgba(0,0,0,0.5)",
    overflow: "hidden",
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14.5,
    letterSpacing: 0.2,
  },
  ctaTextSmall: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,5,3,0.72)",
    justifyContent: "flex-end",
  },
  waktuModalOuter: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    position: "relative",
  },
  waktuModal: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.10)",
    padding: Spacing.lg,
    overflow: "hidden",
  },
  waktuModalTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
    color: "#FFFFFF",
  },
  waktuOpt: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  waktuOptText: { fontSize: 15.5, color: "#4ADE80", fontWeight: "700" },
  waktuCancel: { marginTop: 10, alignItems: "center", paddingVertical: 12 },
  waktuCancelText: { fontSize: 14.5, color: "rgba(255,255,255,0.5)" },
  createHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  createCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  createCloseTxt: { fontSize: 16, color: "#FFFFFF", fontWeight: "700" },
  createTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.55)",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputBox: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.10)",
  },
  inputText: { flex: 1, fontSize: 14, color: "#FFFFFF" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.10)",
  },
  searchResult: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  resultName: { fontSize: 13.5, fontWeight: "700", color: "#FFFFFF" },
  resultMeta: { fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  addChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(74,222,128,0.14)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.35)",
  },

  cartHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cartTitle: { fontSize: 13.5, fontWeight: "800", color: "#FFFFFF" },
  cartMacro: { fontSize: 12.5, color: "#4ADE80", fontWeight: "800" },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  cartName: { fontSize: 13.5, fontWeight: "700", color: "#FFFFFF" },
  cartMeta: { fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 2 },

  porsiCtrl: { flexDirection: "row", alignItems: "center", gap: 8 },
  porsiBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
  },
  porsiBtnTxt: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 17,
  },
  porsiVal: {
    fontSize: 13,
    fontWeight: "900",
    color: "#4ADE80",
    minWidth: 26,
    textAlign: "center",
  },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: "900", color: "#FFFFFF" },
  emptyDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 24,
  },
});
