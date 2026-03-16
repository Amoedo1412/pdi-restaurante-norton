import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  StatusBar, 
  Platform 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { 
  bg: '#F4F6F9', 
  card: '#FFFFFF', 
  text: '#1C1C1E', 
  textSec: '#8E8E93', 
  orange: '#FF6B00', 
  border: '#E5E5EA', 
  red: '#FF3B30',
  star: '#FFD700'
};

export default function PortalCriticas({ navigation }: any) {
  const [criticas, setCriticas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ media: 0, total: 0 });

  useEffect(() => {
    carregarCriticas();
  }, []);

  async function carregarCriticas() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('criticas')
        .select('*, cliente:perfis(nome)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const lista = data || [];
      setCriticas(lista);

      // Calcular estatísticas simples
      if (lista.length > 0) {
        const soma = lista.reduce((acc, curr) => acc + curr.nota, 0);
        setStats({
          media: parseFloat((soma / lista.length).toFixed(1)),
          total: lista.length
        });
      }
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível carregar as críticas.');
    } finally {
      setLoading(false);
    }
  }

  async function apagarCritica(id: string) {
    Alert.alert('Apagar', 'Remover esta crítica permanentemente?', [
      { text: 'Cancelar', style: 'cancel' }, 
      { 
        text: 'Apagar', 
        style: 'destructive', 
        onPress: async () => { 
          await supabase.from('criticas').delete().eq('id', id); 
          carregarCriticas(); 
        }
      }
    ]);
  }

  const Estrelas = ({ n }: { n: number }) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons 
          key={i} 
          name={i <= n ? "star" : "star-outline"} 
          size={14} 
          color={i <= n ? COLORS.star : COLORS.textSec} 
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
      
      {/* Cabeçalho Melhorado */}
      <View style={styles.header}>
        
        <Text style={styles.tituloHeader}>Avaliações</Text>
        
        <TouchableOpacity onPress={carregarCriticas} style={styles.headerBtn}>
          <Ionicons name="refresh" size={24} color={COLORS.orange} />
        </TouchableOpacity>
      </View>

      {/* Card de Resumo de Estatísticas */}
      {!loading && criticas.length > 0 && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.media}</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Ionicons name="star" size={14} color={COLORS.star} />
              <Text style={styles.statLabel}>Média</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Críticas</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.orange} />
        </View>
      ) : (
        <FlatList
          data={criticas}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color={COLORS.border} />
              <Text style={styles.emptyText}>Ainda não recebeste críticas.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{item.cliente?.nome || 'Cliente Anónimo'}</Text>
                  <View style={styles.infoRow}>
                    <Estrelas n={item.nota} />
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.dataText}>
                      {new Date(item.created_at).toLocaleDateString('pt-PT')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => apagarCritica(item.id)} 
                  style={styles.btnTrash}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.red} />
                </TouchableOpacity>
              </View>

              {item.comentario ? (
                <View style={styles.comentarioBox}>
                  <Text style={styles.comentarioText}>"{item.comentario}"</Text>
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 15, 
    backgroundColor: COLORS.card, 
    borderBottomWidth: 1, 
    borderColor: COLORS.border 
  },
  headerBtn: {
    padding: 5,
    width: 40,
    alignItems: 'center'
  },
  tituloHeader: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    margin: 20,
    marginBottom: 5,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSec, fontWeight: '600' },
  statDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  card: { 
    backgroundColor: COLORS.card, 
    padding: 18, 
    borderRadius: 20, 
    marginBottom: 15, 
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { color: COLORS.textSec, fontSize: 16 },
  dataText: { fontSize: 12, color: COLORS.textSec },
  btnTrash: { 
    padding: 10, 
    backgroundColor: '#FFF5F5', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE5E5' 
  },
  comentarioBox: { 
    marginTop: 15, 
    padding: 15, 
    backgroundColor: '#F9FAFB', 
    borderRadius: 15, 
    borderLeftWidth: 4, 
    borderColor: COLORS.orange 
  },
  comentarioText: { 
    fontSize: 14, 
    color: '#4B5563', 
    fontStyle: 'italic', 
    lineHeight: 22 
  },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: COLORS.textSec, marginTop: 15, fontSize: 16, fontWeight: '600' }
});