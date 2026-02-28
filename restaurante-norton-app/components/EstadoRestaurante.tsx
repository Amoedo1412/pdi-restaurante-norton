import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function EstadoRestaurante() {
  const [ocupacao, setOcupacao] = useState(0);

  useEffect(() => {
    carregarOcupacao();
    
    const subscription = supabase
      .channel('public:restaurante')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurante', filter: 'id=eq.1' }, payload => {
        setOcupacao(payload.new.taxa_ocupacao);
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  async function carregarOcupacao() {
    const { data } = await supabase.from('restaurante').select('taxa_ocupacao').eq('id', 1).single();
    if (data) setOcupacao(data.taxa_ocupacao);
  }

  const getCor = () => {
    if (ocupacao >= 75) return '#ff3b30'; // Vermelho
    if (ocupacao >= 50) return '#ff9500'; // Laranja
    return '#4cd964'; // Verde
  };

  return (
    <View style={styles.containerCentral}>
      <View style={styles.card}>
        <Text style={styles.titulo}>Lotação em Tempo Real</Text>
        
        <View style={styles.barraFundo}>
          <View style={[styles.barraProgresso, { width: `${ocupacao}%`, backgroundColor: getCor() }]} />
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.textoStatus}>
            {ocupacao === 0 ? "Restaurante Livre" : `Ocupação: ${ocupacao}%`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  containerCentral: {
    width: '100%',
    alignItems: 'center', // Centra o card horizontalmente
    marginVertical: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    width: '90%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center', // Centra o conteúdo dentro do card
  },
  titulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  barraFundo: {
    height: 10,
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barraProgresso: {
    height: '100%',
    borderRadius: 5,
  },
  infoRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  }
});