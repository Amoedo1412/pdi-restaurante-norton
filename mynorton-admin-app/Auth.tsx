import React, { useState } from 'react';
import { 
  Alert, StyleSheet, View, TextInput, TouchableOpacity, Text, 
  KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar, ScrollView, Image 
} from 'react-native';
import { supabase } from './lib/supabase';
import { useFonts } from 'expo-font';

const COLORS = {
  bg: '#0A0A0A', card: '#1A1A1A', text: '#FFFFFF', textSec: '#8E8E93', 
  orange: '#FF6B00', border: '#2C2C2C'
};

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focado, setFocado] = useState('');

  // Carregar a fonte Bauhaus
  const [fontsLoaded] = useFonts({
    'Bauhaus93': require('./assets/fonts/Bauhaus93.ttf'),
  });

  async function signInWithEmail() {
    if (!email || !password) return Alert.alert('Atenção', 'Preenche tudo.');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Erro', error.message);
    setLoading(false);
  }

  // Mostra loading enquanto a fonte não estiver pronta
  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.orange} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.innerContainer} keyboardShouldPersistTaps="always">
          
          <View style={styles.header}>
            <View style={styles.logoContainer}>
               <Image 
                  source={require('./imgs/Logotipo_1.png')} 
                  style={styles.logoImagem} 
                  resizeMode="contain"
               />
            </View>

            <Text style={styles.tituloHeader}>My <Text style={{color: COLORS.orange}}>NortoN</Text></Text>
            <Text style={styles.subtitulo}>ADMIN PANEL</Text>
          </View>
          
          <View style={[styles.inputWrapper, focado === 'email' && { borderColor: COLORS.orange }]}>
            <TextInput
              style={styles.input} onChangeText={setEmail} value={email}
              placeholder="Email profissional" placeholderTextColor={COLORS.textSec}
              autoCapitalize="none" keyboardType="email-address"
              onFocus={() => setFocado('email')} onBlur={() => setFocado('')}
            />
          </View>

          <View style={[styles.inputWrapper, focado === 'password' && { borderColor: COLORS.orange }]}>
            <TextInput
              style={styles.input} onChangeText={setPassword} value={password}
              secureTextEntry placeholder="Password" placeholderTextColor={COLORS.textSec}
              onFocus={() => setFocado('password')} onBlur={() => setFocado('')}
            />
          </View>

          <TouchableOpacity style={styles.btnPrincipal} onPress={signInWithEmail} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.textBtn}>ENTRAR</Text>}
          </TouchableOpacity>
          
          <Text style={styles.txtCopyright}>© 2026 Restaurante Norton</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  innerContainer: { flexGrow: 1, paddingHorizontal: 40, justifyContent: 'center' },
  header: { marginBottom: 50, alignItems: 'center' },
  logoContainer: {
    width: 120, height: 120, backgroundColor: '#FFF', borderRadius: 60,
    justifyContent: 'center', alignItems: 'center', marginBottom: 15,
    overflow: 'hidden', borderWidth: 2, borderColor: COLORS.orange
  },
  logoImagem: { width: '80%', height: '80%' },
  tituloHeader: { fontSize: 45, fontFamily: 'Bauhaus93', color: COLORS.text, letterSpacing: 1 },
  subtitulo: { fontSize: 12, color: COLORS.textSec, fontWeight: '700', letterSpacing: 3, marginTop: 5 },
  inputWrapper: { backgroundColor: COLORS.card, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border, ...Platform.select({ web: { transition: '0.2s' } as any }) },
  input: { padding: 18, fontSize: 15, color: COLORS.text, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  btnPrincipal: { backgroundColor: COLORS.orange, borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 20 },
  textBtn: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  txtCopyright: { textAlign: 'center', color: COLORS.textSec, fontSize: 10, marginTop: 80 }
});