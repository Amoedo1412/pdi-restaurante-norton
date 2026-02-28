import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function MenuScreen() {
  const [pratosHoje, setPratosHoje] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEmentaDoDia();
  }, []);

  async function carregarEmentaDoDia() {
    setLoading(true);
    // 1. Obter a data de hoje no formato YYYY-MM-DD
    const hoje = new Date().toISOString().split('T')[0];

    // 2. Procurar na tabela ementa_diaria os IDs dos pratos para hoje
    const { data: ementa, error: ementaError } = await supabase
      .from('ementa_diaria')
      .select('prato_1_id, prato_2_id, prato_3_id')
      .eq('data', hoje)
      .single();

    if (ementa) {
      // Criar um array com os IDs que não são nulos
      const ids = [ementa.prato_1_id, ementa.prato_2_id, ementa.prato_3_id].filter(id => id !== null);

      if (ids.length > 0) {
        // 3. Procurar os detalhes desses pratos na tabela pratos
        const { data: detalhesPratos } = await supabase
          .from('pratos')
          .select('*')
          .in('id', ids);

        if (detalhesPratos) setPratosHoje(detalhesPratos);
      }
    }
    setLoading(false);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#e67e22" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.tituloSecao}>Sugestões para Hoje</Text>
      <FlatList
        data={pratosHoje}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.cardPrato}>
            <Image source={{ uri: item.imagem_url }} style={styles.fotoPrato} />
            <View style={styles.infoPrato}>
              <Text style={styles.nomePrato}>{item.nome}</Text>
              <Text style={styles.categoriaPrato}>{item.categoria}</Text>
              <Text style={styles.precoPrato}>{parseFloat(item.preco).toFixed(2)}€</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.vazio}>Ainda não foi definida a ementa para hoje.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tituloSecao: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333', marginTop: 40 },
  cardPrato: { backgroundColor: '#fff', borderRadius: 12, flexDirection: 'row', marginBottom: 15, elevation: 3, overflow: 'hidden' },
  fotoPrato: { width: 100, height: 100 },
  infoPrato: { padding: 10, justifyContent: 'center', flex: 1 },
  nomePrato: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  categoriaPrato: { fontSize: 14, color: '#e67e22', marginVertical: 2 },
  precoPrato: { fontSize: 16, fontWeight: '600', color: '#2ecc71' },
  vazio: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});