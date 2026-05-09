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
import { useTheme } from '../components/TemaContexto';

export default function PortalCriticas({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const [criticas, setCriticas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [pesquisa, setPesquisa] = useState('');
  const [ordem, setOrdem] = useState('Mais Recentes');
  const [modalOrdemVisivel, setModalOrdemVisivel] = useState(false);

  useEffect(() => {
    carregarCriticas(false);

    const subscription = supabase
      .channel('escutar-criticas')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'criticas' }, 
        () => carregarCriticas(true)
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
          setCriticas(criticasAtuais => criticasAtuais.filter(c => c.id !== id));
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
          color={i <= n ? '#FFD700' : theme.subText} 
        />
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={styles.toolsRow}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.subText} style={{marginRight: 8}} />
          <TextInput 
            style={[styles.searchInput, { color: theme.text }]} 
            placeholder="Pesquisar..." 
            placeholderTextColor={theme.subText}
            value={pesquisa} 
            onChangeText={setPesquisa} 
          />
        </View>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setModalOrdemVisivel(true)}>
          <Ionicons name="filter" size={22} color={theme.orange} />
        </TouchableOpacity>
      </View>

      {!loading && (
        <View style={[styles.statsCard, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : '#000' }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.media}</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={[styles.statLabel, { color: theme.subText }]}>Média</Text>
            </View>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: theme.subText }]}>Total Críticas</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.orange} />
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
              <Ionicons name="chatbubbles-outline" size={60} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.subText }]}>Nenhuma crítica encontrada.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : '#000' }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: theme.text }]}>{item.cliente?.nome || 'Cliente Anónimo'}</Text>
                  <View style={styles.infoRow}>
                    <Estrelas n={item.nota} />
                    <Text style={[styles.dot, { color: theme.subText }]}>•</Text>
                    <Text style={[styles.dataText, { color: theme.subText }]}>
                      {new Date(item.created_at).toLocaleDateString('pt-PT')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => apagarCritica(item.id)} style={[styles.btnTrash, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.1)' : '#FFF5F5', borderColor: isDark ? 'transparent' : '#FFE5E5' }]}>
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>

              {item.comentario ? (
                <View style={[styles.comentarioBox, { backgroundColor: theme.bg, borderColor: theme.orange }]}>
                  <Text style={[styles.comentarioText, { color: theme.text }]}>"{item.comentario}"</Text>
                </View>
              ) : null}
            </View>
          )}
        />
      )}

      <Modal visible={modalOrdemVisivel} animationType="fade" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalOrdemVisivel(false)}>
          <View style={[styles.sortModalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.sortTitle, { color: theme.text }]}>Ordenar por</Text>
            {['Mais Recentes', 'Mais Antigas', 'Nota Mais Alta', 'Nota Mais Baixa'].map((o) => (
              <TouchableOpacity key={o} style={[styles.sortOption, { borderBottomColor: theme.bg }]} onPress={() => { setOrdem(o); setModalOrdemVisivel(false); }}>
                <Text style={[styles.sortText, { color: theme.subText }, ordem === o && { color: theme.orange, fontWeight: '800' }]}>{o}</Text>
                {ordem === o && <Ionicons name="checkmark" size={20} color={theme.orange} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  toolsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 15 : 40, paddingBottom: 15, gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 14, height: 50, paddingHorizontal: 15, borderWidth: 1 }, 
  searchInput: { flex: 1, fontSize: 16 },
  filterBtn: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },

  statsCard: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'space-around', elevation: 3, shadowOpacity: 0.05, shadowRadius: 10 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '600' },
  statDivider: { width: 1, height: 40 },
  
  card: { padding: 18, borderRadius: 20, marginBottom: 15, elevation: 2, shadowOpacity: 0.04, shadowRadius: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { fontSize: 16 },
  dataText: { fontSize: 12 },
  btnTrash: { padding: 10, borderRadius: 12, borderWidth: 1 },
  comentarioBox: { marginTop: 15, padding: 15, borderRadius: 15, borderLeftWidth: 4 },
  comentarioText: { fontSize: 14, fontStyle: 'italic', lineHeight: 22 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 15, fontSize: 16, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sortModalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25 },
  sortTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20 },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
  sortText: { fontSize: 16, fontWeight: '500' }
});