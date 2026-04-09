import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, 
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; 
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// A COR OFICIAL DO NORTON
const COR_NORTON = '#FF6B00';

export default function AuthScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function signIn() {
    setError('');
    if (!email || !password) {
      setError('Preencha os campos para continuar.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('Dados de acesso incorretos.');
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      {/* A MÁGICA PARA A WEB: pointerEvents="none" 
        Isto diz ao navegador "ignora cliques nestas bolas de fundo" 
      */}
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
          <Text style={[styles.title, { color: COR_NORTON }]}>Olá!</Text>
          <Text style={styles.subtitle}>Inicia sessão na tua conta Norton</Text>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  blob: { position: 'absolute', borderRadius: 1000 },
  topBlob: { width: width * 1.2, height: width * 1.2, backgroundColor: 'rgba(255, 107, 0, 0.1)', top: -width * 0.6, left: -width * 0.2 },
  bottomBlob: { width: width, height: width, backgroundColor: 'rgba(0,0,0,0.03)', bottom: -width * 0.4, right: -width * 0.2 },
  inner: { flexGrow: 1, paddingHorizontal: 35, justifyContent: 'center', paddingBottom: 20 },
  title: { fontSize: 45, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 40 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 25, paddingVertical: 5 },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16 },
  error: { color: 'red', fontSize: 13, marginBottom: 15, textAlign: 'center' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10 },
  actionText: { fontSize: 24, fontWeight: 'bold', marginRight: 15 },
  goBtn: { width: 65, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  link: { marginTop: 40, alignItems: 'center' },
  linkText: { fontSize: 14, color: '#666' }
});