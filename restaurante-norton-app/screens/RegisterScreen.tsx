import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, 
  Alert, ScrollView, TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; 
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function RegisterScreen({ navigation }: any) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const corNortonLaranja = '#e67e22';

  async function handleRegister() {
    setError('');
    if (!nome || !email || !password) {
      setError('Preencha todos os campos para criar conta.');
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: perfilError } = await supabase
        .from('perfis')
        .insert([{ id: data.user.id, nome: nome, email: email }]);

      if (perfilError) console.error("Erro ao criar perfil:", perfilError.message);

      Alert.alert('Sucesso!', 'Conta criada com sucesso. Já podes fazer login.');
      navigation.navigate('Login');
    }
    setLoading(false);
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={[styles.blob, styles.topBlob]} />
        <View style={[styles.blob, styles.bottomBlob]} />

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.inner} 
            bounces={false} 
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={28} color="#333" />
            </TouchableOpacity>

            <Text style={[styles.title, { color: corNortonLaranja, marginTop: 80 }]}>Novo aqui?</Text>
            <Text style={styles.subtitle}>Cria a tua conta e começa a ganhar pontos</Text>

            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
              <TextInput 
                placeholder="Nome Completo" 
                style={styles.input} 
                value={nome} 
                onChangeText={setNome}
              />
            </View>

            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
              <TextInput 
                placeholder="E-mail" 
                style={styles.input} 
                value={email} 
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
              <TextInput 
                placeholder="Palavra-passe" 
                style={styles.input} 
                secureTextEntry 
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actionRow}>
              <Text style={styles.actionText}>Registar</Text>
              <TouchableOpacity onPress={handleRegister} disabled={loading}>
                <LinearGradient colors={['#e67e22', '#d35400']} style={styles.goBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="arrow-forward" size={24} color="#fff" />}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  blob: { position: 'absolute', borderRadius: 1000 },
  topBlob: { width: width * 1.2, height: width * 1.2, backgroundColor: 'rgba(230, 126, 34, 0.08)', top: -width * 0.5, right: -width * 0.3 },
  bottomBlob: { width: width * 0.8, height: width * 0.8, backgroundColor: 'rgba(0,0,0,0.02)', bottom: -width * 0.2, left: -width * 0.2 },
  inner: { flexGrow: 1, paddingHorizontal: 35, justifyContent: 'center', paddingBottom: 40 },
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  title: { fontSize: 40, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 40 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 25, paddingVertical: 5 },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16 },
  error: { color: '#e74c3c', fontSize: 13, marginBottom: 15, textAlign: 'center' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 20 },
  actionText: { fontSize: 24, fontWeight: 'bold', marginRight: 15, color: '#333' },
  goBtn: { width: 65, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 5 }
});