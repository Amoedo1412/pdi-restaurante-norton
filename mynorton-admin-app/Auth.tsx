import React, { useState } from 'react';
import { Alert, StyleSheet, View, TextInput, Button, Text } from 'react-native';
import { supabase } from './lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Erro ao entrar', error.message);
    setLoading(false);
  }

  // Função que faz o envio real para o Supabase
  async function executarReset() {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      Alert.alert('Sucesso', 'Verifica a tua caixa de correio para repores a password!');
    }
    setLoading(false);
  }

  // Função que pede a confirmação primeiro
  function confirmarReset() {
    if (!email) {
      Alert.alert('Atenção', 'Por favor, introduz o teu email no campo acima primeiro.');
      return;
    }

    // Cria um alerta com botões de escolha
    Alert.alert(
      'Confirmar Email',
      `Queres enviar o link de recuperação para:\n\n${email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sim, enviar', onPress: () => executarReset() }
      ]
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Acesso Reservado</Text>
      <View style={[styles.espacamento, styles.mt20]}>
        <TextInput
          style={styles.input}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@restaurante.com"
          autoCapitalize={'none'}
        />
      </View>
      <View style={styles.espacamento}>
        <TextInput
          style={styles.input}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Password"
          autoCapitalize={'none'}
        />
      </View>
      <View style={[styles.espacamento, styles.mt20]}>
        <Button title="Entrar" disabled={loading} onPress={() => signInWithEmail()} />
      </View>
      
      {/* Botão de recuperação atualizado */}
      <View style={styles.espacamento}>
        <Button 
          title="Esqueci-me da password" 
          disabled={loading} 
          onPress={() => confirmarReset()} 
          color="#888" 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  titulo: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  espacamento: { paddingTop: 4, paddingBottom: 4, alignSelf: 'stretch' },
  mt20: { marginTop: 20 },
  input: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 8, fontSize: 16 }
});