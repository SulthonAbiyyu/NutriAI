/**
 * AiChatScreen.js
 *
 * Chat personal dengan NutriAI (Gemini via backend).
 * Fitur:
 * - Conversation history (10 pesan terakhir dikirim sebagai context)
 * - Quick prompts
 * - Auto scroll ke bawah
 * - Reset chat
 */

import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButtonFloating from '../../components/common/BackButtonFloating';
import { chatWithAI, getMealSuggestion } from '../../services/AiService';
import { Colors, Radius, Shadow, Spacing } from '../../theme';

const CHATAI_ICON = require('../../../assets/chatai.png');

// ─── Quick Prompts ────────────────────────────────────

const QUICK_PROMPTS = [
  // 'Saran Menu' dikasih action khusus: dipakai getMealSuggestion() (endpoint
  // /api/ai/meal-suggestion) yang memang dibangun buat kasih rekomendasi menu
  // konkret berdasarkan sisa kalori/protein hari ini — bukan chat generik.
  // `msg` di bawah cuma dipakai sebagai teks bubble yang tampil di layar user.
  { icon: '🍽', label: 'Saran Menu',   msg: 'Berikan saran menu makan untuk sisa hari ini berdasarkan targetku', action: 'meal_suggestion' },
  { icon: '💡', label: 'Tips Diet',    msg: 'Berikan tips diet yang efektif sesuai tujuan dietku' },
  { icon: '🥦', label: 'Tinggi Protein', msg: 'Rekomendasikan 5 makanan Indonesia tinggi protein yang mudah didapat' },
  { icon: '📊', label: 'Jelaskan TDEE', msg: 'Jelaskan apa itu TDEE dan bagaimana cara kerjanya dalam dietku' },
];

// ─── Quick Prompt Chip (3D) ──────────────────────────
// Chip mengambang di atas Input Bar (dipindah dari bawah header),
// dikasih bevel + gradient tipis + shadow + efek ketekan biar konsisten
// sama gaya 3D di komponen lain (BackButtonFloating, FabMenu, dll),
// tapi versi ringan (tanpa noise texture) biar nggak berat di deretan chip.
function QuickPromptChip({ icon, label, onPress, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 18, bounciness: 9 }).start();

  return (
    <Animated.View style={[styles.quickChipWrap, { transform: [{ scale }], opacity: disabled ? 0.5 : 1 }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#FFFFFF', '#EAFBF0']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.quickChipInner}
        >
          <Text style={styles.quickIcon}>{icon}</Text>
          <Text style={styles.quickLabel}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Bubble ──────────────────────────────────────────

// Jaring pengaman: kadang Gemini masih ngasih markdown (misal **bold**) walau
// prompt-nya udah diinstruksikan buat gak pakai itu. Bubble ini nampilin teks
// APA ADANYA (bukan markdown renderer), jadi tanda-tanda itu perlu dibuang di
// sini biar gak kelihatan literal sebagai karakter '**'/'#' di layar.
function cleanMarkdown(str) {
  return String(str)
    .replace(/\*\*(.*?)\*\*/g, '$1')  // **bold** -> bold
    .replace(/^#{1,6}\s+/gm, '');     // # Heading -> Heading
}

// List bernomor ("1. nama = deskripsi") dirender sebagai baris [nomor | teks]
// biar baris kedua saat teks-nya wrap ikut sejajar dengan teks pertama
// (hanging indent), bukan turun ke bawah nomornya.
const LIST_LINE_RE = /^(\d+\.)\s+(.*)$/;

function renderMessageText(text, textStyle) {
  return cleanMarkdown(text).split('\n').map((line, i) => {
    const match = line.match(LIST_LINE_RE);
    if (match) {
      return (
        <View key={i} style={styles.listLineRow}>
          <Text style={[textStyle, styles.listLineNumber]}>{match[1]}</Text>
          <Text style={[textStyle, styles.listLineContent]}>{match[2]}</Text>
        </View>
      );
    }
    if (line.trim() === '') {
      return <View key={i} style={styles.blankLine} />;
    }
    return <Text key={i} style={textStyle}>{line}</Text>;
  });
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  const textStyle = [styles.bubbleText, isUser && styles.bubbleTextUser];
  return (
    <View style={[styles.bubbleWrap, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
      {!isUser && (
        <View style={styles.botAvatarWrap}>
          <Image source={CHATAI_ICON} style={styles.botAvatar} resizeMode="contain" />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot, { maxWidth: '78%' }]}>
        {msg.loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>NutriAI mengetik...</Text>
          </View>
        ) : (
          <>
            <View style={styles.bubbleTextBlock}>
              {renderMessageText(msg.text, textStyle)}
            </View>
            <View style={styles.bubbleFooter}>
              <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
                {msg.timestamp}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────

// Dibikin fungsi (bukan objek statis) supaya timestamp-nya dihitung SAAT
// dipakai (mount / reset), bukan sekali doang saat file ini pertama di-import
// oleh JS bundler — kalau statis, jam yang ditampilkan bisa "beku" di waktu
// jauh sebelum user benar-benar membuka layar ini.
function makeInitialMsg() {
  return {
    id: '0',
    role: 'bot',
    text: 'Halo! Saya NutriAI 🥗\n\nTanyakan apa saja tentang nutrisi, diet, atau minta saran menu makanan. Tap 🔊 untuk mendengarkan jawaban saya!',
    tts_text: 'Halo! Saya NutriAI. Tanyakan apa saja tentang nutrisi, diet, atau minta saran menu makanan.',
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
}

// Store level-modul (bukan AsyncStorage/backend) — sengaja dibuat sesederhana
// mungkin biar gak nambah dependency baru. Ini bikin chat & history TETAP ADA
// selama app masih hidup, walau AiChatScreen di-unmount (misal user pindah tab
// lalu balik lagi ke sini). Kalau app di-kill/reload, ya balik ke pesan awal —
// itu limitasi yang disengaja. Kalau nanti butuh persist lintas restart app,
// baru upgrade ke AsyncStorage.
const chatStore = {
  messages: null, // diisi lazy pas komponen pertama kali mount
  history: [],
};

export default function AiChatScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const flatRef    = useRef(null);
  const historyRef = useRef(chatStore.history); // conversation context, ambil dari store

  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState(() => chatStore.messages || [makeInitialMsg()]);
  const [sending,  setSending]  = useState(false);

  // Tinggi kira-kira Quick Prompts row + Input Bar (send button + padding),
  // dipakai buat naruh tombol back mengambang SEJAJAR sama baris Quick Prompts
  // (bukan di atasnya lagi — sebelumnya `backButtonBottom` ikut nambahin
  // QUICK_ROW_H penuh, jadi tombolnya kedorong ke atas baris Quick Prompts dan
  // nutupin sebagian chat).
  const QUICK_ROW_H  = 58;
  const SEND_BTN_H   = 44;
  const INPUT_TOP_PAD = 10;
  // ASUMSI: BackButtonFloating berukuran ~44x44 (sama kayak sendBtn) — saya gak
  // punya source BackButtonFloating.js buat mastiin ukuran aslinya. Kalau
  // ternyata beda, tinggal sesuaikan BACK_BTN_SIZE ini biar tetap center pas
  // sama baris Quick Prompts.
  const BACK_BTN_SIZE = 44;
  const inputBarHeight   = INPUT_TOP_PAD + SEND_BTN_H + Math.max(insets.bottom, 12);
  const backButtonBottom = inputBarHeight + (QUICK_ROW_H - BACK_BTN_SIZE) / 2;

  // Simpan messages ke store level-modul tiap berubah, biar gak reset
  // kalau screen ini di-unmount lalu di-mount ulang (lihat komentar chatStore).
  useEffect(() => { chatStore.messages = messages; }, [messages]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);
  // Catatan: scroll-to-end cukup ditrigger dari satu tempat (onContentSizeChange
  // di FlatList di bawah). Sebelumnya ada useEffect terpisah yang juga manggil
  // scrollToEnd() tiap `messages` berubah — dobel dengan onContentSizeChange,
  // jadi dihapus di sini.

  const sendMessage = useCallback(async (text) => {
    const msgText = (text || input).trim();
    if (!msgText || sending) return;

    setInput('');

    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const uid = Date.now().toString();

    // Tambah pesan user + loading bubble bot
    setMessages(prev => [
      ...prev,
      { id: uid, role: 'user', text: msgText, timestamp: now },
      { id: 'loading', role: 'bot', loading: true },
    ]);
    setSending(true);

    // Update history
    historyRef.current = [
      ...historyRef.current,
      { role: 'user', text: msgText },
    ].slice(-10);
    chatStore.history = historyRef.current;

    try {
      const res      = await chatWithAI(msgText, historyRef.current);
      const botText  = res.reply    || 'Maaf, saya tidak bisa menjawab sekarang.';
      const ttsText  = res.tts_text || botText;
      const botId    = `bot_${Date.now()}`;

      historyRef.current = [
        ...historyRef.current,
        { role: 'model', text: botText },
      ].slice(-10);
      chatStore.history = historyRef.current;

      setMessages(prev =>
        prev.filter(m => m.id !== 'loading').concat({
          id: botId, role: 'bot',
          text: botText, tts_text: ttsText,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        })
      );
    } catch {
      // FIX: sebelumnya giliran user yang gagal ini tetap nyangkut di
      // historyRef tanpa balasan model, jadi chat berikutnya ngirim history
      // dengan 2 pesan 'user' beruntun ke backend (bisa bikin AI bingung
      // konteks). Batalkan giliran ini dari history biar tetap berpasangan.
      historyRef.current = historyRef.current.slice(0, -1);
      chatStore.history = historyRef.current;

      setMessages(prev =>
        prev.filter(m => m.id !== 'loading').concat({
          id: `err_${Date.now()}`, role: 'bot',
          text: '⚠️ NutriAI tidak tersedia. Pastikan koneksi internet dan GEMINI_API_KEY sudah dikonfigurasi di server.',
          tts_text: 'NutriAI tidak tersedia saat ini.',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        })
      );
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  // FIX: sebelumnya tombol "Saran Menu" cuma manggil sendMessage(q.msg), yang
  // ujungnya nembak chatWithAI() — chat generik yang cuma dikasih teks +
  // history obrolan. Backend chatWithAI gak dikasih tahu ini permintaan saran
  // menu, jadi Gemini sering malah balik ke "hari ini kamu makan segini,
  // proteinnya kurang" (menegaskan status) alih-alih kasih rekomendasi menu.
  // getMealSuggestion() manggil endpoint /api/ai/meal-suggestion yang memang
  // dibikin khusus: hitung sisa kalori/protein hari ini lalu eksplisit minta
  // Gemini kasih 3 saran menu konkret.
  const handleMealSuggestion = useCallback(async () => {
    if (sending) return;
    const promptLabel = 'Berikan saran menu makan untuk sisa hari ini berdasarkan targetku';

    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const uid = Date.now().toString();

    setMessages(prev => [
      ...prev,
      { id: uid, role: 'user', text: promptLabel, timestamp: now },
      { id: 'loading', role: 'bot', loading: true },
    ]);
    setSending(true);

    historyRef.current = [
      ...historyRef.current,
      { role: 'user', text: promptLabel },
    ].slice(-10);
    chatStore.history = historyRef.current;

    try {
      const res     = await getMealSuggestion();
      const botText = res.suggestion || 'Maaf, saran menu tidak tersedia saat ini.';
      const ttsText = res.tts_text   || botText;
      const botId   = `bot_${Date.now()}`;

      historyRef.current = [
        ...historyRef.current,
        { role: 'model', text: botText },
      ].slice(-10);
      chatStore.history = historyRef.current;

      setMessages(prev =>
        prev.filter(m => m.id !== 'loading').concat({
          id: botId, role: 'bot',
          text: botText, tts_text: ttsText,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        })
      );
    } catch {
      historyRef.current = historyRef.current.slice(0, -1);
      chatStore.history = historyRef.current;

      setMessages(prev =>
        prev.filter(m => m.id !== 'loading').concat({
          id: `err_${Date.now()}`, role: 'bot',
          text: '⚠️ Saran menu tidak tersedia. Pastikan koneksi internet dan GEMINI_API_KEY sudah dikonfigurasi di server.',
          tts_text: 'Saran menu tidak tersedia saat ini.',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        })
      );
    } finally {
      setSending(false);
    }
  }, [sending]);

  const doReset = useCallback(() => {
    historyRef.current = [];
    chatStore.history = [];
    const fresh = [makeInitialMsg()];
    chatStore.messages = fresh;
    setMessages(fresh);
  }, []);

  // FIX: sebelumnya sekali tap langsung wipe semua chat tanpa konfirmasi,
  // beda sama pola Alert.alert konfirmasi yang dipakai di aksi destruktif
  // lain (misal Logout di ProfileScreen). Kalau ke-tap gak sengaja, riwayat
  // chat hilang instan — sekarang dikasih konfirmasi dulu.
  const resetChat = useCallback(() => {
    Alert.alert(
      'Reset Percakapan?',
      'Semua riwayat chat dengan NutriAI akan dihapus dan tidak bisa dikembalikan.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: doReset },
      ]
    );
  }, [doReset]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      // FIX: sempat dicoba behavior={undefined} di Android dengan asumsi
      // windowSoftInputMode="adjustResize" udah aktif — ternyata TIDAK,
      // jadi keyboard nutupin TextInput begitu aja tanpa ada yang geser
      // layout ke atas. 'padding' dipakai di KEDUA platform: dia nambahin
      // paddingBottom di container ini setinggi keyboard (animated), dan
      // beda dari 'height' — paddingnya balik bersih ke 0 pas keyboard
      // ditutup, jadi gak nyisain spasi kosong kayak masalah sebelumnya.
      behavior="padding"
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Image source={CHATAI_ICON} style={styles.headerIcon} resizeMode="contain" />
          <Text style={styles.headerTitle}>NutriAI</Text>
          <View style={styles.onlineDot} />
        </View>
        <TouchableOpacity onPress={resetChat} style={styles.resetBtn}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => <Bubble msg={item} />}
        contentContainerStyle={styles.msgList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToEnd}
      />

      {/* ── Quick Prompts (dipindah dari bawah header ke sini — sekarang
          jadi baris tepat di atas Input Bar, jadi kelihatan "menempel"
          di komposer, bukan ikut ke-scroll bareng chat). Tombol Back
          mengambang sejajar di baris ini juga (lihat paddingLeft di
          quickScrollContent yang sengaja dikasih ruang buat tombolnya). ── */}
      <View style={styles.quickWrap}>
        {/* Spacer kosong seukuran zona tombol back — bukan View "kotak"
            yang keliatan, cuma jatah ruang doang, jadi gak ada elemen
            visual apa pun di sini. */}
        <View style={styles.quickBackSpacer} pointerEvents="none" />
        {/* FIX: pemisah sebelumnya pakai View solid + elevation buat
            nutupin chip pas digeser — tapi elevation di Android otomatis
            gambar drop-shadow sendiri, jadi malah keliatan garis di bawah
            tombol back. Diganti ke overflow:'hidden' di wrapper ini: chip
            yang kegeser ke kiri kepotong bersih sama batas View-nya sendiri
            (perilaku native, gak ada elemen ekstra yang digambar → gak ada
            garis/bayangan sama sekali). */}
        <View style={styles.quickScrollClip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickScrollContent}
          >
            {QUICK_PROMPTS.map(q => (
              <QuickPromptChip
                key={q.label}
                icon={q.icon}
                label={q.label}
                onPress={() => (q.action === 'meal_suggestion' ? handleMealSuggestion() : sendMessage(q.msg))}
                disabled={sending}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      {/* ── Input Bar ── */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Tanya soal nutrisi..."
          placeholderTextColor={Colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnOff]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || sending}
          activeOpacity={0.8}
        >
          {sending
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.sendIcon}>➤</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Tombol Back (mengambang, pojok kiri bawah — posisi sama
          kayak di InputMakanan/Laporan/Profile). Screen ini di-push
          lewat stack, jadi goBack() aman dipakai. ── */}
      <BackButtonFloating
        bottom={backButtonBottom}
        left={20}
        onPress={() => navigation.goBack()}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerCenter: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-start', gap: 6 },
  headerIcon:   { width: 22, height: 22 },
  headerTitle:  { fontSize: 16, fontWeight: '800', color: Colors.text },
  onlineDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  resetBtn:     { paddingHorizontal: 4 },
  resetText:    { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },

  // Quick Prompts — sekarang mengambang tepat di atas Input Bar
  quickWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.bg,
    paddingTop: 10, paddingBottom: 4,
  },
  // Jatah ruang kosong buat BackButtonFloating yang sejajar di baris ini
  // (left={20} + lebar tombol ~44 + jarak dikit). Ini cuma spacer, gak
  // gambar apa-apa — jadi gak ada kotak/garis/bayangan yang keliatan.
  quickBackSpacer: {
    width: 76,
  },
  // Pemisah asli: overflow 'hidden' motong chip yang digeser ke kiri persis
  // di batas View ini secara native — gak butuh View/warna/elevation
  // tambahan, jadi gak ada garis atau bayangan yang muncul di UI.
  quickScrollClip: {
    flex: 1,
    overflow: 'hidden',
  },
  quickScrollContent: {
    // Jarak dari batas pemisah ke chip pertama, biar gak mepet.
    paddingLeft: 14, paddingRight: Spacing.md, gap: 8,
  },
  quickChipWrap: {
    borderRadius: Radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10, shadowRadius: 6, elevation: 3,
  },
  quickChipInner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 8, gap: 5,
    borderWidth: 1.5,
    // Bevel tipis: atas-kiri terang, bawah-kanan gelap — konsisten sama
    // gaya 3D komponen lain, versi ringan buat chip kecil.
    borderTopColor:    'rgba(255,255,255,0.9)',
    borderLeftColor:   'rgba(255,255,255,0.9)',
    borderRightColor:  'rgba(34,197,94,0.18)',
    borderBottomColor: 'rgba(34,197,94,0.28)',
  },
  quickIcon:  { fontSize: 12 },
  quickLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  msgList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: 14 },

  bubbleWrap:  { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubbleLeft:  { justifyContent: 'flex-start' },
  // FIX: sebelumnya ada `flexDirection: 'row-reverse'` di sini. Dikombinasikan
  // sama `justifyContent: 'flex-end'`, flex-end di row-reverse itu ngarah ke
  // KIRI secara visual (main-axis start/end kebalik pas row-reverse) — jadi
  // bubble user malah nempel kiri, bukan kanan. Lagipula bubble user cuma
  // punya 1 child (gak ada avatar kayak bot), jadi gak butuh dibalik urutannya.
  bubbleRight: { justifyContent: 'flex-end' },

  botAvatarWrap: { marginBottom: 4 },
  botAvatar:     { width: 28, height: 28 },

  bubble:     { borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot:  { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, ...Shadow.xs },
  bubbleUser: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },

  bubbleTextBlock: { gap: 2 },
  bubbleText:     { fontSize: 14, color: Colors.text, lineHeight: 21, textAlign: 'justify' },
  bubbleTextUser: { color: Colors.white },
  // Baris list bernomor: kolom nomor lebar tetap + kolom teks flex, biar kalau
  // teksnya wrap ke baris berikutnya, dia sejajar sama teks pertama (hanging
  // indent) — bukan turun ke bawah nomornya.
  listLineRow:     { flexDirection: 'row', alignItems: 'flex-start' },
  listLineNumber:  { minWidth: 20 },
  listLineContent: { flex: 1 },
  blankLine:       { height: 8 }, // ganti baris kosong (paragraf baru) di teks AI

  bubbleFooter:  { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 5, gap: 8 },
  bubbleTime:    { fontSize: 9, color: Colors.textMuted },
  bubbleTimeUser:{ color: 'rgba(255,255,255,0.6)' },

  loadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  loadingText: { fontSize: 12, color: Colors.textMuted },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: Spacing.md, paddingTop: 10, gap: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  textInput: {
    flex: 1, backgroundColor: Colors.bg,
    borderRadius: Radius.lg, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, maxHeight: 100,
    color: Colors.text, borderWidth: 1.5, borderColor: Colors.border,
    // FIX: tanpa ini, multiline TextInput di Android defaultnya nempel ke
    // atas ('top'), jadi kalau teksnya cuma 1 baris pendek, kelihatan ada
    // spasi kosong nganggur di bawah teks. 'center' bikin teksnya nempatin
    // tengah box secara vertikal (gak ngaruh ke iOS, di sana defaultnya
    // udah center).
    textAlignVertical: 'center',
  },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnOff: { backgroundColor: Colors.primaryMuted },
  sendIcon:   { fontSize: 16, color: Colors.white },
});