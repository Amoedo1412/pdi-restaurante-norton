import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Image, Alert, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function GestaoCatalogo() {
  const [modo, setModo] = useState<'lista' | 'formulario'>('lista');
  const [pratos, setPratos] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPratos, setLoadingPratos] = useState(true);

  // --- ESTADOS DO FORMULÁRIO ---
  const [pratoEditandoId, setPratoEditandoId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [preco, setPreco] = useState('');
  const [imagemUri, setImagemUri] = useState<string | null>(null);
  const [loadingGuardar, setLoadingGuardar] = useState(false);

  useEffect(() => {
    if (modo === 'lista') carregarPratos();
  }, [modo]);

  async function carregarPratos() {
    setLoadingPratos(true);
    const { data, error } = await supabase.from('pratos').select('*').order('nome', { ascending: true });
    if (error) Alert.alert('Erro', 'Não foi possível carregar o catálogo.');
    else if (data) setPratos(data);
    setLoadingPratos(false);
  }

  // --- FUNÇÕES DE NAVEGAÇÃO DO FORMULÁRIO ---
  function abrirNovoPrato() {
    setPratoEditandoId(null);
    setNome('');
    setCategoria('');
    setPreco('');
    setImagemUri(null);
    setModo('formulario');
  }

  function abrirEdicao(prato: any) {
    setPratoEditandoId(prato.id);
    setNome(prato.nome);
    setCategoria(prato.categoria || '');
    setPreco(prato.preco.toString());
    setImagemUri(prato.imagem_url);
    setModo('formulario');
  }

  // --- LÓGICA DE FOTOGRAFIA E GUARDA/ATUALIZAÇÃO ---
  async function escolherImagem() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Correção do aviso amarelo
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, 
    });

    if (!resultado.canceled) setImagemUri(resultado.assets[0].uri);
  }

  async function guardarPrato() {
    if (!nome || !preco) {
      Alert.alert('Atenção', 'Preenche pelo menos o nome e o preço.');
      return;
    }

    setLoadingGuardar(true);
    try {
      let finalImageUrl = imagemUri;

      // Se a imagemUri existir e NÃO começar por "http" (foto nova do telemóvel)
      if (imagemUri && !imagemUri.startsWith('http')) {
        const fileName = `${Date.now()}.jpg`; 
        
        const resposta = await fetch(imagemUri);
        // Correção para o iPhone não bloquear no upload
        const buffer = await resposta.arrayBuffer(); 

        const { error: uploadError } = await supabase.storage
          .from('pratos')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg', 
          });
          
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('pratos').getPublicUrl(fileName);
        finalImageUrl = publicUrlData.publicUrl;
      }

      const dadosPrato = {
        nome: nome,
        categoria: categoria || 'Geral',
        preco: parseFloat(preco.replace(',', '.')), 
        imagem_url: finalImageUrl
      };

      if (pratoEditandoId) {
        // ATUALIZAR PRATO EXISTENTE
        const { error } = await supabase.from('pratos').update(dadosPrato).eq('id', pratoEditandoId);
        if (error) throw error;
        Alert.alert('Sucesso!', 'O prato foi atualizado.');
      } else {
        // INSERIR NOVO PRATO
        const { error } = await supabase.from('pratos').insert(dadosPrato);
        if (error) throw error;
        Alert.alert('Sucesso!', 'Novo prato adicionado ao catálogo.');
      }
      
      setModo('lista'); 
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoadingGuardar(false);
    }
  }

  // --- LÓGICA DE REMOÇÃO ---
  async function eliminarPrato() {
    Alert.alert("Eliminar Prato", `Tens a certeza que queres apagar "${nome}" do catálogo?`, [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Eliminar", 
        style: "destructive", 
        onPress: async () => {
          setLoadingGuardar(true);
          const { error } = await supabase.from('pratos').delete().eq('id', pratoEditandoId);
          setLoadingGuardar(false);
          
          if (error) Alert.alert("Erro", "Não foi possível eliminar o prato.");
          else {
            Alert.alert("Apagado", "O prato foi removido com sucesso.");
            setModo('lista');
          }
        } 
      }
    ]);
  }

  const pratosFiltrados = pratos.filter(prato => 
    prato.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (prato.categoria && prato.categoria.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ==========================================
  // MODO FORMULÁRIO (Criar ou Editar)
  // ==========================================
  if (modo === 'formulario') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerForm}>
          <TouchableOpacity onPress={() => setModo('lista')} style={styles.btnVoltar}>
            <Ionicons name="arrow-back" size={24} color="#e67e22" />
            <Text style={styles.textoVoltar}>Voltar à Lista</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.titulo}>{pratoEditandoId ? 'Editar Prato' : 'Adicionar Novo Prato'}</Text>

        <TextInput style={styles.input} placeholder="Nome do Prato" value={nome} onChangeText={setNome} />
        <TextInput style={styles.input} placeholder="Categoria" value={categoria} onChangeText={setCategoria} />
        <TextInput style={styles.input} placeholder="Preço" value={preco} onChangeText={setPreco} keyboardType="numeric" />

        <TouchableOpacity style={styles.botaoFoto} onPress={escolherImagem}>
          <Text style={styles.textoBotaoFoto}>{imagemUri ? 'Mudar Fotografia' : 'Escolher Fotografia'}</Text>
        </TouchableOpacity>

        {imagemUri && <Image source={{ uri: imagemUri }} style={styles.imagemPreview} />}

        <View style={{ marginTop: 20, marginBottom: 40, gap: 15 }}>
          {loadingGuardar ? (
            <ActivityIndicator size="large" color="#e67e22" />
          ) : (
            <>
              <TouchableOpacity style={styles.botaoGuardar} onPress={guardarPrato}>
                <Text style={styles.textoBotaoGuardar}>{pratoEditandoId ? 'Atualizar Prato' : 'Guardar no Catálogo'}</Text>
              </TouchableOpacity>

              {pratoEditandoId && (
                <TouchableOpacity style={styles.botaoEliminar} onPress={eliminarPrato}>
                  <Text style={styles.textoBotaoEliminar}>Eliminar Prato</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    );
  }

  // ==========================================
  // MODO LISTA (Ecrã Principal)
  // ==========================================
  return (
    <View style={styles.containerLista}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Procurar prato ou categoria..." value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <TouchableOpacity style={styles.btnAdicionar} onPress={abrirNovoPrato}>
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.textoBtnAdicionar}>Adicionar Novo Prato</Text>
      </TouchableOpacity>

      {loadingPratos ? (
        <ActivityIndicator size="large" color="#e67e22" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={pratosFiltrados}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.cartaoPrato}>
              {item.imagem_url ? (
                <Image source={{ uri: item.imagem_url }} style={styles.fotoPratoMini} />
              ) : (
                <View style={styles.fotoPratoPlaceholder}><Ionicons name="restaurant" size={24} color="#ccc" /></View>
              )}
              <View style={styles.infoPrato}>
                <Text style={styles.nomePrato}>{item.nome}</Text>
                <Text style={styles.categoriaPrato}>{item.categoria}</Text>
                <Text style={styles.precoPrato}>{item.preco.toFixed(2)} €</Text>
              </View>
              
              <TouchableOpacity style={styles.btnEditar} onPress={() => abrirEdicao(item)}>
                <Ionicons name="pencil" size={20} color="#e67e22" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.vazio}>Nenhum prato encontrado no catálogo.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, backgroundColor: '#f8f9fa' },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, marginTop: 10, color: '#333' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  botaoFoto: { backgroundColor: '#e0e0e0', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  textoBotaoFoto: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  imagemPreview: { width: '100%', height: 250, borderRadius: 8, marginBottom: 15, resizeMode: 'cover' },
  botaoGuardar: { backgroundColor: '#e67e22', padding: 15, borderRadius: 8, alignItems: 'center' },
  textoBotaoGuardar: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  botaoEliminar: { backgroundColor: '#ff3b30', padding: 15, borderRadius: 8, alignItems: 'center' },
  textoBotaoEliminar: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerForm: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  btnVoltar: { flexDirection: 'row', alignItems: 'center' },
  textoVoltar: { color: '#e67e22', fontSize: 16, marginLeft: 5, fontWeight: '600' },
  containerLista: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', height: 50 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, height: '100%' },
  btnAdicionar: { backgroundColor: '#e67e22', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 10, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
  textoBtnAdicionar: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  cartaoPrato: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, alignItems: 'center' },
  fotoPratoMini: { width: 70, height: 70, borderRadius: 8, marginRight: 15 },
  fotoPratoPlaceholder: { width: 70, height: 70, borderRadius: 8, marginRight: 15, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  infoPrato: { flex: 1 },
  nomePrato: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  categoriaPrato: { fontSize: 14, color: '#888', marginTop: 2 },
  precoPrato: { fontSize: 15, fontWeight: 'bold', color: '#e67e22', marginTop: 4 },
  btnEditar: { padding: 10 },
  vazio: { textAlign: 'center', color: '#999', marginTop: 30, fontSize: 16 }
});