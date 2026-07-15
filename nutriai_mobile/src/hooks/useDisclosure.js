/**
 * hooks/useDisclosure.js
 *
 * Hook untuk state buka/tutup (modal, bottomsheet, dropdown, dll).
 *
 * Contoh:
 *   const { isOpen, open, close, toggle } = useDisclosure();
 *   <Modal visible={isOpen} onRequestClose={close} />
 *   <Button onPress={open} label="Buka Modal" />
 */

import { useState, useCallback } from 'react';

export function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);
  const open   = useCallback(() => setIsOpen(true),  []);
  const close  = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(v => !v), []);
  return { isOpen, open, close, toggle };
}
