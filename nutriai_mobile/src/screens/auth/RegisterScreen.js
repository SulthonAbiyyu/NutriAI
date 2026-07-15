/**
 * RegisterScreen.js — NutriAI
 * Aesthetic: Liquid Glass Neumorphism · Warm Cream + Purple/Coral
 *
 * npx expo install expo-linear-gradient expo-blur expo-haptics
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  Animated, PanResponder, Dimensions, KeyboardAvoidingView,
  Platform, StatusBar, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient }    from 'expo-linear-gradient';
import { BlurView }          from 'expo-blur';
import * as Haptics          from 'expo-haptics';
import { Ionicons }          from '@expo/vector-icons';
import { register }          from '../../services/AuthService';
import { useAuth }           from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');
const W = width;

// ─── Unified Design System ──────────────────────────────────────
const C = {
  // Neumorphic base — warm off-white with slight warmth
  base:       '#F0EBE3',
  baseLight:  '#FAF6F2',
  baseShadow: '#D6CFC7',
  // Glass
  glass:      'rgba(255,255,255,0.55)',
  glassHard:  'rgba(255,255,255,0.82)',
  glassBd:    'rgba(255,255,255,0.75)',
  // Text
  ink:        '#1E1A2E',
  inkSub:     '#4A4565',
  inkMuted:   '#9896AA',
  // Accents — same family across all steps
  violet:     '#7B6EF6',
  coral:      '#F4716B',
  mint:       '#4ECDC4',
  amber:      '#F7C059',
  rose:       '#F06292',
};

// Per-step gradient — all purple/coral/mint family
const G = [
  ['#7B6EF6','#A78BFA'],   // 0 username
  ['#A78BFA','#C084FC'],   // 1 password
  ['#F4716B','#F06292'],   // 2 gender
  ['#F7C059','#F4A24D'],   // 3 age
  ['#4ECDC4','#26B5AA'],   // 4 height
  ['#F4716B','#A78BFA'],   // 5 weight
  ['#7B6EF6','#4ECDC4'],   // 6 goal
  ['#A78BFA','#F7C059'],   // 7 activity
  ['#4ECDC4','#7B6EF6'],   // 8 body
];

const STEPS = [
  { id:'username',  type:'text',   field:'username',  icon:'person-outline',      title:'Siapa\nkamu?',           hint:'Username unik untuk akunmu', placeholder:'contoh: budi_fit', cap:'none' },
  { id:'password',  type:'text',   field:'password',  icon:'lock-closed-outline', title:'Password\nrahasiamu',    hint:'Minimal 6 karakter', placeholder:'••••••••', secure:true },
  { id:'gender',    type:'gender', field:'gender',    icon:'people-outline',      title:'Kamu\nlaki atau perempuan?', hint:'Untuk menghitung kebutuhan kalorimu',
    opts:[ { v:'laki_laki', emoji:'👨', label:'Laki-laki', sub:'Male',   g:['#5B8BFF','#3366FF'] }, { v:'perempuan', emoji:'👩', label:'Perempuan', sub:'Female', g:['#F4716B','#D946EF'] } ] },
  { id:'umur',      type:'age',    icon:'calendar-outline',  title:'Berapa\numurmu?',        hint:'Usia mempengaruhi kebutuhan nutrisimu' },
  { id:'tb',        type:'height', icon:'resize-outline',    title:'Seberapa\ntinggimu?',    hint:'Seret ruler naik↑ atau turun↓' },
  { id:'bb',        type:'weight', icon:'fitness-outline',   title:'Berapa\nberatmu?',       hint:'Hold & geser untuk memilih angka' },
  { id:'tujuan',    type:'choice', field:'tujuan',    icon:'flag-outline',        title:'Apa\ntujuanmu?',         hint:'Target utamamu sekarang',
    opts:[ { v:'bulking',  e:'💪', l:'Bulking',  d:'Tambah massa otot',    g:['#7B6EF6','#3B5BDB'] }, { v:'cutting',  e:'🔥', l:'Cutting',  d:'Turunkan lemak tubuh', g:['#F4716B','#E11D48'] }, { v:'maintain', e:'⚖️', l:'Maintain', d:'Jaga berat ideal',     g:['#4ECDC4','#059669'] } ] },
  { id:'aktivitas', type:'choice', field:'aktivitas', icon:'pulse-outline',       title:'Seberapa\naktifmu?',     hint:'Aktivitas fisik harianmu',
    opts:[ { v:'sangat_tidak_aktif', e:'🛋️', l:'Santai',   d:'Jarang olahraga',       g:['#9CA3AF','#64748B'] }, { v:'aktivitas_ringan',   e:'🚶', l:'Ringan',   d:'1–3x/minggu',  g:['#4ECDC4','#059669'] }, { v:'aktivitas_sedang',   e:'🏋️', l:'Sedang',   d:'3–5x/minggu',  g:['#7B6EF6','#3B5BDB'] }, { v:'aktivitas_berat',    e:'⚡', l:'Intensif', d:'Tiap hari',     g:['#F7C059','#F59E0B'] } ] },
  { id:'body_type', type:'body',   field:'body_type', icon:'body-outline',        title:'Tipe\ntubuhmu?',         hint:'Yang paling mendekati kondisimu',
    opts:[ { v:'ectomorph', e:'🏃', l:'Ecto', d:'Ramping,\nsulit gemuk',  g:['#7B6EF6','#3B5BDB'] }, { v:'mesomorph', e:'💪', l:'Meso', d:'Atletis,\nmudah berotot', g:['#4ECDC4','#059669'] }, { v:'endomorph', e:'🏋️', l:'Endo', d:'Padat,\nmudah gemuk',    g:['#F7C059','#F59E0B'] } ] },
];

// ──────────────────────────────────────────────────────────────
//  NEUMORPHIC SHADOW HELPERS
// ──────────────────────────────────────────────────────────────
const NEU_RAISED = {
  shadowColor:   C.baseShadow,
  shadowOffset:  { width: 6, height: 6 },
  shadowOpacity: 0.8,
  shadowRadius:  12,
  elevation:     8,
  backgroundColor: C.base,
};
const NEU_INSET_STYLE = {
  backgroundColor: C.base,
  shadowColor:     '#FFFFFF',
  shadowOffset:    { width: -4, height: -4 },
  shadowOpacity:   0.9,
  shadowRadius:    8,
};

// ──────────────────────────────────────────────────────────────
//  GLASS PILL  — liquid glass with refraction tint
// ──────────────────────────────────────────────────────────────
function GlassPill({ children, style, grad, intensity=70 }) {
  return (
    <View style={[{ borderRadius:100, overflow:'hidden', shadowColor:grad?grad[0]:'#7B6EF6', shadowOffset:{width:0,height:6}, shadowOpacity:0.22, shadowRadius:16 }, style]}>
      {grad && <LinearGradient colors={[grad[0]+'33',grad[1]+'22']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />}
      <BlurView intensity={intensity} tint="light" style={{ borderRadius:100, overflow:'hidden', borderWidth:1.5, borderColor:C.glassBd }}>
        {children}
      </BlurView>
    </View>
  );
}

// Rounded rect glass card
function GlassCard({ children, style, grad, radius=24, intensity=65 }) {
  return (
    <View style={[{ borderRadius:radius, overflow:'hidden',
      shadowColor: grad?grad[0]:'#7B6EF6',
      shadowOffset:{width:0,height:8}, shadowOpacity:0.14, shadowRadius:20,
    }, style]}>
      {grad && <LinearGradient colors={[grad[0]+'28',grad[1]+'18']} style={[StyleSheet.absoluteFill,{borderRadius:radius}]} start={{x:0,y:0}} end={{x:1,y:1}} />}
      <BlurView intensity={intensity} tint="light" style={{ borderRadius:radius, overflow:'hidden', borderWidth:1.5, borderColor:C.glassBd, backgroundColor:C.glass }}>
        {children}
      </BlurView>
    </View>
  );
}

// Neumorphic raised button
function NeuButton({ children, style, onPress, disabled }) {
  const sc = useRef(new Animated.Value(1)).current;
  const press = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(sc,{toValue:0.96,duration:80,useNativeDriver:true}),
      Animated.spring(sc,{toValue:1,tension:300,friction:8,useNativeDriver:true}),
    ]).start();
    onPress?.();
  };
  return (
    <TouchableOpacity onPress={disabled?null:press} activeOpacity={1} disabled={disabled}>
      <Animated.View style={[NEU_RAISED, { borderRadius:18 }, style, { transform:[{scale:sc}] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────────────────────
//  BACKGROUND  — consistent across steps
// ──────────────────────────────────────────────────────────────
function Background({ g }) {
  return (
    <>
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={[C.base, C.baseLight, '#EDE8F5']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
      </View>
      {/* Soft blobs */}
      <View style={[bg.blob,{top:-80,left:-60,backgroundColor:g[0]+'25',width:240,height:240,borderRadius:120}]} />
      <View style={[bg.blob,{top:height*0.35,right:-80,backgroundColor:g[1]+'1C',width:220,height:220,borderRadius:110}]} />
      <View style={[bg.blob,{bottom:60,left:20,backgroundColor:g[0]+'14',width:180,height:180,borderRadius:90}]} />
      {/* Subtle noise texture via small dots */}
      <View style={[bg.blob,{top:height*0.15,left:width*0.6,backgroundColor:g[1]+'18',width:80,height:80,borderRadius:40}]} />
    </>
  );
}
const bg = StyleSheet.create({ blob:{position:'absolute'} });

// ──────────────────────────────────────────────────────────────
//  LANJUT BUTTON  — each step gets its own variant
// ──────────────────────────────────────────────────────────────
function LanjutFab({ label='Lanjut', onPress, g, loading, variant='pill', icon='arrow-forward' }) {
  const sc = useRef(new Animated.Value(1)).current;
  const press = () => {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(sc,{toValue:0.94,duration:80,useNativeDriver:true}),
      Animated.spring(sc,{toValue:1,tension:250,friction:7,useNativeDriver:true}),
    ]).start();
    onPress?.();
  };

  // variant: 'pill' | 'wide' | 'circle' | 'badge' | 'fat'
  if (variant === 'circle') {
    return (
      <TouchableOpacity onPress={press} activeOpacity={0.9}>
        <Animated.View style={{ transform:[{scale:sc}] }}>
          <LinearGradient colors={g} style={lb.circle} start={{x:0,y:0}} end={{x:1,y:1}}>
            <View style={lb.circleInner}>
              <Ionicons name={icon} size={26} color={g[0]} />
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }
  if (variant === 'badge') {
    return (
      <TouchableOpacity onPress={press} activeOpacity={0.9}>
        <Animated.View style={{ transform:[{scale:sc}] }}>
          <GlassPill grad={g} style={{ overflow:'hidden' }}>
            <View style={lb.badgeRow}>
              <Text style={[lb.badgeTxt,{color:g[0]}]}>{label}</Text>
              <LinearGradient colors={g} style={lb.badgeIcon} start={{x:0,y:0}} end={{x:1,y:1}}>
                <Ionicons name={icon} size={14} color="#fff" />
              </LinearGradient>
            </View>
          </GlassPill>
        </Animated.View>
      </TouchableOpacity>
    );
  }
  if (variant === 'fat') {
    return (
      <TouchableOpacity onPress={press} activeOpacity={0.9} style={{ width:'100%' }}>
        <Animated.View style={[{ borderRadius:20, overflow:'hidden' }, { transform:[{scale:sc}] }]}>
          <LinearGradient colors={g} start={{x:0,y:0}} end={{x:1,y:0}} style={lb.fat}>
            <Text style={lb.fatTxt}>{label}</Text>
            <Ionicons name={icon} size={20} color="#fff" />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }
  // default 'pill' / 'wide'
  return (
    <TouchableOpacity onPress={press} activeOpacity={0.9}>
      <Animated.View style={[{ borderRadius:100, overflow:'hidden' }, { transform:[{scale:sc}] }]}>
        <LinearGradient colors={g} start={{x:0,y:0}} end={{x:1,y:0}} style={lb.pill}>
          <Text style={lb.pillTxt}>{label}</Text>
          <View style={lb.pillIcon}><Ionicons name={icon} size={16} color={g[0]} /></View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}
const lb = StyleSheet.create({
  circle:     { width:72, height:72, borderRadius:36, padding:4, shadowColor:'#000', shadowOffset:{width:0,height:6}, shadowOpacity:0.2, shadowRadius:12 },
  circleInner:{ flex:1, borderRadius:32, backgroundColor:'rgba(255,255,255,0.92)', alignItems:'center', justifyContent:'center' },
  badgeRow:   { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:14, paddingHorizontal:24 },
  badgeTxt:   { fontSize:15, fontWeight:'800', letterSpacing:0.2 },
  badgeIcon:  { width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center' },
  fat:        { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10, paddingVertical:20 },
  fatTxt:     { fontSize:17, fontWeight:'900', color:'#fff', letterSpacing:0.3 },
  pill:       { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:16, paddingHorizontal:32 },
  pillTxt:    { fontSize:16, fontWeight:'800', color:'#fff' },
  pillIcon:   { width:30, height:30, borderRadius:15, backgroundColor:'rgba(255,255,255,0.9)', alignItems:'center', justifyContent:'center' },
});

// ──────────────────────────────────────────────────────────────
//  STEP: TEXT
//  Layout: Title top-left · Input center · Lanjut pill bottom-right
// ──────────────────────────────────────────────────────────────
function TextStep({ s, form, set, showPass, setShowPass, g, onNext }) {
  const [focused, setFocused] = useState(false);
  const lineAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(lineAnim,{toValue:focused?1:0,tension:150,friction:10,useNativeDriver:false}).start();
  },[focused]);
  const borderColor = lineAnim.interpolate({ inputRange:[0,1], outputRange:[C.glassBd, g[0]+'CC'] });

  return (
    <View style={{ width:'100%', gap:0 }}>
      {/* Title */}
      <View style={{ marginBottom:32 }}>
        <Text style={txt.eyebrow}>Langkah dasar</Text>
        <Text style={txt.h1}>{s.title.split('\n')[0]}</Text>
        <Text style={[txt.h1,{color:g[0]}]}>{s.title.split('\n')[1]}</Text>
        <Text style={txt.hint}>{s.hint}</Text>
      </View>

      {/* Neumorphic input container */}
      <View style={[NEU_RAISED,{borderRadius:20,overflow:'hidden'}]}>
        <Animated.View style={{ borderRadius:20, borderWidth:1.5, borderColor, overflow:'hidden' }}>
          <BlurView intensity={60} tint="light" style={{ backgroundColor:C.glass }}>
            <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:18, paddingVertical:4 }}>
              {/* Gradient icon */}
              <LinearGradient colors={g} style={txt.icon} start={{x:0,y:0}} end={{x:1,y:1}}>
                <Ionicons name={s.icon} size={17} color="#fff" />
              </LinearGradient>
              <TextInput
                style={txt.input}
                value={form[s.field]}
                onChangeText={v => set(s.field, v)}
                placeholder={s.placeholder}
                placeholderTextColor={C.inkMuted}
                secureTextEntry={s.secure && !showPass}
                autoCapitalize={s.cap||'sentences'}
                autoFocus
                selectionColor={g[0]}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              {s.secure && (
                <TouchableOpacity onPress={() => setShowPass(p=>!p)} style={{padding:8}}>
                  <Ionicons name={showPass?'eye-off-outline':'eye-outline'} size={20} color={C.inkMuted} />
                </TouchableOpacity>
              )}
            </View>
          </BlurView>
        </Animated.View>
      </View>

      {/* Bottom row: decorative + button */}
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:28 }}>
        <GlassCard grad={g} radius={16} style={{ paddingHorizontal:14, paddingVertical:10 }}>
          <Text style={{ fontSize:10, color:g[0], fontWeight:'800', letterSpacing:1.5, textTransform:'uppercase' }}>
            {s.field==='username' ? '⬡ identitas' : '⬡ keamanan'}
          </Text>
        </GlassCard>
        <LanjutFab g={g} onPress={onNext} variant="badge" />
      </View>
    </View>
  );
}
const txt = StyleSheet.create({
  eyebrow: { fontSize:10, fontWeight:'800', color:C.inkMuted, letterSpacing:2.5, textTransform:'uppercase', marginBottom:6 },
  h1:      { fontSize:40, fontWeight:'900', color:C.ink, letterSpacing:-1.5, lineHeight:44 },
  hint:    { fontSize:13, color:C.inkMuted, marginTop:10, fontWeight:'500', lineHeight:18 },
  icon:    { width:36, height:36, borderRadius:12, alignItems:'center', justifyContent:'center', marginRight:12 },
  input:   { flex:1, fontSize:17, fontWeight:'600', color:C.ink, paddingVertical:18 },
});

// ──────────────────────────────────────────────────────────────
//  STEP: GENDER
//  Layout: Title · 2 big flip cards side by side · Lanjut circle bottom-center
// ──────────────────────────────────────────────────────────────
function GenderStep({ s, form, set, g, onNext }) {
  const CW = (W - 72) / 2;
  const CH = CW * 1.45;
  return (
    <View style={{ width:'100%', alignItems:'center' }}>
      <View style={{ width:'100%', marginBottom:24 }}>
        <Text style={txt.eyebrow}>Jenis kelamin</Text>
        <Text style={txt.h1}>{s.title.split('\n')[0]}</Text>
        <Text style={[txt.h1,{color:g[0]}]}>{s.title.split('\n')[1]||''}</Text>
        <Text style={txt.hint}>{s.hint}</Text>
      </View>

      <View style={{ flexDirection:'row', gap:16 }}>
        {s.opts.map(opt => <GFCard key={opt.v} opt={opt} sel={form.gender===opt.v} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); set('gender',opt.v); }} W={CW} H={CH} />)}
      </View>

      {/* Lanjut as circle, centered below cards */}
      <View style={{ marginTop:28, alignItems:'center' }}>
        {form.gender
          ? <LanjutFab g={g} onPress={onNext} variant="circle" icon="arrow-forward" />
          : <GlassPill grad={g} style={{ paddingHorizontal:20, paddingVertical:12 }}>
              <Text style={{ fontSize:12, color:g[0], fontWeight:'700' }}>← Pilih salah satu →</Text>
            </GlassPill>
        }
      </View>
    </View>
  );
}

function GFCard({ opt, sel, onPress, W, H }) {
  const flip = useRef(new Animated.Value(sel?1:0)).current;
  const prev = useRef(sel);
  useEffect(() => {
    if (prev.current===sel) return;
    prev.current = sel;
    Animated.spring(flip,{toValue:sel?1:0,tension:60,friction:7,useNativeDriver:true}).start();
  },[sel]);
  const fRot = flip.interpolate({inputRange:[0,1],outputRange:['0deg','180deg']});
  const bRot = flip.interpolate({inputRange:[0,1],outputRange:['180deg','360deg']});
  const fOp  = flip.interpolate({inputRange:[0,0.49,0.5,1],outputRange:[1,1,0,0]});
  const bOp  = flip.interpolate({inputRange:[0,0.49,0.5,1],outputRange:[0,0,1,1]});
  const sc   = flip.interpolate({inputRange:[0,0.5,1],outputRange:[1,0.87,1]});
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={{width:W,height:H}}>
      <Animated.View style={{width:W,height:H,transform:[{scale:sc}]}}>
        <Animated.View style={[gf.face,{width:W,height:H,opacity:fOp,transform:[{rotateY:fRot}]}]}>
          <View style={[NEU_RAISED,{flex:1,borderRadius:28,overflow:'hidden',shadowColor:opt.g[0]}]}>
            <BlurView intensity={60} tint="light" style={[gf.inner,{borderColor:opt.g[0]+'33'}]}>
              <View style={[gf.blob,{backgroundColor:opt.g[0]+'15',width:W*0.9,height:W*0.9,borderRadius:W*0.45,top:-W*0.2,right:-W*0.18}]} />
              <Text style={{fontSize:60,marginBottom:10}}>{opt.emoji}</Text>
              <Text style={gf.fl}>{opt.label}</Text>
              <Text style={gf.fs}>{opt.sub}</Text>
              <View style={[gf.tap,{backgroundColor:opt.g[0]+'44'}]} />
            </BlurView>
          </View>
        </Animated.View>
        <Animated.View style={[gf.face,{position:'absolute',top:0,left:0,width:W,height:H,opacity:bOp,transform:[{rotateY:bRot}]}]}>
          <LinearGradient colors={opt.g} style={[gf.inner,{borderRadius:28,borderWidth:0}]} start={{x:0.1,y:0}} end={{x:0.9,y:1}}>
            <View style={[gf.blob,{backgroundColor:'rgba(255,255,255,0.14)',width:W*1.1,height:W*1.1,borderRadius:W*0.55,top:-W*0.35,right:-W*0.35}]} />
            <View style={gf.ck}><Ionicons name="checkmark" size={28} color={opt.g[0]} /></View>
            <Text style={{fontSize:54,marginBottom:10}}>{opt.emoji}</Text>
            <Text style={gf.bl}>{opt.label}</Text>
            <Text style={gf.bs}>Terpilih ✓</Text>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}
const gf = StyleSheet.create({
  face:  { position:'absolute', backfaceVisibility:'hidden', borderRadius:28 },
  inner: { flex:1, borderRadius:28, alignItems:'center', justifyContent:'center', overflow:'hidden', borderWidth:1.5, borderColor:C.glassBd },
  blob:  { position:'absolute' },
  tap:   { width:44, height:6, borderRadius:3, marginTop:14 },
  ck:    { width:54, height:54, borderRadius:27, backgroundColor:'rgba(255,255,255,0.94)', alignItems:'center', justifyContent:'center', marginBottom:14, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.15, shadowRadius:8 },
  fl:    { fontSize:18, fontWeight:'900', color:C.ink, letterSpacing:-0.3, marginBottom:4 },
  fs:    { fontSize:12, color:C.inkMuted, fontWeight:'600' },
  bl:    { fontSize:18, fontWeight:'900', color:'#fff', letterSpacing:-0.3, marginBottom:4 },
  bs:    { fontSize:12, color:'rgba(255,255,255,0.82)', fontWeight:'700' },
});

// ──────────────────────────────────────────────────────────────
//  STEP: AGE
//  Layout: title left · orbital ring center · +/- pills · Lanjut pill right
// ──────────────────────────────────────────────────────────────
function AgeStep({ form, set, g, onNext }) {
  const scA = useRef(new Animated.Value(1)).current;
  const bump = () => Animated.sequence([
    Animated.timing(scA,{toValue:1.22,duration:75,useNativeDriver:true}),
    Animated.spring(scA,{toValue:1,tension:320,friction:8,useNativeDriver:true}),
  ]).start();
  const change = d => {
    const n = Math.min(80,Math.max(10,form.umur+d));
    if(n!==form.umur){ bump(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set('umur',n); }
  };
  return (
    <View style={{width:'100%'}}>
      <Text style={txt.eyebrow}>Data diri</Text>
      <Text style={txt.h1}>Berapa</Text>
      <Text style={[txt.h1,{color:g[0],marginBottom:8}]}>umurmu?</Text>
      <Text style={[txt.hint,{marginBottom:32}]}>{STEPS[3].hint}</Text>

      {/* Orbital ring — centered */}
      <View style={{alignItems:'center',marginVertical:8}}>
        <View style={{width:200,height:200,alignItems:'center',justifyContent:'center'}}>
          {/* Rings */}
          {[200,158,116].map((sz,i) => (
            <View key={i} style={{position:'absolute',width:sz,height:sz,borderRadius:sz/2,borderWidth:i===0?2:1.2,borderColor:i===0?g[0]+'44':g[0]+'22'}} />
          ))}
          {/* Orbiting dots */}
          <View style={{position:'absolute',width:12,height:12,borderRadius:6,backgroundColor:g[0],top:8,right:52,shadowColor:g[0],shadowOffset:{width:0,height:3},shadowOpacity:0.6,shadowRadius:6}} />
          <View style={{position:'absolute',width:7,height:7,borderRadius:3.5,backgroundColor:g[1]+'99',bottom:20,left:28}} />
          {/* Center glass orb */}
          <View style={[NEU_RAISED,{width:126,height:126,borderRadius:63,overflow:'hidden',shadowColor:g[0]}]}>
            <LinearGradient colors={[...g,'#fff']} style={{flex:1,borderRadius:63,alignItems:'center',justifyContent:'center'}} start={{x:0,y:0}} end={{x:0.7,y:1}}>
              <Animated.Text style={{fontSize:52,fontWeight:'900',color:'#fff',letterSpacing:-3,transform:[{scale:scA}]}}>{form.umur}</Animated.Text>
              <Text style={{fontSize:12,fontWeight:'700',color:'rgba(255,255,255,0.8)',marginTop:-4}}>tahun</Text>
            </LinearGradient>
          </View>
        </View>
      </View>

      {/* Controls + Lanjut row */}
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:24}}>
        <GlassCard grad={g} radius={100} style={{overflow:'hidden'}}>
          <View style={{flexDirection:'row',padding:6,gap:6}}>
            {[-10,-1,1,10].map(d=>(
              <TouchableOpacity key={d} onPress={()=>change(d)} activeOpacity={0.8} style={{borderRadius:100,overflow:'hidden'}}>
                {d>0
                  ? <LinearGradient colors={g} style={ag.btn} start={{x:0,y:0}} end={{x:1,y:1}}><Text style={[ag.btnT,{color:'#fff'}]}>{d>0?`+${d}`:d}</Text></LinearGradient>
                  : <BlurView intensity={55} tint="light" style={[ag.btn,{backgroundColor:'rgba(255,255,255,0.35)'}]}><Text style={ag.btnT}>{d}</Text></BlurView>
                }
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>
        <LanjutFab g={g} onPress={onNext} variant="circle" />
      </View>
    </View>
  );
}
const ag = StyleSheet.create({
  btn:  {paddingHorizontal:18,paddingVertical:13,minWidth:56,alignItems:'center',borderRadius:100},
  btnT: {fontSize:13,fontWeight:'900',color:C.inkSub},
});

// ──────────────────────────────────────────────────────────────
//  STEP: HEIGHT  —  ruler left, value right, Lanjut fat-bottom
// ──────────────────────────────────────────────────────────────
const HT_MIN=140, HT_MAX=220;
const RH = height*0.38;
const PPC = RH/(HT_MAX-HT_MIN);

function HeightStep({ form, set, g, onNext }) {
  const startY  = useRef(0), startV = useRef(form.tb), cur = useRef(form.tb);
  const animV   = useRef(new Animated.Value(form.tb)).current;
  const lastH   = useRef(form.tb);

  const apply = useCallback(v=>{
    const c=Math.max(HT_MIN,Math.min(HT_MAX,Math.round(v)));
    if(c!==lastH.current){ Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); lastH.current=c; }
    cur.current=c; animV.setValue(c); set('tb',c);
  },[]);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder:        ()=>true,
    onStartShouldSetPanResponderCapture: ()=>true,
    onMoveShouldSetPanResponder:         ()=>true,
    onMoveShouldSetPanResponderCapture:  ()=>true,
    onPanResponderGrant: e=>{ startY.current=e.nativeEvent.pageY; startV.current=cur.current; },
    onPanResponderMove: e=>{ apply(startV.current-(e.nativeEvent.pageY-startY.current)/PPC); },
  })).current;

  const indicY = animV.interpolate({ inputRange:[HT_MIN,HT_MAX], outputRange:[RH-2,2], extrapolate:'clamp' });
  const ticks  = useMemo(()=>{
    const a=[];
    for(let cm=HT_MAX;cm>=HT_MIN;cm--){
      a.push({cm,y:((HT_MAX-cm)/(HT_MAX-HT_MIN))*RH,big:cm%10===0,mid:cm%5===0&&cm%10!==0});
    }
    return a;
  },[]);

  return (
    <View style={{width:'100%'}}>
      <Text style={txt.eyebrow}>Pengukuran</Text>
      <Text style={txt.h1}>Seberapa</Text>
      <Text style={[txt.h1,{color:g[0],marginBottom:8}]}>tinggimu?</Text>
      <Text style={[txt.hint,{marginBottom:20}]}>{STEPS[4].hint}</Text>

      <View style={{flexDirection:'row',gap:16,alignItems:'center'}}>
        {/* Ruler */}
        <View style={[NEU_RAISED,{borderRadius:24,width:96,height:RH,overflow:'hidden',shadowColor:g[0]}]}
          {...pan.panHandlers}>
          <BlurView intensity={55} tint="light" style={{flex:1,backgroundColor:C.glass,borderRadius:24,borderWidth:1.5,borderColor:C.glassBd,overflow:'hidden'}}>
            {ticks.map(({cm,y,big,mid})=>(
              <View key={cm} style={{position:'absolute',top:y-1,left:0,right:0,paddingLeft:10}}>
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                  <View style={{width:big?50:mid?34:18,height:big?2.5:mid?1.8:1,backgroundColor:big?C.inkSub+'99':mid?C.inkMuted+'66':'#D4DCE8',borderRadius:2}} />
                  {big&&<Text style={{fontSize:9,fontWeight:'800',color:C.inkMuted}}>{cm}</Text>}
                </View>
              </View>
            ))}
            {/* Indicator */}
            <Animated.View pointerEvents="none" style={{position:'absolute',left:0,right:0,height:3,top:indicY,zIndex:10}}>
              <LinearGradient colors={g} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:0}} />
            </Animated.View>
            <Animated.View pointerEvents="none" style={{position:'absolute',right:0,top:Animated.subtract(indicY,7),zIndex:11}}>
              <View style={{width:0,height:0,borderTopWidth:7,borderBottomWidth:7,borderRightWidth:12,borderTopColor:'transparent',borderBottomColor:'transparent',borderRightColor:g[0]}} />
            </Animated.View>
            {/* Fades */}
            <View pointerEvents="none" style={{position:'absolute',top:0,left:0,right:0,height:52}}>
              <LinearGradient colors={['rgba(242,238,232,1)','rgba(242,238,232,0)']} style={StyleSheet.absoluteFill} />
            </View>
            <View pointerEvents="none" style={{position:'absolute',bottom:0,left:0,right:0,height:52}}>
              <LinearGradient colors={['rgba(242,238,232,0)','rgba(242,238,232,1)']} style={StyleSheet.absoluteFill} />
            </View>
          </BlurView>
        </View>

        {/* Right: value + fine step + Lanjut */}
        <View style={{flex:1,alignItems:'center',gap:14}}>
          {/* Big value orb */}
          <View style={[NEU_RAISED,{borderRadius:24,overflow:'hidden',width:'100%',shadowColor:g[0]}]}>
            <LinearGradient colors={g} style={{paddingVertical:20,alignItems:'center',borderRadius:22}} start={{x:0,y:0}} end={{x:1,y:1}}>
              <Text style={{fontSize:52,fontWeight:'900',color:'#fff',letterSpacing:-2}}>{form.tb}</Text>
              <Text style={{fontSize:14,fontWeight:'700',color:'rgba(255,255,255,0.8)',marginTop:-4}}>cm</Text>
            </LinearGradient>
          </View>

          {/* Fine step buttons */}
          <View style={{flexDirection:'row',gap:8,width:'100%'}}>
            {[1,-1].map(d=>(
              <TouchableOpacity key={d} onPress={()=>apply(form.tb+d)} activeOpacity={0.8} style={{flex:1,borderRadius:14,overflow:'hidden'}}>
                {d>0
                  ? <LinearGradient colors={g} style={ht.sBtn} start={{x:0,y:0}} end={{x:1,y:1}}><Text style={[ht.sBtnT,{color:'#fff'}]}>{`+${d}`}</Text></LinearGradient>
                  : <BlurView intensity={55} tint="light" style={[ht.sBtn,{backgroundColor:C.glass,borderWidth:1.5,borderColor:C.glassBd}]}><Text style={ht.sBtnT}>{d}</Text></BlurView>
                }
              </TouchableOpacity>
            ))}
          </View>

          {/* Lanjut */}
          <LanjutFab g={g} onPress={onNext} variant="pill" />
        </View>
      </View>
    </View>
  );
}
const ht = StyleSheet.create({
  sBtn:  {paddingVertical:13,alignItems:'center',borderRadius:14},
  sBtnT: {fontSize:14,fontWeight:'900',color:C.inkSub},
});

// ──────────────────────────────────────────────────────────────
//  STEP: WEIGHT  —  hold = fullscreen modal
//  ONE continuous gesture: grant→zoomIn, move→needle, release→zoomOut
// ──────────────────────────────────────────────────────────────
const AS=-210, SW=240, BMIN=30, BMAX=150;
function bTicks(R){
  const a=[];
  for(let kg=BMIN;kg<=BMAX;kg++){
    const fr=(kg-BMIN)/(BMAX-BMIN),deg=AS+fr*SW,rad=deg*Math.PI/180;
    const big=kg%10===0,mid=kg%5===0&&!big,tL=big?22:mid?14:7;
    const OR=R-22,IR=OR-tL;
    const ox=R+OR*Math.cos(rad),oy=R+OR*Math.sin(rad);
    const ix=R+IR*Math.cos(rad),iy=R+IR*Math.sin(rad);
    const dx=ox-ix,dy=oy-iy,len=Math.sqrt(dx*dx+dy*dy),ang=Math.atan2(dy,dx)*180/Math.PI;
    const LR=OR-tL-16,lx=R+LR*Math.cos(rad),ly=R+LR*Math.sin(rad);
    a.push({kg,ix,iy,len,ang,lx,ly,big,mid});
  }
  return a;
}

function DialView({ D, val, g, ticks }) {
  const R=D/2,PX=R,PY=R*0.88;
  const na = useRef(new Animated.Value(AS+((val-BMIN)/(BMAX-BMIN))*SW)).current;
  const lv = useRef(val);
  useEffect(()=>{
    const t=AS+((val-BMIN)/(BMAX-BMIN))*SW;
    if(Math.abs(val-lv.current)<=2) na.setValue(t);
    else Animated.spring(na,{toValue:t,tension:100,friction:10,useNativeDriver:true}).start();
    lv.current=val;
  },[val]);
  const rot=na.interpolate({inputRange:[AS,AS+SW],outputRange:[`${AS}deg`,`${AS+SW}deg`]});
  return (
    <View style={{width:D,height:D*0.60,overflow:'hidden'}}>
      <View style={{position:'absolute',width:D,height:D,borderRadius:R,overflow:'hidden'}}>
        <LinearGradient colors={[C.baseLight,'#EEF0FA']} style={StyleSheet.absoluteFill} />
        <View style={{position:'absolute',top:10,left:10,right:10,bottom:10,borderRadius:R-10,borderWidth:1.5,borderColor:'rgba(255,255,255,0.88)'}} />
      </View>
      {ticks.map(({kg,ix,iy,len,ang,lx,ly,big,mid})=>{
        const act=kg<=val,near=Math.abs(kg-val)<=1;
        return (
          <React.Fragment key={kg}>
            <View style={{position:'absolute',left:ix,top:iy,width:len,height:big?2.5:mid?1.8:1,backgroundColor:near?g[0]:act?g[0]+'BB':'#C8D2E0',borderRadius:2,transform:[{rotate:`${ang}deg`}],transformOrigin:'left center'}} />
            {big&&<Text style={{position:'absolute',left:lx-15,top:ly-8,fontSize:D>300?11:9,fontWeight:'800',width:30,textAlign:'center',color:act?g[0]:'#9AAABB'}}>{kg}</Text>}
          </React.Fragment>
        );
      })}
      <Animated.View style={{position:'absolute',left:PX,top:PY-2.5,width:R*0.65,height:5,borderRadius:5,overflow:'hidden',transform:[{rotate:rot}],transformOrigin:'left center'}}>
        <LinearGradient colors={g} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:0}} />
      </Animated.View>
      <Animated.View style={{position:'absolute',left:PX-22,top:PY-2,width:22,height:4,borderRadius:2,backgroundColor:'rgba(175,190,215,0.55)',transform:[{rotate:rot}],transformOrigin:'right center'}} />
      <View style={{position:'absolute',left:PX-11,top:PY-11,width:22,height:22,borderRadius:11,overflow:'hidden',shadowColor:'#000',shadowOffset:{width:0,height:3},shadowOpacity:0.2,shadowRadius:6}}>
        <LinearGradient colors={g} style={StyleSheet.absoluteFill} />
        <View style={{position:'absolute',width:9,height:9,borderRadius:4.5,backgroundColor:'rgba(255,255,255,0.65)',top:6.5,left:6.5}} />
      </View>
    </View>
  );
}

function WeightStep({ form, set, g, onNext }) {
  const [zoomed,setZoomed] = useState(false);
  const zA    = useRef(new Animated.Value(0)).current;
  const valR  = useRef(form.bb);
  const lastH = useRef(form.bb);
  const orig  = useRef({x:0,y:0});

  const FD=W-32, FR=FD/2;
  const SD=W*0.72, SR=SD/2;
  const sFT = useMemo(()=>bTicks(SR),[]);
  const fFT = useMemo(()=>bTicks(FR),[]);

  const tv=(px,py)=>{
    const dx=px-orig.current.x-FR,dy=py-orig.current.y-FR*0.88;
    const angle=Math.atan2(dy,dx)*(180/Math.PI);
    const frac=Math.max(0,Math.min(1,(angle-AS)/SW));
    return Math.round(BMIN+frac*(BMAX-BMIN));
  };
  const at=(px,py)=>{
    const v=tv(px,py);
    if(v!==lastH.current){ Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); lastH.current=v; }
    valR.current=v; set('bb',v);
  };

  const zIn=()=>{ setZoomed(true); Animated.spring(zA,{toValue:1,tension:70,friction:9,useNativeDriver:true}).start(); };
  const zOut=()=>{ Animated.timing(zA,{toValue:0,duration:200,useNativeDriver:true}).start(()=>setZoomed(false)); };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder:        ()=>true,
    onStartShouldSetPanResponderCapture: ()=>true,
    onMoveShouldSetPanResponder:         ()=>true,
    onMoveShouldSetPanResponderCapture:  ()=>true,
    onPanResponderGrant: ()=>zIn(),
    onPanResponderMove: e=>{ if(orig.current.x>0) at(e.nativeEvent.pageX,e.nativeEvent.pageY); },
    onPanResponderRelease:   ()=>zOut(),
    onPanResponderTerminate: ()=>zOut(),
  })).current;

  const oOp=zA.interpolate({inputRange:[0,1],outputRange:[0,1]});
  const dSc=zA.interpolate({inputRange:[0,1],outputRange:[0.2,1]});
  const dTY=zA.interpolate({inputRange:[0,1],outputRange:[300,0]});

  return (
    <View style={{width:'100%'}}>
      <Text style={txt.eyebrow}>Pengukuran</Text>
      <Text style={txt.h1}>Berapa</Text>
      <Text style={[txt.h1,{color:g[0],marginBottom:8}]}>beratmu?</Text>
      <Text style={[txt.hint,{marginBottom:20}]}>{STEPS[5].hint}</Text>

      {/* Readout pill */}
      <View style={{alignSelf:'flex-start',marginBottom:16}}>
        <View style={[NEU_RAISED,{borderRadius:100,overflow:'hidden',shadowColor:g[0]}]}>
          <LinearGradient colors={g} style={{flexDirection:'row',alignItems:'flex-end',gap:4,paddingHorizontal:28,paddingVertical:12,borderRadius:100}} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Text style={{fontSize:42,fontWeight:'900',color:'#fff',letterSpacing:-2}}>{form.bb}</Text>
            <Text style={{fontSize:14,fontWeight:'700',color:'rgba(255,255,255,0.8)',marginBottom:6}}>kg</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Preview dial — panResponder attaches here */}
      <View {...pan.panHandlers}>
        <View style={[NEU_RAISED,{borderRadius:28,overflow:'hidden',padding:10,shadowColor:g[0]}]}>
          <BlurView intensity={60} tint="light" style={{borderRadius:22,overflow:'hidden',borderWidth:1.5,borderColor:C.glassBd}}>
            <DialView D={SD} val={form.bb} g={g} ticks={sFT} />
          </BlurView>
        </View>
        {/* Hold hint */}
        <View style={{alignItems:'center',marginTop:10}}>
          <GlassPill grad={g}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,paddingHorizontal:20}}>
              <LinearGradient colors={g} style={{width:22,height:22,borderRadius:8,alignItems:'center',justifyContent:'center'}} start={{x:0,y:0}} end={{x:1,y:1}}>
                <Ionicons name="hand-left-outline" size={12} color="#fff" />
              </LinearGradient>
              <Text style={{fontSize:12,color:g[0],fontWeight:'700'}}>Hold & geser timbangan</Text>
            </View>
          </GlassPill>
        </View>
      </View>

      {/* Fine tune + Lanjut row */}
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:20}}>
        <GlassCard grad={g} radius={100}>
          <View style={{flexDirection:'row',padding:6,gap:6}}>
            {[-5,-1,1,5].map(d=>(
              <TouchableOpacity key={d} onPress={()=>set('bb',Math.max(BMIN,Math.min(BMAX,form.bb+d)))} activeOpacity={0.8} style={{borderRadius:100,overflow:'hidden'}}>
                {d>0
                  ? <LinearGradient colors={g} style={ag.btn} start={{x:0,y:0}} end={{x:1,y:1}}><Text style={[ag.btnT,{color:'#fff'}]}>{d>0?`+${d}`:d}</Text></LinearGradient>
                  : <BlurView intensity={55} tint="light" style={[ag.btn,{backgroundColor:'rgba(255,255,255,0.35)'}]}><Text style={ag.btnT}>{d}</Text></BlurView>
                }
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>
        <LanjutFab g={g} onPress={onNext} variant="circle" />
      </View>

      {/* FULLSCREEN MODAL */}
      <Modal visible={zoomed} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={[StyleSheet.absoluteFill,{opacity:oOp}]}>
          <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFill} />
          <LinearGradient colors={[g[0]+'25',g[1]+'1C']} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
          <Animated.View style={{alignItems:'center',paddingHorizontal:16,transform:[{scale:dSc},{translateY:dTY}]}}
            onLayout={e=>e.target.measure((_,__,___,____,px,py)=>{ orig.current={x:px,y:py}; })}>
            <Text style={{fontSize:11,fontWeight:'800',color:C.inkMuted,letterSpacing:2.5,textTransform:'uppercase',marginBottom:14}}>✦ Timbangan Digital</Text>
            <View style={[NEU_RAISED,{borderRadius:100,overflow:'hidden',shadowColor:g[0],marginBottom:20}]}>
              <LinearGradient colors={g} style={{flexDirection:'row',alignItems:'flex-end',gap:4,paddingHorizontal:36,paddingVertical:14,borderRadius:100}} start={{x:0,y:0}} end={{x:1,y:1}}>
                <Text style={{fontSize:56,fontWeight:'900',color:'#fff',letterSpacing:-2}}>{form.bb}</Text>
                <Text style={{fontSize:18,fontWeight:'700',color:'rgba(255,255,255,0.8)',marginBottom:10}}>kg</Text>
              </LinearGradient>
            </View>
            <View style={[NEU_RAISED,{borderRadius:28,overflow:'hidden',padding:12,shadowColor:g[0]}]}>
              <BlurView intensity={60} tint="light" style={{borderRadius:20,overflow:'hidden',borderWidth:1.5,borderColor:C.glassBd}}>
                <DialView D={FD} val={form.bb} g={g} ticks={fFT} />
              </BlurView>
            </View>
            <Text style={{marginTop:18,fontSize:13,color:C.inkMuted,fontWeight:'700',letterSpacing:0.4}}>
              Geser jarum  ·  Lepas untuk konfirmasi ✓
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
//  STEP: CHOICE  —  stacked cards, Lanjut fat at bottom of cards
// ──────────────────────────────────────────────────────────────
function ChoiceStep({ s, form, set, g, onNext }) {
  return (
    <View style={{width:'100%'}}>
      <Text style={txt.eyebrow}>Pilihan</Text>
      <Text style={txt.h1}>{s.title.split('\n')[0]}</Text>
      <Text style={[txt.h1,{color:g[0],marginBottom:8}]}>{s.title.split('\n')[1]||''}</Text>
      <Text style={[txt.hint,{marginBottom:20}]}>{s.hint}</Text>

      <View style={{gap:10,marginBottom:20}}>
        {s.opts.map(opt=>(
          <ChoiceRow key={opt.v} opt={opt} sel={form[s.field]===opt.v}
            onPress={()=>{ Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set(s.field,opt.v); }} />
        ))}
      </View>

      {/* Lanjut — fat, spans full width, integrated below choices */}
      <LanjutFab g={g} onPress={onNext} variant="fat" label={`Lanjut  →`} icon="arrow-forward" />
    </View>
  );
}

function ChoiceRow({ opt, sel, onPress }) {
  const sc = useRef(new Animated.Value(1)).current;
  const go = ()=>{
    Animated.sequence([
      Animated.timing(sc,{toValue:0.97,duration:70,useNativeDriver:true}),
      Animated.spring(sc,{toValue:1,tension:350,friction:8,useNativeDriver:true}),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{transform:[{scale:sc}]}}>
      <TouchableOpacity onPress={go} activeOpacity={1}>
        <View style={[NEU_RAISED,{borderRadius:20,overflow:'hidden',shadowColor:sel?opt.g[0]:'#D6CFC7'}]}>
          <BlurView intensity={60} tint="light" style={[chS.card,sel&&{borderColor:opt.g[0]+'66'}]}>
            <LinearGradient colors={sel?opt.g:['#CBD5E0','#DDE3EC']} style={chS.bar} start={{x:0,y:0}} end={{x:0,y:1}} />
            {sel
              ? <LinearGradient colors={opt.g} style={chS.ibox} start={{x:0,y:0}} end={{x:1,y:1}}><Text style={{fontSize:22}}>{opt.e}</Text></LinearGradient>
              : <View style={[chS.ibox,{backgroundColor:'rgba(255,255,255,0.6)',borderRadius:15}]}><Text style={{fontSize:22}}>{opt.e}</Text></View>
            }
            <View style={{flex:1}}>
              <Text style={[chS.label,sel&&{color:C.ink}]}>{opt.l}</Text>
              {opt.d&&<Text style={chS.desc}>{opt.d}</Text>}
            </View>
            <View style={[chS.dot,sel&&{borderColor:opt.g[0]}]}>
              {sel&&<LinearGradient colors={opt.g} style={StyleSheet.absoluteFill} />}
            </View>
          </BlurView>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const chS = StyleSheet.create({
  card:  {flexDirection:'row',alignItems:'center',borderRadius:20,overflow:'hidden',paddingVertical:13,paddingRight:16,borderWidth:1.5,borderColor:C.glassBd,backgroundColor:C.glass},
  bar:   {width:4,alignSelf:'stretch',marginRight:14},
  ibox:  {width:46,height:46,alignItems:'center',justifyContent:'center',marginRight:14,borderRadius:15},
  label: {fontSize:15,fontWeight:'900',color:C.inkSub,letterSpacing:-0.2},
  desc:  {fontSize:12,color:C.inkMuted,marginTop:2},
  dot:   {width:22,height:22,borderRadius:11,borderWidth:2,borderColor:'#C8D2DF',overflow:'hidden'},
});

// ──────────────────────────────────────────────────────────────
//  STEP: BODY TYPE  —  3 tall cards, Lanjut pill below
// ──────────────────────────────────────────────────────────────
function BodyStep({ s, form, set, g, onNext }) {
  return (
    <View style={{width:'100%'}}>
      <Text style={txt.eyebrow}>Tipe tubuh</Text>
      <Text style={txt.h1}>{s.title.split('\n')[0]}</Text>
      <Text style={[txt.h1,{color:g[0],marginBottom:8}]}>{s.title.split('\n')[1]||''}</Text>
      <Text style={[txt.hint,{marginBottom:20}]}>{s.hint}</Text>

      <View style={{flexDirection:'row',gap:10,marginBottom:24}}>
        {s.opts.map(opt=>{
          const sel=form.body_type===opt.v;
          return (
            <TouchableOpacity key={opt.v} onPress={()=>{ Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); set('body_type',opt.v); }} activeOpacity={0.85} style={{flex:1}}>
              <View style={[NEU_RAISED,{borderRadius:24,overflow:'hidden',shadowColor:sel?opt.g[0]:C.baseShadow}]}>
                <BlurView intensity={60} tint="light" style={[bdS.card,sel&&{borderColor:opt.g[0]+'66'}]}>
                  {sel
                    ? <LinearGradient colors={opt.g} style={bdS.icon} start={{x:0,y:0}} end={{x:1,y:1}}><Text style={{fontSize:28}}>{opt.e}</Text></LinearGradient>
                    : <View style={[bdS.icon,{backgroundColor:'rgba(255,255,255,0.55)'}]}><Text style={{fontSize:28}}>{opt.e}</Text></View>
                  }
                  <Text style={[bdS.label,sel&&{color:C.ink}]}>{opt.l}</Text>
                  <Text style={bdS.desc}>{opt.d}</Text>
                  {sel&&<LinearGradient colors={opt.g} style={bdS.ck} start={{x:0,y:0}} end={{x:1,y:1}}><Ionicons name="checkmark" size={10} color="#fff" /></LinearGradient>}
                </BlurView>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{alignSelf:'center'}}>
        <LanjutFab g={g} onPress={onNext} variant="badge" label="Lanjut" />
      </View>
    </View>
  );
}
const bdS = StyleSheet.create({
  card:  {borderRadius:24,overflow:'hidden',padding:14,alignItems:'center',borderWidth:1.5,borderColor:C.glassBd,backgroundColor:C.glass,minHeight:150},
  icon:  {width:56,height:56,borderRadius:18,alignItems:'center',justifyContent:'center',marginBottom:10},
  label: {fontSize:13,fontWeight:'900',color:C.inkSub,marginBottom:4,letterSpacing:-0.2},
  desc:  {fontSize:10,color:C.inkMuted,textAlign:'center',lineHeight:15},
  ck:    {position:'absolute',top:8,right:8,width:18,height:18,borderRadius:9,alignItems:'center',justifyContent:'center'},
});

// ──────────────────────────────────────────────────────────────
//  CONFIRM  —  summary card, Lanjut fat-daftar
// ──────────────────────────────────────────────────────────────
function ConfirmStep({ form, onRegister, loading }) {
  const rows = [
    { g:['#7B6EF6','#3B5BDB'], e:'👤', l:'Username',   v:form.username },
    { g:['#F4716B','#E11D48'], e:'⚡', l:'Gender',     v:form.gender==='laki_laki'?'Laki-laki':'Perempuan' },
    { g:['#F7C059','#F59E0B'], e:'🎂', l:'Umur',       v:`${form.umur} tahun` },
    { g:['#4ECDC4','#059669'], e:'📏', l:'Tinggi',     v:`${form.tb} cm` },
    { g:['#F4716B','#A78BFA'], e:'⚖️', l:'Berat',      v:`${form.bb} kg` },
    { g:['#7B6EF6','#4ECDC4'], e:'🎯', l:'Tujuan',     v:{bulking:'Bulking',cutting:'Cutting',maintain:'Maintain'}[form.tujuan] },
    { g:['#A78BFA','#F7C059'], e:'🏃', l:'Aktivitas',  v:{sangat_tidak_aktif:'Santai',aktivitas_ringan:'Ringan',aktivitas_sedang:'Sedang',aktivitas_berat:'Intensif'}[form.aktivitas] },
    { g:['#4ECDC4','#7B6EF6'], e:'💪', l:'Tipe',       v:form.body_type?form.body_type[0].toUpperCase()+form.body_type.slice(1):'' },
  ];
  return (
    <View style={{width:'100%'}}>
      <Text style={txt.eyebrow}>Hampir selesai!</Text>
      <Text style={txt.h1}>Semua</Text>
      <Text style={[txt.h1,{color:'#7B6EF6',marginBottom:8}]}>siap! 🌱</Text>
      <Text style={[txt.hint,{marginBottom:20}]}>Cek data sebelum mendaftar</Text>

      <View style={[NEU_RAISED,{borderRadius:24,overflow:'hidden',marginBottom:24}]}>
        <BlurView intensity={65} tint="light" style={{borderRadius:24,overflow:'hidden',borderWidth:1.5,borderColor:C.glassBd,backgroundColor:C.glass,paddingHorizontal:18}}>
          {rows.map(({g,e,l,v},i)=>(
            <View key={l} style={{flexDirection:'row',alignItems:'center',paddingVertical:11,gap:12,borderBottomWidth:i<rows.length-1?1:0,borderBottomColor:'rgba(200,210,228,0.35)'}}>
              <LinearGradient colors={g} style={{width:32,height:32,borderRadius:10,alignItems:'center',justifyContent:'center'}} start={{x:0,y:0}} end={{x:1,y:1}}>
                <Text style={{fontSize:13}}>{e}</Text>
              </LinearGradient>
              <Text style={{flex:1,fontSize:13,color:C.inkSub,fontWeight:'700'}}>{l}</Text>
              <Text style={{fontSize:13,color:C.ink,fontWeight:'900'}}>{v}</Text>
            </View>
          ))}
        </BlurView>
      </View>

      <LanjutFab g={['#7B6EF6','#F4716B']} onPress={onRegister} variant="fat"
        label={loading?'Mendaftar...':'Daftar Sekarang 🚀'} icon={loading?'hourglass-outline':'checkmark-circle-outline'} />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
//  MAIN SCREEN
// ──────────────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [step,    setStep]     = useState(0);
  const [loading, setLoading]  = useState(false);
  const [showPass,setShowPass] = useState(false);
  const [form, setForm] = useState({ username:'', password:'', gender:'', umur:22, tb:170, bb:65, tujuan:'', aktivitas:'', body_type:'' });
  const fadeA  = useRef(new Animated.Value(1)).current;
  const slideA = useRef(new Animated.Value(0)).current;
  const setF   = (k,v) => setForm(f=>({...f,[k]:v}));

  const isConfirm = step===STEPS.length;
  const s         = isConfirm ? null : STEPS[step];
  const g         = G[Math.min(step, G.length-1)];

  const validate = () => {
    if(!s) return true;
    if(s.type==='text'){
      if(!form[s.field]?.trim()){ Alert.alert('Isi dulu!','Field ini wajib diisi.'); return false; }
      if(s.field==='password'&&form.password.length<6){ Alert.alert('Password kurang panjang','Minimal 6 karakter.'); return false; }
    }
    if(['choice','body','gender'].includes(s.type)&&!form[s.field]){ Alert.alert('Pilih dulu!','Tolong pilih salah satu.'); return false; }
    return true;
  };

  const tx = (cb,back=false) => {
    Animated.timing(fadeA,{toValue:0,duration:90,useNativeDriver:true}).start(()=>{
      slideA.setValue(back?-44:44);
      cb();
      Animated.parallel([
        Animated.timing(fadeA,{toValue:1,duration:240,useNativeDriver:true}),
        Animated.timing(slideA,{toValue:0,duration:240,useNativeDriver:true}),
      ]).start();
    });
  };

  const goNext = () => { if(!validate()) return; tx(()=>setStep(p=>p+1)); };
  const goBack = () => { if(step===0){ navigation.goBack?.(); return; } tx(()=>setStep(p=>p-1),true); };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const res = await register({...form});
      await signIn(res?.user || null); // AppNavigator otomatis pindah ke MainStack
    } catch(err) {
      Alert.alert('Gagal Daftar', err?.message || err?.response?.data?.error || 'Coba lagi ya 🙏');
    } finally {
      setLoading(false);
    }
  };

  const isText = s?.type==='text';

  return (
    <View style={{flex:1}}>
      <StatusBar barStyle="dark-content" />
      <Background g={g} />

      <View style={{flex:1}}>
        {/* Top bar — back + progress dots only */}
        <View style={[mn.top,{paddingTop:insets.top+6}]}>
          <TouchableOpacity onPress={goBack} activeOpacity={0.8}>
            <View style={[NEU_RAISED,{borderRadius:14,width:40,height:40,alignItems:'center',justifyContent:'center',shadowColor:C.baseShadow}]}>
              <BlurView intensity={60} tint="light" style={{...StyleSheet.absoluteFillObject,borderRadius:14,borderWidth:1.5,borderColor:C.glassBd}} />
              <Ionicons name="arrow-back" size={17} color={C.inkSub} />
            </View>
          </TouchableOpacity>

          {!isConfirm && (
            <View style={{flexDirection:'row',gap:4,alignItems:'center'}}>
              {STEPS.map((_,i)=>(
                <View key={i} style={{
                  width:i===step?22:6, height:6, borderRadius:3,
                  overflow:'hidden',
                  backgroundColor:i<step?g[0]+'66':i===step?'transparent':C.inkMuted+'33',
                }}>
                  {i===step&&<LinearGradient colors={g} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:0}} />}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Centered content — NO fixed button below */}
        <KeyboardAvoidingView style={{flex:1}} behavior={isText&&Platform.OS==='ios'?'padding':undefined}>
          <View style={{flex:1, justifyContent:'center', paddingHorizontal:24}}>
            <Animated.View style={{opacity:fadeA, transform:[{translateY:slideA}], width:'100%'}}>

              {s?.type==='text'   && <TextStep   s={s} form={form} set={setF} showPass={showPass} setShowPass={setShowPass} g={g} onNext={goNext} />}
              {s?.type==='gender' && <GenderStep s={s} form={form} set={setF} g={g} onNext={goNext} />}
              {s?.type==='age'    && <AgeStep    form={form} set={setF} g={g} onNext={goNext} />}
              {s?.type==='height' && <HeightStep form={form} set={setF} g={g} onNext={goNext} />}
              {s?.type==='weight' && <WeightStep form={form} set={setF} g={g} onNext={goNext} />}
              {s?.type==='choice' && <ChoiceStep s={s} form={form} set={setF} g={g} onNext={goNext} />}
              {s?.type==='body'   && <BodyStep   s={s} form={form} set={setF} g={g} onNext={goNext} />}
              {isConfirm          && <ConfirmStep form={form} onRegister={handleRegister} loading={loading} />}

            </Animated.View>
          </View>
        </KeyboardAvoidingView>

        {/* ONLY copyright at very bottom */}
        <View style={{paddingBottom:insets.bottom+10, alignItems:'center'}}>
          <Text style={{fontSize:11,color:C.inkMuted,fontWeight:'600',letterSpacing:0.5}}>
            © 2026 Matchaby · All rights reserved
          </Text>
        </View>
      </View>
    </View>
  );
}

const mn = StyleSheet.create({
  top: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingBottom:4 },
});