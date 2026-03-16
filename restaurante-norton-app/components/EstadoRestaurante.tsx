import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = {
  orange: '#FF6B00',
  black: '#121212',
  textSec: '#8E8E93',
  green: '#34C759',
  yellow: '#FFCC00',
  red: '#FF3B30',
  border: '#F0F0F0'
};

export default function EstadoRestaurante() {
  const [ocupacao, setOcupacao] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOcupacao();

    // ESCUTA EM TEMPO REAL
    const subscription = supabase
      .channel('restaurante_status')
      .on(
        'postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'restaurante',
          filter: 'id=eq.1' 
        }, 
        (payload) => {
          setOcupacao(payload.new.taxa_ocupacao); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function fetchOcupacao() {
    try {
      const { data, error } = await supabase
        .from('restaurante')
        .select('taxa_ocupacao') 
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;
      if (data) setOcupacao(data.taxa_ocupacao);
      
    } catch (error) {
      console.error("Erro ao buscar ocupação:", error);
    } finally {
      setLoading(false);
    }
  }

  // Lógica de Cores Progressiva (Igual ao Admin para consistência)
  const getCor = (p: number) => {
    if (p <= 30) return COLORS.green;
    if (p <= 60) return COLORS.yellow;
    if (p <= 90) return COLORS.orange;
    return COLORS.red;
  };

  const getTexto = (p: number) => {
    if (p <= 30) return 'Ambiente tranquilo';
    if (p <= 70) return 'Algum movimento';
    if (p >= 100) return 'Lotação esgotada';
    return 'Restaurante quase cheio';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={COLORS.orange} size="small" />
      </View>
    );
  }

  const corAtual = getCor(ocupacao);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>DISPONIBILIDADE</Text>
        <View style={[styles.badge, { backgroundColor: corAtual + '15' }]}>
          <Text style={[styles.badgeText, { color: corAtual }]}>{ocupacao}%</Text>
        </View>
      </View>
      
      <View style={styles.linhaEstado}>
        <MaterialCommunityIcons 
          name="hat-fedora" 
          size={26} 
          color={corAtual} 
          style={{ marginRight: 12 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.textoEstado}>{getTexto(ocupacao)}</Text>
          
          {/* BARRA DE PROGRESSO VISUAL */}
          <View style={styles.barraFundo}>
            <View 
              style={[
                styles.barraProgresso, 
                { width: `${ocupacao}%`, backgroundColor: corAtual }
              ]} 
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    paddingHorizontal: 5,
    width: '100%'
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 10 
  },
  label: { 
    fontSize: 11, 
    color: COLORS.textSec, 
    fontWeight: '800', 
    letterSpacing: 1 
  },
  linhaEstado: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  textoEstado: { 
    fontSize: 15, 
    color: COLORS.black, 
    fontWeight: '700',
    marginBottom: 8
  },
  badge: { 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 10 
  },
  badgeText: { 
    fontSize: 12, 
    fontWeight: '900' 
  },
  barraFundo: { 
    height: 8, 
    backgroundColor: '#F0F0F0', 
    borderRadius: 4, 
    overflow: 'hidden',
    width: '100%'
  },
  barraProgresso: { 
    height: '100%', 
    borderRadius: 4 
  }
});