import React, { useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  Modal, Alert, ScrollView, Platform, ActivityIndicator, StatusBar 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { 
  bg: '#F4F6F9', card: '#FFFFFF', text: '#1C1C1E', textSec: '#8E8E93', 
  orange: '#FF6B00', border: '#E5E5EA', orangeLight: '#FFF0E5', green: '#34C759', red: '#FF3B30', 
  black: '#000000' 
};

export default function Pontos() {
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

  async function buscarCliente(termoBusca: string) {
    const telemovelLimpo = termoBusca.trim();
    if (!telemovelLimpo) return;
    
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminLogado = authData?.user;

      const { data: perfilData } = await supabase
        .from('perfis')
        .select('*')
        .eq('telemovel', telemovelLimpo)
        .maybeSingle();
      
      if (!perfilData) {
        Alert.alert("Não Encontrado", "Cliente não registado com este telemóvel.");
        setLoading(false);
        return;
      }

      if (adminLogado?.id === perfilData.id) {
        Alert.alert("Ação Bloqueada 🛑", "Não podes gerir os teus próprios pontos.");
        setLoading(false);
        return;
      }

      setCliente(perfilData);

      const { data: saldoData } = await supabase.from('pontos').select('saldo').eq('id_cliente', perfilData.id).single();
      setSaldoAtual(saldoData?.saldo || 0);

      carregarDadosAdicionais(perfilData.id);

    } catch (err) { 
      Alert.alert("Erro", "Erro ao ligar à base de dados."); 
    } finally { 
      setLoading(false); 
    }
  }

  async function carregarDadosAdicionais(clienteId: string) {
    const { data: vAtivos } = await supabase.from('vouchers').select('*').eq('perfil_id', clienteId);
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
    await supabase.from('log_pontos').insert({ cliente_id: cliente.id, admin_id: user?.id, quantidade: pontos });

    setSaldoAtual(novoSaldo);
    setValorFatura('');
    carregarDadosAdicionais(cliente.id);
    setProcessando(false);
    Alert.alert("Sucesso", "Pontos atribuídos!");
  }

  const utilizarVoucher = async (voucher: any) => {
    Alert.alert("Usar Voucher", "Confirmas a utilização deste voucher na caixa?", [
      { text: "Não" },
      { text: "Sim, Usar", style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('vouchers').delete().eq('id', voucher.id);
        if (!error) {
          await supabase.from('log_pontos').insert({ 
            cliente_id: cliente.id, 
            quantidade: 0, 
            nota: `Voucher consumido na caixa` 
          });
          carregarDadosAdicionais(cliente.id);
          Alert.alert("Sucesso", "Voucher descontado!");
        }
      }}
    ]);
  };

  // Função para limpar o ecrã e preparar para o próximo cliente
  const limparCliente = () => {
    setCliente(null);
    setBusca('');
    setSaldoAtual(0);
    setVouchers([]);
    setHistorico([]);
    setValorFatura('');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
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
            <View style={styles.target} />
            <Text style={styles.scanText}>Lê o código do cliente</Text>
            <TouchableOpacity 
              style={styles.closeScan} 
              onPress={() => { isScanning.current = false; setScanner(false); }}
            >
              <Ionicons name="close" size={30} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.titulo}>Pontos & Vouchers</Text>
        <View style={styles.searchRow}>
          <TextInput 
            style={styles.input} placeholder="Nº Telemóvel..." 
            value={busca} onChangeText={setBusca} keyboardType="numeric"
          />
          <TouchableOpacity style={styles.btnBlack} onPress={() => buscarCliente(busca)}>
            <Ionicons name="search" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnOrange} onPress={async () => { 
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
            <View style={styles.cardCliente}>
              {/* Botão de Fechar Perfil do Cliente */}
              <TouchableOpacity style={styles.btnLimparCliente} onPress={limparCliente}>
                <Ionicons name="close" size={24} color={COLORS.textSec} />
              </TouchableOpacity>

              <Text style={styles.nomeCli}>{cliente.nome}</Text>
              <Text style={styles.tlmCli}>{cliente.telemovel}</Text>
              <View style={styles.saldoRow}>
                <Text style={styles.saldoVal}>{saldoAtual}</Text>
                <Text style={styles.saldoLabel}>PONTOS DISPONÍVEIS</Text>
              </View>

              <View style={styles.faturaBox}>
                <Text style={styles.faturaLabel}>VALOR DA FATURA (€)</Text>
                <View style={styles.faturaInputRow}>
                  <TextInput 
                    style={styles.inputFatura} value={valorFatura} 
                    onChangeText={setValorFatura} keyboardType="numeric" placeholder="0.00"
                  />
                  <TouchableOpacity style={styles.btnAtribuir} onPress={processarFatura}>
                    <Text style={styles.btnAtribuirTxt}>DAR PONTOS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.vouchersHeader}>
              <TouchableOpacity onPress={() => setAbaVouchers('ativos')} style={[styles.tab, abaVouchers === 'ativos' && styles.tabAtiva]}>
                <Text style={[styles.tabTxt, abaVouchers === 'ativos' && styles.tabTxtAtiva]}>Vouchers Ativos</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAbaVouchers('historico')} style={[styles.tab, abaVouchers === 'historico' && styles.tabAtiva]}>
                <Text style={[styles.tabTxt, abaVouchers === 'historico' && styles.tabTxtAtiva]}>Histórico</Text>
              </TouchableOpacity>
            </View>

            {abaVouchers === 'ativos' ? (
              vouchers.length > 0 ? vouchers.map(v => (
                <View key={v.id} style={styles.itemVoucher}>
                  <View style={{flex: 1}}>
                    <Text style={styles.vTitle}>{v.titulo || "Voucher de Desconto"}</Text>
                    <Text style={styles.vDesc}>Pronto a aplicar na conta</Text>
                  </View>
                  <TouchableOpacity style={styles.btnUsar} onPress={() => utilizarVoucher(v)}>
                    <Text style={styles.btnUsarTxt}>USAR</Text>
                  </TouchableOpacity>
                </View>
              )) : <Text style={styles.vazio}>Sem vouchers ativos.</Text>
            ) : (
              historico.length > 0 ? historico.map(h => {
                const isAtribuicao = h.quantidade > 0;
                const isResgate = h.quantidade < 0;
                const labelHistorico = isAtribuicao ? "Atribuição" : (isResgate ? "Resgate Voucher" : "Voucher Usado");
                
                const dataObj = new Date(h.created_at);
                const dataStr = dataObj.toLocaleDateString('pt-PT');
                const horaStr = dataObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

                return (
                  <View key={h.id} style={styles.itemHist}>
                    <View style={{flex: 1}}>
                      <Text style={styles.histData}>{dataStr} às {horaStr}</Text>
                      <Text style={styles.histNota}>{labelHistorico}</Text>
                    </View>
                    <Text style={[
                      styles.histPts, 
                      { color: isAtribuicao ? COLORS.green : (isResgate ? COLORS.red : COLORS.textSec) }
                    ]}>
                      {isAtribuicao ? `+${h.quantidade}` : h.quantidade}
                    </Text>
                  </View>
                );
              }) : <Text style={styles.vazio}>Sem histórico recente.</Text>
            )}
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="search-circle-outline" size={80} color={COLORS.border} />
            <Text style={styles.emptyTxt}>Pesquisa um cliente pelo número para gerir pontos e vouchers.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: COLORS.card, borderBottomWidth: 1, borderColor: COLORS.border },
  titulo: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 15 },
  searchRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, height: 50, backgroundColor: COLORS.bg, borderRadius: 12, paddingHorizontal: 15, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  btnBlack: { width: 50, height: 50, backgroundColor: COLORS.black, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  btnOrange: { width: 50, height: 50, backgroundColor: COLORS.orange, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  cardCliente: { position: 'relative', backgroundColor: COLORS.card, borderRadius: 20, padding: 20, elevation: 4, shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 25 },
  btnLimparCliente: { position: 'absolute', top: 15, right: 15, padding: 5, zIndex: 10 },
  nomeCli: { fontSize: 20, fontWeight: '900', color: COLORS.text, paddingRight: 30 },
  tlmCli: { fontSize: 14, color: COLORS.textSec, marginBottom: 20 },
  saldoRow: { alignItems: 'center', marginBottom: 20 },
  saldoVal: { fontSize: 48, fontWeight: '900', color: COLORS.orange },
  saldoLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textSec, letterSpacing: 1 },
  
  faturaBox: { borderTopWidth: 1, borderColor: COLORS.bg, paddingTop: 20 },
  faturaLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSec, marginBottom: 10 },
  faturaInputRow: { flexDirection: 'row', gap: 10 },
  inputFatura: { flex: 1, height: 50, backgroundColor: COLORS.bg, borderRadius: 12, paddingHorizontal: 15, fontSize: 20, fontWeight: 'bold' },
  btnAtribuir: { backgroundColor: COLORS.orange, paddingHorizontal: 15, borderRadius: 12, justifyContent: 'center' },
  btnAtribuirTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },

  vouchersHeader: { flexDirection: 'row', gap: 20, marginBottom: 15 },
  tab: { paddingBottom: 5 },
  tabAtiva: { borderBottomWidth: 3, borderColor: COLORS.orange },
  tabTxt: { fontSize: 16, fontWeight: '700', color: COLORS.textSec },
  tabTxtAtiva: { color: COLORS.text },

  itemVoucher: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  vTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  vDesc: { fontSize: 12, color: COLORS.orange },
  btnUsar: { backgroundColor: COLORS.orange, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  btnUsarTxt: { color: '#FFF', fontWeight: '900', fontSize: 11 },

  itemHist: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center' },
  histData: { fontSize: 12, color: COLORS.textSec },
  histNota: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  histPts: { fontSize: 16, fontWeight: '900' },

  empty: { marginTop: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyTxt: { textAlign: 'center', marginTop: 15, color: COLORS.textSec, fontWeight: '600', lineHeight: 20 },

  vazio: { textAlign: 'center', marginTop: 15, color: COLORS.textSec, fontWeight: '600', lineHeight: 20 },

  cameraFull: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  target: { width: 250, height: 250, borderWidth: 2, borderColor: COLORS.orange, borderRadius: 20 },
  scanText: { color: '#FFF', marginTop: 30, fontWeight: 'bold' },
  closeScan: { position: 'absolute', bottom: 50, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' }
});