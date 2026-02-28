import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function Reservas() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pessoas, setPessoas] = useState(2);
  const [periodo, setPeriodo] = useState('Almoço'); // Almoço ou Jantar

  const fazerReserva = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert("Erro", "Precisas de estar autenticado para reservar.");
      return;
    }

    const { error } = await supabase.from('reservas').insert([
      {
        perfil_id: user.id,
        data_reserva: date.toISOString().split('T')[0],
        hora_reserva: periodo === 'Almoço' ? '13:00' : '20:00',
        numero_pessoas: pessoas,
        status: 'pendente'
      }
    ]);

    if (error) {
      Alert.alert("Erro", "Não foi possível realizar a reserva.");
    } else {
      Alert.alert("Sucesso! 🎉", "A tua reserva foi enviada e aguarda confirmação.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Nova Reserva</Text>

      {/* Seletor de Data */}
      <View style={styles.card}>
        <Text style={styles.label}>Escolha o dia:</Text>
        <TouchableOpacity style={styles.botaoData} onPress={() => setShowPicker(true)}>
          <Ionicons name="calendar-outline" size={20} color="#e67e22" />
          <Text style={styles.textoData}>{date.toLocaleDateString('pt-PT')}</Text>
        </TouchableOpacity>
        
        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowPicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}
      </View>

      {/* Seletor de Período */}
      <View style={styles.card}>
        <Text style={styles.label}>Período:</Text>
        <View style={styles.row}>
          {['Almoço', 'Jantar'].map((p) => (
            <TouchableOpacity 
              key={p} 
              style={[styles.chip, periodo === p && styles.chipAtivo]} 
              onPress={() => setPeriodo(p)}
            >
              <Text style={[styles.chipTexto, periodo === p && styles.chipTextoAtivo]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Contador de Pessoas */}
      <View style={styles.card}>
        <Text style={styles.label}>Número de Pessoas:</Text>
        <View style={styles.contador}>
          <TouchableOpacity onPress={() => setPessoas(Math.max(1, pessoas - 1))} style={styles.btnCircular}>
            <Ionicons name="remove" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.numPessoas}>{pessoas}</Text>
          <TouchableOpacity onPress={() => setPessoas(pessoas + 1)} style={styles.btnCircular}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.btnConfirmar} onPress={fazerReserva}>
        <Text style={styles.btnTexto}>Confirmar Reserva</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc', padding: 20 },
  titulo: { fontSize: 26, fontWeight: 'bold', marginTop: 40, marginBottom: 20, color: '#333' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 2 },
  label: { fontSize: 14, color: '#666', marginBottom: 10, fontWeight: '600' },
  botaoData: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  textoData: { marginLeft: 10, fontSize: 18, color: '#333' },
  row: { flexDirection: 'row', gap: 10 },
  chip: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#f0f0f0' },
  chipAtivo: { backgroundColor: '#e67e22' },
  chipTexto: { color: '#666' },
  chipTextoAtivo: { color: '#fff', fontWeight: 'bold' },
  contador: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 30, paddingVertical: 10 },
  btnCircular: { backgroundColor: '#e67e22', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  numPessoas: { fontSize: 24, fontWeight: 'bold' },
  btnConfirmar: { backgroundColor: '#333', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20 },
  btnTexto: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});