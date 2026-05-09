import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  StatusBar, ActivityIndicator, Platform, Alert, TextInput
} from 'react-native';
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
  green: '#34C759',
  blue: '#007AFF',
  black: '#121212'
};

export default function Pedidos() {
  const [pedidosAtivos, setPedidosAtivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [abaAtiva, setAbaAtiva] = useState<'ativos' | 'historico'>('ativos');
  const [busca, setBusca] = useState('');
  const [ordenarPorTempo, setOrdenarPorTempo] = useState<'recente' | 'recolha'>('recente');

  useEffect(() => {
    carregarPedidos();
    
    const sub = supabase.channel('pedidos_admin')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'pedidos' }, 
        () => carregarPedidos()
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  async function carregarPedidos() {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        perfis:cliente_id (nome, telemovel)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao carregar pedidos:", error.message);
      setLoading(false);
      return;
    }

    if (data) setPedidosAtivos(data);
    setLoading(false);
  }

  const confirmarAcao = (id: string, novoStatus: string, mensagemBotao: string) => {
    Alert.alert(
      "Confirmar Ação",
      `Tens a certeza que queres ${mensagemBotao.toLowerCase()}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim, Confirmar", onPress: () => atualizarStatus(id, novoStatus) }
      ]
    );
  };

  async function atualizarStatus(id: string, novoStatus: string) {
    const { error } = await supabase
      .from('pedidos')
      .update({ status: novoStatus })
      .eq('id', id);
    
    if (error) {
      Alert.alert('Erro de Permissão', error.message);
    } else {
      carregarPedidos();
    }
  }

  const processarLista = () => {
    let listaVisivel = pedidosAtivos.filter(p => {
      if (abaAtiva === 'ativos' && p.status === 'concluido') return false;
      if (abaAtiva === 'historico' && p.status !== 'concluido') return false;

      if (busca.trim() !== '') {
        const termo = busca.toLowerCase();
        const nomeCliente = p.perfis?.nome?.toLowerCase() || '';
        const tlmCliente = p.perfis?.telemovel || '';
        if (!nomeCliente.includes(termo) && !tlmCliente.includes(termo)) {
          return false;
        }
      }
      return true;
    });

    listaVisivel.sort((a, b) => {
      if (ordenarPorTempo === 'recente') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        const horaA = a.hora_recolha || '23:59';
        const horaB = b.hora_recolha || '23:59';
        return horaA.localeCompare(horaB);
      }
    });

    return listaVisivel;
  };

  const getConfigStatus = (status: string) => {
    switch (status) {
      case 'pendente': return { corBg: '#FFF3E0', corTxt: '#E65100', texto: 'PENDENTE', btnTexto: 'CONFIRMAR PEDIDO', btnCor: COLORS.orange, proxStatus: 'confirmado', iconeBtn: 'flame' };
      case 'confirmado': return { corBg: '#E3F2FD', corTxt: COLORS.blue, texto: 'NA COZINHA', btnTexto: 'MARCAR COMO PRONTO', btnCor: COLORS.orange, proxStatus: 'pronto', iconeBtn: 'bag-check' };
      case 'pronto': return { corBg: '#E8F5E9', corTxt: COLORS.green, texto: 'AGUARDA CLIENTE', btnTexto: 'CONCLUIR ENTREGA', btnCor: COLORS.orange, proxStatus: 'concluido', iconeBtn: 'checkmark-done' };
      case 'concluido': return { corBg: '#F2F2F7', corTxt: COLORS.textSec, texto: 'CONCLUÍDO', btnTexto: '', btnCor: '', proxStatus: '', iconeBtn: '' };
      default: return { corBg: '#FFF3E0', corTxt: '#E65100', texto: 'PENDENTE', btnTexto: 'CONFIRMAR', btnCor: COLORS.orange, proxStatus: 'confirmado', iconeBtn: 'flame' };
    }
  };

  // Função para extrair apenas a hora e os minutos de uma data completa
  const formatarHora = (dataString: string) => {
    if (!dataString) return '--:--';
    const data = new Date(dataString);
    const hora = data.getHours().toString().padStart(2, '0');
    const min = data.getMinutes().toString().padStart(2, '0');
    return `${hora}:${min}`;
  };

  const listaFiltrada = processarLista();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      <View style={styles.header}>
        <Text style={styles.titulo}>Gestão de Encomendas</Text>
        
        <View style={styles.toolsRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={COLORS.textSec} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Pesquisar cliente ou telemóvel..."
              placeholderTextColor={COLORS.textSec}
              value={busca}
              onChangeText={setBusca}
            />
            {busca !== '' && (
              <TouchableOpacity onPress={() => setBusca('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSec} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.btnOrder, ordenarPorTempo === 'recolha' && { backgroundColor: COLORS.orangeLight, borderColor: COLORS.orange }]}
            onPress={() => setOrdenarPorTempo(prev => prev === 'recente' ? 'recolha' : 'recente')}
          >
            <Ionicons name="time-outline" size={22} color={ordenarPorTempo === 'recolha' ? COLORS.orange : COLORS.textSec} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, abaAtiva === 'ativos' && styles.tabAtiva]}
            onPress={() => setAbaAtiva('ativos')}
          >
            <Text style={[styles.tabText, abaAtiva === 'ativos' && styles.tabTextAtiva]}>Encomendas Ativas</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, abaAtiva === 'historico' && styles.tabAtiva]}
            onPress={() => setAbaAtiva('historico')}
          >
            <Text style={[styles.tabText, abaAtiva === 'historico' && styles.tabTextAtiva]}>Histórico Encomendas</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.orange} />
        </View>
      ) : (
        <FlatList
          data={listaFiltrada}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const config = getConfigStatus(item.status);
            const isNovo = item.status === 'pendente';
            
            const partes = item.prato_nome.split('\n');
            const comida = partes[0].split(', ').join('\n');
            const extrasENotas = partes.slice(1).join('\n');

            const nomeCli = Array.isArray(item.perfis) ? item.perfis[0]?.nome : item.perfis?.nome;
            const tlmCli = Array.isArray(item.perfis) ? item.perfis[0]?.telemovel : item.perfis?.telemovel;

            return (
              <View style={[styles.card, isNovo && { borderColor: COLORS.orange, borderWidth: 2 }]}>
                
                {/* CABEÇALHO DO CARTÃO: Info do Cliente na esquerda, Estado na direita */}
                <View style={styles.cardHeader}>
                  <View style={styles.clienteInfoRow}>
                    <View style={styles.avatarMini}>
                      <Text style={styles.avatarTxt}>{nomeCli ? nomeCli.charAt(0).toUpperCase() : '?'}</Text>
                    </View>
                    <View>
                      <Text style={styles.nomeCliente}>{nomeCli || 'Cliente Desconhecido'}</Text>
                      <Text style={styles.tlmCliente}>{tlmCli || 'Sem contacto'}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: config.corBg }]}>
                    <View style={[styles.dot, { backgroundColor: config.corTxt }]} />
                    <Text style={[styles.statusText, { color: config.corTxt }]}>
                      {config.texto}
                    </Text>
                  </View>
                </View>

                <View style={styles.separator} />

                {/* DETALHES DA COMIDA E NOTAS */}
                <Text style={styles.detalhesTxt}>{comida}</Text>

                {extrasENotas ? (
                  <View style={styles.boxNotas}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.orange} />
                    <Text style={styles.notasTxt}>{extrasENotas}</Text>
                  </View>
                ) : null}

                {/* BLOCO DE HORAS */}
                <View style={styles.timesContainer}>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={16} color={COLORS.textSec} />
                    <Text style={styles.timeLabel}>Encomenda feita:</Text>
                    <Text style={styles.timeBold}>{formatarHora(item.created_at)}</Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Ionicons name="alarm-outline" size={16} color={COLORS.textSec} />
                    <Text style={styles.timeLabel}>Agendado para:</Text>
                    <Text style={styles.timeBold}>{item.hora_recolha || '--:--'}</Text>
                  </View>
                </View>
                
                {/* RODAPÉ: Preço e Botão de Ação */}
                <View style={styles.footerCard}>
                  <View style={styles.priceRow}>
                    <Text style={styles.totalLabel}>Total a Receber</Text>
                    <Text style={styles.totalValue}>{parseFloat(item.total_preco || 0).toFixed(2)}€</Text>
                  </View>
                  
                  {abaAtiva === 'ativos' && (
                    <TouchableOpacity 
                      style={[styles.btnAcao, { backgroundColor: config.btnCor }]} 
                      onPress={() => confirmarAcao(item.id, config.proxStatus, config.btnTexto)}
                    >
                      <Text style={styles.btnText}>{config.btnTexto}</Text>
                      <Ionicons name={config.iconeBtn as any} size={16} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>

              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name={abaAtiva === 'ativos' ? "restaurant-outline" : "file-tray-outline"} size={60} color={COLORS.border} />
              <Text style={styles.vazio}>
                {abaAtiva === 'ativos' 
                  ? (busca ? "Nenhum pedido ativo encontrado." : "Sem encomnendas ativas no momento.") 
                  : "Ainda não há histórico de pedidos concluídos."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingHorizontal: 20, 
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderColor: COLORS.border
  },
  titulo: { fontSize: 26, fontWeight: '900', color: COLORS.text, marginBottom: 15 },
  
  toolsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  searchBox: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', 
    backgroundColor: COLORS.bg, borderRadius: 12, paddingHorizontal: 12, height: 46,
    borderWidth: 1, borderColor: COLORS.border
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  btnOrder: { 
    width: 46, height: 46, borderRadius: 12, backgroundColor: COLORS.bg, 
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center'
  },

  tabsContainer: { flexDirection: 'row', gap: 15, paddingBottom: 15 },
  tab: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, backgroundColor: COLORS.bg },
  tabAtiva: { backgroundColor: COLORS.black },
  tabText: { fontWeight: '600', color: COLORS.textSec },
  tabTextAtiva: { color: '#FFF' },
  
  card: { 
    backgroundColor: COLORS.card, borderRadius: 20, padding: 20, marginBottom: 15, 
    borderWidth: 1, borderColor: COLORS.border, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  
  clienteInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarMini: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.orangeLight, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 16, fontWeight: 'bold', color: COLORS.orange },
  nomeCliente: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  tlmCliente: { fontSize: 12, color: COLORS.textSec, marginTop: 2 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 6, marginLeft: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '900' },
  
  separator: { height: 1, backgroundColor: COLORS.bg, marginVertical: 15 },
  
  detalhesTxt: { fontSize: 16, color: COLORS.text, fontWeight: '700', lineHeight: 24, marginBottom: 10 },
  
  boxNotas: { flexDirection: 'row', backgroundColor: COLORS.orangeLight, padding: 12, borderRadius: 12, marginBottom: 15, gap: 8, alignItems: 'flex-start' },
  notasTxt: { fontSize: 13, color: '#C05000', fontWeight: '600', flex: 1, lineHeight: 18 },

  timesContainer: { backgroundColor: COLORS.bg, padding: 12, borderRadius: 12, marginBottom: 15, gap: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeLabel: { fontSize: 13, color: COLORS.textSec, flex: 1 },
  timeBold: { fontSize: 14, color: COLORS.black, fontWeight: '800' },

  footerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F2F2F7' },
  priceRow: { flexDirection: 'column' },
  totalLabel: { fontSize: 10, color: COLORS.textSec, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  totalValue: { fontSize: 18, fontWeight: '900', color: COLORS.black },

  btnAcao: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 15, gap: 8 },
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  
  empty: { alignItems: 'center', marginTop: 80 },
  vazio: { textAlign: 'center', marginTop: 15, color: COLORS.textSec, fontWeight: '600', paddingHorizontal: 20 }
});