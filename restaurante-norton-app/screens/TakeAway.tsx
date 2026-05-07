import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, 
  TextInput, ScrollView, ActivityIndicator, Platform, StatusBar, Switch, Modal 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

// IMPORTAÇÃO DA NUVEM GLOBAL
import { useTheme } from '../components/TemaContexto';

const COR_NORTON = '#FF6B00';

export default function TakeAway({ navigation }: any) {
  const { theme } = useTheme();

  // Estados de Disponibilidade
  const [isAberto, setIsAberto] = useState(true);
  const [mensagemFecho, setMensagemFecho] = useState('');
  
  // Estados do Pedido
  const [pratos, setPratos] = useState<any[]>([]);
  const [loadingPratos, setLoadingPratos] = useState(true);
  const [loadingEnviar, setLoadingEnviar] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  
  // Estados de Extras
  const [precisaEmbalagem, setPrecisaEmbalagem] = useState(false); // 0,40€ por dose se ativo
  const [precisaSaco, setPrecisaSaco] = useState(false); // 0,20€ fixo se ativo

  // Estado do Modal de Horas
  const [modalHoraVisible, setModalHoraVisible] = useState(false);

  const horariosPossiveis = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30'];

  const mapeamentoDias: { [key: string]: number } = {
    'segunda': 1, 'segunda-feira': 1,
    'terça': 2, 'terça-feira': 2,
    'quarta': 3, 'quarta-feira': 3,
    'quinta': 4, 'quinta-feira': 4,
    'sexta': 5, 'sexta-feira': 5,
    'sábado': 6, 'sabado': 6,
    'domingo': 0
  };

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoadingPratos(true);

      const { data: rest } = await supabase.from('restaurante').select('*').eq('id', 1).maybeSingle();
      
      let abertoHoje = true;
      let msg = '';

      if (rest) {
        const diasMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        const hojeJS = new Date().getDay();
        const diaKey = diasMap[hojeJS];

        if (rest.is_ferias) {
          abertoHoje = false;
          msg = 'Estamos de Férias!\nO serviço de Take-Away encontra-se suspenso.';
        } else if (rest.horario_json?.[diaKey]?.aberto === false) {
          abertoHoje = false;
          msg = 'Hoje estamos encerrados.\nO serviço de Take-Away não está disponível.';
        }
      }

      setIsAberto(abertoHoje);
      setMensagemFecho(msg);

      if (!abertoHoje) {
        setLoadingPratos(false);
        return;
      }

      const { data: ementasData, error } = await supabase.from('ementas').select(`
        id, dia_semana,
        prato:pratos!prato_id ( id, nome, preco, imagem_url )
      `);

      if (error) throw error;

      if (ementasData) {
        const hojeJS = new Date().getDay();
        
        const pratosDeHoje = ementasData
          .filter(item => {
            const diaNome = (item.dia_semana || '').trim().toLowerCase();
            return mapeamentoDias[diaNome] === hojeJS;
          })
          .map((item: any) => {
            const p = Array.isArray(item.prato) ? item.prato[0] : item.prato;
            return p ? { ...p, quantidade: 0 } : null;
          })
          .filter(p => p !== null);

        if (pratosDeHoje.length === 0) {
          setIsAberto(false);
          setMensagemFecho('A ementa de hoje ainda está a ser preparada!\nVolta a tentar mais tarde.');
        } else {
          setPratos(pratosDeHoje);
        }
      }
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível carregar o sistema de Take-Away.");
    } finally {
      setLoadingPratos(false);
    }
  }

  const atualizarQuantidade = (id: any, operacao: 'mais' | 'menos') => {
    setPratos(prev => prev.map(p => {
      if (p.id === id) {
        const novaQtd = operacao === 'mais' ? p.quantidade + 1 : Math.max(0, p.quantidade - 1);
        return { ...p, quantidade: novaQtd };
      }
      return p;
    }));
  };

  const calcularTotal = () => {
    let totalBase = pratos.reduce((acc, p) => acc + (Number(p.preco) * p.quantidade), 0);
    const totalDoses = pratos.reduce((acc, p) => acc + p.quantidade, 0);

    // Se há pratos e o cliente pediu embalagens, cobra 0.40€ por cada dose
    if (totalDoses > 0 && precisaEmbalagem) {
      totalBase += totalDoses * 0.40;
    }
    // Se há pratos e precisa de saco, cobra 0.20€
    if (totalDoses > 0 && precisaSaco) {
      totalBase += 0.20;
    }

    return totalBase.toFixed(2);
  };

  // PASSO 1: O utilizador clica em Confirmar no Footer
  const iniciarCheckout = () => {
    const selecionados = pratos.filter(p => p.quantidade > 0);
    if (selecionados.length === 0) {
      return Alert.alert("Carrinho Vazio", "Por favor, seleciona pelo menos um prato antes de encomendar.");
    }
    setModalHoraVisible(true);
  };

  // PASSO 2: O utilizador escolhe a hora no Modal, que lança o alerta de confirmação
  const escolherHora = (hora: string) => {
    setModalHoraVisible(false); // Fecha o modal primeiro
    
    setTimeout(() => {
      Alert.alert(
        "Confirmar Pedido",
        `Vais efetuar o pedido para levantamento às ${hora}.\nTotal a pagar: ${calcularTotal()}€.\n\nQueres confirmar a encomenda?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Sim, encomendar", style: "default", onPress: () => processarPedidoBD(hora) }
        ]
      );
    }, 400); 
  };

  // PASSO 3: O pedido é efetivamente enviado para o Supabase
  const processarPedidoBD = async (horaEscolhida: string) => {
    setLoadingEnviar(true);
    try {
      const selecionados = pratos.filter(p => p.quantidade > 0);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sessão expirada. Inicia sessão novamente.");

      const resumoPratos = selecionados.map(p => `${p.quantidade}x ${p.nome}`).join(', ');
      const totalQtd = selecionados.reduce((acc, p) => acc + p.quantidade, 0);
      
      let notasFinais = `Take-Away: ${precisaEmbalagem ? 'Sim' : 'Não'} | Saco: ${precisaSaco ? 'Sim' : 'Não'}`;
      if (observacoes.trim()) notasFinais += `\nObs: ${observacoes.trim()}`;

      const { error: insertError } = await supabase.from('pedidos').insert([{
        cliente_id: user.id,
        prato_nome: resumoPratos + `\n${notasFinais}`,
        quantidade: totalQtd,
        total_preco: parseFloat(calcularTotal()),
        hora_recolha: horaEscolhida,
        status: 'pendente'
      }]);

      if (insertError) throw new Error(`Erro na base de dados: ${insertError.message}`);

      // Alerta de sucesso seguido de navegação
      Alert.alert(
        "Pedido Confirmado! 🛍️", 
        "Podes acompanhar o estado do teu pedido no histórico de pedidos.",
        [{ 
          text: "OK", 
          onPress: () => {
            setPratos(prev => prev.map(p => ({ ...p, quantidade: 0 })));
            setObservacoes('');
            setPrecisaEmbalagem(false);
            setPrecisaSaco(false);
            navigation.navigate('HistoricoPedidos'); 
          }
        }]
      );
      
    } catch (err: any) {
      Alert.alert("Erro no Envio", err.message || "Ocorreu um erro inesperado.");
    } finally {
      setLoadingEnviar(false);
    }
  };

  // ECRÃ DE BLOQUEIO (Encerrado/Férias)
  if (!loadingPratos && !isAberto) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.orange} />
        <View style={[styles.headerLaranja, { backgroundColor: theme.orange, paddingBottom: 30 }]}>
          <View style={styles.topRow}>
            <Text style={styles.tituloHeader}>Take-Away</Text>
          </View>
        </View>
        <View style={styles.encerradoContainer}>
          <View style={[styles.iconeFechadoBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="storefront-outline" size={60} color={theme.textSec} />
          </View>
          <Text style={[styles.tituloFechado, { color: theme.text }]}>Serviço Indisponível</Text>
          <Text style={[styles.msgFechado, { color: theme.textSec }]}>{mensagemFecho}</Text>
          <TouchableOpacity style={[styles.btnVoltarMenu, { backgroundColor: theme.orange }]} onPress={() => navigation.goBack()}>
            <Text style={styles.btnVoltarMenuTxt}>Voltar ao Início</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ECRÃ NORMAL
  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.orange} />
      
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 260 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerLaranja, { backgroundColor: theme.orange }]}>
          <View style={styles.topRow}>
            <Text style={styles.tituloHeader}>Take-Away</Text>
          </View>
          <Text style={styles.subTituloHeader}>Realiza a tua encomenda</Text>
        </View>

        <View style={styles.body}>

          <Text style={[styles.seccaoTitulo, { color: theme.text, marginTop: 10 }]}>Pratos do Dia</Text>
          {loadingPratos ? (
            <ActivityIndicator color={theme.orange} size="large" style={{ marginTop: 20 }} />
          ) : (
            pratos.map((item) => (
              <View key={item.id} style={[styles.cardPrato, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nomePrato, { color: theme.text }]}>{item.nome}</Text>
                  <Text style={[styles.precoPrato, { color: theme.orange }]}>{Number(item.preco).toFixed(2)}€</Text>
                </View>
                <View style={styles.contador}>
                  <TouchableOpacity onPress={() => atualizarQuantidade(item.id, 'menos')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="remove-circle-outline" size={32} color={item.quantidade > 0 ? theme.orange : theme.border} />
                  </TouchableOpacity>
                  <Text style={[styles.qtdText, { color: theme.text }]}>{item.quantidade}</Text>
                  <TouchableOpacity onPress={() => atualizarQuantidade(item.id, 'mais')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="add-circle" size={32} color={theme.orange} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <Text style={[styles.seccaoTitulo, { color: theme.text, marginTop: 15 }]}>Opções Adicionais</Text>
          <View style={[styles.cardExtras, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.extraLinha}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.extraTitulo, { color: theme.text }]}>Necessito de Take-Away</Text>
                <Text style={[styles.extraSub, { color: theme.textSec }]}>Custo de 0,40€/dose</Text>
              </View>
              <Switch 
                value={precisaEmbalagem} 
                onValueChange={setPrecisaEmbalagem} 
                trackColor={{ false: theme.border, true: '#f3cba8' }} 
                thumbColor={precisaEmbalagem ? COR_NORTON : '#f4f3f4'} 
              />
            </View>
            <View style={[styles.divisor, { backgroundColor: theme.border }]} />
            <View style={styles.extraLinha}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.extraTitulo, { color: theme.text }]}>Necessito de Saco</Text>
                <Text style={[styles.extraSub, { color: theme.textSec }]}>Custo de 0,20€/uni</Text>
              </View>
              <Switch 
                value={precisaSaco} 
                onValueChange={setPrecisaSaco} 
                trackColor={{ false: theme.border, true: '#f3cba8' }} 
                thumbColor={precisaSaco ? COR_NORTON : '#f4f3f4'} 
              />
            </View>
          </View>

          <TextInput
            style={[styles.inputObs, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder="Observações adicionais (ex: alergias, preferências, etc.)"
            placeholderTextColor={theme.textSec}
            multiline
            numberOfLines={4}
            value={observacoes}
            onChangeText={setObservacoes}
          />
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={[styles.footer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.footerInfo}>
          <Text style={[styles.totalLabel, { color: theme.textSec }]}>TOTAL A PAGAR</Text>
          <Text style={[styles.totalTxt, { color: theme.text }]}>{calcularTotal()}€</Text>
        </View>
        <TouchableOpacity style={[styles.btn, loadingEnviar && { opacity: 0.7 }, { backgroundColor: theme.orange }]} onPress={iniciarCheckout} disabled={loadingEnviar}>
          {loadingEnviar ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.btnContent}>
               <Text style={styles.btnTxt}>Efetuar Encomenda</Text>
               <Ionicons name="basket" size={20} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL DE SELEÇÃO DE HORA */}
      <Modal visible={modalHoraVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Hora de Recolha</Text>
            <Text style={[styles.modalSub, { color: theme.textSec }]}>A que horas pretendes levantar o teu pedido no restaurante?</Text>
            
            <View style={styles.gridHoras}>
              {horariosPossiveis.map(hora => (
                <TouchableOpacity 
                  key={hora} 
                  style={[styles.modalHoraBtn, { backgroundColor: theme.card, borderColor: theme.border }]} 
                  onPress={() => escolherHora(hora)}
                >
                  <Text style={[styles.modalHoraTxt, { color: theme.text }]}>{hora}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: theme.border }]} onPress={() => setModalHoraVisible(false)}>
              <Text style={[styles.modalCancelTxt, { color: theme.textSec }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  
  body: { 
    paddingHorizontal: 20, 
    marginTop: 20 
  },
  
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tituloHeader: { fontSize: 22, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  subTituloHeader: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 10, textAlign: 'center', fontWeight: '500' },
  
  seccaoTitulo: { fontSize: 16, fontWeight: '800', marginBottom: 12, marginLeft: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  cardPrato: { padding: 18, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, elevation: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4 },
  nomePrato: { fontWeight: '700', fontSize: 16 },
  precoPrato: { fontWeight: '800', marginTop: 4, fontSize: 15 },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtdText: { fontWeight: '900', fontSize: 18, minWidth: 25, textAlign: 'center' },
  
  cardExtras: { borderRadius: 20, padding: 15, borderWidth: 1, marginBottom: 15 },
  extraLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  extraTitulo: { fontSize: 15, fontWeight: 'bold' },
  extraSub: { fontSize: 12, marginTop: 2 },
  divisor: { height: 1, width: '100%', marginVertical: 10 },

  inputObs: { borderRadius: 20, padding: 15, marginBottom: 5, minHeight: 150, textAlignVertical: 'top', borderWidth: 1 },
  
  footer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 85 : 80, width: '100%', paddingHorizontal: 25, paddingTop: 20, paddingBottom: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderBottomWidth: 0 },
  footerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  totalLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  totalTxt: { fontSize: 26, fontWeight: '900' },
  btn: { paddingVertical: 18, borderRadius: 22, elevation: 4, shadowOpacity: 0.2, shadowRadius: 5 },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnTxt: { color: '#FFF', fontWeight: '900', letterSpacing: 1, fontSize: 15 },

  encerradoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, marginTop: -50 },
  iconeFechadoBox: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginBottom: 20 },
  tituloFechado: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  msgFechado: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  btnVoltarMenu: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25 },
  btnVoltarMenuTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 25, padding: 25, borderWidth: 1, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  modalTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 5 },
  modalSub: { fontSize: 14, textAlign: 'center', marginBottom: 25, lineHeight: 20 },
  gridHoras: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  modalHoraBtn: { width: '48%', paddingVertical: 15, borderRadius: 15, borderWidth: 1, marginBottom: 15, alignItems: 'center' },
  modalHoraTxt: { fontSize: 16, fontWeight: 'bold' },
  modalCancelBtn: { marginTop: 10, paddingVertical: 15, borderRadius: 15, borderWidth: 1, alignItems: 'center' },
  modalCancelTxt: { fontSize: 15, fontWeight: 'bold' }
});