import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, StatusBar, ScrollView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { bg: '#F4F6F9', card: '#FFFFFF', text: '#1C1C1E', textSec: '#8E8E93', orange: '#FF6B00', border: '#E5E5EA', orangeLight: '#FFF0E5' };
const DIAS = ['Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];

export default function GestaoEmenta({ navigation }: any) {
  const [diaSelecionado, setDiaSelecionado] = useState('Segunda-Feira');
  const [pratos, setPratos] = useState<any[]>([]);
  const [ementaIDs, setEmentaIDs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { carregarDados(); }, [diaSelecionado]);

  async function carregarDados() {
    setLoading(true);
    try {
      const { data: todosPratos } = await supabase.from('pratos').select('*').order('nome');
      setPratos(todosPratos || []);

      const { data: ementa } = await supabase.from('ementas').select('prato_id').eq('dia_semana', diaSelecionado);
      setEmentaIDs(ementa ? ementa.map(e => String(e.prato_id)) : []);
    } catch (e) { Alert.alert("Erro", "Falha ao carregar."); } 
    finally { setLoading(false); }
  }

  async function togglePrato(pratoId: string) {
    const isAtivo = ementaIDs.includes(String(pratoId));
    try {
      if (isAtivo) {
        setEmentaIDs(prev => prev.filter(id => id !== String(pratoId)));
        await supabase.from('ementas').delete().eq('dia_semana', diaSelecionado).eq('prato_id', pratoId);
      } else {
        setEmentaIDs(prev => [...prev, String(pratoId)]);
        await supabase.from('ementas').insert({ dia_semana: diaSelecionado, prato_id: pratoId });
      }
    } catch (err) { Alert.alert("Erro", "Não foi possível alterar."); }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
      
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {DIAS.map(d => (
            <TouchableOpacity key={d} onPress={() => setDiaSelecionado(d)} style={[styles.tab, diaSelecionado === d && styles.tabAtiva]}>
              <Text style={{ color: diaSelecionado === d ? '#FFF' : COLORS.textSec, fontWeight: 'bold' }}>{d.split('-')[0]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.orange} style={{marginTop: 30}} /> : (
        <FlatList
          data={pratos} keyExtractor={item => String(item.id)} contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const sel = ementaIDs.includes(String(item.id));
            return (
              <TouchableOpacity style={[styles.card, sel && styles.cardSel]} onPress={() => togglePrato(item.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nome, sel && {color: COLORS.orange}]}>{item.nome}</Text>
                  <Text style={styles.categoria}>{item.categoria} • {Number(item.preco).toFixed(2)}€</Text>
                </View>
                <Ionicons name={sel ? "checkmark-circle" : "ellipse-outline"} size={28} color={sel ? COLORS.orange : COLORS.border} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 15, backgroundColor: COLORS.card, borderBottomWidth: 1, borderColor: COLORS.border },
  tituloHeader: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  tabContainer: { height: 70, backgroundColor: COLORS.card, borderBottomWidth: 1, borderColor: COLORS.border, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, justifyContent: 'center' },
  tabsScroll: { paddingHorizontal: 20, alignItems: 'center' },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.bg, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
  tabAtiva: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  card: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 20, marginBottom: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, elevation: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5 },
  cardSel: { borderColor: COLORS.orange, backgroundColor: COLORS.orangeLight, borderWidth: 1.5 },
  nome: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  categoria: { fontSize: 12, color: COLORS.textSec, marginTop: 4 }
});