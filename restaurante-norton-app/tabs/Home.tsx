import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Adicionado
import { supabase } from '../lib/supabase';
import EstadoRestaurante from '../components/EstadoRestaurante';

export default function Home() {
  const [nome, setNome] = useState('Cliente');
  const navigation = useNavigation<any>(); // Adicionado

  useEffect(() => {
    // Monitorização de ocupação em tempo real
    const canalOcupacao = supabase
      .channel('alertas-lotacao')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'restaurante', filter: 'id=eq.1' }, 
        (payload) => {
          const novaOcupacao = payload.new.taxa_ocupacao;
          const ocupacaoAntiga = payload.old.taxa_ocupacao;

          // Lógica de notificação: se baixou de um estado crítico para disponível
          if (ocupacaoAntiga >= 75 && novaOcupacao < 50) {
            Alert.alert(
              "Mesa Disponível! 🍽️",
              "O Restaurante Norton já tem mesas livres. Aproveite para vir agora!",
              [
                { text: "Ver Ementa", onPress: () => navigation.navigate('Ementa') },
                { text: "OK" }
              ]
            );
          }
        }
      )
      .subscribe();

    obterPerfil();

    // Limpeza do canal ao sair do ecrã
    return () => {
      supabase.removeChannel(canalOcupacao);
    };
  }, []);

  async function obterPerfil() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('perfis').select('nome').eq('id', user.id).single();
      if (data?.nome) setNome(data.nome);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.ola}>Olá, {nome} 👋</Text>
        <Text style={styles.frase}>Pronto para uma refeição incrível?</Text>
      </View>

      <EstadoRestaurante />

      <View style={styles.seccao}>
        <Text style={styles.tituloSecao}>Sugestão do Chef</Text>
        <View style={styles.cardDestaque}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=600' }} 
            style={styles.imagemDestaque} 
          />
          <View style={styles.infoDestaque}>
            <Text style={styles.nomeDestaque}>Bacalhau com Broa</Text>
            <Text style={styles.precoDestaque}>10.00€</Text>
          </View>
        </View>
      </View>

      <View style={styles.horarioCard}>
        <Text style={styles.horarioTitulo}>Horário de Hoje</Text>
        <Text style={styles.horarioTexto}>12:00 - 15:00 | 19:00 - 22:30</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { padding: 25, paddingTop: 60, backgroundColor: '#fff' },
  ola: { fontSize: 18, color: '#e67e22', fontWeight: 'bold' },
  frase: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 5 },
  seccao: { padding: 20 },
  tituloSecao: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  cardDestaque: { backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', elevation: 4 },
  imagemDestaque: { width: '100%', height: 180 },
  infoDestaque: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nomeDestaque: { fontSize: 18, fontWeight: 'bold' },
  precoDestaque: { fontSize: 18, color: '#2ecc71', fontWeight: 'bold' },
  horarioCard: { margin: 20, padding: 20, backgroundColor: '#333', borderRadius: 15, alignItems: 'center' },
  horarioTitulo: { color: '#e67e22', fontWeight: 'bold', marginBottom: 5 },
  horarioTexto: { color: '#fff', fontSize: 14 }
});