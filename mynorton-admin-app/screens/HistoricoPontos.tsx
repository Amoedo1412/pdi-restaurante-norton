import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../components/TemaContexto';

export default function HistoricoPontos() {
  const { theme, isDark } = useTheme();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { carregarHistorico(); }, []);

  async function carregarHistorico() {
    setLoading(true);
    const { data, error } = await supabase
      .from('log_pontos')
      .select(`id, quantidade, created_at, cliente:cliente_id ( nome ), admin:admin_id ( nome )`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setLogs(data);
    setLoading(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={styles.header}>
        <Text style={[styles.titulo, { color: theme.text }]}>Histórico de Pontos</Text>
        <Text style={[styles.subtitulo, { color: theme.subText }]}>Últimas movimentações de fidelidade</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={carregarHistorico} colors={[theme.orange]} />
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={[styles.cardLog, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : '#000' }]}>
            <View style={[styles.iconBox, { backgroundColor: item.quantidade > 0 ? (isDark ? 'rgba(76, 217, 100, 0.1)' : '#F0FFF4') : (isDark ? 'rgba(255, 59, 48, 0.1)' : '#FFF0F0') }]}>
              <Ionicons name={item.quantidade > 0 ? "trending-up" : "trending-down"} size={22} color={item.quantidade > 0 ? "#4CD964" : "#FF3B30"} />
            </View>

            <View style={styles.infoContent}>
              <Text style={[styles.clienteNome, { color: theme.text }]}>{item.cliente?.nome || 'Cliente Removido'}</Text>
              <Text style={[styles.adminNome, { color: theme.subText }]}>Atribuído por: {item.admin?.nome || 'Sistema'}</Text>
              <Text style={[styles.dataHora, { color: theme.subText }]}>
                {new Date(item.created_at).toLocaleDateString('pt-PT')} às {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            <View style={styles.valorPontos}>
              <Text style={[styles.pontosText, { color: item.quantidade > 0 ? '#4CD964' : '#FF3B30' }]}>
                {item.quantidade > 0 ? `+${item.quantidade}` : item.quantidade}
              </Text>
              <Text style={[styles.ptsLabel, { color: theme.subText }]}>pts</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.vazio}>
              <Ionicons name="receipt-outline" size={60} color={theme.border} />
              <Text style={[styles.vazioText, { color: theme.subText }]}>Nenhuma movimentação registada.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 25 },
  titulo: { fontSize: 28, fontWeight: 'bold' },
  subtitulo: { fontSize: 15, marginTop: 4 },
  cardLog: { flexDirection: 'row', padding: 15, borderRadius: 20, marginBottom: 12, alignItems: 'center', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
  iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoContent: { flex: 1 },
  clienteNome: { fontSize: 16, fontWeight: '700' },
  adminNome: { fontSize: 12, marginTop: 2 },
  dataHora: { fontSize: 11, marginTop: 4, fontWeight: '500' },
  valorPontos: { alignItems: 'flex-end' },
  pontosText: { fontSize: 18, fontWeight: '800' },
  ptsLabel: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  vazio: { alignItems: 'center', marginTop: 80 },
  vazioText: { marginTop: 15, fontSize: 15 }
});