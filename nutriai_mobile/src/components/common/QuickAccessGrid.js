/**
 * QuickAccessGrid.js
 * Grid 3x2 (6 box) — versi "3D realistik, banyak layer".
 *
 * Catatan penting: sorot cahaya dari halaman dashboard itu di LUAR file ini
 * (datang dari atas komponen ini). Tugas file ini cuma satu: bikin tiap box
 * SENDIRI sudah terlihat seperti objek fisik 3D — bertekstur, berlapis,
 * punya bevel/tepi — supaya waktu kena sorot dari dashboard, dia react
 * kayak benda nyata, bukan kotak flat yang cuma "diterangi warna".
 *
 * Resep "banyakin layer" yang dipakai per tile (dari bawah ke atas):
 *  1. Outer ambient shadow  → tileWrap, diagonal ke kanan-bawah (bukan blur
 *                              simetris) supaya box kebaca berdiri di atas bg
 *  2. DepthStack (4 layer)  → beberapa View berbentuk PERSIS sama kayak tile
 *                              (radius sama), ditumpuk & digeser makin jauh
 *                              ke kanan-bawah, makin transparan → simulasi
 *                              blur + shadow di sisi BAWAH dan KANAN sekaligus.
 *                              Karena bentuknya identik dgn tile, sudut
 *                              kanan-bawahnya otomatis ikut radius (nggak
 *                              ada garis lurus/siku).
 *  3. Base gradient         → warna dasar, terang kiri-atas → gelap kanan-bawah
 *  4. ShadowOverlay         → gradient diagonal transparan→hitam, nambah kontras
 *  5. Texture (noise dots)  → bintik-bintik kecil acak (terang+gelap campur),
 *                              BUKAN garis — biar permukaan kerasa kertas/kanvas
 *  6. Bevel border          → border 4 sisi beda warna (atas-kiri terang,
 *                              bawah-kanan gelap) = classic emboss/bevel trick
 *  7. Icon                  → gambar PNG langsung (tanpa badge/box), size tetap
 *                              disamakan antar tile biar rapi.
 *
 * CATATAN UPDATE:
 *  - Box paling kanan di tiap row (Laporan & Chat NutriAI) sebelumnya
 *    warnanya beda sendiri (oranye/emas terang) dibanding box lain yang
 *    gelap. Sekarang diselaraskan: tetap pakai identitas hue-nya (amber utk
 *    Laporan, gold utk Chat NutriAI) tapi di-gelapkan supaya senada dengan
 *    box "Tambah Data" & "Jarvis" — 3D layer (DepthStack, ShadowOverlay,
 *    Texture, bevel border) TIDAK diubah, cuma base gradient + border +
 *    shadowColor yang disesuaikan.
 *  - Semua icon (emoji/teks) diganti jadi gambar PNG asli dari folder
 *    assets, ditampilkan LANGSUNG tanpa badge/circle/hexagon box lagi.
 *    Khusus Jarvis: default mic.png, saat aktif (recording/processing)
 *    ganti jadi speaker.png, balik ke mic.png lagi saat idle.
 *  - Icon PNG diperbesar (36 → 44) supaya lebih terlihat/nendang.
 *  - Tiap tile sekarang punya TITLE (label) di bagian ATAS box, sengaja
 *    digeser naik (translateY negatif via `top: -14`) supaya sebagian badge-nya "nongol"
 *    keluar dari tepi atas box → kesan pill/label itu ditempel & timbul
 *    di atas permukaan tile, bukan nempel rata di dalam.
 *  - Font title dibikin kesan 3D/ekstrusi: karena React Native cuma
 *    support SATU textShadow per <Text>, teksnya di-render berlapis
 *    (beberapa <Text> sama persis ditumpuk, digeser dikit ke kanan-bawah,
 *    warna makin gelap) — trik klasik "faux 3D lettering" ala logo game/
 *    comic. Pill di belakang title juga dikasih gradient + bevel border +
 *    drop shadow sendiri biar makin "timbul".
 *  - JarvisTile sekarang ngukur posisinya sendiri di layar tiap kali
 *    di-tap (measureInWindow) dan ngirim { x, y, width, height } lewat
 *    onJarvis(rect) — dipakai DashboardScreen buat naruh JarvisVoiceOverlay
 *    mengambang tepat di atas box ini, bukan sebagai bottom-sheet.
 *
 * PENTING soal icon assets:
 *  Semua require(...) gambar icon TIDAK di-hardcode di file ini lagi —
 *  dipindah ke `ICONS` di constants/index.js (satu sumber kebenaran,
 *  konsisten sama pola BG_IMAGE yang sudah ada di situ). File ini
 *  lokasinya di src/components/common/QuickAccessGrid.js, jadi importnya
 *  `import { ICONS } from '../../constants'` (naik 2 level: common →
 *  components → src, baru turun ke constants). Kalau file ini dipindah
 *  ke folder lain, path import-nya WAJIB disesuaikan lagi.
 *
 * Dependency: react-native-svg (dipakai buat texture noise dots).
 * Kalau belum ada: `expo install react-native-svg`.
 *
 * Props:
 *  onInputMakanan     — () => void
 *  onTambahData       — () => void
 *  onLaporan          — () => void
 *  onProfile          — () => void
 *  onJarvis           — (rect: {x,y,width,height}) => void — posisi tile di
 *                        layar (measureInWindow), dipakai buat naruh
 *                        JarvisVoiceOverlay mengambang tepat di atas box ini
 *  onJarvisType       — (rect: {x,y,width,height}) => void (opsional) — buka
 *                        fallback input teks (badge ⌨ di pojok tile Jarvis,
 *                        cuma nongol pas idle), rect sama kayak onJarvis
 *  onChatAI           — () => void
 *  micStatus          — 'idle' | 'recording' | 'processing'
 *  isSpeaking         — boolean — true kalau Jarvis lagi ngomong balik (TTS
 *                        playback beneran) — tile pakai icon speaker.png
 *                        HANYA di kondisi ini, bukan pas recording/processing
 *  onExpand           — () => void (opsional, tombol bulat box 6)
 *  onSearch           — () => void (opsional, tombol bulat box 6)
 *  profileImageSource — ImageSourcePropType, misal require('./assets/profile.jpg')
 *                        atau { uri: 'https://...' }. Kalau tidak dikasih,
 *                        tile Profile fallback ke icon profile.png biasa.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ICONS } from '../../constants';

// Gradient diagonal transparan → hitam, dipakai sebagai overlay kedua
// di semua tile supaya ada kontras shadow, bukan cuma warna solid.
function ShadowOverlay({ opacity = 0.32 }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(0,0,0,0)', `rgba(0,0,0,${opacity})`]}
      start={{ x: 0.15, y: 0.1 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

// ── DepthStack ────────────────────────────────────────────────────────
// Beberapa lapis View berbentuk PERSIS sama kayak tile (borderRadius
// sama, radius 20), masing-masing digeser dikit ke kanan-bawah dan makin
// gelap-transparan makin jauh. Karena bentuknya identik dengan tile,
// sudut kanan-bawahnya OTOMATIS ikut radius tile — tidak ada garis
// lurus/siku di manapun. Efek tumpukannya juga jadi "blur palsu" (fake
// gaussian) dan nambah shadow di sisi kanan sekaligus bawah.
const DEPTH_LAYERS = [
  { dx: 1.5, dy: 2.5, color: 'rgba(0,0,0,0.55)' }, // paling dekat, paling tajam (seam)
  { dx: 3, dy: 5, color: 'rgba(0,0,0,0.40)' },
  { dx: 5, dy: 7.5, color: 'rgba(0,0,0,0.26)' },
  { dx: 7, dy: 10.5, color: 'rgba(0,0,0,0.15)' }, // paling jauh, paling lembut
];

function DepthStack({ radius = 20 }) {
  return (
    <>
      {DEPTH_LAYERS.map((l, i) => (
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

// ── Texture (noise/grain) ───────────────────────────────────────────────
// Bintik-bintik kecil acak (noise/grain beneran), campuran titik terang &
// gelap supaya permukaan kerasa bertekstur kayak kertas/kanvas, bukan
// gradient vector yang mulus. Posisi di-generate sekali aja pas module
// load (bukan tiap render), pakai koordinat 0-100 (viewBox persen) supaya
// otomatis pas di tile ukuran berapa pun tanpa perlu tahu pixel aslinya.
const NOISE_DOTS = Array.from({ length: 42 }).map(() => ({
  cx: Math.random() * 100,
  cy: Math.random() * 100,
  r: 0.3 + Math.random() * 0.55,
  o: 0.035 + Math.random() * 0.055,
  dark: Math.random() > 0.55,
}));

function Texture({ opacity = 1 }) {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 100" width="100%" height="100%">
      {NOISE_DOTS.map((d, i) => (
        <Circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={d.dark ? `rgba(0,0,0,${d.o * opacity})` : `rgba(255,255,255,${d.o * opacity})`}
        />
      ))}
    </Svg>
  );
}

// ── Title3D ──────────────────────────────────────────────────────────
// Label di atas tiap tile, dibikin kesan "timbul"/3D:
//  1. Pill (LinearGradient + bevel border + shadow sendiri) → badge-nya
//     sendiri sudah kayak objek fisik nempel di tile.
//  2. Posisi pill digeser ke atas (translateY negatif via `top: -14`)
//     supaya separuh badannya nongol keluar dari tepi atas box.
//  3. Teksnya di-extrude: RN cuma bisa 1 textShadow per <Text>, jadi biar
//     kelihatan solid/3D, teks yang sama ditumpuk beberapa kali (absolute,
//     saling geser 1px) dengan warna makin gelap dari lapis paling bawah
//     ke paling atas, lalu lapis paling atas dikasih highlight tipis
//     (textShadow putih di sisi atas) biar permukaannya kebaca mengkilap.
function Title3D({ label, tint = '#FFF7E6', edge = 'rgba(30,20,8,0.9)', pillColors = ['#3A2F22', '#1C140C'] }) {
  const EXTRUDE = [
    { d: 2.5, c: 'rgba(0,0,0,0.55)' },
    { d: 1.5, c: 'rgba(0,0,0,0.65)' },
    { d: 0.75, c: edge },
  ];
  return (
    <View style={st.titleAnchor} pointerEvents="none">
      <LinearGradient
        colors={pillColors}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={st.titlePill}
      >
        <View style={st.titleTextStack}>
          {EXTRUDE.map((l, i) => (
            <Text
              key={i}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={[st.titleText, { position: 'absolute', top: l.d, left: l.d, color: l.c }]}
            >
              {label}
            </Text>
          ))}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={[
              st.titleText,
              {
                color: tint,
                textShadowColor: 'rgba(255,255,255,0.55)',
                textShadowOffset: { width: 0, height: -1 },
                textShadowRadius: 1,
              },
            ]}
          >
            {label}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// Icon gambar langsung, tanpa badge/box di belakangnya (sesuai permintaan).
function TileIcon({ source, size = 44, style }) {
  return (
    <Image source={source} style={[{ width: size, height: size }, style]} resizeMode="contain" />
  );
}

function Tile({
  colors,
  borderColor,
  shadowColor,
  icon,
  iconSize = 54,
  onPress,
  children,
  overlayOpacity = 0.32,
  accessibilityLabel,
  title,
  titleTint,
  titlePillColors,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Animated.View style={[st.tileWrap, { transform: [{ scale }], shadowColor }]}>
      {/* DepthStack di LUAR tileInner (bukan di dalam) supaya tidak ke-clip
          sama overflow:hidden-nya, dan bentuknya (borderRadius 20) sama
          persis kayak tile → sudut kanan-bawah otomatis ikut radius. */}
      <DepthStack />
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityLabel={accessibilityLabel}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[
            st.tileInner,
            {
              // Bevel border: sisi kiri-atas lebih terang (nangkep cahaya),
              // sisi kanan-bawah lebih gelap (jatuh bayangan) — trik emboss klasik.
              borderTopColor: borderColor,
              borderLeftColor: borderColor,
              borderRightColor: 'rgba(0,0,0,0.22)',
              borderBottomColor: 'rgba(0,0,0,0.30)',
            },
          ]}
        >
          <ShadowOverlay opacity={overlayOpacity} />
          <Texture />
          {icon && <TileIcon source={icon} size={iconSize} />}
          {children}
        </LinearGradient>
      </TouchableOpacity>
      {title && <Title3D label={title} tint={titleTint} pillColors={titlePillColors} />}
    </Animated.View>
  );
}

// Tile foto asli — dipakai untuk Profile. Kalau profileImageSource tidak ada,
// parent sebaiknya fallback ke <Tile icon={ICONS.profile} .../>.
function PhotoTile({ source, onPress, accessibilityLabel, title, titleTint, titlePillColors }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Animated.View style={[st.tileWrap, { transform: [{ scale }], shadowColor: 'rgba(20,20,20,0.45)' }]}>
      <DepthStack />
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityLabel={accessibilityLabel}
        style={{ flex: 1 }}
      >
        <ImageBackground
          source={source}
          style={[
            st.tileInner,
            {
              borderTopColor: 'rgba(255,255,255,0.30)',
              borderLeftColor: 'rgba(255,255,255,0.30)',
              borderRightColor: 'rgba(0,0,0,0.25)',
              borderBottomColor: 'rgba(0,0,0,0.35)',
            },
          ]}
          imageStyle={{ borderRadius: 20 }}
        >
          {/* gradient tipis biar foto tetap senada sama tile lain */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.38)']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Texture opacity={0.6} />
        </ImageBackground>
      </TouchableOpacity>
      {title && <Title3D label={title} tint={titleTint} pillColors={titlePillColors} />}
    </Animated.View>
  );
}

// ── Jarvis tile: icon berubah (mic ⇄ speaker) + pulse ring sesuai micStatus ──
// onPress dipanggil dengan { x, y, width, height } (posisi tile di layar,
// hasil measureInWindow) — dipakai DashboardScreen buat naruh
// JarvisVoiceOverlay mengambang tepat di atas box ini.
//
// FIX ikon: sebelumnya icon speaker.png dipakai buat nandain "lagi
// rekam/proses" — padahal secara konvensi UI, speaker itu artinya "lagi
// ngeluarin suara" (output/TTS), bukan "lagi nangkep suara" (input/rekam).
// Sekarang dipisah: mic.png dipakai terus buat rekam & proses (pulse ring-nya
// sendiri sudah cukup nandain lagi aktif), speaker.png cuma dipakai pas
// Jarvis BENERAN lagi ngomong balik (`isSpeaking` dari TTS playback).
function JarvisTile({ onPress, onTypePress, micStatus, isSpeaking, title, titleTint, titlePillColors }) {
  const isRecording = micStatus === 'recording';
  const isProcessing = micStatus === 'processing';
  const isIdle = !isRecording && !isProcessing;
  const wrapRef = useRef(null);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let loop;
    if (isRecording) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
    } else {
      pulse.setValue(1);
    }
    return () => loop?.stop();
  }, [isRecording]);

  const colors = isRecording
    ? ['#665C50', '#332C24']
    : isProcessing
    ? ['#5C5245', '#302921']
    : isSpeaking
    ? ['#665C50', '#332C24']
    : ['#5A5147', '#26211C'];

  // mic.png = idle/recording/processing (lagi nunggu atau nangkep suara user).
  // speaker.png = HANYA pas Jarvis lagi ngomong balik (TTS playback beneran).
  const iconSource = isSpeaking ? ICONS.speaker : ICONS.mic;

  const handlePress = () => {
    // collapsable={false} di wrapper memastikan measureInWindow tetap
    // akurat di Android (kalau tidak, View ini bisa "di-flatten" native side).
    wrapRef.current?.measureInWindow((x, y, width, height) => {
      onPress?.({ x, y, width, height });
    });
  };

  const handleTypePress = () => {
    // Sama persis kayak handlePress — badge ini nempel di tile yang sama,
    // jadi anchor-nya ikut posisi tile juga (bukan posisi badge kecilnya).
    wrapRef.current?.measureInWindow((x, y, width, height) => {
      onTypePress?.({ x, y, width, height });
    });
  };

  return (
    <Animated.View
      ref={wrapRef}
      collapsable={false}
      style={[st.tileWrap, { shadowColor: 'rgba(42,36,28,0.45)' }]}
    >
      <DepthStack />
      <TouchableOpacity activeOpacity={0.88} onPress={handlePress} style={{ flex: 1 }} accessibilityLabel="Jarvis">
        <LinearGradient
          colors={colors}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[
            st.tileInner,
            {
              borderTopColor: 'rgba(255,255,255,0.18)',
              borderLeftColor: 'rgba(255,255,255,0.18)',
              borderRightColor: 'rgba(0,0,0,0.32)',
              borderBottomColor: 'rgba(0,0,0,0.42)',
            },
          ]}
        >
          <ShadowOverlay opacity={0.3} />
          <Texture />
          <Animated.Image
            source={iconSource}
            style={{ width: 54, height: 54, transform: [{ scale: pulse }] }}
            resizeMode="contain"
          />
        </LinearGradient>
      </TouchableOpacity>

      {/* Fallback: ketik perintah alih-alih ngomong — buat situasi tempat
          berisik/gak nyaman ngomong (warung, kantin, dll), atau kalau mic
          bermasalah. Cuma nongol pas idle biar gak ganggu tampilan lagi
          rekam/proses. Ini yang bikin fallback-nya KETEMU user, bukan cuma
          "teknisnya ada" tapi gak ada yang tau. */}
      {isIdle && onTypePress && (
        <TouchableOpacity
          style={st.typeBadge}
          onPress={handleTypePress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Ketik perintah untuk Jarvis"
        >
          <Text style={st.typeBadgeIcon}>⌨</Text>
        </TouchableOpacity>
      )}
      {title && <Title3D label={title} tint={titleTint} pillColors={titlePillColors} />}
    </Animated.View>
  );
}

export default function QuickAccessGrid({
  onInputMakanan,
  onTambahData,
  onLaporan,
  onProfile,
  onJarvis,
  onJarvisType,
  onChatAI,
  micStatus = 'idle',
  isSpeaking = false,
  onExpand,
  onSearch,
  profileImageSource,
}) {
  return (
    <View style={st.grid}>
      {/* Row 1 */}
      <View style={st.row}>
        <Tile
          icon={ICONS.makanan} iconSize={68} accessibilityLabel="Input Makanan" onPress={onInputMakanan}
          colors={['#0E7A3B', '#4CC584']} borderColor="rgba(255,255,255,0.32)"
          shadowColor="rgba(14,122,59,0.40)"
          title="Makanan" titleTint="#EAFBF0" titlePillColors={['#2F6B44', '#0F3320']}
        />
        <Tile
          icon={ICONS.tambahdata} accessibilityLabel="Tambah Data" onPress={onTambahData}
          colors={['#5C534B', '#1C1815']} borderColor="rgba(255,255,255,0.08)"
          shadowColor="rgba(28,21,16,0.5)"
          title="Tambah Data" titleTint="#FDF3E7" titlePillColors={['#4A4038', '#1C1815']}
        />
        {/* Box kanan sendiri (Laporan) — sebelumnya oranye terang & beda
            sendiri, sekarang digelapkan (tetap identitas hue amber) supaya
            selaras dengan box Tambah Data & Jarvis di sebelahnya. Layer 3D
            (DepthStack, ShadowOverlay, Texture, bevel border) tetap sama. */}
        <Tile
          icon={ICONS.laporan} accessibilityLabel="Laporan" onPress={onLaporan}
          colors={['#5A4632', '#241B10']} borderColor="rgba(255,255,255,0.10)"
          shadowColor="rgba(36,27,16,0.5)"
          title="Laporan" titleTint="#FFE9C2" titlePillColors={['#6B4E22', '#2B1D0C']}
        />
      </View>

      {/* Row 2 */}
      <View style={st.row}>
        {profileImageSource ? (
          <PhotoTile
            source={profileImageSource} onPress={onProfile} accessibilityLabel="Profile"
            title="Profile" titleTint="#FFE7C4" titlePillColors={['#6B4E2E', '#2E1F10']}
          />
        ) : (
          <Tile
            icon={ICONS.profile} accessibilityLabel="Profile" onPress={onProfile}
            colors={['#6E5636', '#3A2A18']} borderColor="rgba(255,255,255,0.16)"
            shadowColor="rgba(58,42,24,0.45)"
            title="Profile" titleTint="#FFE7C4" titlePillColors={['#6B4E2E', '#2E1F10']}
          />
        )}
        <JarvisTile
          onPress={onJarvis} onTypePress={onJarvisType} micStatus={micStatus} isSpeaking={isSpeaking}
          title="Asisten NutriAI" titleTint="#FDEDE0" titlePillColors={['#4A4038', '#1C1613']}
        />
        {/* Box kanan sendiri (Chat NutriAI) — sebelumnya emas/gold terang,
            sekarang digelapkan (tetap identitas hue gold) biar senada
            dengan box lain, terutama Profile & Jarvis di baris yang sama. */}
        <Tile
          icon={ICONS.chatai} accessibilityLabel="Chat NutriAI" onPress={onChatAI}
          colors={['#5C4A28', '#241C0E']} borderColor="rgba(255,255,255,0.10)"
          shadowColor="rgba(36,28,14,0.5)"
          title="Chat AI" titleTint="#FFEFB8" titlePillColors={['#6B551F', '#2A210B']}
        >
          <View style={st.fabRow}>
            {onExpand && (
              <TouchableOpacity style={st.fabBtn} onPress={onExpand} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={st.fabIcon}>⤢</Text>
              </TouchableOpacity>
            )}
            {onSearch && (
              <TouchableOpacity style={[st.fabBtn, { marginLeft: 6 }]} onPress={onSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={st.fabIcon}>✦</Text>
              </TouchableOpacity>
            )}
          </View>
        </Tile>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  grid: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },

  tileWrap: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    position: 'relative',
    // overflow sengaja dibiarkan 'visible' (default RN) supaya titleAnchor
    // (badge judul) boleh nongol keluar dari tepi atas tile.
    // Shadow diagonal ke kanan-bawah (bukan simetris) — biar konsisten sama
    // arah "cahaya dari kiri-atas" dan kebaca sebagai objek yang berdiri
    // di atas background, bukan cuma glow rata di sekeliling box.
    shadowOffset: { width: 5, height: 11 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  tileInner: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    // paddingTop kecil (dulu 20, buat kasih ruang badge title yang nongol
    // dari atas tile — sekarang title pindah ke dalam/bawah, jadi cukup
    // paddingBottom yang disisain buat pill title-nya).
    paddingTop: 6,
    paddingBottom: 26,
    overflow: 'hidden',
  },

  // ── Title3D styles ────────────────────────────────────────────────
  titleAnchor: {
    position: 'absolute',
    bottom: 6,
    left: 4,
    right: 4,
    alignItems: 'center',
    zIndex: 20,
  },
  titlePill: {
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    // Bevel klasik: atas-kiri terang (nangkep cahaya), bawah-kanan gelap
    // (jatuh bayangan) → pill kebaca timbul/embossed, senada sama tile.
    borderTopColor: 'rgba(255,255,255,0.40)',
    borderLeftColor: 'rgba(255,255,255,0.40)',
    borderRightColor: 'rgba(0,0,0,0.45)',
    borderBottomColor: 'rgba(0,0,0,0.55)',
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 10,
  },
  titleTextStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  fabRow: { position: 'absolute', right: 6, bottom: 6, flexDirection: 'row' },
  fabBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.25)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 3,
  },
  fabIcon: { fontSize: 12, fontWeight: '900', color: '#4E3A22' },

  // Badge "ketik perintah" — muncul di pojok kanan-bawah tile Jarvis,
  // cuma pas idle (lihat JarvisTile). Style-nya senada sama fabBtn di
  // tile Chat NutriAI biar konsisten sama bahasa desain grid ini.
  typeBadge: {
    position: 'absolute', right: 6, bottom: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.25)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 3,
  },
  typeBadgeIcon: { fontSize: 11, fontWeight: '900', color: '#292524' },
});