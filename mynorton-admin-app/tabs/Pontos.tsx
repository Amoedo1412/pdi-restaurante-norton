import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  Modal, Alert, ScrollView, Platform, ActivityIndicator, StatusBar 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/TemaContexto';

export default function Pontos() {
  const { theme, isDark } = useTheme();
  const [busca, setBusca] = useState('');
  const [cliente, setCliente] = useState<any>(null);
  const [saldoAtual, setSaldoAtual] = useState<number>(0);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [abaVouchers, setAbaVouchers] = useState<'ativos' | 'historico'>('ativos');
  const [valorFatura, setValorFatura] = useState('');
  
  const [scanner, setScanner] = useState(false);
  const isScanning = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (!cliente?.id) return;

    const subscription = supabase.channel(`admin_cliente_${cliente.id}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'vouchers', filter: `perfil_id=eq.${cliente.id}` }, 
        () => carregarDadosAdicionais(cliente.id)
      )
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'pontos', filter: `id_cliente=eq.${cliente.id}` }, 
        (payload: any) => { if (payload.new) setSaldoAtual(payload.new.saldo); }
      )
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'log_pontos', filter: `cliente_id=eq.${cliente.id}` }, 
        () => carregarDadosAdicionais(cliente.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [cliente?.id]);

  async function buscarCliente(termoBusca: string) {
    const limpo = termoBusca.trim();
    if (!limpo) return;
    
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminLogado = authData?.user;

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(limpo);
      
      let query = supabase.from('perfis').select('*');
      if (isUUID) {
        query = query.eq('id', limpo);
      } else {
        query = query.eq('telemovel', limpo);
      }

      const { data: perfilData } = await query.maybeSingle();
      
      if (!perfilData) {
        Alert.alert("Não Encontrado", "Cliente não encontrado. Verifica o número ou código QR.");
        setLoading(false);
        return;
      }

      if (adminLogado?.id === perfilData.id) {
        Alert.alert("Ação Bloqueada 🛑", "Não podes gerir os teus próprios pontos.");
        setLoading(false);
        return;
      }

      setCliente(perfilData);

      const { data: saldoData } = await supabase.from('pontos').select('saldo').eq('id_cliente', perfilData.id).maybeSingle();
      setSaldoAtual(saldoData?.saldo || 0);

      carregarDadosAdicionais(perfilData.id);

    } catch (err) { 
      Alert.alert("Erro", "Erro ao ligar à base de dados."); 
    } finally { 
      setLoading(false); 
    }
  }

  async function carregarDadosAdicionais(clienteId: string) {
    const { data: vAtivos } = await supabase
      .from('vouchers')
      .select('*')
      .eq('perfil_id', clienteId)
      .eq('usado', false);
    
    if (vAtivos) setVouchers(vAtivos);

    const { data: logs } = await supabase
      .from('log_pontos')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });
    
    if (logs) setHistorico(logs);
  }

  async function processarFatura() {
    if (!cliente || !valorFatura) return;
    const valorEur = parseFloat(valorFatura.replace(',', '.'));
    if (isNaN(valorEur) || valorEur <= 0) return Alert.alert("Valor Inválido", "Insere um valor correto.");

    const pontosGanhos = Math.floor(valorEur);
    
    Alert.alert("Confirmar", `Atribuir ${pontosGanhos} pontos?`, [
      { text: "Cancelar" },
      { text: "Confirmar", onPress: () => atribuirPontos(pontosGanhos) }
    ]);
  }

  async function atribuirPontos(pontos: number) {
    setProcessando(true);
    const novoSaldo = saldoAtual + pontos;
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('pontos').upsert({ id_cliente: cliente.id, saldo: novoSaldo });
    await supabase.from('log_pontos').insert({ 
      cliente_id: cliente.id, 
      admin_id: user?.id, 
      quantidade: pontos,
      nota: 'Atribuição de pontos na fatura'
    });

    setSaldoAtual(novoSaldo);
    setValorFatura('');
    carregarDadosAdicionais(cliente.id);
    setProcessando(false);
    Alert.alert("Sucesso", "Pontos atribuídos!");
  }

  const utilizarVoucher = async (voucher: any) => {
    Alert.alert("Usar Voucher", `Confirmas a utilização da oferta "${voucher.titulo}" na caixa?`, [
      { text: "Não" },
      { text: "Sim, Usar", style: 'destructive', onPress: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('vouchers').update({ usado: true }).eq('id', voucher.id);
        
        if (!error) {
          // Inserção no log a incluir o nome específico do voucher usado
          await supabase.from('log_pontos').insert({ 
            cliente_id: cliente.id, 
            admin_id: user?.id,
            quantidade: 0, 
            nota: `Utilizou: ${voucher.titulo}` 
          });
          
          carregarDadosAdicionais(cliente.id);
          Alert.alert("Sucesso", "Voucher descontado com sucesso!");
        }
      }}
    ]);
  };

  const limparCliente = () => {
    setCliente(null);
    setBusca('');
    setSaldoAtual(0);
    setVouchers([]);
    setHistorico([]);
    setValorFatura('');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <Modal visible={scanner} animationType="fade">
        <View style={styles.cameraFull}>
          <CameraView 
            style={StyleSheet.absoluteFillObject} 
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => { 
              if (isScanning.current) return;
              isScanning.current = true;
              setScanner(false);
              buscarCliente(data);
            }}
          />
          <View style={styles.overlay}>
            <View style={[styles.target, { borderColor: theme.orange }]} />
            <Text style={styles.scanText}>Lê o código do cliente</Text>
            <TouchableOpacity style={styles.closeScan} onPress={() => { isScanning.current = false; setScanner(false); }}>
              <Ionicons name="close" size={30} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.titulo, { color: theme.text }]}>Pontos & Vouchers</Text>
        <View style={styles.searchRow}>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.bg, color: '#FF0000', borderColor: theme.border }]}
            placeholder="Nº Telemóvel..." 
            placeholderTextColor={theme.subText}
            value={busca} onChangeText={setBusca} keyboardType="numeric"
          />
          <TouchableOpacity style={[styles.btnBlack, { backgroundColor: isDark ? '#333' : '#000' }]} onPress={() => buscarCliente(busca)}>
            <Ionicons name="search" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnOrange, { backgroundColor: theme.orange }]} onPress={async () => { 
            const { granted } = await requestPermission(); 
            if (granted) { isScanning.current = false; setScanner(true); }
          }}>
            <Ionicons name="qr-code" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {cliente ? (
          <View>
            <View style={[styles.cardCliente, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : '#000' }]}>
              <TouchableOpacity style={styles.btnLimparCliente} onPress={limparCliente}>
                <Ionicons name="close" size={24} color={theme.subText} />
              </TouchableOpacity>

              <Text style={[styles.nomeCli, { color: theme.text }]}>{cliente.nome}</Text>
              <Text style={[styles.tlmCli, { color: theme.subText }]}>{cliente.telemovel}</Text>
              <View style={styles.saldoRow}>
                <Text style={[styles.saldoVal, { color: theme.orange }]}>{saldoAtual}</Text>
                <Text style={[styles.saldoLabel, { color: theme.subText }]}>PONTOS DISPONÍVEIS</Text>
              </View>

              <View style={[styles.faturaBox, { borderColor: theme.border }]}>
                <Text style={[styles.faturaLabel, { color: theme.subText }]}>VALOR DA FATURA (€)</Text>
                <View style={styles.faturaInputRow}>
                  <TextInput 
                    style={[styles.inputFatura, { backgroundColor: theme.bg, color: theme.text }]} 
                    value={valorFatura} 
                    onChangeText={setValorFatura} keyboardType="numeric" placeholder="0.00"
                    placeholderTextColor={theme.subText}
                  />
                  <TouchableOpacity style={[styles.btnAtribuir, { backgroundColor: theme.orange }]} onPress={processarFatura}>
                    <Text style={styles.btnAtribuirTxt}>DAR PONTOS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.vouchersHeader}>
              <TouchableOpacity onPress={() => setAbaVouchers('ativos')} style={[styles.tab, abaVouchers === 'ativos' && { borderBottomColor: theme.orange, borderBottomWidth: 3 }]}>
                <Text style={[styles.tabTxt, { color: abaVouchers === 'ativos' ? theme.text : theme.subText }]}>Vouchers Ativos</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAbaVouchers('historico')} style={[styles.tab, abaVouchers === 'historico' && { borderBottomColor: theme.orange, borderBottomWidth: 3 }]}>
                <Text style={[styles.tabTxt, { color: abaVouchers === 'historico' ? theme.text : theme.subText }]}>Histórico</Text>
              </TouchableOpacity>
            </View>

            {abaVouchers === 'ativos' ? (
              vouchers.length > 0 ? vouchers.map(v => (
                <View key={v.id} style={[styles.itemVoucher, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{flex: 1}}>
                    <Text style={[styles.vTitle, { color: theme.text }]}>{v.titulo || "Voucher de Desconto"}</Text>
                    <Text style={[styles.vDesc, { color: theme.orange }]}>Pronto a aplicar na conta</Text>
                  </View>
                  <TouchableOpacity style={[styles.btnUsar, { backgroundColor: theme.orange }]} onPress={() => utilizarVoucher(v)}>
                    <Text style={styles.btnUsarTxt}>USAR</Text>
                  </TouchableOpacity>
                </View>
              )) : <Text style={[styles.vazio, { color: theme.subText }]}>Sem vouchers ativos.</Text>
            ) : (
              historico.length > 0 ? historico.map(h => {
                const isAtribuicao = h.quantidade > 0;
                const isResgate = h.quantidade < 0;
                
                // Se houver nota guardada na BD mostra a nota, senão usa as labels padrão
                const labelHistorico = h.nota ? h.nota : (isAtribuicao ? "Atribuição" : (isResgate ? "Resgate Voucher" : "Voucher Utilizado"));
                
                const dataObj = new Date(h.created_at);
                const dataStr = dataObj.toLocaleDateString('pt-PT');
                const horaStr = dataObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

                return (
                  <View key={h.id} style={[styles.itemHist, { backgroundColor: theme.card }]}>
                    <View style={{flex: 1, paddingRight: 10 }}>
                      <Text style={[styles.histData, { color: theme.subText }]}>{dataStr} às {horaStr}</Text>
                      <Text style={[styles.histNota, { color: theme.text }]} numberOfLines={2}>{labelHistorico}</Text>
                    </View>
                    
                    {/* Lógica Inteligente para distinguir transações numéricas de consumo de voucher */}
                    {isAtribuicao || isResgate ? (
                      <Text style={[styles.histPts, { color: isAtribuicao ? '#34C759' : '#FF3B30' }]}>
                        {isAtribuicao ? `+${h.quantidade}` : h.quantidade}
                      </Text>
                    ) : (
                      <Ionicons name="checkmark-done-circle" size={24} color={theme.subText} />
                    )}
                  </View>
                );
              }) : <Text style={[styles.vazio, { color: theme.subText }]}>Sem histórico recente.</Text>
            )}
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="search-circle-outline" size={80} color={theme.border} />
            <Text style={[styles.emptyTxt, { color: theme.subText }]}>Pesquisa um cliente pelo número ou código QR para gerir pontos e vouchers.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1 },
  titulo: { fontSize: 24, fontWeight: '900', marginBottom: 15 },
  searchRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, height: 50, borderRadius: 12, paddingHorizontal: 15, fontSize: 16, borderWidth: 1 },
  btnBlack: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnOrange: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  cardCliente: { position: 'relative', borderRadius: 20, padding: 20, elevation: 4, shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 25 },
  btnLimparCliente: { position: 'absolute', top: 15, right: 15, padding: 5, zIndex: 10 },
  nomeCli: { fontSize: 20, fontWeight: '900', paddingRight: 30 },
  tlmCli: { fontSize: 14, marginBottom: 20 },
  saldoRow: { alignItems: 'center', marginBottom: 20 },
  saldoVal: { fontSize: 48, fontWeight: '900' },
  saldoLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  
  faturaBox: { borderTopWidth: 1, paddingTop: 20 },
  faturaLabel: { fontSize: 11, fontWeight: '800', marginBottom: 10 },
  faturaInputRow: { flexDirection: 'row', gap: 10 },
  inputFatura: { flex: 1, height: 50, borderRadius: 12, paddingHorizontal: 15, fontSize: 20, fontWeight: 'bold' },
  btnAtribuir: { paddingHorizontal: 15, borderRadius: 12, justifyContent: 'center' },
  btnAtribuirTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },

  vouchersHeader: { flexDirection: 'row', gap: 20, marginBottom: 15 },
  tab: { paddingBottom: 5 },
  tabTxt: { fontSize: 16, fontWeight: '700' },

  itemVoucher: { flexDirection: 'row', padding: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center', borderWidth: 1 },
  vTitle: { fontSize: 15, fontWeight: '800' },
  vDesc: { fontSize: 12 },
  btnUsar: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  btnUsarTxt: { color: '#FFF', fontWeight: '900', fontSize: 11 },

  itemHist: { flexDirection: 'row', padding: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center' },
  histData: { fontSize: 12 },
  histNota: { fontSize: 14, fontWeight: '700' },
  histPts: { fontSize: 16, fontWeight: '900' },

  empty: { marginTop: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyTxt: { textAlign: 'center', marginTop: 15, fontWeight: '600', lineHeight: 20 },

  vazio: { textAlign: 'center', marginTop: 15, fontWeight: '600', lineHeight: 20 },

  cameraFull: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  target: { width: 250, height: 250, borderWidth: 2, borderRadius: 20 },
  scanText: { color: '#FFF', marginTop: 30, fontWeight: 'bold' },
  closeScan: { position: 'absolute', bottom: 50, width: 60, height: 60, borderRadius: 30, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }
});