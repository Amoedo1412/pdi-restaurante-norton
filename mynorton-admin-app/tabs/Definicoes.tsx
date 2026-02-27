import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Definicoes() {
  
  const handleLogout = () => {
    Alert.alert(
      "Sair",
      "Tens a certeza que queres terminar sessão?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sair", 
          onPress: () => supabase.auth.signOut(),
          style: "destructive" 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Definições</Text>
      
      <View style={styles.seccao}>
        <Text style={styles.label}>Conta</Text>
        <TouchableOpacity 
          style={styles.botaoLogout} 
          onPress={handleLogout}
        >
          <Text style={styles.textoLogout}>Terminar Sessão (Logout)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    marginTop: 40,
    color: '#333',
  },
  seccao: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  botaoLogout: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  textoLogout: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '600',
  }
});