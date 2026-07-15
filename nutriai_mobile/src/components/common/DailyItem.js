import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../../theme';
import { deleteDaily } from '../../services/DailyService';

export default function DailyItem({ item, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    Alert.alert('Hapus', `Hapus ${item.food?.nama_makanan}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteDaily(item.id);
            onDelete(item.id);
          } catch {
            Alert.alert('Error', 'Gagal menghapus');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.dailyItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.dailyName} numberOfLines={1}>{item.food?.nama_makanan}</Text>
        <Text style={styles.dailyMacro}>{item.food?.protein}g · {item.food?.kalori} kcal · {item.food?.porsi}x</Text>
      </View>
      {deleting
        ? <ActivityIndicator size="small" color={Colors.danger} />
        : (
          <TouchableOpacity style={styles.dailyDeleteBtn} onPress={handleDelete}>
            <Text style={styles.dailyDeleteText}>🗑</Text>
          </TouchableOpacity>
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  dailyItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  dailyName:      { fontSize: 13, fontWeight: '600', color: Colors.text },
  dailyMacro:     { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  dailyDeleteBtn: { padding: 8 },
  dailyDeleteText:{ fontSize: 16 },
});