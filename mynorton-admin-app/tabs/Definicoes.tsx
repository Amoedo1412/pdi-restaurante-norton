import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export default function Definicoes() {
  const [role, setRole] = useState<string | null>(null);
  const [ocupacao, setOcupacao] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // 1. Verificar Cargo
      const { data: perfil } = await supabase.from('perfis').select('tipo_utilizador').eq('id', user.id).single();
      if (perfil) setRole(perfil.tipo_utilizador);

      // 2. Carregar Ocupação Atual
      const { data: rest } = await supabase.from('restaurante').select('taxa_ocupacao').single();
      if (rest) setOcupacao(rest.taxa_ocupacao);
    }
    setLoading(false);
  }

  async function atualizarOcupacao(valor: number) {
    const { error } = await supabase
      .from('restaurante')
      .update({ taxa_ocupacao: valor })
      .match({ id: 1 }); 
    
    if (!error) setOcupacao(valor);
    else Alert.alert("Erro", "Não foi possível atualizar a ocupação.");
  }

  const handleLogout = () => {
    Alert.alert("Sair", "Tens a certeza que queres terminar sessão?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", onPress: () => supabase.auth.signOut(), style: "destructive" }
    ]);
  };

  if (loading) return <View style={styles.container}><ActivityIndicator size="small" color="#e67e22" /></View>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Definições</Text>
      
      {/* SECÇÃO DE GESTÃO (Apenas para Staff) */}
      {(role === 'admin' || role === 'funcionario') && (
        <View style={styles.seccao}>
          <Text style={styles.label}>Gestão do Estabelecimento</Text>
          
          {/* Controle de Ocupação */}
          <Text style={styles.subLabel}>Taxa de Ocupação Atual: {ocupacao}%</Text>
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

          {/* Atalho para Portal de Críticas */}
          <TouchableOpacity 
            style={styles.itemMenu} 
            onPress={() => navigation.navigate('PortalCriticas')}
          >
            <Ionicons name="star-outline" size={24} color="#333" />
            <Text style={styles.textoItemMenu}>Críticas e Fotos</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      )}

      {/* SECÇÃO DE CONTA */}
      <View style={[styles.seccao, { marginTop: 20, marginBottom: 40 }]}>
        <Text style={styles.label}>Conta</Text>
        <TouchableOpacity style={styles.botaoLogout} onPress={handleLogout}>
          <Text style={styles.textoLogout}>Terminar Sessão (Logout)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  titulo: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, marginTop: 40, color: '#333' },
  seccao: { backgroundColor: '#fff', borderRadius: 12, padding: 15, elevation: 3 },
  label: { fontSize: 12, color: '#888', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  subLabel: { fontSize: 14, color: '#444', marginBottom: 10, fontWeight: '600' },
  botoesOcupacao: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  botaoMini: { padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e67e22', minWidth: 50, alignItems: 'center' },
  botaoAtivo: { backgroundColor: '#e67e22' },
  textoLaranja: { color: '#e67e22', fontWeight: 'bold' },
  textoBranco: { color: '#fff', fontWeight: 'bold' },
  itemMenu: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  textoItemMenu: { flex: 1, marginLeft: 15, fontSize: 16, color: '#333' },
  botaoLogout: { paddingVertical: 12, alignItems: 'center' },
  textoLogout: { color: '#ff3b30', fontSize: 16, fontWeight: '600' }
});