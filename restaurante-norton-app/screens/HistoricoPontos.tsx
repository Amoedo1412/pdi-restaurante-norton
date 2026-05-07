import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Platform, StatusBar 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/TemaContexto';

const COR_NORTON = '#FF6B00';

export default function HistoricoPontos({ navigation }: any) {
  const { theme } = useTheme();
  
  const [saldo, setSaldo] = useState<number>(0);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosPontos();
  }, []);

  async function carregarDadosPontos() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Ir buscar o saldo atual à tabela 'pontos'
      const { data: dadosSaldo, error: erroSaldo } = await supabase
        .from('pontos')
        .select('saldo')
        .eq('id_cliente', user.id)
        .single();

      if (!erroSaldo && dadosSaldo) {
        setSaldo(dadosSaldo.saldo);
      }

      // 2. Ir buscar o histórico de movimentos à tabela 'log_pontos'
      const { data: dadosLogs, error: erroLogs } = await supabase
        .from('log_pontos')
        .select('*')
        .eq('cliente_id', user.id)
        .order('created_at', { ascending: false });

      if (!erroLogs && dadosLogs) {
        setHistorico(dadosLogs);
      }
      
    } catch (error) {
      console.error("Erro ao carregar pontos:", error);
    } finally {
      setLoading(false);
    }
  }

  // Formatar a data (ex: 15/05/2026 às 12:30)
  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const ano = data.getFullYear();
    const hora = data.getHours().toString().padStart(2, '0');
    const min = data.getMinutes().toString().padStart(2, '0');
    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.orange} />
      
      <View style={[styles.headerLaranja, { backgroundColor: theme.orange }]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={30} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.tituloHeader}>Histórico de Pontos</Text>
          <View style={{ width: 30 }} />
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>          
          {loading ? (
            <ActivityIndicator color={theme.orange} size="large" style={{ marginTop: 40 }} />
          ) : historico.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="swap-vertical-outline" size={60} color={theme.border} />
              <Text style={[styles.emptyTitulo, { color: theme.text }]}>Sem movimentos</Text>
              <Text style={[styles.emptySub, { color: theme.textSec }]}>Ainda não tem histórico de pontos registado.</Text>
            </View>
          ) : (
            historico.map((log) => {
              const isGanho = log.quantidade > 0;
              
              return (
                <View key={log.id} style={[styles.cardLog, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={[styles.iconBox, { backgroundColor: isGanho ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)' }]}>
                    <Ionicons 
                      name={isGanho ? "arrow-down-outline" : "arrow-up-outline"} 
                      size={20} 
                      color={isGanho ? "#2E7D32" : "#D32F2F"} 
                    />
                  </View>
                  
                  <View style={styles.logInfo}>
                    <Text style={[styles.logTitulo, { color: theme.text }]}>
                      {isGanho ? 'Pontos Atribuídos' : 'Resgate de Voucher'}
                    </Text>
                    <Text style={[styles.logData, { color: theme.textSec }]}>
                      {formatarData(log.created_at)}
                    </Text>
                  </View>
                  
                  <Text style={[styles.logValor, { color: isGanho ? "#2E7D32" : "#D32F2F" }]}>
                    {isGanho ? '+' : ''}{log.quantidade} pts
                  </Text>
                </View>
              );
            })
          )}
          
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  container: { flex: 1 },
  
  headerLaranja: { 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingHorizontal: 20, 
    paddingBottom: 25, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40 
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tituloHeader: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  
  body: { 
    paddingHorizontal: 20, 
    marginTop: 20, // Mantemos o negativo para ele subir para cima do laranja
    zIndex: 1,      // Obriga o conteúdo a ficar por cima do cabeçalho
    elevation: 10   // Obriga o conteúdo a ficar por cima do cabeçalho (em Android)
  },

  // CARTÃO DE SALDO
  cardSaldo: { 
    borderRadius: 25, 
    borderWidth: 1, 
    padding: 25, 
    alignItems: 'center', 
    marginBottom: 30, 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 10 
  },
  iconeSaldoBox: { 
    width: 60, height: 60, 
    borderRadius: 30, 
    backgroundColor: 'rgba(255, 107, 0, 0.1)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  saldoLabel: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  saldoValor: { fontSize: 40, fontWeight: '900' },
  saldoPts: { fontSize: 20, fontWeight: '600' },

  seccaoTitulo: { fontSize: 16, fontWeight: '800', marginBottom: 15, marginLeft: 5, textTransform: 'uppercase', letterSpacing: 0.5 },

  // LISTA DE LOGS
  cardLog: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    borderRadius: 20, 
    borderWidth: 1, 
    marginBottom: 12, 
    elevation: 1, 
    shadowColor: '#000', 
    shadowOpacity: 0.02, 
    shadowRadius: 4 
  },
  iconBox: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  logInfo: { flex: 1 },
  logTitulo: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  logData: { fontSize: 12, fontWeight: '500' },
  logValor: { fontSize: 16, fontWeight: '900' },

  emptyContainer: { alignItems: 'center', marginTop: 40, paddingHorizontal: 30 },
  emptyTitulo: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});