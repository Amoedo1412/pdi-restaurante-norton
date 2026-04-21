import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Platform, StatusBar, Alert, Switch, ActivityIndicator, Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';

const COLORS = {
  bg: '#F4F6F9', card: '#FFFFFF', text: '#1C1C1E', 
  textSec: '#8E8E93', orange: '#FF6B00', orangeLight: '#FFF0E5', 
  border: '#E5E5EA', red: '#FF3B30', green: '#34C759'
};

const DIAS_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export default function Home({ navigation }: any) {
  const [adminNome, setAdminNome] = useState('Admin');
  const [percentagem, setPercentagem] = useState(0);
  const [isFerias, setIsFerias] = useState(false);
  const [horario, setHorario] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  const [modalHorarioVisivel, setModalHorarioVisivel] = useState(false);
  const [modalFeriasVisivel, setModalFeriasVisivel] = useState(false);

  const [horarioPadrao, setHorarioPadrao] = useState({ inicio: '12:00', fim: '22:00' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dataFim, setDataFim] = useState(new Date());

  // Estados dos Pickers de Hora
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeConfig, setTimeConfig] = useState({ dia: '', campo: 'inicio' as 'inicio' | 'fim' | 'padrao_inicio' | 'padrao_fim' });
  const [tempTime, setTempTime] = useState(new Date());

  useEffect(() => { 
    buscarPerfilAdmin(); 
    carregarDadosRestaurante(); 

    // --- NOVA MAGIA: ESCUTA EM TEMPO REAL ---
    const subscription = supabase
      .channel('escutar-restaurante')
      .on(
        'postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'restaurante', 
          filter: 'id=eq.1' // Escuta apenas as mudanças no restaurante com ID 1
        }, 
        (payload) => {
          // O "payload.new" traz a linha exata como ficou na base de dados após a mudança
          const novosDados = payload.new;
          
          setPercentagem(novosDados.taxa_ocupacao);
          setIsFerias(novosDados.is_ferias);
          setHorario(novosDados.horario_json || {});
          
          if (novosDados.ferias_fim) {
            setDataFim(new Date(novosDados.ferias_fim));
          }
        }
      )
      .subscribe();

    // Quando o utilizador sai deste ecrã, fechamos o tubo de escuta para poupar bateria e net
    return () => {
      supabase.removeChannel(subscription);
    };
    // ----------------------------------------

  }, []);

  async function buscarPerfilAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('perfis').select('nome').eq('id', user.id).single();
        if (data?.nome) setAdminNome(data.nome.split(' ')[0]);
      }
    } catch (error) { console.error(error); }
  }

  async function carregarDadosRestaurante() {
    try {
      const { data } = await supabase.from('restaurante').select('*').eq('id', 1).single();
      if (data) {
        setPercentagem(data.taxa_ocupacao);
        setIsFerias(data.is_ferias);
        setHorario(data.horario_json || {});
        if (data.ferias_fim) setDataFim(new Date(data.ferias_fim));
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  const verificarSeFechado = () => {
    if (isFerias) return "FÉRIAS";
    const diaHoje = DIAS_LABELS[new Date().getDay()];
    if (horario[diaHoje] && !horario[diaHoje].aberto) return "FECHADO";
    return null;
  };

  const statusAtual = verificarSeFechado();

  const atualizarBD = async (coluna: string, valor: any) => {
    try {
      await supabase.from('restaurante').update({ [coluna]: valor }).eq('id', 1);
    } catch (error) { Alert.alert("Erro", "Falha ao gravar."); }
  };

  const syncHorarioDB = async (novoHorarioJson: any) => {
    try {
      await supabase.from('restaurante').update({ horario_json: novoHorarioJson }).eq('id', 1);
    } catch (error) { console.error("Falha ao sincronizar horário"); }
  };

  const aplicarHorarioGeral = () => {
    const novoHorario = { ...horario };
    DIAS_LABELS.forEach(dia => {
      if (novoHorario[dia]?.aberto) {
        novoHorario[dia] = { ...novoHorario[dia], inicio: horarioPadrao.inicio, fim: horarioPadrao.fim };
      }
    });
    setHorario(novoHorario);
    syncHorarioDB(novoHorario);
    Alert.alert("Sucesso", "Horário padrão aplicado e guardado.");
  };

  // --- LÓGICA DO PICKER DE HORAS ---
  const abrirPickerTempo = (dia: string, campo: any, valorAtual: string) => {
    setTimeConfig({ dia, campo });
    const d = new Date();
    if (valorAtual) {
      const [h, m] = valorAtual.split(':');
      d.setHours(parseInt(h, 10));
      d.setMinutes(parseInt(m, 10));
    } else {
      d.setHours(12, 0);
    }
    setTempTime(d);
    setShowTimePicker(true);
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && selectedDate) {
        processarHoraSelecionada(selectedDate);
      }
    } else {
      if (selectedDate) setTempTime(selectedDate);
    }
  };

  const confirmarTempoIOS = () => {
    processarHoraSelecionada(tempTime);
    setShowTimePicker(false);
  };

  const processarHoraSelecionada = (dataSelecionada: Date) => {
    const h = dataSelecionada.getHours().toString().padStart(2, '0');
    const m = dataSelecionada.getMinutes().toString().padStart(2, '0');
    const formatado = `${h}:${m}`;

    if (timeConfig.campo.includes('padrao')) {
      setHorarioPadrao({...horarioPadrao, [timeConfig.campo.replace('padrao_', '')]: formatado});
    } else {
      const novoHorario = {
        ...horario,
        [timeConfig.dia]: { ...horario[timeConfig.dia], [timeConfig.campo]: formatado }
      };
      setHorario(novoHorario);
      syncHorarioDB(novoHorario);
    }
  };

  // --- LÓGICA DO PICKER DE DATAS (FÉRIAS) ---
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDataFim(selectedDate);
  };

  const salvarFerias = async () => {
    try {
      await supabase.from('restaurante').update({ 
        is_ferias: isFerias,
        ferias_fim: dataFim.toISOString().split('T')[0]
      }).eq('id', 1);
      setModalFeriasVisivel(false);
      carregarDadosRestaurante();
    } catch (error) { Alert.alert("Erro", "Falha ao gravar as férias."); }
  };

  const getCorStatus = () => {
    if (statusAtual) return COLORS.textSec;
    return percentagem >= 90 ? COLORS.red : percentagem >= 60 ? '#FFCC00' : COLORS.green;
  };

  if (loading) return <View style={styles.loadingCenter}><ActivityIndicator size="large" color={COLORS.orange} /></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER SIMPLIFICADO (SEM IMAGEM) */}
      <View style={styles.header}>
        <View style={styles.perfilRow}>
          <View>
            <Text style={styles.saudacao}>Olá, {adminNome}!</Text>
            <Text style={styles.subSaudacao}>Painel Administrativo</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Controlo de Sala</Text>
        <View style={[styles.statusCard, { borderLeftColor: getCorStatus() }]}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusValue}>{statusAtual ? '0%' : `${percentagem}%`}</Text>
            <Text style={[styles.statusLabel, { color: getCorStatus() }]}>
              {statusAtual || (percentagem >= 100 ? 'ESGOTADO' : 'ABERTO')}
            </Text>
          </View>

          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0} maximumValue={100} step={5}
            disabled={!!statusAtual}
            value={statusAtual ? 0 : percentagem}
            onValueChange={setPercentagem}
            onSlidingComplete={(v) => atualizarBD('taxa_ocupacao', Math.round(v))}
            minimumTrackTintColor={getCorStatus()}
            thumbTintColor={getCorStatus()}
          />

          <View style={styles.divider} />

          <TouchableOpacity style={styles.rowItem} onPress={() => setModalHorarioVisivel(true)}>
            <View>
              <Text style={styles.itemTitle}>Horário Semanal</Text>
              <Text style={styles.itemSub}>Define abertura e fecho diário</Text>
            </View>
            <Ionicons name="time" size={24} color={COLORS.orange} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.rowItem} onPress={() => setModalFeriasVisivel(true)}>
            <View>
              <Text style={styles.itemTitle}>Período de Férias</Text>
              {isFerias && <Text style={{fontSize: 12, color: COLORS.red}}>Regresso: {dataFim.toLocaleDateString('pt-PT')}</Text>}
            </View>
            <Ionicons name="airplane" size={24} color={COLORS.orange} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Gestão de Conteúdos</Text>
        <View style={styles.grid}>
          {[
            { t: 'Ementa', r: 'GestaoEmenta', i: 'calendar' },
            { t: 'Pratos', r: 'GestaoCatalogo', i: 'restaurant' },
            { t: 'Utilizadores', r: 'GestaoUtilizadores', i: 'people' },
            { t: 'Críticas', r: 'PortalCriticas', i: 'star' }
          ].map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.cardMenu} // Removida a opacidade dinâmica para ficar sempre com cores vivas
              onPress={() => navigation.navigate(item.r)}
            >
              <View style={[styles.iconBox, { backgroundColor: COLORS.orangeLight }]}>
                <Ionicons name={item.i as any} size={26} color={COLORS.orange} />
              </View>
              <Text style={styles.cardTitle}>{item.t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* MODAL HORÁRIO */}
      <Modal visible={modalHorarioVisivel} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Horário Semanal</Text>
              <TouchableOpacity onPress={() => setModalHorarioVisivel(false)}><Ionicons name="close" size={28} /></TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.globalBox}>
                <Text style={styles.globalTitle}>Horário Padrão</Text>
                <View style={styles.globalRow}>
                  <TouchableOpacity onPress={() => abrirPickerTempo('', 'padrao_inicio', horarioPadrao.inicio)} style={styles.timeBoxPadrao}>
                    <Text style={styles.timeText}>{horarioPadrao.inicio}</Text>
                  </TouchableOpacity>
                  <Text style={{fontWeight: 'bold', color: COLORS.textSec}}>-</Text>
                  <TouchableOpacity onPress={() => abrirPickerTempo('', 'padrao_fim', horarioPadrao.fim)} style={styles.timeBoxPadrao}>
                    <Text style={styles.timeText}>{horarioPadrao.fim}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnAplicarTudo} onPress={aplicarHorarioGeral}>
                    <Text style={styles.btnAplicarTxt}>Aplicar a Todos</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              {DIAS_LABELS.map(dia => (
                <View key={dia} style={styles.diaRow}>
                  <Text style={styles.diaNome}>{dia}</Text>
                  
                  <Switch 
                    value={horario[dia]?.aberto} 
                    onValueChange={(v) => {
                      const diaAtual = horario[dia] || {};
                      const novoHorario = {
                        ...horario, 
                        [dia]: { 
                          ...diaAtual, 
                          aberto: v,
                          inicio: diaAtual.inicio || horarioPadrao.inicio,
                          fim: diaAtual.fim || horarioPadrao.fim
                        }
                      };
                      setHorario(novoHorario);
                      syncHorarioDB(novoHorario);
                    }}
                    trackColor={{ true: COLORS.orange }}
                  />
                  
                  {horario[dia]?.aberto ? (
                    <View style={styles.horasInput}>
                      <TouchableOpacity onPress={() => abrirPickerTempo(dia, 'inicio', horario[dia].inicio)} style={styles.timeBox}>
                        <Text style={styles.timeText}>{horario[dia].inicio}</Text>
                      </TouchableOpacity>
                      <Text style={{fontWeight: 'bold', color: COLORS.textSec}}>-</Text>
                      <TouchableOpacity onPress={() => abrirPickerTempo(dia, 'fim', horario[dia].fim)} style={styles.timeBox}>
                        <Text style={styles.timeText}>{horario[dia].fim}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : <Text style={styles.txtFechado}>Encerrado</Text>}
                </View>
              ))}
            </ScrollView>

            {showTimePicker && Platform.OS === 'ios' && (
              <View style={styles.pickerOverlay}>
                <View style={styles.pickerCard}>
                  <View style={styles.pickerHeaderRow}>
                    <Text style={{fontWeight: '800', fontSize: 16}}>Selecionar Hora</Text>
                    <TouchableOpacity onPress={confirmarTempoIOS}>
                      <Text style={{color: COLORS.orange, fontWeight: '800', fontSize: 16}}>Concluir</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker 
                    mode="time" 
                    display="spinner" 
                    is24Hour={true} 
                    minuteInterval={15} 
                    value={tempTime} 
                    onChange={onTimeChange} 
                    textColor="black"
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL FÉRIAS SIMPLIFICADO */}
      <Modal visible={modalFeriasVisivel} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, (showDatePicker && Platform.OS === 'ios') && { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gerir Férias</Text>
              <TouchableOpacity onPress={() => { setModalFeriasVisivel(false); setShowDatePicker(false); }}><Ionicons name="close" size={28} /></TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.itemTitle}>Ativar Modo Férias</Text>
              <Switch value={isFerias} onValueChange={setIsFerias} trackColor={{ true: COLORS.orange }} />
            </View>

            {isFerias && (
              <View style={{ marginBottom: 20 }}>
                <TouchableOpacity style={styles.datePickerBtnFull} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.labelMini}>Data de Regresso</Text>
                  <Text style={styles.dateTextFull}>{dataFim.toLocaleDateString('pt-PT')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {showDatePicker && Platform.OS === 'ios' && isFerias && (
              <View style={styles.iosPickerContainer}>
                 <DateTimePicker 
                    mode="date" 
                    display="inline" 
                    value={dataFim} 
                    onChange={onDateChange} 
                    minimumDate={new Date()}
                  />
                  <TouchableOpacity style={styles.btnDone} onPress={() => setShowDatePicker(false)}>
                    <Text style={{color: '#FFF', fontWeight: 'bold'}}>Confirmar Data</Text>
                  </TouchableOpacity>
              </View>
            )}

            {!showDatePicker && (
              <TouchableOpacity style={styles.btnSalvar} onPress={salvarFerias}>
                <Text style={styles.btnSalvarTxt}>Guardar Estado</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* ANDROID ONLY PICKERS */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker 
          mode="time" 
          is24Hour={true} 
          minuteInterval={15} 
          value={tempTime} 
          onChange={onTimeChange} 
        />
      )}
      {Platform.OS === 'android' && showDatePicker && isFerias && (
        <DateTimePicker mode="date" value={dataFim} onChange={onDateChange} minimumDate={new Date()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, backgroundColor: COLORS.card, borderBottomWidth: 1, borderColor: COLORS.border },
  perfilRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  saudacao: { fontSize: 20, fontWeight: '800' },
  subSaudacao: { fontSize: 11, color: COLORS.textSec, textTransform: 'uppercase' },
  scroll: { padding: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textSec, marginBottom: 12, textTransform: 'uppercase' },
  statusCard: { backgroundColor: COLORS.card, padding: 20, borderRadius: 25, borderLeftWidth: 8, elevation: 3, marginBottom: 25 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statusValue: { fontSize: 36, fontWeight: '900' },
  statusLabel: { fontSize: 14, fontWeight: '800' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  itemSub: { fontSize: 12, color: COLORS.textSec },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardMenu: { width: '48%', backgroundColor: COLORS.card, padding: 20, borderRadius: 20, marginBottom: 15 },
  iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10, backgroundColor: COLORS.orangeLight },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  
  globalBox: { backgroundColor: '#F8F9FB', padding: 15, borderRadius: 15, marginBottom: 10 },
  globalTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textSec, marginBottom: 10, textTransform: 'uppercase' },
  globalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeBoxPadrao: { backgroundColor: '#FFF', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, width: 70, alignItems: 'center' },
  btnAplicarTudo: { backgroundColor: COLORS.orange, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginLeft: 'auto' },
  btnAplicarTxt: { color: '#FFF', fontWeight: '800', fontSize: 12 },

  diaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  diaNome: { width: 45, fontWeight: '800', fontSize: 16 },
  horasInput: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  timeBox: { backgroundColor: '#F2F2F7', padding: 10, borderRadius: 10, width: 70, alignItems: 'center' },
  timeText: { fontWeight: '700', fontSize: 16, color: COLORS.text },
  txtFechado: { flex: 1, textAlign: 'right', color: COLORS.red, fontWeight: '700' },
  
  pickerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  pickerCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, width: '85%', elevation: 10 },
  pickerHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },

  datePickerBtnFull: { width: '100%', backgroundColor: '#F2F2F7', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 15 },
  labelMini: { fontSize: 11, color: COLORS.textSec, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase' },
  dateTextFull: { fontSize: 18, fontWeight: '700', color: COLORS.orange },
  iosPickerContainer: { backgroundColor: '#F8F8F8', borderRadius: 25, padding: 15, marginBottom: 20 },
  btnDone: { backgroundColor: COLORS.orange, padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  btnSalvar: { backgroundColor: COLORS.orange, padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 25 },
  btnSalvarTxt: { color: '#FFF', fontWeight: '900', fontSize: 16 }
});