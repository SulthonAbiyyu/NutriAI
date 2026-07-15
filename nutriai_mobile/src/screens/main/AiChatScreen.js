/**
 * AiChatScreen.js
 *
 * Chat personal dengan NutriAI (Gemini via backend).
 * Fitur:
 * - Conversation history (6 pesan terakhir dikirim sebagai context)
 * - Quick prompts
 * - TTS: tap 🔊 di bubble untuk dengarkan jawaban
 * - Auto scroll ke bawah
 * - Reset chat
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation }     from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatWithAI, getMealSuggestion } from '../../services/AiService';
import { useTTS }            from '../../hooks/useTTS';
import { Colors, Spacing, Radius, Shadow } from '../../theme';

// ─── Quick Prompts ────────────────────────────────────

const QUICK_PROMPTS = [
  { icon: '🍽', label: 'Saran Menu',   msg: 'Berikan saran menu makan untuk sisa hari ini berdasarkan targetku' },
  { icon: '💡', label: 'Tips Diet',    msg: 'Berikan tips diet yang efektif sesuai tujuan dietku' },
  { icon: '🥦', label: 'Tinggi Protein', msg: 'Rekomendasikan 5 makanan Indonesia tinggi protein yang mudah didapat' },
  { icon: '📊', label: 'Jelaskan TDEE', msg: 'Jelaskan apa itu TDEE dan bagaimana cara kerjanya dalam dietku' },
];

// ─── Bubble ──────────────────────────────────────────

function Bubble({ msg, onSpeak, isSpeaking }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleWrap, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
      {!isUser && (
        <View style={styles.botAvatarWrap}>
          <Text style={styles.botAvatar}>🤖</Text>
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
            <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
              {msg.text}
            </Text>
            <View style={styles.bubbleFooter}>
              <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
                {msg.timestamp}
              </Text>
              {/* TTS button hanya di bot bubble */}
              {!isUser && msg.tts_text && (
                <TouchableOpacity
                  onPress={() => onSpeak(msg.id, msg.tts_text)}
                  style={styles.ttsBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.ttsIcon, isSpeaking && { color: Colors.primary }]}>
                    {isSpeaking ? '⏹' : '🔊'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────

const INITIAL_MSG = {
  id: '0',
  role: 'bot',
  text: 'Halo! Saya NutriAI 🥗\n\nTanyakan apa saja tentang nutrisi, diet, atau minta saran menu makanan. Tap 🔊 untuk mendengarkan jawaban saya!',
  tts_text: 'Halo! Saya NutriAI. Tanyakan apa saja tentang nutrisi, diet, atau minta saran menu makanan.',
  timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
};

export default function AiChatScreen() {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();
  const flatRef    = useRef(null);
  const historyRef = useRef([]); // conversation context

  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState([INITIAL_MSG]);
  const [sending,  setSending]  = useState(false);
  const [activeTtsId, setActiveTtsId] = useState(null); // id bubble yg sedang dibaca

  const { speak, stop, speaking } = useTTS();

  // Stop TTS saat unmount
  useEffect(() => () => stop(), [stop]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  useEffect(() => { scrollToEnd(); }, [messages, scrollToEnd]);

  // TTS handler per bubble
  const handleSpeak = useCallback((id, text) => {
    if (activeTtsId === id && speaking) {
      stop();
      setActiveTtsId(null);
    } else {
      setActiveTtsId(id);
      speak(text, {
        onDone:    () => setActiveTtsId(null),
        onStopped: () => setActiveTtsId(null),
        onError:   () => setActiveTtsId(null),
      });
    }
  }, [activeTtsId, speaking, speak, stop]);

  const sendMessage = useCallback(async (text) => {
    const msgText = (text || input).trim();
    if (!msgText || sending) return;

    setInput('');
    stop(); // Stop TTS kalau lagi baca
    setActiveTtsId(null);

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

    try {
      const res      = await chatWithAI(msgText, historyRef.current);
      const botText  = res.reply    || 'Maaf, saya tidak bisa menjawab sekarang.';
      const ttsText  = res.tts_text || botText;
      const botId    = `bot_${Date.now()}`;

      historyRef.current = [
        ...historyRef.current,
        { role: 'model', text: botText },
      ].slice(-10);

      setMessages(prev =>
        prev.filter(m => m.id !== 'loading').concat({
          id: botId, role: 'bot',
          text: botText, tts_text: ttsText,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        })
      );

      // Auto-read response (opsional — hanya jika kurang dari 200 karakter)
      // if (ttsText.length < 200) {
      //   setActiveTtsId(botId);
      //   speak(ttsText, { onDone: () => setActiveTtsId(null) });
      // }
    } catch {
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
  }, [input, sending, stop, speak]);

  const resetChat = useCallback(() => {
    stop();
    setActiveTtsId(null);
    historyRef.current = [];
    setMessages([{
      ...INITIAL_MSG,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    }]);
  }, [stop]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { stop(); navigation.goBack(); }} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🤖 NutriAI</Text>
          <View style={styles.onlineDot} />
        </View>
        <TouchableOpacity onPress={resetChat} style={styles.resetBtn}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* ── Quick Prompts ── */}
      <View style={styles.quickWrap}>
        {QUICK_PROMPTS.map(q => (
          <TouchableOpacity
            key={q.label}
            style={[styles.quickChip, sending && styles.quickChipDisabled]}
            onPress={() => sendMessage(q.msg)}
            disabled={sending}
            activeOpacity={0.7}
          >
            <Text style={styles.quickIcon}>{q.icon}</Text>
            <Text style={styles.quickLabel}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Messages ── */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => (
          <Bubble
            msg={item}
            onSpeak={handleSpeak}
            isSpeaking={activeTtsId === item.id && speaking}
          />
        )}
        contentContainerStyle={styles.msgList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToEnd}
      />

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:      { width: 36, height: 36, justifyContent: 'center' },
  backArrow:    { fontSize: 22, color: Colors.text },
  headerCenter: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  headerTitle:  { fontSize: 16, fontWeight: '800', color: Colors.text },
  onlineDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  resetBtn:     { paddingHorizontal: 4 },
  resetText:    { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },

  quickWrap: {
    flexDirection: 'row', paddingHorizontal: Spacing.md,
    paddingVertical: 10, gap: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  quickChip:         { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryLight, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  quickChipDisabled: { opacity: 0.5 },
  quickIcon:         { fontSize: 12 },
  quickLabel:        { fontSize: 11, fontWeight: '700', color: Colors.primary },

  msgList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: 14 },

  bubbleWrap:  { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubbleLeft:  { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end', flexDirection: 'row-reverse' },

  botAvatarWrap: { marginBottom: 4 },
  botAvatar:     { fontSize: 22 },

  bubble:     { borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot:  { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, ...Shadow.xs },
  bubbleUser: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },

  bubbleText:     { fontSize: 14, color: Colors.text, lineHeight: 21 },
  bubbleTextUser: { color: Colors.white },

  bubbleFooter:  { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 5, gap: 8 },
  bubbleTime:    { fontSize: 9, color: Colors.textMuted },
  bubbleTimeUser:{ color: 'rgba(255,255,255,0.6)' },
  ttsBtn:        { padding: 2 },
  ttsIcon:       { fontSize: 13, color: Colors.textMuted },

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
  },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnOff: { backgroundColor: Colors.primaryMuted },
  sendIcon:   { fontSize: 16, color: Colors.white },
});