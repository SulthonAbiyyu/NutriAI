import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import BgBoxImg from '../../../assets/bgbox.png';

// Rasio asli bgbox.png (640x220) — dipakai agar box tidak gepeng/melar di device manapun
const BOX_RATIO = 640 / 220;

const TXT_TITLE = 'rgba(255,255,255,0.62)';

function pctOf(current, target) {
  const t = Math.max(target, 1);
  return Math.round(Math.min(current / t, 1) * 100);
}

function Item({ pct, label, color, showDivider }) {
  return (
    <View style={st.item}>
      <Text style={[st.pct, { color }]}>{pct}%</Text>
      <Text style={st.label}>{label}</Text>
      {showDivider && <View style={st.divider} />}
    </View>
  );
}

export default function NutrisiBox({
  kaloriCurrent = 0,
  kaloriTarget = 2000,
  karboCurrent = 0,
  karboTarget = 300,
  proteinCurrent = 0,
  proteinTarget = 150,
  lemakCurrent = 0,
  lemakTarget = 65,
  style,
}) {
  const items = [
    { key: 'kalori',  label: 'Kalori',  color: '#A5B4FC', pct: pctOf(kaloriCurrent, kaloriTarget) },
    { key: 'karbo',   label: 'Karbo',   color: '#86EFAC', pct: pctOf(karboCurrent, karboTarget) },
    { key: 'protein', label: 'Protein', color: '#5FF676', pct: pctOf(proteinCurrent, proteinTarget) },
    { key: 'lemak',   label: 'Lemak',   color: '#FCD34D', pct: pctOf(lemakCurrent, lemakTarget) },
  ];

  return (
    <View style={[st.wrap, style]}>
      <ImageBackground
        source={BgBoxImg}
        style={st.bg}
        imageStyle={st.bgImg}
        resizeMode="cover"
      >
        <View style={st.row}>
          {items.map((it, i) => (
            <Item
              key={it.key}
              pct={it.pct}
              label={it.label}
              color={it.color}
              showDivider={i < items.length - 1}
            />
          ))}
        </View>
      </ImageBackground>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'center',
  },
  bg: {
    width: '100%',
    aspectRatio: BOX_RATIO,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgImg: {
    borderRadius: 50,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: TXT_TITLE,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  divider: {
    position: 'absolute',
    right: 0,
    top: '22%',
    bottom: '22%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
});