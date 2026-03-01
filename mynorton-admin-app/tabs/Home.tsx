import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [nome, setNome] = useState('');
  const [ocupacao, setOcupacao] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    async function carregarDados() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Carregar Nome
        const { data: perfil } = await supabase.from('perfis').select('nome').eq('id', user.id).single();
        setNome(perfil?.nome || user.email?.split('@')[0] || 'Utilizador');

        // 2. Carregar Ocupação Atual
        const { data: rest } = await supabase.from('restaurante').select('taxa_ocupacao').single();
        if (rest) setOcupacao(rest.taxa_ocupacao);
      }
      setLoading(false);
    }
    carregarDados();
  }, []);

  async function atualizarOcupacao(valor: number) {
    const { error } = await supabase
      .from('restaurante')
      .update({ taxa_ocupacao: valor })
      .match({ id: 1 }); 
    
    if (!error) setOcupacao(valor);
    else Alert.alert("Erro", "Não foi possível atualizar a ocupação.");
  }

  if (loading) return <View style={styles.containerCentrado}><ActivityIndicator size="large" color="#e67e22" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.cabecalho}>
        <Text style={styles.saudacao}>Olá, {nome} 👋</Text>
        <Text style={styles.titulo}>Centro de Controlo</Text>
      </View>

      {/* NOVA SECÇÃO: GESTÃO DE LOTAÇÃO NO TOPO */}
      <View style={styles.cartaoLotacao}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <Ionicons name="pie-chart" size={24} color="#e67e22" style={{ marginRight: 10 }} />
          <Text style={styles.tituloLotacao}>Lotação Atual do Restaurante: {ocupacao}%</Text>
        </View>
        <View style={styles.botoesOcupacao}>
          {[0, 25, 50, 75, 100].map((valor) => (
            <TouchableOpacity 
              key={valor} 
              style={[styles.botaoMini, ocupacao === valor && styles.botaoAtivo]}
              onPress={() => atualizarOcupacao(valor)}
            >
              <Text style={ocupacao === valor ? styles.textoBranco : styles.textoLaranja}>{valor}%</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.cartao} onPress={() => navigation.navigate('GestaoUtilizadores')}>
          <Ionicons name="people" size={40} color="#e67e22" />
          <Text style={styles.textoCartao}>Gestão de Utilizadores</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cartao} onPress={() => navigation.navigate('GestaoCatalogo')}>
          <Ionicons name="restaurant" size={40} color="#e67e22" />
          <Text style={styles.textoCartao}>Gestão de Pratos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cartao} onPress={() => navigation.navigate('GestaoEmenta')}>
          <Ionicons name="calendar" size={40} color="#e67e22" />
          <Text style={styles.textoCartao}>Ementa Semanal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cartao} onPress={() => navigation.navigate('PortalCriticas')}>
          <Ionicons name="star" size={40} color="#e67e22" />
          <Text style={styles.textoCartao}>Portal de Críticas</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  containerCentrado: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' },
  cabecalho: { marginTop: 40, marginBottom: 20 },
  saudacao: { fontSize: 18, color: '#666', marginBottom: 5 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  
  /* Estilos do Cartão de Lotação */
  cartaoLotacao: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  tituloLotacao: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  botoesOcupacao: { flexDirection: 'row', justifyContent: 'space-between' },
  botaoMini: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e67e22', minWidth: 50, alignItems: 'center' },
  botaoAtivo: { backgroundColor: '#e67e22' },
  textoLaranja: { color: '#e67e22', fontWeight: 'bold', fontSize: 16 },
  textoBranco: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  /* Estilos da Grid original */
  grid: { gap: 15 },
  cartao: { backgroundColor: '#fff', padding: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, gap: 15 },
  textoCartao: { fontSize: 18, fontWeight: '600', color: '#333', flex: 1 }
});