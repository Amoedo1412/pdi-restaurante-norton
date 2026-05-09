import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, 
  Alert, ScrollView, Keyboard, Switch, Image, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; 
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');
const COR_NORTON = '#FF6B00';

export default function RegisterScreen({ navigation }: any) {
  const [step, setStep] = useState(1);

  // Passo 1: Identidade e Contacto
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telemovel, setTelemovel] = useState('');

  // Passo 2: Dados Pessoais
  const [dataNasc, setDataNasc] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dataAlterada, setDataAlterada] = useState(false);
  const [sexo, setSexo] = useState('');
  const [modalSexoVisible, setModalSexoVisible] = useState(false); // NOVO: Estado para o Modal de Sexo
  
  // Passo 3: Segurança
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Passo 4: Fotografia e Definições
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [notificacoes, setNotificacoes] = useState(false); 
  const [newsletter, setNewsletter] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- FUNÇÕES AUXILIARES ---
  const formatarDataParaBD = (data: Date) => data.toISOString().split('T')[0];

  const onChangeDate = (event: any, selectedDate?: Date) => {
    // Na Web e Android, fecha o calendário automaticamente após escolher
    if (Platform.OS !== 'ios') setShowDatePicker(false); 
    
    if (selectedDate) {
      setDataNasc(selectedDate);
      setDataAlterada(true);
    } else if (event?.target?.value) {
      // Prevenção extra para o comportamento da Web
      const webDate = new Date(event.target.value);
      if (!isNaN(webDate.getTime())) {
        setDataNasc(webDate);
        setDataAlterada(true);
      }
    }
  };

  async function escolherFoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Aviso', 'Precisamos de acesso à galeria.');
    
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true, 
    });
    
    if (!resultado.canceled && resultado.assets[0].base64) {
      setFotoUri(resultado.assets[0].uri);
      setFotoBase64(resultado.assets[0].base64);
    }
  }

  // --- NAVEGAÇÃO ENTRE PASSOS ---
  const handleAvancar = () => {
    setError('');
    
    if (step === 1) {
      if (!nome || !email || !telemovel) return setError('Preenche todos os campos.');
      const prefixos = ['91', '92', '93', '96'];
      if (telemovel.length !== 9 || !prefixos.includes(telemovel.substring(0, 2))) {
        return setError('Telemóvel inválido. Use 9 dígitos iniciados por 91, 92, 93 ou 96.');
      }
      if (!email.includes('@') || !email.includes('.')) return setError('E-mail inválido.');
      setStep(2);
    } 
    else if (step === 2) {
      if (!dataAlterada || !sexo) return setError('Preenche a data de nascimento e o sexo.');
      setStep(3);
    }
    else if (step === 3) {
      if (!password || !confirmarPassword) return setError('Preenche as palavras-passe.');
      if (password !== confirmarPassword) return setError('As palavras-passe não coincidem.');
      if (password.length < 6) return setError('A palavra-passe deve ter pelo menos 6 caracteres.');
      setStep(4);
    }
  };

  const handleRetroceder = () => {
    setError('');
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  // --- CRIAÇÃO DA CONTA FINAL ---
  async function handleRegisterFinal() {
    setError('');
    setLoading(true);
    
    const { data, error: signUpError } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: { data: { nome: nome } }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      let novaUrlFoto = null;

      if (fotoBase64) {
        const fileName = `avatar_${data.user.id}_${Date.now()}.jpg`;
        const base64Limpo = fotoBase64.includes('base64,') ? fotoBase64.split('base64,')[1] : fotoBase64;
        
        const { error: uploadError } = await supabase.storage
          .from('avatares')
          .upload(fileName, decode(base64Limpo), { contentType: 'image/jpeg', upsert: true });

        if (uploadError) {
          Alert.alert("ERRO DA FOTO", "Motivo: " + uploadError.message);
          setLoading(false);
          return; 
        }

        const { data: urlData } = supabase.storage.from('avatares').getPublicUrl(fileName);
        novaUrlFoto = urlData.publicUrl;
      }

      const { error: perfilError } = await supabase
        .from('perfis')
        .update({ 
          telemovel: telemovel,
          data_nascimento: formatarDataParaBD(dataNasc),
          sexo: sexo,
          foto_url: novaUrlFoto,
          notificacoes_push: notificacoes,
          receber_newsletter: newsletter,
          tema_escuro: false
        })
        .eq('id', data.user.id);

      if (perfilError) {
        setError("Erro ao guardar perfil: " + perfilError.message);
        setLoading(false);
        return;
      }

      Alert.alert('Bem-vindo!', 'Conta registada com sucesso.');
      navigation.navigate('AuthScreens'); // Leva o user para o login
    }
    setLoading(false);
  }

  const renderStepIndicator = () => (
    <View style={styles.stepContainer}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.stepDot, step >= i ? styles.stepDotActive : null]} />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.blob, styles.topBlob]} pointerEvents="none" />
      <View style={[styles.blob, styles.bottomBlob]} pointerEvents="none" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <TouchableOpacity style={styles.backBtn} onPress={handleRetroceder}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>

          <Text style={[styles.title, { color: COR_NORTON, marginTop: 100 }]}>Novo aqui?</Text>
          
          <View style={styles.headerProgresso}>
            <Text style={styles.subtitle}>Passo {step} de 4</Text>
            {renderStepIndicator()}
          </View>

          {step === 1 && (
            <View style={styles.stepContent}>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
                <TextInput placeholder="Nome Completo *" style={styles.input} value={nome} onChangeText={setNome} placeholderTextColor="#999" />
              </View>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
                <TextInput placeholder="E-mail *" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#999" />
              </View>
              <View style={styles.inputBox}>
                <Ionicons name="call-outline" size={20} color="#666" style={styles.icon} />
                <TextInput placeholder="Telemóvel *" style={styles.input} value={telemovel} onChangeText={setTelemovel} keyboardType="phone-pad" maxLength={9} placeholderTextColor="#999" />
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <TouchableOpacity style={styles.inputBox} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color="#666" style={styles.icon} />
                <Text style={[styles.input, { color: dataAlterada ? '#000' : '#999', paddingTop: 3 }]}>
                  {dataAlterada ? dataNasc.toLocaleDateString('pt-PT') : "Data de Nascimento *"}
                </Text>
                
                {showDatePicker && Platform.OS === 'ios' && (
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.btnConfirmarData}>
                    <Ionicons name="checkmark-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker 
                  value={dataNasc} 
                  mode="date" 
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
                  onChange={onChangeDate} 
                  maximumDate={new Date()} 
                />
              )}

              {/* BOTÃO QUE ABRE O NOVO MODAL DE SEXO */}
              <TouchableOpacity style={styles.inputBox} onPress={() => setModalSexoVisible(true)}>
                <Ionicons name="male-female-outline" size={20} color="#666" style={styles.icon} />
                <Text style={[styles.input, { color: sexo ? '#000' : '#999', paddingTop: 3 }]}>{sexo || "Sexo *"}</Text>
                <Ionicons name="chevron-down" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
                <TextInput placeholder="Palavra-passe *" style={styles.input} secureTextEntry={!mostrarPassword} value={password} onChangeText={setPassword} placeholderTextColor="#999" autoCapitalize="none" />
                <TouchableOpacity onPress={() => setMostrarPassword(!mostrarPassword)} style={styles.eyeIcon}>
                  <Ionicons name={mostrarPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
                <TextInput placeholder="Confirmar Palavra-passe *" style={styles.input} secureTextEntry={!mostrarPassword} value={confirmarPassword} onChangeText={setConfirmarPassword} placeholderTextColor="#999" autoCapitalize="none" />
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContent}>
              <View style={styles.avatarArea}>
                <View style={styles.avatarContainer}>
                  {fotoUri ? (
                    <Image source={{ uri: fotoUri }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={40} color="#ccc" />
                  )}
                  <TouchableOpacity style={styles.btnCamera} onPress={escolherFoto}>
                    <Ionicons name="camera" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.avatarLabel}>Fotografia de Perfil (Opcional)</Text>
              </View>

              <View style={styles.switchesContainer}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Ativar Notificações</Text>
                  <Switch value={notificacoes} onValueChange={setNotificacoes} trackColor={{ false: '#eee', true: '#f3cba8' }} thumbColor={notificacoes ? COR_NORTON : '#f4f3f4'} />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Subscrever Newsletter</Text>
                  <Switch value={newsletter} onValueChange={setNewsletter} trackColor={{ false: '#eee', true: '#f3cba8' }} thumbColor={newsletter ? COR_NORTON : '#f4f3f4'} />
                </View>
              </View>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actionRow}>
            <Text style={styles.actionText}>{step === 4 ? 'Criar Conta' : 'Avançar'}</Text>
            <TouchableOpacity onPress={step === 4 ? handleRegisterFinal : handleAvancar} disabled={loading}>
              <LinearGradient colors={[COR_NORTON, '#e65c00']} style={styles.goBtn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name={step === 4 ? "checkmark" : "arrow-forward"} size={24} color="#fff" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>

      {/* NOVO MODAL DE SEXO (Funciona na Web, iOS e Android) */}
      <Modal visible={modalSexoVisible} transparent animationType="fade" onRequestClose={() => setModalSexoVisible(false)}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalSexoVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione o Sexo</Text>
            {['Prefiro não dizer', 'Masculino', 'Feminino'].map((op, index) => (
              <TouchableOpacity 
                key={op} 
                style={[styles.modalOption, index === 2 && { borderBottomWidth: 0 }]} 
                onPress={() => { 
                  setSexo(op); 
                  setModalSexoVisible(false); 
                }}
              >
                <Text style={styles.modalOptionText}>{op}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  blob: { position: 'absolute', borderRadius: 1000 },
  topBlob: { width: width * 1.2, height: width * 1.2, backgroundColor: 'rgba(255, 107, 0, 0.08)', top: -width * 0.5, right: -width * 0.3 },
  bottomBlob: { width: width * 0.8, height: width * 0.8, backgroundColor: 'rgba(0,0,0,0.02)', bottom: -width * 0.2, left: -width * 0.2 },
  inner: { flexGrow: 1, paddingHorizontal: 35, paddingBottom: 60 },
  backBtn: { position: 'absolute', top: 55, left: 20, zIndex: 10 },
  
  title: { fontSize: 36, fontWeight: 'bold' },
  headerProgresso: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, marginTop: 5 },
  subtitle: { fontSize: 16, color: '#666', fontWeight: '600' },
  
  stepContainer: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#eee' },
  stepDotActive: { backgroundColor: COR_NORTON },
  
  stepContent: { minHeight: 180 },

  avatarArea: { alignItems: 'center', marginBottom: 25, marginTop: -10 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COR_NORTON },
  avatarImage: { width: '100%', height: '100%', borderRadius: 40 },
  btnCamera: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#333', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarLabel: { marginTop: 6, fontSize: 12, color: '#888' },

  inputBox: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 25, paddingVertical: 8 },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#000' },
  eyeIcon: { padding: 5 },
  
  btnConfirmarData: { 
    backgroundColor: COR_NORTON, width: 32, height: 32, borderRadius: 16, 
    justifyContent: 'center', alignItems: 'center' 
  },

  switchesContainer: { marginTop: 5, marginBottom: 25, backgroundColor: '#fcfcfc', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#eee' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  switchLabel: { fontSize: 14, color: '#555', fontWeight: '500' },

  error: { color: '#e74c3c', fontSize: 13, marginBottom: 15, textAlign: 'center' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10 },
  actionText: { fontSize: 22, fontWeight: 'bold', marginRight: 15, color: '#333' },
  goBtn: { width: 60, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  // ESTILOS DO NOVO MODAL DE SEXO
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '80%', borderRadius: 20, padding: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: COR_NORTON, textAlign: 'center' },
  modalOption: { paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  modalOptionText: { fontSize: 16, color: '#333', fontWeight: '500' }
});