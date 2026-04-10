import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Platform, StatusBar, Alert, Image, Switch, ActivityIndicator, Modal 
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

  // Estados dos Pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateType, setDateType] = useState<'inicio' | 'fim'>('inicio');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeConfig, setTimeConfig] = useState({ dia: '', campo: 'inicio' as 'inicio' | 'fim' });

  const [dataInicio, setDataInicio] = useState(new Date());
  const [dataFim, setDataFim] = useState(new Date());

  useEffect(() => { 
    buscarPerfilAdmin(); 
    carregarDadosRestaurante(); 
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
        if (data.ferias_inicio) setDataInicio(new Date(data.ferias_inicio));
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

  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    
    if (selectedDate && timeConfig.dia) {
      const h = selectedDate.getHours().toString().padStart(2, '0');
      const m = selectedDate.getMinutes().toString().padStart(2, '0');
      const formatted = `${h}:${m}`;
      setHorario({ ...horario, [timeConfig.dia]: { ...horario[timeConfig.dia], [timeConfig.campo]: formatted } });
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    
    if (selectedDate) {
      if (dateType === 'inicio') setDataInicio(selectedDate);
      else setDataFim(selectedDate);
    }
  };

  const salvarFerias = async () => {
    await supabase.from('restaurante').update({ 
      is_ferias: isFerias,
      ferias_inicio: dataInicio.toISOString().split('T')[0],
      ferias_fim: dataFim.toISOString().split('T')[0]
    }).eq('id', 1);
    setModalFeriasVisivel(false);
    carregarDadosRestaurante();
  };

  const getCorStatus = () => {
    if (statusAtual) return COLORS.textSec;
    return percentagem >= 90 ? COLORS.red : percentagem >= 60 ? '#FFCC00' : COLORS.green;
  };

  if (loading) return <View style={styles.loadingCenter}><ActivityIndicator size="large" color={COLORS.orange} /></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.perfilRow}>
          <Image source={require('../imgs/Logotipo_1.png')} style={styles.logoPequeno} resizeMode="contain" />
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
              {isFerias && <Text style={{fontSize: 12, color: COLORS.red}}>Regresso: {dataFim.toLocaleDateString()}</Text>}
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
              style={[styles.cardMenu, { opacity: statusAtual ? 0.7 : 1 }]} 
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
          <View style={[styles.modalContent, (showTimePicker && Platform.OS === 'ios') && { height: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Horário Semanal</Text>
              <TouchableOpacity onPress={() => { setModalHorarioVisivel(false); setShowTimePicker(false); }}><Ionicons name="close" size={28} /></TouchableOpacity>
            </View>
            
            <ScrollView>
              {DIAS_LABELS.map(dia => (
                <View key={dia} style={styles.diaRow}>
                  <Text style={styles.diaNome}>{dia}</Text>
                  <Switch 
                    value={horario[dia]?.aberto} 
                    onValueChange={(v) => setHorario({...horario, [dia]: {...horario[dia], aberto: v}})}
                    trackColor={{ true: COLORS.orange }}
                  />
                  {horario[dia]?.aberto ? (
                    <View style={styles.horasInput}>
                      <TouchableOpacity onPress={() => { setTimeConfig({dia, campo: 'inicio'}); setShowTimePicker(true); }} style={[styles.timeBox, (timeConfig.dia === dia && timeConfig.campo === 'inicio' && showTimePicker) && {borderColor: COLORS.orange, borderWidth: 1}]}>
                        <Text style={styles.timeText}>{horario[dia].inicio}</Text>
                      </TouchableOpacity>
                      <Text>-</Text>
                      <TouchableOpacity onPress={() => { setTimeConfig({dia, campo: 'fim'}); setShowTimePicker(true); }} style={[styles.timeBox, (timeConfig.dia === dia && timeConfig.campo === 'fim' && showTimePicker) && {borderColor: COLORS.orange, borderWidth: 1}]}>
                        <Text style={styles.timeText}>{horario[dia].fim}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : <Text style={styles.txtFechado}>Encerrado</Text>}
                </View>
              ))}

              {/* PICKER INLINE PARA IOS */}
              {showTimePicker && Platform.OS === 'ios' && (
                <View style={styles.iosPickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerHeaderText}>A editar {timeConfig.dia} ({timeConfig.campo})</Text>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}><Text style={{color: COLORS.orange, fontWeight: 'bold'}}>Concluir</Text></TouchableOpacity>
                  </View>
                  <DateTimePicker 
                    mode="time" 
                    display="spinner" 
                    is24Hour={true} 
                    value={new Date()} 
                    onChange={onTimeChange} 
                    textColor="black"
                  />
                </View>
              )}
            </ScrollView>

            {!showTimePicker && (
              <TouchableOpacity style={styles.btnSalvar} onPress={() => { atualizarBD('horario_json', horario); setModalHorarioVisivel(false); carregarDadosRestaurante(); }}>
                <Text style={styles.btnSalvarTxt}>Guardar Horário</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL FÉRIAS */}
      <Modal visible={modalFeriasVisivel} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, (showDatePicker && Platform.OS === 'ios') && { height: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gerir Férias</Text>
              <TouchableOpacity onPress={() => { setModalFeriasVisivel(false); setShowDatePicker(false); }}><Ionicons name="close" size={28} /></TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.itemTitle}>Ativar Modo Férias</Text>
              <Switch value={isFerias} onValueChange={setIsFerias} trackColor={{ true: COLORS.orange }} />
            </View>

            <View style={{flexDirection: 'row', gap: 10, marginBottom: 20}}>
              <TouchableOpacity style={[styles.datePickerBtn, dateType === 'inicio' && {borderColor: COLORS.orange, borderWidth: 1}]} onPress={() => { setDateType('inicio'); setShowDatePicker(true); }}>
                <Text style={styles.labelMini}>Início</Text>
                <Text style={styles.dateText}>{dataInicio.toLocaleDateString('pt-PT')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.datePickerBtn, dateType === 'fim' && {borderColor: COLORS.orange, borderWidth: 1}]} onPress={() => { setDateType('fim'); setShowDatePicker(true); }}>
                <Text style={styles.labelMini}>Fim</Text>
                <Text style={styles.dateText}>{dataFim.toLocaleDateString('pt-PT')}</Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && Platform.OS === 'ios' && (
              <View style={styles.iosPickerContainer}>
                 <DateTimePicker 
                    mode="date" 
                    display="inline" 
                    value={dateType === 'inicio' ? dataInicio : dataFim} 
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
                <Text style={styles.btnSalvarTxt}>Guardar Período</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* ANDROID ONLY PICKERS */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker mode="time" is24Hour={true} value={new Date()} onChange={onTimeChange} />
      )}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker mode="date" value={dateType === 'inicio' ? dataInicio : dataFim} onChange={onDateChange} minimumDate={new Date()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, backgroundColor: COLORS.card, borderBottomWidth: 1, borderColor: COLORS.border },
  perfilRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoPequeno: { width: 45, height: 45, borderRadius: 10 },
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
  diaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  diaNome: { width: 45, fontWeight: '800', fontSize: 16 },
  horasInput: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  timeBox: { backgroundColor: '#F2F2F7', padding: 8, borderRadius: 8, width: 70, alignItems: 'center' },
  timeText: { fontWeight: '700' },
  txtFechado: { flex: 1, textAlign: 'right', color: COLORS.red, fontWeight: '700' },
  
  // iOS Picker Styles
  iosPickerContainer: { marginTop: 10, backgroundColor: '#F8F8F8', borderRadius: 20, padding: 15 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  pickerHeaderText: { fontWeight: 'bold', color: COLORS.textSec },
  datePickerBtn: { flex: 1, backgroundColor: '#F2F2F7', padding: 12, borderRadius: 15 },
  labelMini: { fontSize: 10, color: COLORS.textSec, fontWeight: 'bold', marginBottom: 2 },
  dateText: { fontSize: 15, fontWeight: '700' },
  btnDone: { backgroundColor: COLORS.orange, padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  btnSalvar: { backgroundColor: COLORS.orange, padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 25 },
  btnSalvarTxt: { color: '#FFF', fontWeight: '900', fontSize: 16 }
});