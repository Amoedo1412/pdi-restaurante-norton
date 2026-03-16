import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, StatusBar, Platform, Modal } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { bg: '#F4F6F9', card: '#FFFFFF', text: '#1C1C1E', textSec: '#8E8E93', orange: '#FF6B00', border: '#E5E5EA', orangeLight: '#FFF0E5', overlay: 'rgba(0,0,0,0.5)' };

export default function GestaoUtilizadores({ navigation }: any) {
  const [utilizadores, setUtilizadores] = useState<any[]>([]);
  const [listaFiltrada, setListaFiltrada] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [userSelecionado, setUserSelecionado] = useState<any>(null);
  const [novosPontos, setNovosPontos] = useState('');

  useEffect(() => { carregarUtilizadores(); }, []);
  
  useEffect(() => {
    setListaFiltrada(utilizadores.filter(u => 
      (u.nome?.toLowerCase().includes(busca.toLowerCase())) || (u.email?.toLowerCase().includes(busca.toLowerCase()))
    ));
  }, [busca, utilizadores]);

  async function carregarUtilizadores() {
    setLoading(true);
    const { data } = await supabase.from('perfis').select('*').order('role').order('nome');
    setUtilizadores(data || []); setListaFiltrada(data || []); setLoading(false);
  }

  async function alternarCargo(id: string, roleAtual: string) {
    const novoCargo = roleAtual === 'admin' ? 'cliente' : 'admin';
    Alert.alert('Cargo', `Mudar para ${novoCargo.toUpperCase()}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Alterar', onPress: async () => { await supabase.from('perfis').update({ role: novoCargo }).eq('id', id); carregarUtilizadores(); } }
    ]);
  }

  function abrirModalPontos(user: any) {
    setUserSelecionado(user); setNovosPontos(String(user.pontos || 0)); setModalVisivel(true);
  }

  async function guardarPontos() {
    const pontosNum = parseInt(novosPontos, 10);
    if (!isNaN(pontosNum)) {
      await supabase.from('perfis').update({ pontos: pontosNum }).eq('id', userSelecionado.id);
      setModalVisivel(false); carregarUtilizadores();
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
      
      <View style={styles.header}>
        <Text style={styles.tituloHeader}>Base de Clientes</Text>
        <TouchableOpacity onPress={carregarUtilizadores}>
          <Ionicons name="refresh" size={24} color={COLORS.orange} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSec} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput} placeholder="Pesquisar..." placeholderTextColor={COLORS.textSec}
          value={busca} onChangeText={setBusca} autoCapitalize="none"
        />
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.orange} style={{ marginTop: 50 }} /> : (
        <FlatList
          data={listaFiltrada} keyExtractor={(item) => item.id} contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.cardUser}>
              <View style={[styles.userBadge, item.role === 'admin' && { backgroundColor: COLORS.orange }]}>
                <Text style={[styles.txtRole, item.role === 'admin' && { color: '#FFF' }]}>
                  {item.role === 'admin' ? 'ADM' : 'USR'}
                </Text>
              </View>
              
              <View style={styles.infoUser}>
                <Text style={styles.nomeUser}>{item.nome || 'Sem Nome'}</Text>
                <Text style={styles.emailUser}>{item.email}</Text>
              </View>

              <TouchableOpacity style={styles.pontosBox} onPress={() => abrirModalPontos(item)}>
                <Text style={styles.txtPontosNumber}>{item.pontos || 0}</Text>
                <Text style={styles.txtPontosLabel}>PTS</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => alternarCargo(item.id, item.role)} style={styles.btnSettings}>
                <Ionicons name="settings-outline" size={20} color={COLORS.textSec} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Editar Pontos</Text>
            <Text style={styles.modalSub}>{userSelecionado?.email}</Text>
            
            <TextInput
              style={styles.modalInput} keyboardType="number-pad" value={novosPontos} onChangeText={setNovosPontos} selectTextOnFocus
            />
            
            <View style={styles.modalBotoes}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalVisivel(false)}><Text style={styles.txtCancelar}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnGuardar} onPress={guardarPontos}><Text style={styles.txtGuardar}>Guardar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 15, backgroundColor: COLORS.card, borderBottomWidth: 1, borderColor: COLORS.border },
  tituloHeader: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, margin: 20, marginBottom: 0, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: Platform.OS === 'web' ? 12 : 15, fontSize: 15, color: COLORS.text, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  cardUser: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 15, borderRadius: 14, marginBottom: 10, elevation: 1, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  userBadge: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 15, backgroundColor: COLORS.bg },
  txtRole: { fontSize: 10, fontWeight: '900', color: COLORS.textSec },
  infoUser: { flex: 1 },
  nomeUser: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  emailUser: { fontSize: 12, color: COLORS.textSec, marginTop: 2 },
  pontosBox: { alignItems: 'flex-end', marginRight: 15, paddingLeft: 10, borderLeftWidth: 1, borderColor: COLORS.border },
  txtPontosNumber: { fontSize: 18, fontWeight: '900', color: COLORS.orange },
  txtPontosLabel: { fontSize: 9, color: COLORS.textSec, fontWeight: 'bold' },
  btnSettings: { padding: 5 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', padding: 20 },
  modalBox: { width: '100%', backgroundColor: COLORS.card, borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  modalSub: { fontSize: 12, color: COLORS.textSec, marginTop: 5, marginBottom: 25 },
  modalInput: { width: '100%', backgroundColor: COLORS.bg, color: COLORS.orange, borderRadius: 12, padding: 15, fontSize: 28, textAlign: 'center', fontWeight: '900', marginBottom: 25, borderWidth: 1, borderColor: COLORS.border, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  modalBotoes: { flexDirection: 'row', gap: 10, width: '100%' },
  btnCancelar: { flex: 1, backgroundColor: COLORS.bg, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  txtCancelar: { fontWeight: 'bold', color: COLORS.textSec },
  btnGuardar: { flex: 1, backgroundColor: COLORS.orange, padding: 16, borderRadius: 12, alignItems: 'center' },
  txtGuardar: { fontWeight: 'bold', color: '#FFF' }
});