import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, Alert, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export default function GestaoCatalogo() {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [preco, setPreco] = useState('');
  const [imagemUri, setImagemUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Função para abrir a galeria e escolher a foto
  async function escolherImagem() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3], // Formato standard para fotos de comida
      quality: 0.5,   // Comprime a imagem para não gastar muito espaço
    });

    if (!resultado.canceled) {
      setImagemUri(resultado.assets[0].uri);
    }
  }

  // 2. Função principal que guarda a foto e os dados do prato
  async function guardarPrato() {
    if (!nome || !preco || !imagemUri) {
      Alert.alert('Atenção', 'Preenche o nome, preço e escolhe uma foto.');
      return;
    }

    setLoading(true);
    try {
      // Preparar o ficheiro para upload
      const ext = imagemUri.substring(imagemUri.lastIndexOf('.') + 1);
      const fileName = `${Date.now()}.${ext}`; // Cria um nome único com a data atual
      
      // Converter a imagem para um formato que o Supabase entenda
      const resposta = await fetch(imagemUri);
      const blob = await resposta.blob();

      // Fazer upload para a pasta 'pratos' no Storage
      const { error: uploadError } = await supabase.storage
        .from('pratos')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Pedir ao Supabase o link público dessa imagem
      const { data: publicUrlData } = supabase.storage
        .from('pratos')
        .getPublicUrl(fileName);

      // Guardar tudo na nossa tabela 'pratos'
      const { error: dbError } = await supabase
        .from('pratos')
        .insert({
          nome: nome,
          categoria: categoria || 'Geral',
          preco: parseFloat(preco.replace(',', '.')), // Garante que aceita vírgulas ou pontos
          imagem_url: publicUrlData.publicUrl
        });

      if (dbError) throw dbError;

      Alert.alert('Sucesso!', 'Prato adicionado ao catálogo com sucesso.');
      
      // Limpar o formulário para o prato seguinte
      setNome('');
      setCategoria('');
      setPreco('');
      setImagemUri(null);

    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Adicionar Novo Prato</Text>

      <TextInput 
        style={styles.input} 
        placeholder="Nome do Prato (ex: Bacalhau à Brás)" 
        value={nome} 
        onChangeText={setNome} 
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Categoria (ex: Peixe, Carne, Sobremesa)" 
        value={categoria} 
        onChangeText={setCategoria} 
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Preço (ex: 10.50)" 
        value={preco} 
        onChangeText={setPreco} 
        keyboardType="numeric" 
      />

      <TouchableOpacity style={styles.botaoFoto} onPress={escolherImagem}>
        <Text style={styles.textoBotaoFoto}>
          {imagemUri ? 'Mudar Fotografia' : 'Escolher Fotografia'}
        </Text>
      </TouchableOpacity>

      {imagemUri && (
        <Image source={{ uri: imagemUri }} style={styles.imagemPreview} />
      )}

      <View style={{ marginTop: 20, marginBottom: 40 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#e67e22" />
        ) : (
          <TouchableOpacity style={styles.botaoGuardar} onPress={guardarPrato}>
            <Text style={styles.textoBotaoGuardar}>Guardar Prato no Catálogo</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, backgroundColor: '#f8f9fa' },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, marginTop: 20, color: '#333' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  botaoFoto: { backgroundColor: '#e0e0e0', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  textoBotaoFoto: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  imagemPreview: { width: '100%', height: 250, borderRadius: 8, marginBottom: 15, resizeMode: 'cover' },
  botaoGuardar: { backgroundColor: '#e67e22', padding: 15, borderRadius: 8, alignItems: 'center' },
  textoBotaoGuardar: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});