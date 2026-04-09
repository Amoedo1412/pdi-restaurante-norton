import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, 
  Alert, ActivityIndicator, StatusBar, Platform, Modal, Image, 
  KeyboardAvoidingView, ScrollView, TouchableWithoutFeedback, 
  Keyboard, ActionSheetIOS 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const COLORS = { 
  bg: '#F4F6F9', 
  card: '#FFFFFF', 
  text: '#1C1C1E', 
  textSec: '#8E8E93', 
  orange: '#FF6B00', 
  border: '#E5E5EA', 
  red: '#FF3B30' 
};

const CATEGORIAS = ['Indefinido', 'Carne', 'Peixe', 'Vegetariano'];

export default function GestaoCatalogo({ navigation }: any) {
  const [pratos, setPratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  
  const [ordemAtual, setOrdemAtual] = useState('Nome (A-Z)');
  const [modalOrdemVisivel, setModalOrdemVisivel] = useState(false);

  const [modalVisivel, setModalVisivel] = useState(false);
  const [pratoEmEdicao, setPratoEmEdicao] = useState<string | null>(null);
  
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [categoria, setCategoria] = useState('Indefinido');
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);

  useEffect(() => { carregarPratos(); }, []);

  async function carregarPratos() {
    setLoading(true);
    const { data, error } = await supabase.from('pratos').select('*').order('created_at', { ascending: false });
    if (!error) setPratos(data || []);
    setLoading(false);
  }

 async function escolherFoto() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      // Atualizado para a nova sintaxe do Expo
      mediaTypes: ['images'], 
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    
    if (!resultado.canceled) {
      setImagemUrl(resultado.assets[0].uri);
    }
  }

  function selecionarCategoria() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', ...CATEGORIAS], cancelButtonIndex: 0, title: 'Categoria' },
        (buttonIndex) => { if (buttonIndex !== 0) setCategoria(CATEGORIAS[buttonIndex - 1]); }
      );
    } else {
      Alert.alert('Categoria', '', CATEGORIAS.map(cat => ({ text: cat, onPress: () => setCategoria(cat) })), { cancelable: true });
    }
  }

  function abrirEdicao(item: any) {
    setPratoEmEdicao(item.id);
    setNome(item.nome);
    setPreco(String(item.preco)); 
    setCategoria(item.categoria || 'Indefinido');
    setImagemUrl(item.imagem_url);
    setModalVisivel(true);
  }

  async function guardarPrato() {
    if (!nome || !preco) return Alert.alert('Aviso', 'Preenche o nome e o preço.');
    const precoNum = parseFloat(preco.replace(',', '.'));
    if (isNaN(precoNum)) return Alert.alert('Erro', 'Preço inválido.');

    const dadosPrato = { nome, preco: precoNum, categoria, imagem_url: imagemUrl };

    if (pratoEmEdicao) {
      Alert.alert('Confirmar Edição', 'Pretendes guardar as alterações?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Guardar', onPress: async () => {
            const { error } = await supabase.from('pratos').update(dadosPrato).eq('id', pratoEmEdicao);
            if (!error) { fecharModal(); carregarPratos(); }
          } 
        }
      ]);
    } else {
      const { error } = await supabase.from('pratos').insert({ ...dadosPrato, created_at: new Date().toISOString() });
      if (!error) { fecharModal(); carregarPratos(); }
    }
  }

  async function confirmarApagarPrato() {
    if (!pratoEmEdicao) return;
    Alert.alert('Eliminar', 'Tens a certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { 
          await supabase.from('pratos').delete().eq('id', pratoEmEdicao); 
          fecharModal(); carregarPratos(); 
      }}
    ]);
  }

  function fecharModal() {
    setModalVisivel(false);
    setPratoEmEdicao(null);
    setNome(''); setPreco(''); setCategoria('Indefinido'); setImagemUrl(null);
  }

  const pratosFiltradosEOrdenados = pratos
    .filter(p => {
      const termo = pesquisa.toLowerCase();
      return p.nome.toLowerCase().includes(termo) || (p.categoria && p.categoria.toLowerCase().includes(termo));
    })
    .sort((a, b) => {
      if (ordemAtual === 'Nome (A-Z)') return a.nome.localeCompare(b.nome);
      if (ordemAtual === 'Preço (Menor)') return a.preco - b.preco;
      if (ordemAtual === 'Preço (Maior)') return b.preco - a.preco;
      if (ordemAtual === 'Categoria') return (a.categoria || '').localeCompare(b.categoria || '');
      return 0;
    });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.textSec} style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Pesquisar..." value={pesquisa} onChangeText={setPesquisa} />
        </View>
        <TouchableOpacity style={styles.btnSort} onPress={() => setModalOrdemVisivel(true)}>
          <Ionicons name="filter" size={22} color={COLORS.orange} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnAddInline} onPress={() => setModalVisivel(true)}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.orange} style={{marginTop: 50}} /> : (
        <FlatList
          data={pratosFiltradosEOrdenados} 
          keyExtractor={item => item.id} 
          contentContainerStyle={{ padding: 20, paddingTop: 5 }}
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.imagem_url ? (
                <Image source={{ uri: item.imagem_url }} style={styles.imgPrato} />
              ) : (
                <View style={styles.imgPlaceholder}>
                  <Ionicons name="restaurant-outline" size={24} color={COLORS.textSec} />
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.nomePrato}>{item.nome}</Text>
                <Text style={styles.categoriaPrato}>{item.categoria || 'Indefinido'}</Text>
                <Text style={styles.precoPrato}>{Number(item.preco).toFixed(2)}€</Text>
              </View>
              <TouchableOpacity onPress={() => abrirEdicao(item)} style={styles.btnEdit}>
                <Ionicons name="pencil-outline" size={20} color={COLORS.orange} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* MODAL ORDENAÇÃO */}
      <Modal visible={modalOrdemVisivel} animationType="fade" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalOrdemVisivel(false)}>
          <View style={styles.sortModalContent}>
            <Text style={styles.sortTitle}>Ordenar por</Text>
            {['Nome (A-Z)', 'Preço (Menor)', 'Preço (Maior)', 'Categoria'].map((o) => (
              <TouchableOpacity key={o} style={styles.sortOption} onPress={() => { setOrdemAtual(o); setModalOrdemVisivel(false); }}>
                <Text style={[styles.sortText, ordemAtual === o && styles.sortTextActive]}>{o}</Text>
                {ordemAtual === o && <Ionicons name="checkmark" size={20} color={COLORS.orange} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FORMULÁRIO DE ECRÃ INTEIRO */}
      {modalVisivel && (
        <View style={styles.fullScreenForm}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{pratoEmEdicao ? 'Editar Prato' : 'Novo Prato'}</Text>
                <TouchableOpacity onPress={fecharModal}><Ionicons name="close" size={28} color={COLORS.text} /></TouchableOpacity>
              </View>

              {/* RECUPERADO: Seletor de Foto */}
              <TouchableOpacity style={styles.btnFoto} onPress={escolherFoto}>
                {imagemUrl ? (
                  <Image source={{ uri: imagemUrl }} style={styles.fotoPreview} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={28} color={COLORS.orange} />
                    <Text style={styles.txtBtnFoto}>Adicionar Foto</Text>
                  </>
                )}
              </TouchableOpacity>

              <TextInput style={styles.inputForm} placeholder="Nome do Prato" value={nome} onChangeText={setNome} />

              <TouchableOpacity style={styles.categorySelector} onPress={selecionarCategoria}>
                <Text style={styles.categoryValueText}>{categoria}</Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textSec} />
              </TouchableOpacity>

              {/* BOX DE PREÇO COM € À DIREITA */}
              <View style={styles.priceInputContainer}>
                <TextInput 
                  style={styles.priceInput} 
                  placeholder="0.00" 
                  value={preco} 
                  onChangeText={setPreco} 
                  keyboardType="numeric" 
                />
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyText}>€</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.btnGuardar} onPress={guardarPrato}>
                <Text style={styles.txtBtnGuardar}>Guardar</Text>
              </TouchableOpacity>
              {pratoEmEdicao && (
                <TouchableOpacity style={styles.btnDeleteModal} onPress={confirmarApagarPrato}>
                  <Text style={styles.txtBtnDeleteModal}>Eliminar Prato</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 15 : 40, paddingBottom: 15, gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, height: 50, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border }, 
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  btnSort: { width: 50, height: 50, backgroundColor: COLORS.card, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  btnAddInline: { width: 50, height: 50, backgroundColor: COLORS.orange, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  imgPrato: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  imgPlaceholder: { width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  nomePrato: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  categoriaPrato: { fontSize: 12, color: COLORS.textSec },
  precoPrato: { fontSize: 15, color: COLORS.orange, fontWeight: '900' },
  btnEdit: { padding: 10, backgroundColor: '#FF6B0015', borderRadius: 10 },

  fullScreenForm: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.card, zIndex: 999 },
  formScrollContent: { padding: 20, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  modalTitle: { fontSize: 24, fontWeight: '800' },

  // Estilos da Foto
  btnFoto: { width: '100%', height: 160, backgroundColor: COLORS.bg, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  fotoPreview: { width: '100%', height: '100%', borderRadius: 15 },
  txtBtnFoto: { color: COLORS.orange, marginTop: 8, fontWeight: '600' },
  
  inputForm: { backgroundColor: COLORS.bg, padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  
  categorySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, padding: 16, borderRadius: 12, marginBottom: 15, justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border },
  categoryValueText: { fontSize: 16, color: COLORS.text },

  // NOVO: Preço com Símbolo €
  priceInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15 },
  priceInput: { flex: 1, padding: 16, fontSize: 16, color: COLORS.text },
  currencyBadge: { paddingRight: 16, justifyContent: 'center' },
  currencyText: { fontSize: 18, color: COLORS.textSec, fontWeight: '600' },

  btnGuardar: { backgroundColor: COLORS.orange, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  txtBtnGuardar: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  btnDeleteModal: { padding: 16, alignItems: 'center', marginTop: 15, borderWidth: 1, borderColor: COLORS.red, borderRadius: 12 },
  txtBtnDeleteModal: { color: COLORS.red, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sortModalContent: { backgroundColor: COLORS.card, padding: 25, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  sortTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: COLORS.text },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.bg },
  sortText: { fontSize: 16, color: COLORS.textSec },
  sortTextActive: { color: COLORS.orange, fontWeight: '700' }
});