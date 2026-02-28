import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [nome, setNome] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    carregarPerfil();
  }, []);

  async function carregarPerfil() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('perfis')
        .select('nome, tipo_utilizador')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setNome(data.nome || user.email?.split('@')[0] || 'Utilizador');
        setRole(data.tipo_utilizador);
      }
    }
    setLoading(false);
  }
  

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" color="#e67e22" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.cabecalho}>
        <Text style={styles.saudacao}>Olá, {nome} 👋</Text>
        <Text style={styles.titulo}>Centro de Controlo</Text>
      </View>

      <View style={styles.grid}>
        {/* Gestão de Utilizadores - Apenas para Administradores [cite: 28, 30] */}
        {role === 'admin' && (
          <TouchableOpacity 
            style={styles.cartao} 
            onPress={() => navigation.navigate('GestaoUtilizadores')}
          >
            <Ionicons name="people" size={40} color="#e67e22" />
            <Text style={styles.textoCartao}>Gestão de Utilizadores</Text>
          </TouchableOpacity>
        )}

        {/* Gestão de Catálogo - Acesso Geral da Equipa [cite: 29] */}
        <TouchableOpacity 
          style={styles.cartao} 
          onPress={() => navigation.navigate('GestaoCatalogo')}
        >
          <Ionicons name="fast-food" size={40} color="#e67e22" />
          <Text style={styles.textoCartao}>Gestão de Catálogo (Pratos)</Text>
        </TouchableOpacity>

        {/* Gestão de Ementa - Acesso Geral da Equipa [cite: 29] */}
        <TouchableOpacity 
          style={styles.cartao} 
          onPress={() => navigation.navigate('GestaoEmenta')}
        >
          <Ionicons name="calendar" size={40} color="#e67e22" />
          <Text style={styles.textoCartao}>Gestão de Ementa (Dias)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  cabecalho: { marginTop: 40, marginBottom: 30 },
  saudacao: { fontSize: 18, color: '#666' },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  grid: { gap: 15, marginBottom: 40 },
  cartao: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    elevation: 3, 
    gap: 15 
  },
  textoCartao: { fontSize: 18, fontWeight: '600', color: '#333', flex: 1 }
});