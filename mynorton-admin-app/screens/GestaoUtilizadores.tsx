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

const COLORS = { 
  bg: '#F4F6F9', 
  card: '#FFFFFF', 
  text: '#1C1C1E', 
  textSec: '#8E8E93', 
  orange: '#FF6B00', 
  border: '#E5E5EA', 
  orangeLight: '#FFF0E5',
  red: '#FF3B30',
  blue: '#007AFF', 
  lightGray: '#E5E5EA', 
  overlay: 'rgba(0,0,0,0.5)' 
};

export default function GestaoUtilizadores({ navigation }: any) {
  const [utilizadores, setUtilizadores] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [meuId, setMeuId] = useState<string | null>(null); 
  
  const [ordem, setOrdem] = useState('Cargo');
  const [modalOrdemVisivel, setModalOrdemVisivel] = useState(false);

  const [modalVisivel, setModalVisivel] = useState(false);
  const [userSelecionado, setUserSelecionado] = useState<any>(null);

  useEffect(() => { 
    // Descobrir quem é o utilizador autenticado
    async function obterMeuId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setMeuId(user.id);
    }
    obterMeuId();

    carregarUtilizadores(false); 

    // O "Tubo de Escuta" em Tempo Real (Realtime)
    const subscription = supabase
      .channel('escutar-perfis')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'perfis' }, 
        () => {
          carregarUtilizadores(true); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
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
    // Bloqueia a mudança de cargo se fores tu próprio
    if (!userSelecionado || userSelecionado.tipo_utilizador === novoCargo || userSelecionado.id === meuId) return;

    Alert.alert(
      'Confirmar Alteração',
      `Desejas mesmo alterar o cargo de ${userSelecionado.nome || 'este utilizador'} para ${novoCargo.toUpperCase()}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            // 1. Atualização Otimista no Modal
            setUserSelecionado({ ...userSelecionado, tipo_utilizador: novoCargo });
            
            // 2. Atualização Otimista Instantânea na Lista Principal
            setUtilizadores(prev => prev.map(u => 
              u.id === userSelecionado.id ? { ...u, tipo_utilizador: novoCargo } : u
            ));

            // 3. Atualiza na Base de Dados (em background)
            await supabase.from('perfis').update({ tipo_utilizador: novoCargo }).eq('id', userSelecionado.id);
          } 
        }
      ]
    );
  }

  async function apagarUtilizador() {
    // Dupla proteção de segurança
    if (!userSelecionado || userSelecionado.id === meuId) return;

    Alert.alert('Apagar Utilizador', `Tens a certeza que queres eliminar permanentemente a conta de ${userSelecionado.nome || 'este utilizador'}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Apagar', 
        style: 'destructive', 
        onPress: async () => { 
          const idParaApagar = userSelecionado.id;
          setModalVisivel(false);
          
          // Atualização Otimista Instantânea na Lista Principal
          setUtilizadores(prev => prev.filter(u => u.id !== idParaApagar));
          
          // Apaga na Base de Dados (em background)
          await supabase.from('perfis').delete().eq('id', idParaApagar);
        }
      }
    ]);
  }

  const formatarData = (dataString: string) => {
    if (!dataString) return 'Não definido';
    return new Date(dataString).toLocaleDateString('pt-PT');
  };

  // Lógica de Filtragem e Ordenação em Tempo Real
  const utilizadoresFiltrados = utilizadores
    .filter(u => 
      (u.nome?.toLowerCase().includes(busca.toLowerCase())) || 
      (u.email?.toLowerCase().includes(busca.toLowerCase()))
    )
    .sort((a, b) => {
      // REGRA SUPREMA: O teu utilizador fica SEMPRE no topo da lista
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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={styles.toolsRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.textSec} style={{marginRight: 8}} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Pesquisar utilizador..." 
            placeholderTextColor={COLORS.textSec}
            value={busca} 
            onChangeText={setBusca} 
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setModalOrdemVisivel(true)}>
          <Ionicons name="filter" size={22} color={COLORS.orange} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.orange} />
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
              <Ionicons name="people-outline" size={60} color={COLORS.border} />
              <Text style={styles.emptyText}>Nenhum utilizador encontrado.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isAdmin = item.tipo_utilizador === 'admin';
            const isFunc = item.tipo_utilizador === 'funcionario';
            const souEu = item.id === meuId;
            
            return (
              <TouchableOpacity 
                style={[styles.cardUser, souEu && { borderColor: COLORS.orange, borderWidth: 1.5 }]} 
                onPress={() => abrirModalUser(item)} 
                activeOpacity={0.7}
              >
                <View style={[
                  styles.userBadge, 
                  isAdmin && { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
                  isFunc && { backgroundColor: COLORS.blue, borderColor: COLORS.blue }
                ]}>
                  <Text style={[styles.txtRole, (isAdmin || isFunc) && { color: '#FFF' }]}>
                    {isAdmin ? 'ADM' : isFunc ? 'FUN' : 'CLI'}
                  </Text>
                </View>
                
                <View style={styles.infoUser}>
                  <Text style={styles.nomeUser}>
                    {item.nome || 'Sem Nome'} 
                    {souEu && <Text style={{ color: COLORS.orange }}> (Tu)</Text>}
                  </Text>
                  <Text style={styles.emailUser}>{item.email}</Text>
                </View>

                <View style={styles.pontosBox}>
                  <Text style={styles.txtPontosNumber}>{item.pontos || 0}</Text>
                  <Text style={styles.txtPontosLabel}>PTS</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* MODAL DE ORDENAMENTO PADRONIZADO */}
      <Modal visible={modalOrdemVisivel} animationType="fade" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalOrdemVisivel(false)}>
          <View style={styles.sortModalContent}>
            <Text style={styles.sortTitle}>Ordenar por</Text>
            {['Cargo', 'Mais Recentes', 'Mais Antigos', 'Nome (A-Z)'].map((o) => (
              <TouchableOpacity key={o} style={styles.sortOption} onPress={() => { setOrdem(o); setModalOrdemVisivel(false); }}>
                <Text style={[styles.sortText, ordem === o && styles.sortTextActive]}>{o}</Text>
                {ordem === o && <Ionicons name="checkmark" size={20} color={COLORS.orange} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL DA FICHA DO UTILIZADOR */}
      <Modal visible={modalVisivel} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <View style={{width: 30}}/>
              <Text style={styles.modalTitle}>Ficha de Utilizador</Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)}>
                <Ionicons name="close" size={26} color={COLORS.textSec} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              
              <View style={styles.perfilInfo}>
                <Ionicons name="person-circle-outline" size={80} color={COLORS.border} />
                <Text style={styles.modalNome}>
                  {userSelecionado?.nome || 'Utilizador s/ nome'}
                  {userSelecionado?.id === meuId && <Text style={{ color: COLORS.orange }}> (Tu)</Text>}
                </Text>
                <View style={styles.badgePontosModal}>
                  <Ionicons name="star" size={14} color={COLORS.orange} />
                  <Text style={styles.txtPontosModal}>{userSelecionado?.pontos || 0} Pontos</Text>
                </View>
              </View>

              <Text style={styles.sectionLabel}>Dados Pessoais</Text>
              <View style={styles.dadosContainer}>
                <View style={styles.dadoRow}>
                  <Text style={styles.dadoLabel}>Email:</Text>
                  <Text style={styles.dadoValor}>{userSelecionado?.email}</Text>
                </View>
                <View style={styles.dividerFino} />
                <View style={styles.dadoRow}>
                  <Text style={styles.dadoLabel}>Telemóvel:</Text>
                  <Text style={styles.dadoValor}>{userSelecionado?.telemovel || 'N/A'}</Text>
                </View>
                <View style={styles.dividerFino} />
                <View style={styles.dadoRow}>
                  <Text style={styles.dadoLabel}>Data Nasc.:</Text>
                  <Text style={styles.dadoValor}>{formatarData(userSelecionado?.data_nascimento)}</Text>
                </View>
                <View style={styles.dividerFino} />
                <View style={styles.dadoRow}>
                  <Text style={styles.dadoLabel}>Sexo:</Text>
                  <Text style={styles.dadoValor}>{userSelecionado?.sexo || 'N/A'}</Text>
                </View>
                <View style={styles.dividerFino} />
                <View style={styles.dadoRow}>
                  <Text style={styles.dadoLabel}>Membro desde:</Text>
                  <Text style={styles.dadoValor}>{formatarData(userSelecionado?.criado_em)}</Text>
                </View>
              </View>

              <Text style={styles.sectionLabel}>Gerir Permissões</Text>
              <View style={[styles.rolesContainer, userSelecionado?.id === meuId && { opacity: 0.5 }]}>
                {['cliente', 'funcionario', 'admin'].map((cargo) => {
                  const ativo = userSelecionado?.tipo_utilizador === cargo;
                  return (
                    <TouchableOpacity 
                      key={cargo} 
                      onPress={() => confirmarMudarCargo(cargo)}
                      disabled={userSelecionado?.id === meuId} // Bloqueia cliques se fores tu
                      style={[styles.roleBtn, ativo && styles.roleBtnAtivo]}
                    >
                      <Text style={[styles.txtRoleBtn, ativo && styles.txtRoleBtnAtivo]}>
                        {cargo.charAt(0).toUpperCase() + cargo.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <View style={styles.divider} />

              {/* Botão de Apagar (Escondido se fores tu) */}
              {userSelecionado?.id !== meuId ? (
                <TouchableOpacity style={styles.btnDelete} onPress={apagarUtilizador}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.red} />
                  <Text style={styles.txtDelete}>Apagar Conta Permanentemente</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.btnDelete, { borderColor: 'transparent', backgroundColor: 'transparent' }]}>
                  <Text style={{ color: COLORS.textSec, fontSize: 13, textAlign: 'center' }}>Não podes apagar ou editar a tua própria conta aqui.</Text>
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
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGray, borderRadius: 14, height: 50, paddingHorizontal: 15 }, 
  searchInput: { flex: 1, fontSize: 16, color: COLORS.text },
  filterBtn: { width: 50, height: 50, backgroundColor: COLORS.card, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cardUser: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 18, borderRadius: 20, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, alignItems: 'center' },
  userBadge: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 15, backgroundColor: COLORS.bg },
  txtRole: { fontSize: 11, fontWeight: '900', color: COLORS.textSec },
  infoUser: { flex: 1 },
  nomeUser: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emailUser: { fontSize: 12, color: COLORS.textSec, marginTop: 2 },
  pontosBox: { alignItems: 'flex-end', marginLeft: 10 },
  txtPontosNumber: { fontSize: 20, fontWeight: '900', color: COLORS.orange },
  txtPontosLabel: { fontSize: 10, color: COLORS.textSec, fontWeight: '800', marginTop: -2 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: COLORS.textSec, marginTop: 15, fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sortModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25 },
  sortTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginBottom: 20 },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  sortText: { fontSize: 16, color: COLORS.textSec, fontWeight: '500' },
  sortTextActive: { color: COLORS.orange, fontWeight: '800' },
  modalBox: { width: '100%', backgroundColor: COLORS.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 25, paddingTop: 25, maxHeight: '90%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  perfilInfo: { alignItems: 'center', marginBottom: 25 },
  modalNome: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 5 },
  badgePontosModal: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.orangeLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 10, gap: 5 },
  txtPontosModal: { color: COLORS.orange, fontWeight: '800', fontSize: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: COLORS.textSec, textTransform: 'uppercase', marginBottom: 10 },
  dadosContainer: { backgroundColor: COLORS.bg, borderRadius: 15, padding: 15, marginBottom: 25, borderWidth: 1, borderColor: COLORS.border },
  dadoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  dadoLabel: { fontSize: 14, color: COLORS.textSec, fontWeight: '600' },
  dadoValor: { fontSize: 14, color: COLORS.text, fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 10 },
  dividerFino: { height: 1, backgroundColor: COLORS.border, marginVertical: 2 },
  rolesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
  roleBtn: { flex: 1, paddingVertical: 12, backgroundColor: COLORS.bg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  roleBtnAtivo: { backgroundColor: COLORS.orangeLight, borderColor: COLORS.orange },
  txtRoleBtn: { fontWeight: '700', color: COLORS.textSec, fontSize: 13 },
  txtRoleBtnAtivo: { color: COLORS.orange, fontWeight: '900' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
  btnDelete: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5F5', padding: 18, borderRadius: 14, borderWidth: 1, borderColor: '#FFE5E5', gap: 10, marginBottom: 20 },
  txtDelete: { color: COLORS.red, fontWeight: '800', fontSize: 15 }
});