import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const COLORS = {
  bg: '#F4F6F9', 
  card: '#FFFFFF', 
  text: '#1C1C1E', 
  textSec: '#8E8E93', 
  orange: '#FF6B00', 
  orangeLight: '#FFF0E5', 
  border: '#E5E5EA', 
  red: '#FF3B30'
};

export default function Home({ navigation }: any) {
  const [adminNome, setAdminNome] = useState('Admin');
  const [percentagem, setPercentagem] = useState(0);

  useEffect(() => { 
    buscarPerfilAdmin(); 
  }, []);

  async function buscarPerfilAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('perfis').select('nome').eq('id', user.id).single();
        if (data && data.nome) setAdminNome(data.nome.split(' ')[0]);
      }
    } catch (error) { 
      console.error(error); 
    }
  }

  // Função para definir a cor com base na percentagem (Verde -> Vermelho)
  const getCorLotacao = (p: number) => {
    if (p <= 30) return '#34C759'; // Verde
    if (p <= 60) return '#FFCC00'; // Amarelo
    if (p <= 90) return '#FF9500'; // Laranja
    return '#FF3B30'; // Vermelho
  };

  const mudarLotacao = async (p: number) => {
  setPercentagem(p); // Atualiza o visual do Admin na hora
  try {
    const { error } = await supabase
      .from('restaurante') // Nome da tabela que o cliente ouve
      .update({ taxa_ocupacao: p }) // Nome da coluna que o cliente ouve
      .eq('id', 1);
    
    if (error) throw error;
  } catch (error) {
    console.error("Erro ao atualizar lotação:", error);
    Alert.alert("Erro", "Não foi possível atualizar a base de dados.");
  }
};
  async function logout() {
    Alert.alert("Sair", "Tens a certeza?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => await supabase.auth.signOut() }
    ]);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.perfilRow}>
          <View style={styles.logoPequenoContainer}>
            <Image
              source={require('../imgs/Logotipo_1.png')} // Verifica se a extensão é .jpg ou .png
              style={styles.logoPequeno}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.saudacao}>Olá, <Text style={{ color: COLORS.orange }}>{adminNome}</Text>!</Text>
            <Text style={styles.subSaudacao}>Painel de Controlo</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btnLogout} onPress={logout}>
          <Ionicons name="power" size={22} color={COLORS.red} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* SECÇÃO DE LOTAÇÃO 0-100% */}
        <Text style={styles.sectionTitle}>Lotação em Tempo Real</Text>
        <View style={[styles.lotacaoCard, { borderLeftColor: getCorLotacao(percentagem) }]}>
          <View style={styles.lotacaoHeader}>
            <Text style={styles.lotacaoValue}>{percentagem}%</Text>
            <Text style={[styles.lotacaoStatus, { color: getCorLotacao(percentagem) }]}>
              {percentagem === 100 ? 'ESGOTADO' : percentagem >= 70 ? 'MUITO CHEIO' : 'DISPONÍVEL'}
            </Text>
          </View>

          {/* Barra Visual */}
          <View style={styles.barraFundo}>
            <View style={[styles.barraProgresso, { width: `${percentagem}%`, backgroundColor: getCorLotacao(percentagem) }]} />
          </View>

          {/* Seletor de 10 em 10 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seletorScroll}>
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => (
              <TouchableOpacity 
                key={p} 
                onPress={() => mudarLotacao(p)}
                style={[
                    styles.btnPercent, 
                    percentagem === p && { backgroundColor: getCorLotacao(p), borderColor: getCorLotacao(p) }
                ]}
              >
                <Text style={[styles.btnPercentText, percentagem === p && { color: '#FFF' }]}>{p}%</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Text style={styles.sectionTitle}>Gestão Rápida</Text>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.cardMenu} onPress={() => navigation.navigate('GestaoEmenta')}>
            <View style={styles.iconBox}>
              <Ionicons name="calendar" size={28} color={COLORS.orange} />
            </View>
            <Text style={styles.cardTitle}>Ementa Semanal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cardMenu} onPress={() => navigation.navigate('GestaoCatalogo')}>
            <View style={styles.iconBox}>
              <Ionicons name="restaurant" size={28} color={COLORS.orange} />
            </View>
            <Text style={styles.cardTitle}>Catálogo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cardMenu} onPress={() => navigation.navigate('GestaoUtilizadores')}>
            <View style={styles.iconBox}>
              <Ionicons name="people" size={28} color={COLORS.orange} />
            </View>
            <Text style={styles.cardTitle}>Utilizadores</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cardMenu} onPress={() => navigation.navigate('PortalCriticas')}>
            <View style={styles.iconBox}>
              <Ionicons name="star" size={28} color={COLORS.orange} />
            </View>
            <Text style={styles.cardTitle}>Críticas</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: COLORS.card, borderBottomWidth: 1, borderColor: COLORS.border },
  perfilRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoPequenoContainer: { width: 50, height: 50, backgroundColor: '#FFF', borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  logoPequeno: { width: '80%', height: '80%' },
  saudacao: { fontSize: 22, fontWeight: '900', color: '#121212' },
  subSaudacao: { fontSize: 11, color: COLORS.textSec, fontWeight: '700', textTransform: 'uppercase' },
  btnLogout: { backgroundColor: '#FFF5F5', padding: 10, borderRadius: 10 },
  scroll: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#121212', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  
  lotacaoCard: { backgroundColor: COLORS.card, padding: 20, borderRadius: 25, marginBottom: 30, borderLeftWidth: 8, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  lotacaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 15 },
  lotacaoValue: { fontSize: 36, fontWeight: '900', color: '#121212' },
  lotacaoStatus: { fontSize: 14, fontWeight: '800' },
  barraFundo: { height: 12, backgroundColor: '#F0F0F0', borderRadius: 6, overflow: 'hidden', marginBottom: 20 },
  barraProgresso: { height: '100%', borderRadius: 6 },
  seletorScroll: { flexDirection: 'row', paddingTop: 5 },
  btnPercent: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginRight: 8, backgroundColor: '#FFF' },
  btnPercentText: { fontWeight: '700', color: COLORS.textSec, fontSize: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardMenu: { width: '48%', backgroundColor: COLORS.card, padding: 20, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  iconBox: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10, backgroundColor: COLORS.orangeLight },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#121212' }
});