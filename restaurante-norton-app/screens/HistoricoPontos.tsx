import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Platform, StatusBar 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/TemaContexto';

export default function HistoricoPontos({ navigation }: any) {
  const { theme, isDark } = useTheme();
  
  const [saldo, setSaldo] = useState<number>(0);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosPontos();

    let subscription: any;

    const configurarRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      subscription = supabase.channel(`cliente_historico_pts_${user.id}`)
        .on(
          'postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'pontos', filter: `id_cliente=eq.${user.id}` }, 
          (payload: any) => { if (payload.new) setSaldo(payload.new.saldo); }
        )
        .on(
          'postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'log_pontos', filter: `cliente_id=eq.${user.id}` }, 
          () => carregarDadosPontos() // Atualiza a lista toda quando há um movimento novo
        )
        .subscribe();
    };

    configurarRealtime();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  async function carregarDadosPontos() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dadosSaldo, error: erroSaldo } = await supabase
        .from('pontos')
        .select('saldo')
        .eq('id_cliente', user.id)
        .single();

      if (!erroSaldo && dadosSaldo) {
        setSaldo(dadosSaldo.saldo);
      }

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
              <Text style={[styles.emptySub, { color: theme.textSec }]}>Ainda não tens histórico de pontos registado.</Text>
            </View>
          ) : (
            historico.map((log) => {
              // LÓGICA INTELIGENTE (Igual ao Admin)
              const isAtribuicao = log.quantidade > 0;
              const isResgate = log.quantidade < 0;
              const isUtilizacao = log.quantidade === 0;

              // Se houver nota guardada na BD mostra a nota, senão usa as labels padrão
              const labelHistorico = log.nota ? log.nota : (isAtribuicao ? "Pontos Atribuídos" : (isResgate ? "Resgate Voucher" : "Voucher Utilizado"));

              // Define os ícones e cores com base no tipo de movimento
              let iconName = "checkmark-done-outline";
              let iconColor = theme.orange;
              let iconBg = "rgba(255, 107, 0, 0.1)";

              if (isAtribuicao) {
                iconName = "arrow-down-outline";
                iconColor = "#2E7D32";
                iconBg = "rgba(46, 125, 50, 0.1)";
              } else if (isResgate) {
                iconName = "arrow-up-outline";
                iconColor = "#D32F2F";
                iconBg = "rgba(211, 47, 47, 0.1)";
              }

              return (
                <View key={log.id} style={[styles.cardLog, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                    <Ionicons name={iconName as any} size={20} color={iconColor} />
                  </View>
                  
                  <View style={styles.logInfo}>
                    <Text style={[styles.logTitulo, { color: theme.text }]} numberOfLines={2}>
                      {labelHistorico}
                    </Text>
                    <Text style={[styles.logData, { color: theme.textSec }]}>
                      {formatarData(log.created_at)}
                    </Text>
                  </View>
                  
                  {/* Se for 0 (Voucher na caixa), mostra um ícone de certo, senão mostra os pontos */}
                  {isUtilizacao ? (
                    <Ionicons name="checkmark-circle" size={24} color={theme.orange} />
                  ) : (
                    <Text style={[styles.logValor, { color: isAtribuicao ? "#2E7D32" : "#D32F2F" }]}>
                      {isAtribuicao ? '+' : ''}{log.quantidade} pts
                    </Text>
                  )}
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
    marginTop: 20, 
    zIndex: 1,      
    elevation: 10   
  },

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
  logInfo: { flex: 1, paddingRight: 10 },
  logTitulo: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  logData: { fontSize: 12, fontWeight: '500' },
  logValor: { fontSize: 16, fontWeight: '900' },

  emptyContainer: { alignItems: 'center', marginTop: 40, paddingHorizontal: 30 },
  emptyTitulo: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});