/**
 * hooks/useTTS.js
 *
 * Wrapper expo-speech untuk Text-to-Speech.
 * expo-speech sudah include di Expo — tidak perlu install.
 *
 * Penggunaan:
 *   const { speak, stop, speaking } = useTTS();
 *   speak("Halo, ini NutriAI");
 */

import { useState, useEffect, useCallback } from 'react';
import * as Speech from 'expo-speech';

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);

  // Bersihkan saat unmount
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const speak = useCallback((text, options = {}) => {
    if (!text) return;

    // Stop dulu kalau sedang bicara
    Speech.stop();

    // Bersihkan teks dari markdown/emoji sebelum dibaca
    const clean = text
      .replace(/[*_`#•\-]/g, '')                          // markdown
      .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')             // emoji
      .replace(/\n+/g, '. ')                              // newline → jeda
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!clean) return;

    setSpeaking(true);
    Speech.speak(clean, {
      language: 'id-ID',    // Bahasa Indonesia
      pitch:    1.0,
      rate:     0.9,        // sedikit lebih lambat dari default agar jelas
      ...options,
      onDone:  () => setSpeaking(false),
      onError: () => setSpeaking(false),
      onStopped:() => setSpeaking(false),
    });
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
    setSpeaking(false);
  }, []);

  // Toggle speak/stop
  const toggle = useCallback((text, options) => {
    if (speaking) {
      stop();
    } else {
      speak(text, options);
    }
  }, [speaking, speak, stop]);

  return { speak, stop, toggle, speaking };
}