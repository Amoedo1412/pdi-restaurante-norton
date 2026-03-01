import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Definicoes() {

  const handleLogout = () => {
    Alert.alert("Sair", "Tens a certeza que queres terminar sessão?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", onPress: () => supabase.auth.signOut(), style: "destructive" }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Definições</Text>

      {/* SECÇÃO DE CONTA */}
      <View style={styles.seccao}>
        <Text style={styles.label}>Conta</Text>
        
        <TouchableOpacity style={styles.botaoLogout} onPress={handleLogout}>
          <Text style={styles.textoLogout}>Terminar Sessão (Logout)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  titulo: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, marginTop: 40, color: '#333' },
  seccao: { backgroundColor: '#fff', borderRadius: 12, padding: 15, elevation: 3, marginTop: 10 },
  label: { fontSize: 12, color: '#888', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  botaoLogout: { paddingVertical: 12, alignItems: 'center' },
  textoLogout: { color: '#ff3b30', fontSize: 16, fontWeight: '600' }
});