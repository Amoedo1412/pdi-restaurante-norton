import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  StatusBar, ActivityIndicator, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const COLORS = {
  bg: '#F4F6F9',
  card: '#FFFFFF',
  text: '#1C1C1E',
  textSec: '#8E8E93',
  orange: '#FF6B00',
  orangeLight: '#FFF0E5',
  border: '#E5E5EA',
  green: '#34C759',
  black: '#121212'
};

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarPedidos();
    
    const sub = supabase.channel('pedidos_admin')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'pedidos' }, 
        () => carregarPedidos()
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  async function carregarPedidos() {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .order('status', { ascending: false }) // 'pendente' aparece primeiro que 'concluido'
      .order('created_at', { ascending: false });

    if (data) setPedidos(data);
    setLoading(false);
  }

  async function atualizarStatus(id: string, novoStatus: string) {
    const { error } = await supabase
      .from('pedidos')
      .update({ status: novoStatus })
      .eq('id', id);
    
    if (!error) carregarPedidos();
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      <View style={styles.header}>
        <Text style={styles.titulo}>Cozinha & Sala</Text>
        <Text style={styles.subtitulo}>Gestão de pedidos em tempo real</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.orange} />
        </View>
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isPendente = item.status === 'pendente';
            
            return (
              <View style={[styles.card, !isPendente && styles.cardConcluido]}>
                <View style={styles.cardHeader}>
                  <View style={styles.pedidoBadge}>
                    <Ionicons name="basket" size={14} color="#FFF" />
                    <Text style={styles.mesaText}>TAKE-AWAY</Text>
                  </View>
                  
                  <View style={[styles.statusBadge, { backgroundColor: isPendente ? COLORS.orangeLight : '#E8F5E9' }]}>
                    <View style={[styles.dot, { backgroundColor: isPendente ? COLORS.orange : COLORS.green }]} />
                    <Text style={[styles.statusText, { color: isPendente ? COLORS.orange : COLORS.green }]}>
                      {item.status ? item.status.toUpperCase() : 'PENDENTE'}
                    </Text>
                  </View>
                </View>

                {/* Ajustado para as tuas colunas: prato_nome e quantidade */}
                <Text style={styles.detalhes}>
                   <Text style={{color: COLORS.orange}}>{item.quantidade}x</Text> {item.prato_nome}
                </Text>

                <View style={styles.recolhaRow}>
                    <Ionicons name="alarm-outline" size={16} color={COLORS.textSec} />
                    <Text style={styles.recolhaLabel}>Recolha agendada: </Text>
                    <Text style={styles.recolhaHora}>{item.hora_recolha || '--:--'}</Text>
                </View>
                
                <View style={styles.footerCard}>
                  <View style={styles.priceRow}>
                    <Text style={styles.totalLabel}>Total: </Text>
                    <Text style={styles.totalValue}>{parseFloat(item.total_preco || 0).toFixed(2)}€</Text>
                  </View>
                  
                  {isPendente && (
                    <TouchableOpacity 
                      style={styles.btnPronto} 
                      onPress={() => atualizarStatus(item.id, 'concluido')}
                    >
                      <Text style={styles.btnText}>PRONTO</Text>
                      <Ionicons name="checkmark-done" size={16} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={60} color={COLORS.border} />
              <Text style={styles.vazio}>Tudo em ordem! Sem pedidos ativos.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingHorizontal: 25, 
    paddingBottom: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderColor: COLORS.border
  },
  titulo: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  subtitulo: { fontSize: 13, color: COLORS.orange, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
  
  card: { 
    backgroundColor: COLORS.card, 
    borderRadius: 25, 
    padding: 20, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  cardConcluido: { opacity: 0.6, borderColor: 'transparent' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  pedidoBadge: { 
    backgroundColor: COLORS.black, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
    gap: 6
  },
  mesaText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '900' },
  
  detalhes: { fontSize: 18, color: COLORS.text, fontWeight: '700', lineHeight: 24, marginBottom: 10 },
  
  recolhaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 5 },
  recolhaLabel: { fontSize: 13, color: COLORS.textSec, fontWeight: '600' },
  recolhaHora: { fontSize: 14, color: COLORS.black, fontWeight: '800' },

  footerCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7'
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  totalLabel: { fontSize: 12, color: COLORS.textSec, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '900', color: COLORS.black },

  btnPronto: { 
    backgroundColor: COLORS.orange, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderRadius: 15, 
    gap: 8,
    elevation: 2
  },
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  
  empty: { alignItems: 'center', marginTop: 100 },
  vazio: { textAlign: 'center', marginTop: 15, color: COLORS.textSec, fontWeight: '600' }
});