import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Platform, StatusBar 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/TemaContexto';

const COR_NORTON = '#FF6B00';

export default function HistoricoPedidos({ navigation }: any) {
  const { theme } = useTheme();
  
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarPedidos();
  }, []);

  async function carregarPedidos() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Vai buscar os pedidos do utilizador, ordenados do mais recente para o mais antigo
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('cliente_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPedidos(data);
      
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  }

  // Mapeamento dos estados para texto amigável e cores
  const getStatusInfo = (statusBadge: string) => {
    switch (statusBadge?.toLowerCase()) {
      case 'pendente':
        return { texto: 'Por Confirmar', corBg: '#FFF3E0', corTxt: '#E65100', icone: 'time-outline' };
      case 'confirmado':
        return { texto: 'Confirmado', corBg: '#E3F2FD', corTxt: '#1565C0', icone: 'flame-outline' };
      case 'pronto':
        return { texto: 'Pronto a Levantar', corBg: '#E8F5E9', corTxt: '#2E7D32', icone: 'bag-check-outline' };
      case 'concluido':
        return { texto: 'Concluído c/ sucesso', corBg: theme.isDark ? '#333' : '#F5F5F5', corTxt: theme.textSec, icone: 'checkmark-circle-outline' };
      default:
        return { texto: 'Por Confirmar', corBg: '#FFF3E0', corTxt: '#E65100', icone: 'time-outline' };
    }
  };

  // Formatar a data (ex: 15/05/2026 às 12:30)
  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const ano = data.getFullYear();
    const hora = data.getHours().toString().padStart(2, '0');
    const min = data.getMinutes().toString().padStart(2, '0');
    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.orange} />
      
      <View style={[styles.headerLaranja, { backgroundColor: theme.orange }]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={30} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.tituloHeader}>Histórico de Pedidos</Text>
          <View style={{ width: 30 }} />
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          
          {loading ? (
            <ActivityIndicator color={theme.orange} size="large" style={{ marginTop: 50 }} />
          ) : pedidos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={80} color={theme.border} />
              <Text style={[styles.emptyTitulo, { color: theme.text }]}>Sem pedidos</Text>
              <Text style={[styles.emptySub, { color: theme.textSec }]}>Ainda não efetuaste nenhuma encomenda de Take-Away.</Text>
            </View>
          ) : (
            pedidos.map((pedido) => {
              const statusInfo = getStatusInfo(pedido.status);
              
              return (
                <View key={pedido.id} style={[styles.cardPedido, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  
                  {/* CABEÇALHO DO CARTÃO */}
                  <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.dataPedido, { color: theme.textSec }]}>{formatarData(pedido.created_at)}</Text>
                    <View style={[styles.badgeStatus, { backgroundColor: statusInfo.corBg }]}>
                      <Ionicons name={statusInfo.icone as any} size={14} color={statusInfo.corTxt} />
                      <Text style={[styles.badgeTxt, { color: statusInfo.corTxt }]}>{statusInfo.texto}</Text>
                    </View>
                  </View>
                  
                  {/* CORPO DO CARTÃO */}
                  <View style={styles.cardBody}>
                    <View style={{ flex: 1, paddingRight: 15 }}>
                      <Text style={[styles.labelInfo, { color: theme.textSec }]}>Resumo da Encomenda:</Text>
                      <Text style={[styles.pratosTxt, { color: theme.text }]} numberOfLines={4}>
                        {pedido.prato_nome}
                      </Text>
                    </View>
                    
                    <View style={styles.boxRecolha}>
                      <Text style={[styles.labelInfo, { color: theme.textSec, textAlign: 'center' }]}>Recolha</Text>
                      <Text style={[styles.horaRecolhaTxt, { color: theme.orange }]}>{pedido.hora_recolha}</Text>
                    </View>
                  </View>
                  
                  {/* RODAPÉ DO CARTÃO */}
                  <View style={styles.cardFooter}>
                    <Text style={[styles.totalLabel, { color: theme.textSec }]}>Total Pago:</Text>
                    <Text style={[styles.totalValor, { color: theme.text }]}>{Number(pedido.total_preco).toFixed(2)}€</Text>
                  </View>

                </View>
              );
            })
          )}
          
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  container: { flex: 1 },
  
  headerLaranja: { 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingHorizontal: 20, 
    paddingBottom: 40, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40 
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tituloHeader: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  
  body: { paddingHorizontal: 20, marginTop: -20 },

  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 30 },
  emptyTitulo: { fontSize: 20, fontWeight: 'bold', marginTop: 15, marginBottom: 8 },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  cardPedido: { 
    borderRadius: 20, 
    borderWidth: 1, 
    marginBottom: 15, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 5,
    overflow: 'hidden'
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingVertical: 12, 
    borderBottomWidth: 1 
  },
  dataPedido: { fontSize: 13, fontWeight: '600' },
  badgeStatus: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 12, 
    gap: 4 
  },
  badgeTxt: { fontSize: 12, fontWeight: 'bold' },
  
  cardBody: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15 
  },
  labelInfo: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  pratosTxt: { fontSize: 14, lineHeight: 20 },
  
  boxRecolha: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'rgba(255, 107, 0, 0.05)', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderRadius: 15 
  },
  horaRecolhaTxt: { fontSize: 20, fontWeight: '900' },

  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingBottom: 15,
    gap: 8
  },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalValor: { fontSize: 18, fontWeight: 'bold' }
});