import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, 
  ScrollView, Modal, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; 
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const COR_NORTON = '#FF6B00';

export default function AuthScreen({ navigation }: any) {
  // Login States
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Recuperação de Pass States
  const [modalEsqueciVisible, setModalEsqueciVisible] = useState(false);
  const [recuperarEmail, setRecuperarEmail] = useState('');
  const [recuperarTelemovel, setRecuperarTelemovel] = useState('');
  const [loadingRecuperacao, setLoadingRecuperacao] = useState(false);

  async function signIn() {
    setError('');
    const inputLimpo = identificador.trim();

    if (!inputLimpo || !password) {
      setError('Preencha os campos para continuar.');
      return;
    }
    
    setLoading(true);
    let emailParaLogin = inputLimpo;

    if (!inputLimpo.includes('@')) {
      const { data: perfil, error: fetchError } = await supabase
        .from('perfis')
        .select('email')
        .eq('telemovel', inputLimpo)
        .single();

      if (fetchError || !perfil) {
        setError('Telemóvel não encontrado. Verifica os dados ou regista-te.');
        setLoading(false);
        return;
      }
      emailParaLogin = perfil.email;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ 
      email: emailParaLogin, 
      password 
    });

    if (signInError) {
      setError('Dados de acesso incorretos.');
    }
    
    setLoading(false);
  }

  async function verificarERecuperar() {
    if (!recuperarEmail || !recuperarTelemovel) {
      Alert.alert('Aviso', 'Preenche o teu e-mail e telemóvel para localizarmos a conta.');
      return;
    }

    setLoadingRecuperacao(true);

    // Vai à base de dados procurar uma linha que tenha ESTE email E ESTE telemóvel
    const { data, error } = await supabase
      .from('perfis')
      .select('id')
      .eq('email', recuperarEmail.trim().toLowerCase())
      .eq('telemovel', recuperarTelemovel.trim())
      .single();

    setLoadingRecuperacao(false);

    // Se der erro (ex: não encontrou nenhuma linha com os dois dados iguais)
    if (error || !data) {
      Alert.alert(
        'Dados Incorretos', 
        'Não encontrámos nenhuma conta com essa combinação exata de e-mail e telemóvel. Verifica os dados inseridos.'
      );
      return;
    }

    // Se passou, a conta existe e os dados coincidem!
    Alert.alert('Sucesso!', 'Enviámos um link de recuperação para o teu e-mail.');
    setModalEsqueciVisible(false);
    setRecuperarEmail('');
    setRecuperarTelemovel('');
  }

  return (
    <View style={styles.container}>
      <View style={[styles.blob, styles.topBlob]} pointerEvents="none" />
      <View style={[styles.blob, styles.bottomBlob]} pointerEvents="none" />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.inner} 
          bounces={false} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" 
        >
          <Text style={[styles.title, { color: COR_NORTON }]}>Bem-Vindo ao Norton!</Text>
          <Text style={styles.subtitle}>Inicia sessão na tua conta Cliente</Text>

          <View style={styles.inputBox}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
            <TextInput 
              placeholder="E-mail ou Telemóvel" 
              style={styles.input} 
              value={identificador} 
              onChangeText={setIdentificador}
              autoCapitalize="none"
              keyboardType="default"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
            <TextInput 
              placeholder="Palavra-passe" 
              style={styles.input} 
              secureTextEntry={!mostrarPassword} 
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
            <TouchableOpacity onPress={() => setMostrarPassword(!mostrarPassword)} style={styles.eyeIcon}>
              <Ionicons name={mostrarPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.esqueciPassBtn} onPress={() => setModalEsqueciVisible(true)}>
            <Text style={styles.esqueciPassText}>Esqueceste-te da palavra-passe?</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actionRow}>
            <Text style={styles.actionText}>Entrar</Text>
            <TouchableOpacity onPress={signIn} disabled={loading}>
              <LinearGradient colors={[COR_NORTON, '#e65c00']} style={styles.goBtn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="arrow-forward" size={24} color="#fff" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.link}>
            <Text style={styles.linkText}>Ainda não tens conta? <Text style={{color: COR_NORTON, fontWeight: 'bold'}}>Regista-te</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL DE RECUPERAÇÃO DE PALAVRA-PASSE */}
      <Modal visible={modalEsqueciVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recuperar Acesso</Text>
              <TouchableOpacity onPress={() => setModalEsqueciVisible(false)}>
                <Ionicons name="close" size={26} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescricao}>
              Insere os teus dados de registo. Vamos confirmar a tua identidade e enviar as instruções.
            </Text>

            <View style={styles.inputBoxModal}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
              <TextInput 
                placeholder="O teu E-mail" 
                style={styles.input} 
                value={recuperarEmail} 
                onChangeText={setRecuperarEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputBoxModal}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.icon} />
              <TextInput 
                placeholder="O teu Telemóvel" 
                style={styles.input} 
                value={recuperarTelemovel} 
                onChangeText={setRecuperarTelemovel}
                keyboardType="phone-pad"
                maxLength={9}
                placeholderTextColor="#999"
              />
            </View>
            

            <TouchableOpacity style={styles.btnRecuperar} onPress={verificarERecuperar} disabled={loadingRecuperacao}>
              {loadingRecuperacao ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnRecuperarTexto}>Verificar e Enviar Link</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  blob: { position: 'absolute', borderRadius: 1000 },
  topBlob: { width: width * 1.2, height: width * 1.2, backgroundColor: 'rgba(255, 107, 0, 0.08)', top: -width * 0.6, left: -width * 0.2 },
  bottomBlob: { width: width, height: width, backgroundColor: 'rgba(0,0,0,0.02)', bottom: -width * 0.4, right: -width * 0.2 },
  inner: { flexGrow: 1, paddingHorizontal: 35, justifyContent: 'center', paddingBottom: 20 },
  
  // Tipografia ajustada
  title: { fontSize: 38, fontWeight: 'bold', lineHeight: 44 }, 
  subtitle: { fontSize: 16, color: '#666', marginBottom: 35, marginTop: 5 },
  
  inputBox: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 20, paddingVertical: 8 },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#000' },
  eyeIcon: { padding: 5 },
  
  esqueciPassBtn: { alignSelf: 'flex-start', marginBottom: 30 },
  esqueciPassText: { color: COR_NORTON, fontSize: 13, fontWeight: '600' },

  error: { color: '#e74c3c', fontSize: 13, marginBottom: 15, textAlign: 'center' },
  
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 5 },
  actionText: { fontSize: 24, fontWeight: 'bold', marginRight: 15, color: '#333' },
  goBtn: { width: 65, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  
  link: { marginTop: 50, alignItems: 'center' },
  linkText: { fontSize: 15, color: '#666' },
  

  // Estilos do Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 25, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalDescricao: { fontSize: 14, color: '#666', marginBottom: 25, lineHeight: 20 },
  inputBoxModal: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginBottom: 15, paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#fafafa' },
  btnRecuperar: { backgroundColor: COR_NORTON, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnRecuperarTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' }
});