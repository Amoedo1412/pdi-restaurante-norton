import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, Alert, FlatList, StatusBar } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import NortonLoading from '../components/NortonLoading';

// 1. IMPORTAR A NUVEM DO TEMA GLOBAL
import { useTheme } from '../components/TemaContexto';

export default function MenuScreen({ navigation }: any) {
  // 2. EXTRAIR O TEMA
  const { theme, isDark } = useTheme();

  const [ementaSemanal, setEmentaSemanal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Ordem lógica para ordenação manual
  const ordemDias: { [key: string]: number } = {
    'Segunda-Feira': 1,
    'Terça-Feira': 2,
    'Quarta-Feira': 3,
    'Quinta-Feira': 4,
    'Sexta-Feira': 5,
    'Sábado': 6,
    'Domingo': 7
  };

  useEffect(() => {
    carregarEmentaCompleta();
  }, []);

  async function carregarEmentaCompleta() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('ementas')
        .select(`
          id,
          dia_semana,
          prato:pratos!prato_id(*)
        `);

      if (error) throw error;

      if (data) {
        const agrupado = data.reduce((acc: any, item: any) => {
          const dia = item.dia_semana;
          if (!acc[dia]) {
            acc[dia] = { dia_semana: dia, pratos: [] };
          }
          acc[dia].pratos.push(item.prato);
          return acc;
        }, {});

        const listaOrdenada = Object.values(agrupado).sort((a: any, b: any) => {
          return ordemDias[a.dia_semana] - ordemDias[b.dia_semana];
        });

        setEmentaSemanal(listaOrdenada);
      }
    } catch (err: any) {
      console.error("Erro ao carregar ementa:", err.message);
      Alert.alert("Erro", "Não foi possível carregar os pratos.");
    } finally {
      setLoading(false);
    }
  }

  const renderDia = ({ item: dia }: { item: any }) => (
    // Card do Dia usa theme.card
    <View style={[styles.cardDia, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.headerDia}>
        <Ionicons name="calendar-outline" size={20} color={theme.orange} />
        <Text style={[styles.nomeDia, { color: theme.text }]}>{dia.dia_semana}</Text>
      </View>
      
      <View style={[styles.divisor, { backgroundColor: theme.border }]} />
      
      {dia.pratos.map((prato: any, pIndex: number) => (
        // Container do prato usa o fundo secundário para contrastar com o card
        <View key={pIndex} style={[styles.containerPrato, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          {prato.imagem_url ? (
            <Image source={{ uri: prato.imagem_url }} style={styles.fotoPrato} />
          ) : (
            <View style={[styles.fotoPlaceholder, { backgroundColor: theme.border }]}>
              <Ionicons name="restaurant-outline" size={24} color={theme.textSec} />
            </View>
          )}
          <View style={styles.infoMenu}>
            <Text style={[styles.nomePrato, { color: theme.text }]}>{prato.nome}</Text>
            <Text style={[styles.detalhesMenu, { color: theme.textSec }]}>Especialidade Norton</Text>
          </View>
          <View style={[styles.boxPreco, { backgroundColor: theme.orange }]}>
            <Text style={styles.textoPreco}>{Number(prato.preco).toFixed(2)}€</Text>
          </View>
        </View>
      ))}
    </View>
  );

  if (loading) return <NortonLoading />;

  return (
    // Fundo principal usa theme.bg
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.tituloHeader, { color: theme.orange }]}>Ementa Semanal</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={ementaSemanal}
        keyExtractor={(item) => item.dia_semana}
        renderItem={renderDia}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.textoVazio, { color: theme.textSec }]}>Sem pratos registados para esta semana.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20 },
  backBtn: { padding: 5 },
  tituloHeader: { fontSize: 22, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  cardDia: { borderRadius: 25, padding: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1 },
  headerDia: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  nomeDia: { fontSize: 18, fontWeight: 'bold' },
  divisor: { height: 1, width: '100%', marginBottom: 15 },
  containerPrato: { flexDirection: 'row', borderRadius: 18, padding: 10, marginBottom: 12, alignItems: 'center', borderWidth: 1 },
  fotoPrato: { width: 65, height: 65, borderRadius: 12 },
  fotoPlaceholder: { width: 65, height: 65, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  infoMenu: { flex: 1, marginLeft: 15 },
  nomePrato: { fontSize: 15, fontWeight: 'bold' },
  detalhesMenu: { fontSize: 11, marginTop: 2 },
  boxPreco: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  textoPreco: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  textoVazio: { textAlign: 'center', marginTop: 100, fontSize: 16 }
});