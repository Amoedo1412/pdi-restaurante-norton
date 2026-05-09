import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Platform, StatusBar, Alert, Switch, ActivityIndicator, Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../components/TemaContexto';

const DIAS_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export default function Home({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const [adminNome, setAdminNome] = useState('Admin');
  
  // NOVO: Estado para verificar se é administrador
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [percentagem, setPercentagem] = useState(0);
  const [isFerias, setIsFerias] = useState(false);
  const [horario, setHorario] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  const [modalHorarioVisivel, setModalHorarioVisivel] = useState(false);
  const [modalFeriasVisivel, setModalFeriasVisivel] = useState(false);

  const [horarioPadrao, setHorarioPadrao] = useState({ inicio: '12:00', fim: '22:00' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dataFim, setDataFim] = useState(new Date());

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeConfig, setTimeConfig] = useState({ dia: '', campo: 'inicio' as 'inicio' | 'fim' | 'padrao_inicio' | 'padrao_fim' });
  const [tempTime, setTempTime] = useState(new Date());

  useEffect(() => { 
    buscarPerfilAdmin(); 
    carregarDadosRestaurante(); 

    const subscription = supabase
      .channel('escutar-restaurante')
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'restaurante', filter: 'id=eq.1' }, 
        (payload) => {
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

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function buscarPerfilAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // ATUALIZADO: Pede também o tipo_utilizador à tabela perfis
        const { data } = await supabase.from('perfis').select('nome, tipo_utilizador').eq('id', user.id).single();
        
        if (data?.nome) setAdminNome(data.nome.split(' ')[0]);
        
        // Verifica as permissões
        if (data?.tipo_utilizador === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
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
    if (statusAtual) return theme.subText;
    return percentagem >= 90 ? '#FF3B30' : percentagem >= 60 ? '#FFCC00' : '#34C759';
  };

  if (loading) return <View style={[styles.loadingCenter, { backgroundColor: theme.bg }]}><ActivityIndicator size="large" color={theme.orange} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.perfilRow}>
          <View>
            <Text style={[styles.saudacao, { color: theme.text }]}>Olá, {adminNome}!</Text>
            {/* ATUALIZADO: Subtítulo dinâmico */}
            <Text style={[styles.subSaudacao, { color: theme.subText }]}>
              Painel {isAdmin ? 'Administrativo' : 'de Funcionário'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: theme.subText }]}>Controlo de Sala</Text>
        <View style={[styles.statusCard, { backgroundColor: theme.card, borderLeftColor: getCorStatus() }]}>
          <View style={styles.statusHeader}>
            <Text style={[styles.statusValue, { color: theme.text }]}>{statusAtual ? '0%' : `${percentagem}%`}</Text>
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

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity style={styles.rowItem} onPress={() => setModalHorarioVisivel(true)}>
            <View>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Horário Semanal</Text>
              <Text style={[styles.itemSub, { color: theme.subText }]}>Define abertura e fecho diário</Text>
            </View>
            <Ionicons name="time" size={24} color={theme.orange} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.rowItem} onPress={() => setModalFeriasVisivel(true)}>
            <View>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Período de Férias</Text>
              {isFerias && <Text style={{fontSize: 12, color: '#FF3B30'}}>Regresso: {dataFim.toLocaleDateString('pt-PT')}</Text>}
            </View>
            <Ionicons name="airplane" size={24} color={theme.orange} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.subText }]}>Gestão de Conteúdos</Text>
        <View style={styles.grid}>
          {/* ATUALIZADO: Filtro restritivo para funcionários */}
          {[
            { t: 'Ementa', r: 'GestaoEmenta', i: 'calendar', adminOnly: false },
            { t: 'Pratos', r: 'GestaoCatalogo', i: 'restaurant', adminOnly: false },
            { t: 'Utilizadores', r: 'GestaoUtilizadores', i: 'people', adminOnly: true },
            { t: 'Críticas', r: 'PortalCriticas', i: 'star', adminOnly: true }
          ]
          .filter(item => !item.adminOnly || isAdmin) // Se adminOnly for true, só mostra se isAdmin for true
          .map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.cardMenu, { backgroundColor: theme.card }]} 
              onPress={() => navigation.navigate(item.r)}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.iconBg }]}>
                <Ionicons name={item.i as any} size={26} color={theme.orange} />
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* MODAL HORÁRIO */}
      <Modal visible={modalHorarioVisivel} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.bg, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Horário Semanal</Text>
              <TouchableOpacity onPress={() => setModalHorarioVisivel(false)}><Ionicons name="close" size={28} color={theme.text}/></TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.globalBox, { backgroundColor: theme.card }]}>
                <Text style={[styles.globalTitle, { color: theme.subText }]}>Horário Padrão</Text>
                <View style={styles.globalRow}>
                  <TouchableOpacity onPress={() => abrirPickerTempo('', 'padrao_inicio', horarioPadrao.inicio)} style={[styles.timeBoxPadrao, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                    <Text style={[styles.timeText, { color: theme.text }]}>{horarioPadrao.inicio}</Text>
                  </TouchableOpacity>
                  <Text style={{fontWeight: 'bold', color: theme.subText}}>-</Text>
                  <TouchableOpacity onPress={() => abrirPickerTempo('', 'padrao_fim', horarioPadrao.fim)} style={[styles.timeBoxPadrao, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                    <Text style={[styles.timeText, { color: theme.text }]}>{horarioPadrao.fim}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnAplicarTudo, { backgroundColor: theme.orange }]} onPress={aplicarHorarioGeral}>
                    <Text style={styles.btnAplicarTxt}>Aplicar a Todos</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {DIAS_LABELS.map(dia => (
                <View key={dia} style={[styles.diaRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.diaNome, { color: theme.text }]}>{dia}</Text>
                  
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
                    trackColor={{ true: theme.orange }}
                  />
                  
                  {horario[dia]?.aberto ? (
                    <View style={styles.horasInput}>
                      <TouchableOpacity onPress={() => abrirPickerTempo(dia, 'inicio', horario[dia].inicio)} style={[styles.timeBox, { backgroundColor: theme.card }]}>
                        <Text style={[styles.timeText, { color: theme.text }]}>{horario[dia].inicio}</Text>
                      </TouchableOpacity>
                      <Text style={{fontWeight: 'bold', color: theme.subText}}>-</Text>
                      <TouchableOpacity onPress={() => abrirPickerTempo(dia, 'fim', horario[dia].fim)} style={[styles.timeBox, { backgroundColor: theme.card }]}>
                        <Text style={[styles.timeText, { color: theme.text }]}>{horario[dia].fim}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : <Text style={styles.txtFechado}>Encerrado</Text>}
                </View>
              ))}
            </ScrollView>

            {showTimePicker && Platform.OS === 'ios' && (
              <View style={styles.pickerOverlay}>
                <View style={[styles.pickerCard, { backgroundColor: theme.card }]}>
                  <View style={styles.pickerHeaderRow}>
                    <Text style={{fontWeight: '800', fontSize: 16, color: theme.text}}>Selecionar Hora</Text>
                    <TouchableOpacity onPress={confirmarTempoIOS}>
                      <Text style={{color: theme.orange, fontWeight: '800', fontSize: 16}}>Concluir</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker 
                    mode="time" 
                    display="spinner" 
                    is24Hour={true} 
                    minuteInterval={15} 
                    value={tempTime} 
                    onChange={onTimeChange} 
                    textColor={theme.text}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL FÉRIAS */}
      <Modal visible={modalFeriasVisivel} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.bg }, (showDatePicker && Platform.OS === 'ios') && { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Gerir Férias</Text>
              <TouchableOpacity onPress={() => { setModalFeriasVisivel(false); setShowDatePicker(false); }}><Ionicons name="close" size={28} color={theme.text}/></TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.itemTitle, { color: theme.text }]}>Ativar Modo Férias</Text>
              <Switch value={isFerias} onValueChange={setIsFerias} trackColor={{ true: theme.orange }} />
            </View>

            {isFerias && (
              <View style={{ marginBottom: 20 }}>
                <TouchableOpacity style={[styles.datePickerBtnFull, { backgroundColor: theme.card }]} onPress={() => setShowDatePicker(true)}>
                  <Text style={[styles.labelMini, { color: theme.subText }]}>Data de Regresso</Text>
                  <Text style={[styles.dateTextFull, { color: theme.orange }]}>{dataFim.toLocaleDateString('pt-PT')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {showDatePicker && Platform.OS === 'ios' && isFerias && (
              <View style={[styles.iosPickerContainer, { backgroundColor: theme.card }]}>
                 <DateTimePicker 
                   mode="date" 
                   display="inline" 
                   value={dataFim} 
                   onChange={onDateChange} 
                   minimumDate={new Date()}
                   textColor={theme.text}
                 />
                 <TouchableOpacity style={[styles.btnDone, { backgroundColor: theme.orange }]} onPress={() => setShowDatePicker(false)}>
                   <Text style={{color: '#FFF', fontWeight: 'bold'}}>Confirmar Data</Text>
                 </TouchableOpacity>
              </View>
            )}

            {!showDatePicker && (
              <TouchableOpacity style={[styles.btnSalvar, { backgroundColor: theme.orange }]} onPress={salvarFerias}>
                <Text style={styles.btnSalvarTxt}>Guardar Estado</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker mode="time" is24Hour={true} minuteInterval={15} value={tempTime} onChange={onTimeChange} />
      )}
      {Platform.OS === 'android' && showDatePicker && isFerias && (
        <DateTimePicker mode="date" value={dataFim} onChange={onDateChange} minimumDate={new Date()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, borderBottomWidth: 1 },
  perfilRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  saudacao: { fontSize: 20, fontWeight: '800' },
  subSaudacao: { fontSize: 11, textTransform: 'uppercase' },
  scroll: { padding: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase' },
  statusCard: { padding: 20, borderRadius: 25, borderLeftWidth: 8, elevation: 3, marginBottom: 25 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statusValue: { fontSize: 36, fontWeight: '900' },
  statusLabel: { fontSize: 14, fontWeight: '800' },
  divider: { height: 1, marginVertical: 15 },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  itemSub: { fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardMenu: { width: '48%', padding: 20, borderRadius: 20, marginBottom: 15 },
  iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  
  globalBox: { padding: 15, borderRadius: 15, marginBottom: 10 },
  globalTitle: { fontSize: 12, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase' },
  globalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeBoxPadrao: { padding: 10, borderRadius: 10, borderWidth: 1, width: 70, alignItems: 'center' },
  btnAplicarTudo: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginLeft: 'auto' },
  btnAplicarTxt: { color: '#FFF', fontWeight: '800', fontSize: 12 },

  diaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  diaNome: { width: 45, fontWeight: '800', fontSize: 16 },
  horasInput: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  timeBox: { padding: 10, borderRadius: 10, width: 70, alignItems: 'center' },
  timeText: { fontWeight: '700', fontSize: 16 },
  txtFechado: { flex: 1, textAlign: 'right', color: '#FF3B30', fontWeight: '700' },
  
  pickerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  pickerCard: { padding: 20, borderRadius: 20, width: '85%', elevation: 10 },
  pickerHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },

  datePickerBtnFull: { width: '100%', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 15 },
  labelMini: { fontSize: 11, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase' },
  dateTextFull: { fontSize: 18, fontWeight: '700' },
  iosPickerContainer: { borderRadius: 25, padding: 15, marginBottom: 20 },
  btnDone: { padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  btnSalvar: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 25 },
  btnSalvarTxt: { color: '#FFF', fontWeight: '900', fontSize: 16 }
});