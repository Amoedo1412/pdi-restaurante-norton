import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, Alert, FlatList } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import NortonLoading from '../components/NortonLoading';

export default function MenuScreen({ navigation }: any) {
  const [ementaSemanal, setEmentaSemanal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Ordem lógica para ordenação manual, já que 'dia_semana' é texto
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
      
      // 1. Busca os dados com o join para a tabela pratos
      const { data, error } = await supabase
        .from('ementas')
        .select(`
          id,
          dia_semana,
          prato:pratos!prato_id(*)
        `);

      if (error) throw error;

      if (data) {
        // 2. Agrupar os pratos por dia da semana
        const agrupado = data.reduce((acc: any, item: any) => {
          const dia = item.dia_semana;
          if (!acc[dia]) {
            acc[dia] = { dia_semana: dia, pratos: [] };
          }
          acc[dia].pratos.push(item.prato);
          return acc;
        }, {});

        // 3. Converter para array e ordenar pela ordem da semana
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
    <View style={styles.cardDia}>
      <View style={styles.headerDia}>
        <Ionicons name="calendar-outline" size={20} color="#e67e22" />
        <Text style={styles.nomeDia}>{dia.dia_semana}</Text>
      </View>
      
      <View style={styles.divisor} />
      
      {dia.pratos.map((prato: any, pIndex: number) => (
        <View key={pIndex} style={styles.containerPrato}>
          {prato.imagem_url ? (
            <Image source={{ uri: prato.imagem_url }} style={styles.fotoPrato} />
          ) : (
            <View style={styles.fotoPlaceholder}>
              <Ionicons name="restaurant-outline" size={24} color="#ccc" />
            </View>
          )}
          <View style={styles.infoMenu}>
            <Text style={styles.nomePrato}>{prato.nome}</Text>
            <Text style={styles.detalhesMenu}>Especialidade Norton</Text>
          </View>
          <View style={styles.boxPreco}>
            <Text style={styles.textoPreco}>{Number(prato.preco).toFixed(2)}€</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.tituloHeader}>Ementa Semanal</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={ementaSemanal}
        keyExtractor={(item) => item.dia_semana}
        renderItem={renderDia}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.textoVazio}>Sem pratos registados para esta semana.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20 },
  backBtn: { padding: 5 },
  tituloHeader: { fontSize: 22, fontWeight: 'bold', color: '#e67e22' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  cardDia: { backgroundColor: '#fff', borderRadius: 25, padding: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#f2f2f2' },
  headerDia: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  nomeDia: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  divisor: { height: 1, backgroundColor: '#eee', width: '100%', marginBottom: 15 },
  containerPrato: { flexDirection: 'row', backgroundColor: '#fcfcfc', borderRadius: 18, padding: 10, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  fotoPrato: { width: 65, height: 65, borderRadius: 12 },
  fotoPlaceholder: { width: 65, height: 65, borderRadius: 12, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  infoMenu: { flex: 1, marginLeft: 15 },
  nomePrato: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  detalhesMenu: { fontSize: 11, color: '#999', marginTop: 2 },
  boxPreco: { backgroundColor: '#e67e22', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  textoPreco: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  textoVazio: { textAlign: 'center', marginTop: 100, color: '#999', fontSize: 16 }
});