import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function EstadoRestaurante() {
  const [ocupacao, setOcupacao] = useState(0);

  useEffect(() => {
    carregarOcupacao();
    
    // Opcional: Escutar mudanças em tempo real (Realtime)
    const subscription = supabase
      .channel('public:restaurante')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurante' }, payload => {
        setOcupacao(payload.new.taxa_ocupacao);
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  async function carregarOcupacao() {
    const { data } = await supabase.from('restaurante').select('taxa_ocupacao').single();
    if (data) setOcupacao(data.taxa_ocupacao);
  }

  // Definir cor baseada na ocupação
  const getCor = () => {
    if (ocupacao >= 100) return '#ff3b30'; // Vermelho (Cheio)
    if (ocupacao >= 75) return '#ff9500';  // Laranja (Quase cheio)
    return '#4cd964';                      // Verde (Livre)
  };

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>Estado do Restaurante</Text>
      <View style={styles.barraFundo}>
        <View style={[styles.barraProgresso, { width: `${ocupacao}%`, backgroundColor: getCor() }]} />
      </View>
      <Text style={styles.textoStatus}>
        {ocupacao === 0 ? "Restaurante Vazio" : 
         ocupacao === 100 ? "Lotação Esgotada" : 
         `Ocupação em ${ocupacao}%`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, width: '90%', elevation: 4, marginVertical: 20 },
  titulo: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  barraFundo: { height: 12, backgroundColor: '#eee', borderRadius: 6, overflow: 'hidden' },
  barraProgresso: { height: '100%', borderRadius: 6 },
  textoStatus: { marginTop: 8, fontSize: 14, color: '#666', fontWeight: '500' }
});