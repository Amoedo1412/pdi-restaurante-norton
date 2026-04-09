import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/TemaContexto'; // Importar a nuvem do Tema

export default function HistoricoPedidos({ navigation }: any) {
  const { theme, isDark } = useTheme(); // Puxar o Tema Escuro
  
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    carregarPedidos();
  }, []);

  async function carregarPedidos() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // 1. Procuramos na tabela CORRETA (pedidos) e na coluna correta (cliente_id)
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('cliente_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Erro ao buscar histórico:", error);
      } else if (data) {
        setPedidos(data);
      }
    }
    setLoading(false);
    setRefreshing(false);
  }

  // Função para refrescar ao puxar para baixo
  const onRefresh = () => {
    setRefreshing(true);
    carregarPedidos();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pendente': return theme.orange; // Laranja Norton
      case 'em preparação': return '#3498db'; // Azul
      case 'pronto': return theme.green; // Verde
      default: return theme.textSec; // Cinzento
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.orange} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* CABEÇALHO PERSONALIZADO PARA CONDOR COM A APP */}
      <View style={[styles.header, { backgroundColor: theme.bg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.titulo, { color: theme.orange }]}>O Meu Histórico</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={pedidos}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.orange} />}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          // CARD COM CORES DINÂMICAS DO TEMA
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            
            <View style={styles.headerCard}>
              <Text style={[styles.data, { color: theme.textSec }]}>
                {new Date(item.created_at).toLocaleDateString('pt-PT')}
              </Text>
              
              <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}>
                <View style={[styles.pontoStatus, { backgroundColor: getStatusColor(item.status) }]} />
                <Text style={[styles.statusText, { color: theme.text }]}>
                  {item.status ? item.status.toUpperCase() : 'PENDENTE'}
                </Text>
              </View>
            </View>

            {/* Mostramos o nome dos pratos, ou um aviso se estiver vazio */}
            <Text style={[styles.detalhes, { color: theme.text }]}>
              {item.prato_nome || "Reserva de mesa"}
            </Text>

            <View style={styles.footerCard}>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color={theme.textSec} />
                <Text style={[styles.hora, { color: theme.textSec }]}>
                  Recolha: <Text style={{ color: theme.text, fontWeight: 'bold' }}>{item.hora_recolha || '--:--'}</Text>
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="cash-outline" size={16} color={theme.textSec} />
                <Text style={[styles.hora, { color: theme.textSec }]}>
                  Total: <Text style={{ color: theme.orange, fontWeight: 'bold' }}>{item.total_preco ? Number(item.total_preco).toFixed(2) : '0.00'}€</Text>
                </Text>
              </View>
            </View>

          </View>
        )}
        ListEmptyComponent={
          <View style={styles.vazioContainer}>
            <Ionicons name="receipt-outline" size={60} color={theme.border} />
            <Text style={[styles.vazio, { color: theme.textSec }]}>Ainda não tens histórico de pedidos.</Text>
            <Text style={[styles.vazioSub, { color: theme.textSec }]}>Quando encomendares o teu Take-Away, ele aparecerá aqui.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 15 },
  backBtn: { padding: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold' },
  
  lista: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  
  card: { borderRadius: 20, padding: 18, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1 },
  headerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  data: { fontSize: 13, fontWeight: '600' },
  
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 5 },
  pontoStatus: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  
  detalhes: { fontSize: 16, fontWeight: '700', marginBottom: 15, lineHeight: 22 },
  
  footerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hora: { fontSize: 13 },
  
  vazioContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  vazio: { textAlign: 'center', marginTop: 20, fontSize: 16, fontWeight: 'bold' },
  vazioSub: { textAlign: 'center', marginTop: 5, fontSize: 13, lineHeight: 20 }
});