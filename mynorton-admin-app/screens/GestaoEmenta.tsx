import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const DIAS = ['Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];

export default function GestaoEmenta() {
  const [diaSelecionado, setDiaSelecionado] = useState('Segunda-Feira');
  const [pratosDisponiveis, setPratosDisponiveis] = useState<any[]>([]);
  const [ementaDoDia, setEmentaDoDia] = useState<string[]>([]); // Guarda IDs dos pratos
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [diaSelecionado]);

  async function carregarDados() {
    setLoading(true);
    try {
      // 1. Carregar todos os pratos do catálogo
      const { data: pratos } = await supabase.from('pratos').select('*');
      if (pratos) setPratosDisponiveis(pratos);

      // 2. Carregar o que já está definido para este dia
      const { data: ementa } = await supabase
        .from('ementas')
        .select('prato_id')
        .eq('dia_semana', diaSelecionado);
      
      if (ementa) {
        setEmentaDoDia(ementa.map(item => item.prato_id));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function togglePratoNaEmenta(pratoId: string) {
    const estaNaEmenta = ementaDoDia.includes(pratoId);

    if (estaNaEmenta) {
      // Remover da ementa
      const { error } = await supabase
        .from('ementas')
        .delete()
        .eq('dia_semana', diaSelecionado)
        .eq('prato_id', pratoId);
      
      if (!error) setEmentaDoDia(prev => prev.filter(id => id !== pratoId));
    } else {
      // Adicionar à ementa
      const { error } = await supabase
        .from('ementas')
        .insert({ dia_semana: diaSelecionado, prato_id: pratoId });
      
      if (!error) setEmentaDoDia(prev => [...prev, pratoId]);
    }
  }

  return (
    <View style={styles.container}>
      {/* Selector de Dias */}
      <View style={{ height: 60 }}>
        <FlatList
          horizontal
          data={DIAS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.tabDia, diaSelecionado === item && styles.tabAtiva]}
              onPress={() => setDiaSelecionado(item)}
            >
              <Text style={[styles.textoTab, diaSelecionado === item && styles.textoTabAtivo]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <Text style={styles.subtitulo}>Pratos para {diaSelecionado}:</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#e67e22" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={pratosDisponiveis}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const selecionado = ementaDoDia.includes(item.id);
            return (
              <TouchableOpacity 
                style={[styles.itemPrato, selecionado && styles.itemSelecionado]} 
                onPress={() => togglePratoNaEmenta(item.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.nomePrato}>{item.nome}</Text>
                  <Text style={styles.precoPrato}>{item.preco.toFixed(2)}€</Text>
                </View>
                <Ionicons 
                  name={selecionado ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={selecionado ? "#e67e22" : "#ccc"} 
                />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  tabDia: { paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, borderRadius: 20, backgroundColor: '#eee', height: 40 },
  tabAtiva: { backgroundColor: '#e67e22' },
  textoTab: { color: '#666', fontWeight: 'bold' },
  textoTabAtivo: { color: '#fff' },
  subtitulo: { fontSize: 18, fontWeight: 'bold', marginVertical: 15, color: '#333' },
  itemPrato: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 10, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee'
  },
  itemSelecionado: { borderColor: '#e67e22', backgroundColor: '#fff9f4' },
  nomePrato: { fontSize: 16, fontWeight: '600' },
  precoPrato: { color: '#e67e22', marginTop: 4 }
});