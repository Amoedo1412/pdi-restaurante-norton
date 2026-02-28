import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function PortalCriticas() {
  const [criticas, setCriticas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarCriticas();
  }, []);

  async function carregarCriticas() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('criticas')
        .select('*, perfis(nome)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setCriticas(data);
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível carregar as críticas.");
    } finally {
      setLoading(false);
    }
  }

  async function eliminarCritica(id: string) {
    Alert.alert("Moderação", "Remover esta crítica permanentemente?", [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Remover", 
        style: 'destructive', 
        onPress: async () => {
          const { error } = await supabase.from('criticas').delete().eq('id', id);
          if (!error) carregarCriticas();
          else Alert.alert("Erro", "Não foi possível eliminar.");
        } 
      }
    ]);
  }

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" color="#e67e22" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={criticas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.criticaCard}>
            <Text style={styles.autor}>{item.perfis?.nome || 'Utilizador Anónimo'}</Text>
            <Text style={styles.comentario}>{item.comentario}</Text>
            
            {/* Renderização condicional da foto conforme planeado no projeto [cite: 24, 30] */}
            {item.foto_url && (
              <Image source={{ uri: item.foto_url }} style={styles.foto} />
            )}
            
            <TouchableOpacity 
              style={styles.botaoEliminar} 
              onPress={() => eliminarCritica(item.id)}
            >
              <Text style={styles.btnEliminar}>Eliminar Comentário Irrelevante</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.vazio}>Ainda não existem críticas para moderar.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 10 },
  criticaCard: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 15, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  autor: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  comentario: { fontSize: 14, color: '#666', marginBottom: 10 },
  foto: { width: '100%', height: 200, borderRadius: 8, marginBottom: 10, resizeMode: 'cover' },
  botaoEliminar: { 
    marginTop: 5, 
    paddingVertical: 8, 
    borderTopWidth: 1, 
    borderTopColor: '#eee',
    alignItems: 'center'
  },
  btnEliminar: { color: '#ff3b30', fontWeight: 'bold', fontSize: 13 },
  vazio: { textAlign: 'center', marginTop: 50, color: '#999' }
});