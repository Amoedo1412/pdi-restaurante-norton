import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, StatusBar, Platform, Modal, Image, KeyboardAvoidingView, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';

const COLORS = { bg: '#F4F6F9', card: '#FFFFFF', text: '#1C1C1E', textSec: '#8E8E93', orange: '#FF6B00', border: '#E5E5EA', red: '#FF3B30' };
const CATEGORIAS = ['Carne', 'Peixe', 'Vegetariano', 'Sobremesa', 'Bebida', 'Snack'];

export default function GestaoCatalogo({ navigation }: any) {
  const [pratos, setPratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');

  // Estados do Formulário (Modal)
  const [modalVisivel, setModalVisivel] = useState(false);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!resultado.canceled) {
      setImagemUrl(resultado.assets[0].uri);
    }
  }

  async function adicionarPrato() {
    if (!nome || !preco) return Alert.alert('Aviso', 'Preenche o nome e o preço.');
    const precoNum = parseFloat(preco.replace(',', '.'));
    if (isNaN(precoNum)) return Alert.alert('Erro', 'Preço inválido.');

    const novoPrato = {
      nome,
      preco: precoNum,
      categoria,
      imagem_url: imagemUrl,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('pratos').insert(novoPrato);
    
    if (!error) { 
      fecharModal(); 
      carregarPratos(); 
    } else {
      Alert.alert('Erro', error.message);
    }
  }

  function fecharModal() {
    setModalVisivel(false);
    setNome('');
    setPreco('');
    setCategoria(CATEGORIAS[0]);
    setImagemUrl(null);
  }

  async function apagarPrato(id: string) {
    Alert.alert('Apagar', 'Tens a certeza que queres eliminar este prato?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => { await supabase.from('pratos').delete().eq('id', id); carregarPratos(); }}
    ]);
  }

  const pratosFiltrados = pratos.filter(p => {
    const termo = pesquisa.toLowerCase();
    const matchNome = p.nome.toLowerCase().includes(termo);
    const matchCategoria = p.categoria ? p.categoria.toLowerCase().includes(termo) : false;
    return matchNome || matchCategoria;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
      
      {/* CABEÇALHO CORRIGIDO: Botão perfeitamente centrado */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnHeaderAdd} onPress={() => setModalVisivel(true)}>
          <Ionicons name="add" size={24} color="#FFF" style={{marginRight: 6}} />
          <Text style={styles.txtBtnAdd}>Novo Prato</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de Pesquisa */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.textSec} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar por nome ou categoria..."
            placeholderTextColor={COLORS.textSec}
            value={pesquisa}
            onChangeText={setPesquisa}
          />
          {pesquisa.length > 0 && (
            <TouchableOpacity onPress={() => setPesquisa('')} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSec} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Lista de Pratos */}
      {loading ? <ActivityIndicator size="large" color={COLORS.orange} style={{marginTop: 50}} /> : (
        <FlatList
          data={pratosFiltrados} keyExtractor={item => item.id} contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{textAlign: 'center', color: COLORS.textSec, marginTop: 20}}>Nenhum prato encontrado.</Text>
          }
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
                <Text style={styles.categoriaPrato}>{item.categoria || 'Sem Categoria'}</Text>
                <Text style={styles.precoPrato}>{Number(item.preco).toFixed(2)}€</Text>
              </View>
              <TouchableOpacity onPress={() => apagarPrato(item.id)} style={styles.btnDelete}>
                <Ionicons name="trash-outline" size={20} color={COLORS.red} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* MODAL CORRIGIDO: Adicionado KeyboardAvoidingView e ScrollView */}
      <Modal visible={modalVisivel} animationType="slide" transparent={true}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Novo Prato</Text>
                  <TouchableOpacity onPress={fecharModal}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.btnFoto} onPress={escolherFoto}>
                  {imagemUrl ? (
                    <Image source={{ uri: imagemUrl }} style={styles.fotoPreview} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={28} color={COLORS.orange} />
                      <Text style={styles.txtBtnFoto}>Adicionar Foto (Opcional)</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TextInput 
                  style={styles.inputForm} placeholder="Nome do Prato (Ex: Bacalhau...)" 
                  placeholderTextColor={COLORS.textSec} value={nome} onChangeText={setNome} 
                />

                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={categoria}
                    onValueChange={(itemValue) => setCategoria(itemValue)}
                    style={styles.picker}
                  >
                    {CATEGORIAS.map((cat, index) => (
                      <Picker.Item key={index} label={cat} value={cat} />
                    ))}
                  </Picker>
                </View>

                <TextInput 
                  style={styles.inputForm} placeholder="Preço (€)" 
                  placeholderTextColor={COLORS.textSec} value={preco} 
                  onChangeText={setPreco} keyboardType="numeric" 
                />

                <TouchableOpacity style={styles.btnGuardar} onPress={adicionarPrato}>
                  <Text style={styles.txtBtnGuardar}>Guardar Prato</Text>
                </TouchableOpacity>
                
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  
  // Cabeçalho corrigido para centrar perfeitamente
  header: { width: '100%', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 15, backgroundColor: COLORS.card },
  btnHeaderAdd: { backgroundColor: COLORS.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, shadowColor: COLORS.orange, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  txtBtnAdd: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  searchContainer: { backgroundColor: COLORS.card, paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderColor: COLORS.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  searchIcon: { paddingLeft: 12 },
  searchInput: { flex: 1, padding: 12, fontSize: 15, color: COLORS.text, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  clearIcon: { paddingRight: 12 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, elevation: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5 },
  imgPrato: { width: 60, height: 60, borderRadius: 10, marginRight: 15 },
  imgPlaceholder: { width: 60, height: 60, borderRadius: 10, marginRight: 15, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  nomePrato: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  categoriaPrato: { fontSize: 12, color: COLORS.textSec, marginTop: 2 },
  precoPrato: { fontSize: 15, color: COLORS.orange, fontWeight: '900', marginTop: 4 },
  btnDelete: { padding: 10, backgroundColor: '#FF3B3015', borderRadius: 10 },

  // Estilos do Modal ajustados para lidar com o ScrollView
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '90%' }, // Adicionado maxHeight para garantir que não tapa o ecrã inteiro
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  
  btnFoto: { width: '100%', height: 120, backgroundColor: COLORS.bg, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  fotoPreview: { width: '100%', height: '100%', borderRadius: 15 },
  txtBtnFoto: { color: COLORS.orange, marginTop: 10, fontWeight: '600' },
  
  inputForm: { backgroundColor: COLORS.bg, color: COLORS.text, padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  pickerContainer: { backgroundColor: COLORS.bg, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  picker: { height: 50, width: '100%' },
  
  btnGuardar: { backgroundColor: COLORS.orange, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 20 }, // Adicionado marginBottom para respirar no final do scroll
  txtBtnGuardar: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});