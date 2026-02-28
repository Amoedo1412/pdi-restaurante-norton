import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function GestaoUtilizadores() {
  const [utilizadores, setUtilizadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarUtilizadores();
  }, []);

  async function carregarUtilizadores() {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .in('tipo_utilizador', ['admin', 'funcionario']); // Filtra apenas staff

    if (data) setUtilizadores(data);
    setLoading(false);
  }

  async function alterarCargo(id: string, cargoAtual: string) {
    const novoCargo = cargoAtual === 'admin' ? 'funcionário' : 'admin';
    
    Alert.alert(
      "Alterar Permissões",
      `Desejas alterar este utilizador para ${novoCargo}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: async () => {
            const { error } = await supabase
              .from('perfis')
              .update({ tipo_utilizador: novoCargo })
              .eq('id', id);
            
            if (!error) carregarUtilizadores();
          }
        }
      ]
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Gestão de Utilizadores</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#e67e22" />
      ) : (
        <FlatList
          data={utilizadores}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{item.nome}</Text>
                <Text style={styles.cargo}>{item.tipo_utilizador.toUpperCase()}</Text>
              </View>
              
              <TouchableOpacity onPress={() => alterarCargo(item.id, item.tipo_utilizador)}>
                <Ionicons 
                  name={item.tipo_utilizador === 'admin' ? "shield-checkmark" : "person-outline"} 
                  size={28} 
                  color="#e67e22" 
                />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 10, 
    alignItems: 'center',
    elevation: 2 
  },
  nome: { fontSize: 16, fontWeight: 'bold' },
  cargo: { fontSize: 12, color: '#e67e22', marginTop: 4, fontWeight: '600' }
});