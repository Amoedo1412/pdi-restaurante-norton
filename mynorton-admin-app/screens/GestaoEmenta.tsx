import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Alert, StatusBar, ScrollView, Platform, Image, Modal, TextInput 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { 
  bg: '#F4F6F9', card: '#FFFFFF', text: '#1C1C1E', 
  textSec: '#8E8E93', orange: '#FF6B00', border: '#E5E5EA', 
  orangeLight: '#FFF0E5', red: '#FF3B30', redLight: '#FFE5E5',
  blue: '#007AFF'
};

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const SEMANAS = [
  { id: 1, label: 'Esta Semana' },
  { id: 2, label: 'Próxima' }
];

const MAPA_DIAS: Record<string, string> = {
  'Segunda': 'Seg', 'Terça': 'Ter', 'Quarta': 'Qua', 
  'Quinta': 'Qui', 'Sexta': 'Sex', 'Sábado': 'Sab', 'Domingo': 'Dom'
};

export default function GestaoEmenta() {
  const [semanaSelecionada, setSemanaSelecionada] = useState(1);
  const [diaSelecionado, setDiaSelecionado] = useState('Segunda');
  const [pratos, setPratos] = useState<any[]>([]);
  const [ementaIDs, setEmentaIDs] = useState<string[]>([]);
  const [diaFechado, setDiaFechado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [pesquisa, setPesquisa] = useState('');

  useEffect(() => { carregarPratos(); }, []);
  useEffect(() => { carregarDadosDoDia(); }, [diaSelecionado, semanaSelecionada]);

  async function carregarPratos() {
    try {
      const { data } = await supabase.from('pratos').select('*').order('categoria').order('nome');
      setPratos(data || []);
    } catch (e) { Alert.alert("Erro", "Falha ao carregar catálogo."); }
  }

  async function carregarDadosDoDia() {
    setLoading(true);
    setPesquisa('');
    try {
      const { data: restData } = await supabase.from('restaurante').select('horario_json').eq('id', 1).single();
      if (restData?.horario_json) {
        const chaveDia = MAPA_DIAS[diaSelecionado];
        setDiaFechado(!(restData.horario_json[chaveDia]?.aberto ?? true));
      }
      const { data } = await supabase.from('ementas').select('prato_id').eq('dia_semana', diaSelecionado).eq('semana_ref', semanaSelecionada);
      setEmentaIDs(data ? data.map(e => String(e.prato_id)) : []);
    } catch (e) { Alert.alert("Erro", "Erro ao carregar dados."); } 
    finally { setLoading(false); }
  }

  async function togglePrato(pratoId: string) {
    if (diaFechado) return;
    const isAtivo = ementaIDs.includes(String(pratoId));
    try {
      if (isAtivo) {
        setEmentaIDs(prev => prev.filter(id => id !== String(pratoId)));
        await supabase.from('ementas').delete().eq('dia_semana', diaSelecionado).eq('prato_id', pratoId).eq('semana_ref', semanaSelecionada);
      } else {
        setEmentaIDs(prev => [...prev, String(pratoId)]);
        await supabase.from('ementas').insert({ dia_semana: diaSelecionado, prato_id: pratoId, semana_ref: semanaSelecionada });
      }
    } catch (err) { Alert.alert("Erro", "Falha ao gravar."); }
  }

  async function confirmarAvancoCiclo() {
    Alert.alert(
      "Alterar Ciclo",
      "Queres passar a ementa 'Próxima' para 'Esta Semana'? A ementa atual será apagada.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", style: "destructive", onPress: executarRotacao }
      ]
    );
  }

  async function executarRotacao() {
    setLoading(true);
    try {
      await supabase.from('ementas').delete().eq('semana_ref', 1);
      await supabase.from('ementas').update({ semana_ref: 1 }).eq('semana_ref', 2);
      setSemanaSelecionada(1);
      carregarDadosDoDia();
      Alert.alert("Sucesso", "Ementas atualizadas.");
    } catch (e) { Alert.alert("Erro", "Falha na rotação."); setLoading(false); }
  }

  const pratosDaEmenta = pratos.filter(p => ementaIDs.includes(String(p.id)));
  const pratosFiltrados = pratos.filter(p => p.nome.toLowerCase().includes(pesquisa.toLowerCase()));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* SELETOR DE SEMANAS COM ÍCONE DE CALENDÁRIO */}
      <View style={styles.semanaContainer}>
        {SEMANAS.map(sem => (
          <TouchableOpacity 
            key={sem.id} 
            onPress={() => setSemanaSelecionada(sem.id)} 
            style={[styles.tabSemana, semanaSelecionada === sem.id && styles.tabSemanaAtiva]}
          >
            <Text style={[styles.txtSemana, semanaSelecionada === sem.id && { color: COLORS.orange }]}>
              {sem.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.btnCiclo} onPress={confirmarAvancoCiclo}>
          <Ionicons name="calendar" size={24} color={COLORS.blue} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {DIAS.map(d => (
            <TouchableOpacity key={d} onPress={() => setDiaSelecionado(d)} style={[styles.tab, diaSelecionado === d && styles.tabAtiva]}>
              <Text style={{ color: diaSelecionado === d ? '#FFF' : COLORS.textSec, fontWeight: 'bold' }}>{d}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.actionRow}>
        <Text style={styles.txtResumo}>{pratosDaEmenta.length} pratos definidos</Text>
        {!diaFechado && ementaIDs.length > 0 && (
          <TouchableOpacity style={styles.btnClear} onPress={() => {}}>
            <Ionicons name="trash-outline" size={16} color={COLORS.red} />
            <Text style={styles.txtClear}>Esvaziar</Text>
          </TouchableOpacity>
        )}
      </View>

      {diaFechado && (
        <View style={styles.bannerFechado}>
          <Ionicons name="lock-closed" size={20} color={COLORS.red} />
          <Text style={styles.txtBannerFechado}>Restaurante encerrado à {diaSelecionado}.</Text>
        </View>
      )}

      {loading ? <ActivityIndicator size="large" color={COLORS.orange} style={{marginTop: 50}} /> : (
        <FlatList
          data={pratosDaEmenta} 
          keyExtractor={item => String(item.id)} 
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={60} color={COLORS.border} />
              <Text style={styles.emptyTitle}>Ementa Vazia</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cardEmenta}>
              {item.imagem_url ? <Image source={{ uri: item.imagem_url }} style={styles.imgPrato} /> : <View style={styles.imgPlaceholder}><Ionicons name="restaurant-outline" size={20} color={COLORS.textSec} /></View>}
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{item.nome}</Text>
                <Text style={styles.categoria}>{item.categoria} • {Number(item.preco).toFixed(2)}€</Text>
              </View>
              {!diaFechado && <TouchableOpacity style={styles.btnRemover} onPress={() => togglePrato(item.id)}><Ionicons name="trash-outline" size={20} color={COLORS.red} /></TouchableOpacity>}
            </View>
          )}
        />
      )}

      {!diaFechado && (
        <View style={styles.footerContainer}>
          <TouchableOpacity style={styles.btnAdicionar} onPress={() => setModalVisivel(true)}>
            <Ionicons name="add-circle-outline" size={24} color="#FFF" />
            <Text style={styles.txtBtnAdicionar}>Adicionar Pratos</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={modalVisivel} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalTitle}>Pratos</Text><Text style={styles.modalSubTitle}>{diaSelecionado}</Text></View>
              <TouchableOpacity onPress={() => setModalVisivel(false)}><Ionicons name="close-circle" size={32} color={COLORS.border} /></TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={COLORS.textSec} style={{marginRight: 8}} />
              <TextInput style={styles.searchInput} placeholder="Pesquisar..." placeholderTextColor={COLORS.textSec} value={pesquisa} onChangeText={setPesquisa} />
            </View>
            <FlatList
              data={pratosFiltrados}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => {
                const isSel = ementaIDs.includes(String(item.id));
                return (
                  <TouchableOpacity style={[styles.cardCatalogo, isSel && styles.cardCatalogoSel]} onPress={() => togglePrato(item.id)}>
                    <View style={{ flex: 1 }}><Text style={[styles.nome, isSel && {color: COLORS.orange}]}>{item.nome}</Text><Text style={styles.categoria}>{item.categoria} • {Number(item.preco).toFixed(2)}€</Text></View>
                    <Ionicons name={isSel ? "checkmark-circle" : "add-circle-outline"} size={28} color={isSel ? COLORS.orange : COLORS.border} />
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.btnConcluir} onPress={() => setModalVisivel(false)}><Text style={styles.txtBtnAdicionar}>Concluir</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  semanaContainer: { flexDirection: 'row', backgroundColor: COLORS.card, paddingTop: Platform.OS === 'ios' ? 0 : 40, paddingHorizontal: 20, alignItems: 'center', borderBottomWidth: 1, borderColor: COLORS.border },
  tabSemana: { paddingVertical: 15, marginRight: 25, borderBottomWidth: 2, borderColor: 'transparent' },
  tabSemanaAtiva: { borderColor: COLORS.orange },
  txtSemana: { fontSize: 15, fontWeight: '800', color: COLORS.textSec },
  btnCiclo: { marginLeft: 'auto', padding: 10 },
  tabContainer: { paddingVertical: 15, backgroundColor: COLORS.card, borderBottomWidth: 1, borderColor: COLORS.border },
  tabsScroll: { paddingHorizontal: 20 },
  tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.bg, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
  tabAtiva: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 15 },
  txtResumo: { fontSize: 12, fontWeight: '700', color: COLORS.textSec, textTransform: 'uppercase' },
  btnClear: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.redLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  txtClear: { color: COLORS.red, fontWeight: '700', fontSize: 12 },
  bannerFechado: { flexDirection: 'row', backgroundColor: COLORS.redLight, padding: 12, marginHorizontal: 20, marginTop: 15, borderRadius: 10, alignItems: 'center', gap: 10 },
  txtBannerFechado: { color: COLORS.red, fontWeight: '700', fontSize: 13 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.border, marginTop: 10 },
  cardEmenta: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 15, marginBottom: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  imgPrato: { width: 50, height: 50, borderRadius: 10, marginRight: 15 },
  imgPlaceholder: { width: 50, height: 50, borderRadius: 10, marginRight: 15, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  nome: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  categoria: { fontSize: 12, color: COLORS.textSec, marginTop: 2 },
  btnRemover: { padding: 8, backgroundColor: COLORS.redLight, borderRadius: 10 },
  footerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: COLORS.bg, borderTopWidth: 1, borderColor: COLORS.border },
  btnAdicionar: { flexDirection: 'row', backgroundColor: COLORS.orange, padding: 16, borderRadius: 15, justifyContent: 'center', alignItems: 'center', gap: 10 },
  txtBtnAdicionar: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, height: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  modalSubTitle: { fontSize: 13, color: COLORS.orange, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingHorizontal: 15, height: 50, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  cardCatalogo: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 15, marginBottom: 10, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cardCatalogoSel: { borderColor: COLORS.orange, backgroundColor: COLORS.orangeLight },
  btnConcluir: { backgroundColor: COLORS.text, padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 }
});