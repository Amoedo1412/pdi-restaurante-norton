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
  Platform,
  TextInput,
  Modal
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
  star: '#FFD700',
  lightGray: '#E5E5EA' 
};

export default function PortalCriticas({ navigation }: any) {
  const [criticas, setCriticas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [pesquisa, setPesquisa] = useState('');
  const [ordem, setOrdem] = useState('Mais Recentes');
  const [modalOrdemVisivel, setModalOrdemVisivel] = useState(false);

  useEffect(() => {
    // 1. Carrega os dados iniciais com ecrã de loading
    carregarCriticas(false);

    // 2. Cria o tubo de escuta em tempo real (Realtime)
    const subscription = supabase
      .channel('escutar-criticas')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'criticas' }, 
        () => {
          // Se houver mudanças, atualiza a lista silenciosamente (sem o ecrã piscar)
          carregarCriticas(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function carregarCriticas(silencioso = false) {
    if (!silencioso) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('criticas')
        .select('*, cliente:perfis(nome)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCriticas(data || []);
    } catch (error: any) {
      if (!silencioso) Alert.alert('Erro', 'Não foi possível carregar as críticas.');
    } finally {
      if (!silencioso) setLoading(false);
    }
  }

  async function apagarCritica(id: string) {
    Alert.alert('Apagar', 'Remover esta crítica permanentemente?', [
      { text: 'Cancelar', style: 'cancel' }, 
      { 
        text: 'Apagar', 
        style: 'destructive', 
        onPress: async () => { 
          // ATUALIZAÇÃO OTIMISTA: Remove instantaneamente da lista atual no ecrã
          // As estatísticas (Média e Total) vão recalcular sozinhas de imediato!
          setCriticas(criticasAtuais => criticasAtuais.filter(c => c.id !== id));

          // Vai apagar à Base de Dados em segundo plano
          await supabase.from('criticas').delete().eq('id', id); 
        }
      }
    ]);
  }

  const criticasFiltradas = criticas
    .filter(c => {
      const texto = `${c.cliente?.nome || ''} ${c.comentario || ''}`.toLowerCase();
      return texto.includes(pesquisa.toLowerCase());
    })
    .sort((a, b) => {
      if (ordem === 'Mais Recentes') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (ordem === 'Mais Antigas') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (ordem === 'Nota Mais Alta') return b.nota - a.nota;
      if (ordem === 'Nota Mais Baixa') return a.nota - b.nota;
      return 0;
    });

  const stats = {
    media: criticas.length > 0 
      ? (criticas.reduce((acc, curr) => acc + curr.nota, 0) / criticas.length).toFixed(1) 
      : '0.0',
    total: criticas.length
  };

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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      <View style={styles.toolsRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.textSec} style={{marginRight: 8}} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Pesquisar..." 
            placeholderTextColor={COLORS.textSec}
            value={pesquisa} 
            onChangeText={setPesquisa} 
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setModalOrdemVisivel(true)}>
          <Ionicons name="filter" size={22} color={COLORS.orange} />
        </TouchableOpacity>
      </View>

      {!loading && (
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
          data={criticasFiltradas}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color={COLORS.border} />
              <Text style={styles.emptyText}>Nenhuma crítica encontrada.</Text>
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
                <TouchableOpacity onPress={() => apagarCritica(item.id)} style={styles.btnTrash}>
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

      <Modal visible={modalOrdemVisivel} animationType="fade" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalOrdemVisivel(false)}>
          <View style={styles.sortModalContent}>
            <Text style={styles.sortTitle}>Ordenar por</Text>
            {['Mais Recentes', 'Mais Antigas', 'Nota Mais Alta', 'Nota Mais Baixa'].map((o) => (
              <TouchableOpacity key={o} style={styles.sortOption} onPress={() => { setOrdem(o); setModalOrdemVisivel(false); }}>
                <Text style={[styles.sortText, ordem === o && styles.sortTextActive]}>{o}</Text>
                {ordem === o && <Ionicons name="checkmark" size={20} color={COLORS.orange} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  toolsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 15 : 40, paddingBottom: 15, gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 14, height: 50, paddingHorizontal: 15 }, 
  searchInput: { flex: 1, fontSize: 16, color: COLORS.text },
  filterBtn: { width: 50, height: 50, backgroundColor: COLORS.card, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },

  statsCard: { flexDirection: 'row', backgroundColor: COLORS.card, marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'space-around', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSec, fontWeight: '600' },
  statDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  
  card: { backgroundColor: COLORS.card, padding: 18, borderRadius: 20, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { color: COLORS.textSec, fontSize: 16 },
  dataText: { fontSize: 12, color: COLORS.textSec },
  btnTrash: { padding: 10, backgroundColor: '#FFF5F5', borderRadius: 12, borderWidth: 1, borderColor: '#FFE5E5' },
  comentarioBox: { marginTop: 15, padding: 15, backgroundColor: '#F9FAFB', borderRadius: 15, borderLeftWidth: 4, borderColor: COLORS.orange },
  comentarioText: { fontSize: 14, color: '#4B5563', fontStyle: 'italic', lineHeight: 22 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: COLORS.textSec, marginTop: 15, fontSize: 16, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sortModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25 },
  sortTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginBottom: 20 },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  sortText: { fontSize: 16, color: COLORS.textSec, fontWeight: '500' },
  sortTextActive: { color: COLORS.orange, fontWeight: '800' },
});