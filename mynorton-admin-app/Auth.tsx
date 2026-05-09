import React, { useState } from 'react';
import { 
  Alert, StyleSheet, View, TextInput, TouchableOpacity, Text, 
  KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar, ScrollView, Image 
} from 'react-native';
import { supabase } from './lib/supabase';
import { useFonts } from 'expo-font';
import { useTheme } from './components/TemaContexto';

export default function Auth() {
  const { theme } = useTheme();
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focado, setFocado] = useState('');

  const [fontsLoaded] = useFonts({
    'Bauhaus93': require('./assets/fonts/Bauhaus93.ttf'),
  });

  async function signInWithEmail() {
    const inputLimpo = identificador.trim();
    if (!inputLimpo || !password) return Alert.alert('Atenção', 'Preenche todos os campos.');
    
    setLoading(true);
    let emailParaLogin = inputLimpo;

    // Login com telemóvel
    if (!inputLimpo.includes('@')) {
      const { data: perfil, error: fetchError } = await supabase
        .from('perfis')
        .select('email')
        .eq('telemovel', inputLimpo)
        .single();

      if (fetchError || !perfil) {
        Alert.alert('Acesso Negado', 'Telemóvel não encontrado no sistema.');
        setLoading(false);
        return;
      }
      emailParaLogin = perfil.email;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: emailParaLogin, password });
    if (error) Alert.alert('Erro', error.message);
    setLoading(false);
  }

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.orange} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.innerContainer} keyboardShouldPersistTaps="always">
          
          <View style={styles.header}>
            <View style={[styles.logoContainer, { borderColor: theme.orange }]}>
               <Image 
                 source={require('./assets/MyNorton.png')} 
                 style={styles.logoImagem} 
                 resizeMode="contain"
               />
            </View>

            <Text style={[styles.tituloHeader, { color: theme.text }]}>My <Text style={{color: theme.orange}}>NortoN</Text></Text>
            <Text style={[styles.subtitulo, { color: theme.subText }]}>ADMIN PANEL</Text>
          </View>
          
          <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }, focado === 'email' && { borderColor: theme.orange }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]} onChangeText={setIdentificador} value={identificador}
              placeholder="Email profissional ou Telemóvel" placeholderTextColor={theme.subText}
              autoCapitalize="none" keyboardType="default"
              onFocus={() => setFocado('email')} onBlur={() => setFocado('')}
            />
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }, focado === 'password' && { borderColor: theme.orange }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]} onChangeText={setPassword} value={password}
              secureTextEntry placeholder="Password" placeholderTextColor={theme.subText}
              onFocus={() => setFocado('password')} onBlur={() => setFocado('')}
            />
          </View>

          <TouchableOpacity style={[styles.btnPrincipal, { backgroundColor: theme.orange }]} onPress={signInWithEmail} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.textBtn}>ENTRAR</Text>}
          </TouchableOpacity>
          
          <Text style={[styles.txtCopyright, { color: theme.subText }]}>© 2026 Restaurante Norton</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  innerContainer: { flexGrow: 1, paddingHorizontal: 40, justifyContent: 'center' },
  header: { marginBottom: 50, alignItems: 'center' },
  logoContainer: {
    width: 120, height: 120, backgroundColor: '#FFF', borderRadius: 60,
    justifyContent: 'center', alignItems: 'center', marginBottom: 15,
    overflow: 'hidden', borderWidth: 2
  },
  logoImagem: { width: '80%', height: '80%' },
  tituloHeader: { fontSize: 45, fontFamily: 'Bauhaus93', letterSpacing: 1 },
  subtitulo: { fontSize: 12, fontWeight: '700', letterSpacing: 3, marginTop: 5 },
  inputWrapper: { borderRadius: 12, marginBottom: 15, borderWidth: 1, ...Platform.select({ web: { transition: '0.2s' } as any }) },
  input: { padding: 18, fontSize: 15, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  btnPrincipal: { borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 20 },
  textBtn: { color: '#FFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  txtCopyright: { textAlign: 'center', fontSize: 10, marginTop: 80 }
});