import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function HistoricoPontos() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarHistorico();
  }, []);

  async function carregarHistorico() {
    setLoading(true);
    // Busca os logs trazendo o nome do cliente e do admin que fez a operação
    const { data, error } = await supabase
      .from('log_pontos')
      .select(`
        id,
        quantidade,
        created_at,
        cliente:cliente_id ( nome ),
        admin:admin_id ( nome )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setLogs(data);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.titulo}>Histórico de Pontos</Text>
        <Text style={styles.subtitulo}>Últimas movimentações de fidelidade</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={carregarHistorico} colors={['#e67e22']} />
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.cardLog}>
            <View style={[styles.iconBox, { backgroundColor: item.quantidade > 0 ? '#F0FFF4' : '#FFF0F0' }]}>
              <Ionicons 
                name={item.quantidade > 0 ? "trending-up" : "trending-down"} 
                size={22} 
                color={item.quantidade > 0 ? "#4CD964" : "#FF3B30"} 
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.clienteNome}>{item.cliente?.nome || 'Cliente Removido'}</Text>
              <Text style={styles.adminNome}>Atribuído por: {item.admin?.nome || 'Sistema'}</Text>
              <Text style={styles.dataHora}>
                {new Date(item.created_at).toLocaleDateString('pt-PT')} às {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            <View style={styles.valorPontos}>
              <Text style={[styles.pontosText, { color: item.quantidade > 0 ? '#4CD964' : '#FF3B30' }]}>
                {item.quantidade > 0 ? `+${item.quantidade}` : item.quantidade}
              </Text>
              <Text style={styles.ptsLabel}>pts</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.vazio}>
              <Ionicons name="receipt-outline" size={60} color="#EEE" />
              <Text style={styles.vazioText}>Nenhuma movimentação registada.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 25 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#1C1C1E' },
  subtitulo: { fontSize: 15, color: '#8E8E93', marginTop: 4 },

  cardLog: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    padding: 15, 
    borderRadius: 20, 
    marginBottom: 12, 
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1
  },
  iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoContent: { flex: 1 },
  clienteNome: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  adminNome: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  dataHora: { fontSize: 11, color: '#CCC', marginTop: 4, fontWeight: '500' },

  valorPontos: { alignItems: 'flex-end' },
  pontosText: { fontSize: 18, fontWeight: '800' },
  ptsLabel: { fontSize: 10, color: '#8E8E93', fontWeight: 'bold', textTransform: 'uppercase' },

  vazio: { alignItems: 'center', marginTop: 80 },
  vazioText: { color: '#CCC', marginTop: 15, fontSize: 15 }
});