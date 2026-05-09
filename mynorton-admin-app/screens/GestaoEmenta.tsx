import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Alert, StatusBar, ScrollView, Platform, Image, Modal, TextInput 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/TemaContexto';

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
  const { theme, isDark } = useTheme();
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
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.semanaContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {SEMANAS.map(sem => (
          <TouchableOpacity 
            key={sem.id} 
            onPress={() => setSemanaSelecionada(sem.id)} 
            style={[styles.tabSemana, semanaSelecionada === sem.id && { borderColor: theme.orange }]}
          >
            <Text style={[styles.txtSemana, { color: theme.subText }, semanaSelecionada === sem.id && { color: theme.orange }]}>
              {sem.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.btnCiclo} onPress={confirmarAvancoCiclo}>
          <Ionicons name="calendar" size={24} color={isDark ? '#0A84FF' : '#007AFF'} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {DIAS.map(d => (
            <TouchableOpacity key={d} onPress={() => setDiaSelecionado(d)} style={[styles.tab, { backgroundColor: theme.bg, borderColor: theme.border }, diaSelecionado === d && { backgroundColor: theme.orange, borderColor: theme.orange }]}>
              <Text style={{ color: diaSelecionado === d ? '#FFF' : theme.subText, fontWeight: 'bold' }}>{d}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.actionRow}>
        <Text style={[styles.txtResumo, { color: theme.subText }]}>{pratosDaEmenta.length} pratos definidos</Text>
        {!diaFechado && ementaIDs.length > 0 && (
          <TouchableOpacity style={[styles.btnClear, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.1)' : '#FFE5E5' }]} onPress={() => {}}>
            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
            <Text style={[styles.txtClear, { color: '#FF3B30' }]}>Esvaziar</Text>
          </TouchableOpacity>
        )}
      </View>

      {diaFechado && (
        <View style={[styles.bannerFechado, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.1)' : '#FFE5E5' }]}>
          <Ionicons name="lock-closed" size={20} color="#FF3B30" />
          <Text style={[styles.txtBannerFechado, { color: '#FF3B30' }]}>Restaurante encerrado à {diaSelecionado}.</Text>
        </View>
      )}

      {loading ? <ActivityIndicator size="large" color={theme.orange} style={{marginTop: 50}} /> : (
        <FlatList
          data={pratosDaEmenta} 
          keyExtractor={item => String(item.id)} 
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={60} color={theme.border} />
              <Text style={[styles.emptyTitle, { color: theme.border }]}>Ementa Vazia</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.cardEmenta, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {item.imagem_url ? <Image source={{ uri: item.imagem_url }} style={styles.imgPrato} /> : <View style={[styles.imgPlaceholder, { backgroundColor: theme.bg }]}><Ionicons name="restaurant-outline" size={20} color={theme.subText} /></View>}
              <View style={{ flex: 1 }}>
                <Text style={[styles.nome, { color: theme.text }]}>{item.nome}</Text>
                <Text style={[styles.categoria, { color: theme.subText }]}>{item.categoria} • {Number(item.preco).toFixed(2)}€</Text>
              </View>
              {!diaFechado && <TouchableOpacity style={[styles.btnRemover, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.1)' : '#FFE5E5' }]} onPress={() => togglePrato(item.id)}><Ionicons name="trash-outline" size={20} color="#FF3B30" /></TouchableOpacity>}
            </View>
          )}
        />
      )}

      {!diaFechado && (
        <View style={[styles.footerContainer, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <TouchableOpacity style={[styles.btnAdicionar, { backgroundColor: theme.orange }]} onPress={() => setModalVisivel(true)}>
            <Ionicons name="add-circle-outline" size={24} color="#FFF" />
            <Text style={styles.txtBtnAdicionar}>Adicionar Pratos</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={modalVisivel} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.bg }]}>
            <View style={styles.modalHeader}>
              <View><Text style={[styles.modalTitle, { color: theme.text }]}>Pratos</Text><Text style={[styles.modalSubTitle, { color: theme.orange }]}>{diaSelecionado}</Text></View>
              <TouchableOpacity onPress={() => setModalVisivel(false)}><Ionicons name="close-circle" size={32} color={theme.border} /></TouchableOpacity>
            </View>
            <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="search" size={20} color={theme.subText} style={{marginRight: 8}} />
              <TextInput style={[styles.searchInput, { color: theme.text }]} placeholder="Pesquisar..." placeholderTextColor={theme.subText} value={pesquisa} onChangeText={setPesquisa} />
            </View>
            <FlatList
              data={pratosFiltrados}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => {
                const isSel = ementaIDs.includes(String(item.id));
                return (
                  <TouchableOpacity style={[styles.cardCatalogo, { backgroundColor: theme.card, borderColor: theme.border }, isSel && { borderColor: theme.orange, backgroundColor: theme.iconBg }]} onPress={() => togglePrato(item.id)}>
                    <View style={{ flex: 1 }}><Text style={[styles.nome, { color: theme.text }, isSel && {color: theme.orange}]}>{item.nome}</Text><Text style={[styles.categoria, { color: theme.subText }]}>{item.categoria} • {Number(item.preco).toFixed(2)}€</Text></View>
                    <Ionicons name={isSel ? "checkmark-circle" : "add-circle-outline"} size={28} color={isSel ? theme.orange : theme.border} />
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={[styles.btnConcluir, { backgroundColor: theme.text }]} onPress={() => setModalVisivel(false)}>
              <Text style={[styles.txtBtnAdicionar, { color: theme.bg }]}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  semanaContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 0, alignItems: 'center', borderBottomWidth: 1 },
  tabSemana: { paddingVertical: 15, marginRight: 25, borderBottomWidth: 2, borderColor: 'transparent' },
  txtSemana: { fontSize: 15, fontWeight: '800' },
  btnCiclo: { marginLeft: 'auto', padding: 10 },
  tabContainer: { paddingVertical: 15, borderBottomWidth: 1 },
  tabsScroll: { paddingHorizontal: 20 },
  tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 15 },
  txtResumo: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  btnClear: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  txtClear: { fontWeight: '700', fontSize: 12 },
  bannerFechado: { flexDirection: 'row', padding: 12, marginHorizontal: 20, marginTop: 15, borderRadius: 10, alignItems: 'center', gap: 10 },
  txtBannerFechado: { fontWeight: '700', fontSize: 13 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  cardEmenta: { flexDirection: 'row', padding: 15, marginBottom: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  imgPrato: { width: 50, height: 50, borderRadius: 10, marginRight: 15 },
  imgPlaceholder: { width: 50, height: 50, borderRadius: 10, marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  nome: { fontSize: 16, fontWeight: '700' },
  categoria: { fontSize: 12, marginTop: 2 },
  btnRemover: { padding: 8, borderRadius: 10 },
  footerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1 },
  btnAdicionar: { flexDirection: 'row', padding: 16, borderRadius: 15, justifyContent: 'center', alignItems: 'center', gap: 10 },
  txtBtnAdicionar: { fontWeight: '800', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, height: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '900' },
  modalSubTitle: { fontSize: 13, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 50, borderRadius: 12, marginBottom: 15, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  cardCatalogo: { flexDirection: 'row', padding: 15, marginBottom: 10, borderRadius: 15, alignItems: 'center', borderWidth: 1 },
  btnConcluir: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 }
});