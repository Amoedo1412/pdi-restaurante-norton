import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  StatusBar, 
  Platform, 
  Modal,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/TemaContexto';

export default function GestaoUtilizadores({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const [utilizadores, setUtilizadores] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [meuId, setMeuId] = useState<string | null>(null); 
  
  const [ordem, setOrdem] = useState('Cargo');
  const [modalOrdemVisivel, setModalOrdemVisivel] = useState(false);

  const [modalVisivel, setModalVisivel] = useState(false);
  const [userSelecionado, setUserSelecionado] = useState<any>(null);

  useEffect(() => { 
    async function obterMeuId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setMeuId(user.id);
    }
    obterMeuId();

    carregarUtilizadores(false); 

    const subscription = supabase
      .channel('escutar-perfis')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'perfis' }, 
        () => { carregarUtilizadores(true); }
      )
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  async function carregarUtilizadores(silencioso = false) {
    if (!silencioso) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .order('criado_em', { ascending: false });

      if (!error && data) {
        setUtilizadores(data);
      }
    } catch (err) {
      console.log(err);
    } finally {
      if (!silencioso) setLoading(false);
    }
  }

  function abrirModalUser(user: any) {
    setUserSelecionado(user); 
    setModalVisivel(true);
  }

  function confirmarMudarCargo(novoCargo: string) {
    if (!userSelecionado || userSelecionado.tipo_utilizador === novoCargo || userSelecionado.id === meuId) return;

    Alert.alert(
      'Confirmar Alteração',
      `Desejas mesmo alterar o cargo de ${userSelecionado.nome || 'este utilizador'} para ${novoCargo.toUpperCase()}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            setUserSelecionado({ ...userSelecionado, tipo_utilizador: novoCargo });
            setUtilizadores(prev => prev.map(u => 
              u.id === userSelecionado.id ? { ...u, tipo_utilizador: novoCargo } : u
            ));
            await supabase.from('perfis').update({ tipo_utilizador: novoCargo }).eq('id', userSelecionado.id);
          } 
        }
      ]
    );
  }

  async function apagarUtilizador() {
    if (!userSelecionado || userSelecionado.id === meuId) return;

    Alert.alert('Apagar Utilizador', `Tens a certeza que queres eliminar permanentemente a conta de ${userSelecionado.nome || 'este utilizador'}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Apagar', 
        style: 'destructive', 
        onPress: async () => { 
          const idParaApagar = userSelecionado.id;
          setModalVisivel(false);
          
          // 1. Atualização Otimista: Tira logo da lista no ecrã
          setUtilizadores(prev => prev.filter(u => u.id !== idParaApagar));
          
          // 2. Chama a função poderosa do SQL que criámos para apagar o login
          const { error } = await supabase.rpc('apagar_utilizador_auth', { uid: idParaApagar });
          
          if (error) {
            Alert.alert("Erro", "Não foi possível apagar o login do utilizador.");
            carregarUtilizadores(true); // Recarrega a lista se falhar
          }
        }
      }
    ]);
  }

  const formatarData = (dataString: string) => {
    if (!dataString) return 'Não definido';
    return new Date(dataString).toLocaleDateString('pt-PT');
  };

  const utilizadoresFiltrados = utilizadores
    .filter(u => 
      (u.nome?.toLowerCase().includes(busca.toLowerCase())) || 
      (u.email?.toLowerCase().includes(busca.toLowerCase()))
    )
    .sort((a, b) => {
      if (a.id === meuId) return -1;
      if (b.id === meuId) return 1;
      if (ordem === 'Cargo') {
        const peso: any = { admin: 1, funcionario: 2, cliente: 3 };
        return (peso[a.tipo_utilizador] || 4) - (peso[b.tipo_utilizador] || 4);
      }
      if (ordem === 'Nome (A-Z)') return (a.nome || '').localeCompare(b.nome || '');
      if (ordem === 'Mais Recentes') return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
      if (ordem === 'Mais Antigos') return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
      return 0;
    });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.toolsRow}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.subText} style={{marginRight: 8}} />
          <TextInput 
            style={[styles.searchInput, { color: theme.text }]} 
            placeholder="Pesquisar utilizador..." 
            placeholderTextColor={theme.subText}
            value={busca} 
            onChangeText={setBusca} 
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setModalOrdemVisivel(true)}>
          <Ionicons name="filter" size={22} color={theme.orange} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.orange} />
        </View>
      ) : (
        <FlatList
          data={utilizadoresFiltrados} 
          keyExtractor={(item) => item.id} 
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.subText }]}>Nenhum utilizador encontrado.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isAdmin = item.tipo_utilizador === 'admin';
            const isFunc = item.tipo_utilizador === 'funcionario';
            const souEu = item.id === meuId;
            
            return (
              <TouchableOpacity 
                style={[styles.cardUser, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : '#000' }, souEu && { borderColor: theme.orange, borderWidth: 1.5 }]} 
                onPress={() => abrirModalUser(item)} 
                activeOpacity={0.7}
              >
                <View style={[
                  styles.userBadge, 
                  { backgroundColor: theme.bg, borderColor: theme.border },
                  isAdmin && { backgroundColor: theme.orange, borderColor: theme.orange },
                  isFunc && { backgroundColor: '#007AFF', borderColor: '#007AFF' }
                ]}>
                  <Text style={[styles.txtRole, { color: theme.subText }, (isAdmin || isFunc) && { color: '#FFF' }]}>
                    {isAdmin ? 'ADM' : isFunc ? 'FUN' : 'CLI'}
                  </Text>
                </View>
                
                <View style={styles.infoUser}>
                  <Text style={[styles.nomeUser, { color: theme.text }]}>
                    {item.nome || 'Sem Nome'} 
                    {souEu && <Text style={{ color: theme.orange }}> (Tu)</Text>}
                  </Text>
                  <Text style={[styles.emailUser, { color: theme.subText }]}>{item.email || 'Sem e-mail'}</Text>
                </View>

                <View style={styles.pontosBox}>
                  <Text style={[styles.txtPontosNumber, { color: theme.orange }]}>{item.pontos || 0}</Text>
                  <Text style={[styles.txtPontosLabel, { color: theme.subText }]}>PTS</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={modalOrdemVisivel} animationType="fade" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalOrdemVisivel(false)}>
          <View style={[styles.sortModalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.sortTitle, { color: theme.text }]}>Ordenar por</Text>
            {['Cargo', 'Mais Recentes', 'Mais Antigos', 'Nome (A-Z)'].map((o) => (
              <TouchableOpacity key={o} style={[styles.sortOption, { borderBottomColor: theme.bg }]} onPress={() => { setOrdem(o); setModalOrdemVisivel(false); }}>
                <Text style={[styles.sortText, { color: theme.subText }, ordem === o && { color: theme.orange, fontWeight: '800' }]}>{o}</Text>
                {ordem === o && <Ionicons name="checkmark" size={20} color={theme.orange} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalVisivel} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{width: 30}}/>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Ficha de Utilizador</Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)}>
                <Ionicons name="close" size={26} color={theme.subText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              
              <View style={styles.perfilInfo}>
                <Ionicons name="person-circle-outline" size={80} color={theme.border} />
                <Text style={[styles.modalNome, { color: theme.text }]}>
                  {userSelecionado?.nome || 'Utilizador s/ nome'}
                  {userSelecionado?.id === meuId && <Text style={{ color: theme.orange }}> (Tu)</Text>}
                </Text>
                <View style={[styles.badgePontosModal, { backgroundColor: theme.iconBg }]}>
                  <Ionicons name="star" size={14} color={theme.orange} />
                  <Text style={[styles.txtPontosModal, { color: theme.orange }]}>{userSelecionado?.pontos || 0} Pontos</Text>
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: theme.subText }]}>Dados Pessoais</Text>
              <View style={[styles.dadosContainer, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <View style={styles.dadoRow}>
                  <Text style={[styles.dadoLabel, { color: theme.subText }]}>Email:</Text>
                  <Text style={[styles.dadoValor, { color: theme.text }]}>{userSelecionado?.email}</Text>
                </View>
                <View style={[styles.dividerFino, { backgroundColor: theme.border }]} />
                <View style={styles.dadoRow}>
                  <Text style={[styles.dadoLabel, { color: theme.subText }]}>Telemóvel:</Text>
                  <Text style={[styles.dadoValor, { color: theme.text }]}>{userSelecionado?.telemovel || 'N/A'}</Text>
                </View>
                <View style={[styles.dividerFino, { backgroundColor: theme.border }]} />
                <View style={styles.dadoRow}>
                  <Text style={[styles.dadoLabel, { color: theme.subText }]}>Data Nasc.:</Text>
                  <Text style={[styles.dadoValor, { color: theme.text }]}>{formatarData(userSelecionado?.data_nascimento)}</Text>
                </View>
                <View style={[styles.dividerFino, { backgroundColor: theme.border }]} />
                <View style={styles.dadoRow}>
                  <Text style={[styles.dadoLabel, { color: theme.subText }]}>Sexo:</Text>
                  <Text style={[styles.dadoValor, { color: theme.text }]}>{userSelecionado?.sexo || 'N/A'}</Text>
                </View>
                <View style={[styles.dividerFino, { backgroundColor: theme.border }]} />
                <View style={styles.dadoRow}>
                  <Text style={[styles.dadoLabel, { color: theme.subText }]}>Membro desde:</Text>
                  <Text style={[styles.dadoValor, { color: theme.text }]}>{formatarData(userSelecionado?.criado_em)}</Text>
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: theme.subText }]}>Gerir Permissões</Text>
              <View style={[styles.rolesContainer, userSelecionado?.id === meuId && { opacity: 0.5 }]}>
                {['cliente', 'funcionario', 'admin'].map((cargo) => {
                  const ativo = userSelecionado?.tipo_utilizador === cargo;
                  return (
                    <TouchableOpacity 
                      key={cargo} 
                      onPress={() => confirmarMudarCargo(cargo)}
                      disabled={userSelecionado?.id === meuId}
                      style={[styles.roleBtn, { backgroundColor: theme.bg, borderColor: theme.border }, ativo && { backgroundColor: theme.iconBg, borderColor: theme.orange }]}
                    >
                      <Text style={[styles.txtRoleBtn, { color: theme.subText }, ativo && { color: theme.orange, fontWeight: '900' }]}>
                        {cargo.charAt(0).toUpperCase() + cargo.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {userSelecionado?.id !== meuId ? (
                <TouchableOpacity style={[styles.btnDelete, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.1)' : '#FFF5F5', borderColor: isDark ? 'transparent' : '#FFE5E5' }]} onPress={apagarUtilizador}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  <Text style={styles.txtDelete}>Apagar Conta Permanentemente</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.btnDelete, { borderColor: 'transparent', backgroundColor: 'transparent' }]}>
                  <Text style={{ color: theme.subText, fontSize: 13, textAlign: 'center' }}>Não podes apagar ou editar a tua própria conta aqui.</Text>
                </View>
              )}

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 14, height: 50, paddingHorizontal: 15, borderWidth: 1 }, 
  searchInput: { flex: 1, fontSize: 16 },
  filterBtn: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  cardUser: { flexDirection: 'row', padding: 18, borderRadius: 20, marginBottom: 12, elevation: 2, shadowOpacity: 0.04, shadowRadius: 8, alignItems: 'center' },
  userBadge: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  txtRole: { fontSize: 11, fontWeight: '900' },
  infoUser: { flex: 1 },
  nomeUser: { fontSize: 16, fontWeight: '700' },
  emailUser: { fontSize: 12, marginTop: 2 },
  pontosBox: { alignItems: 'flex-end', marginLeft: 10 },
  txtPontosNumber: { fontSize: 20, fontWeight: '900' },
  txtPontosLabel: { fontSize: 10, fontWeight: '800', marginTop: -2 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 15, fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sortModalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25 },
  sortTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20 },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
  sortText: { fontSize: 16, fontWeight: '500' },
  sortTextActive: { fontWeight: '800' },
  modalBox: { width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 25, paddingTop: 25, maxHeight: '90%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  perfilInfo: { alignItems: 'center', marginBottom: 25 },
  modalNome: { fontSize: 22, fontWeight: '800', marginTop: 5 },
  badgePontosModal: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 10, gap: 5 },
  txtPontosModal: { fontWeight: '800', fontSize: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', marginBottom: 10 },
  dadosContainer: { borderRadius: 15, padding: 15, marginBottom: 25, borderWidth: 1 },
  dadoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  dadoLabel: { fontSize: 14, fontWeight: '600' },
  dadoValor: { fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 10 },
  dividerFino: { height: 1, marginVertical: 2 },
  rolesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
  roleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  txtRoleBtn: { fontWeight: '700', fontSize: 13 },
  divider: { height: 1, marginVertical: 15 },
  btnDelete: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 14, borderWidth: 1, gap: 10, marginBottom: 20 },
  txtDelete: { color: '#FF3B30', fontWeight: '800', fontSize: 15 }
});