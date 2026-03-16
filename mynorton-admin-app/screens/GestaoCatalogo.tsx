import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { bg: '#F4F6F9', card: '#FFFFFF', text: '#1C1C1E', textSec: '#8E8E93', orange: '#FF6B00', border: '#E5E5EA', red: '#FF3B30' };

export default function GestaoCatalogo({ navigation }: any) {
  const [pratos, setPratos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');

  useEffect(() => { carregarPratos(); }, []);

  async function carregarPratos() {
    setLoading(true);
    const { data, error } = await supabase.from('pratos').select('*').order('nome');
    if (!error) setPratos(data || []);
    setLoading(false);
  }

  async function adicionarPrato() {
    if (!nome || !preco) return Alert.alert('Aviso', 'Preenche o nome e o preço.');
    const precoNum = parseFloat(preco.replace(',', '.'));
    if (isNaN(precoNum)) return Alert.alert('Erro', 'Preço inválido.');

    const { error } = await supabase.from('pratos').insert({ nome, preco: precoNum, categoria: 'Prato do Dia' });
    if (!error) { setNome(''); setPreco(''); carregarPratos(); } 
    else Alert.alert('Erro', error.message);
  }

  async function apagarPrato(id: string) {
    Alert.alert('Apagar', 'Tens a certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => { await supabase.from('pratos').delete().eq('id', id); carregarPratos(); }}
    ]);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
      

      <View style={styles.formAdd}>
        <TextInput 
          style={styles.inputNome} placeholder="Nome do Prato (Ex: Bacalhau...)" placeholderTextColor={COLORS.textSec}
          value={nome} onChangeText={setNome} 
        />
        <View style={styles.rowForm}>
          <TextInput 
            style={styles.inputPreco} placeholder="Preço" placeholderTextColor={COLORS.textSec}
            value={preco} onChangeText={setPreco} keyboardType="numeric" 
          />
          <TouchableOpacity style={styles.btnAdd} onPress={adicionarPrato}>
            <Ionicons name="add" size={20} color="#FFF" style={{marginRight: 4}} />
            <Text style={styles.txtBtnAdd}>Novo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.orange} style={{marginTop: 50}} /> : (
        <FlatList
          data={pratos} keyExtractor={item => item.id} contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.info}>
                <Text style={styles.nomePrato}>{item.nome}</Text>
                <Text style={styles.precoPrato}>{Number(item.preco).toFixed(2)}€</Text>
              </View>
              <TouchableOpacity onPress={() => apagarPrato(item.id)} style={styles.btnDelete}>
                <Ionicons name="trash-outline" size={20} color={COLORS.red} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 15, backgroundColor: COLORS.card, borderBottomWidth: 1, borderColor: COLORS.border },
  tituloHeader: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  formAdd: { backgroundColor: COLORS.card, padding: 20, borderBottomWidth: 1, borderColor: COLORS.border, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  inputNome: { backgroundColor: COLORS.bg, color: COLORS.text, padding: 15, borderRadius: 12, fontSize: 15, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  rowForm: { flexDirection: 'row', gap: 10 },
  inputPreco: { flex: 1, backgroundColor: COLORS.bg, color: COLORS.text, padding: 15, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  btnAdd: { backgroundColor: COLORS.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 12 },
  txtBtnAdd: { color: '#FFF', fontWeight: 'bold' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 18, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, elevation: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5 },
  info: { flex: 1 },
  nomePrato: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  precoPrato: { fontSize: 14, color: COLORS.orange, fontWeight: '900', marginTop: 4 },
  btnDelete: { padding: 10, backgroundColor: '#FF3B3015', borderRadius: 10 }
});