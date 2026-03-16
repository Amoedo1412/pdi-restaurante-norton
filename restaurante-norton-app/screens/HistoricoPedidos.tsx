import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function HistoricoPedidos() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    carregarPedidos();
  }, []);

  async function carregarPedidos() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('reservas')
        .select('*')
        .eq('perfil_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) setPedidos(data);
    }
    setLoading(false);
    setRefreshing(false);
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendente': return '#ff9500';
      case 'em preparação': return '#3498db';
      case 'pronto': return '#2ecc71';
      default: return '#8e8e93';
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#e67e22" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Os Meus Pedidos</Text>
      <FlatList
        data={pedidos}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={carregarPedidos} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerCard}>
              <Text style={styles.data}>{new Date(item.created_at).toLocaleDateString('pt-PT')}</Text>
              <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.detalhes}>{item.pedido_detalhes || "Reserva de mesa"}</Text>
            <View style={styles.footerCard}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.hora}>Recolha: {item.hora_reserva}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.vazio}>Ainda não tens histórico de pedidos.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 24, fontWeight: 'bold', marginTop: 40, marginBottom: 20, color: '#333' },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 3, borderWidth: 1, borderColor: '#eee' },
  headerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  data: { fontSize: 14, color: '#888', fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  detalhes: { fontSize: 16, color: '#333', marginBottom: 10 },
  footerCard: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hora: { fontSize: 13, color: '#666' },
  vazio: { textAlign: 'center', marginTop: 50, color: '#999' }
});