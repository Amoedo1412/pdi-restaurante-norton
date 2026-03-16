import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Alert, ScrollView, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { bg: '#F4F6F9', card: '#FFFFFF', text: '#1C1C1E', textSec: '#8E8E93', orange: '#FF6B00', border: '#E5E5EA', orangeLight: '#FFF0E5' };

export default function Pontos() {
  const [busca, setBusca] = useState('');
  const [cliente, setCliente] = useState<any>(null);
  const [scanner, setScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);

  async function buscarCliente(idOuEmail: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('perfis').select('*').or(`id.eq.${idOuEmail},email.eq.${idOuEmail}`).maybeSingle();
      if (data) setCliente(data); 
      else { Alert.alert("Aviso", "Cliente não encontrado."); setCliente(null); }
    } catch (err) { Alert.alert("Erro", "Formato de leitura inválido."); } 
    finally { setLoading(false); }
  }

  async function adicionarPontos(valor: number) {
    if (!cliente) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const novosPontos = (cliente.pontos || 0) + valor;

      await supabase.from('perfis').update({ pontos: novosPontos }).eq('id', cliente.id);
      await supabase.from('log_pontos').insert({ cliente_id: cliente.id, admin_id: user?.id, quantidade: valor });

      setCliente({ ...cliente, pontos: novosPontos });
      Alert.alert("Sucesso", `${valor} pontos atribuídos!`);
    } catch (err) { Alert.alert("Erro", "Não foi possível atribuir pontos."); }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Modal visible={scanner} animationType="slide">
        <CameraView style={{ flex: 1 }} onBarcodeScanned={({ data }) => { setScanner(false); buscarCliente(data); }}>
          <TouchableOpacity onPress={() => setScanner(false)} style={styles.btnFechar}>
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
        </CameraView>
      </Modal>

      <Text style={styles.titulo}>Leitor QR & Pontos</Text>
      
      <View style={styles.searchRow}>
        <TextInput 
          style={styles.input} placeholder="Email do cliente..." placeholderTextColor={COLORS.textSec}
          value={busca} onChangeText={setBusca} autoCapitalize="none"
        />
        <TouchableOpacity style={styles.btnSearch} onPress={() => buscarCliente(busca)}>
          <Ionicons name="search" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnQR} onPress={async () => { 
          const { granted } = await requestPermission(); 
          if (granted) setScanner(true); else Alert.alert("Aviso", "Permite acesso à câmara."); 
        }}>
          <Ionicons name="qr-code" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {cliente && (
        <View style={styles.cardCliente}>
          <View style={styles.iconUser}>
            <Ionicons name="person" size={40} color={COLORS.orange} />
          </View>
          <Text style={styles.nomeCliente}>{cliente.nome || cliente.email}</Text>
          <Text style={styles.ptsAtual}>{cliente.pontos || 0} PTS</Text>
          
          <View style={styles.botoesPts}>
            <TouchableOpacity style={styles.btnAdd} onPress={() => adicionarPontos(10)}>
              <Text style={styles.txtAdd}>+10 PTS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnAdd} onPress={() => adicionarPontos(50)}>
              <Text style={styles.txtAdd}>+50 PTS</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: COLORS.bg },
  titulo: { fontSize: 28, fontWeight: '900', color: COLORS.text, marginBottom: 20 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  input: { flex: 1, backgroundColor: COLORS.card, color: COLORS.text, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  btnSearch: { backgroundColor: '#121212', padding: 15, borderRadius: 12, justifyContent: 'center' },
  btnQR: { backgroundColor: COLORS.orange, padding: 15, borderRadius: 12, justifyContent: 'center' },
  cardCliente: { backgroundColor: COLORS.card, padding: 30, borderRadius: 20, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  iconUser: { width: 80, height: 80, borderRadius: 20, backgroundColor: COLORS.orangeLight, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  nomeCliente: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  ptsAtual: { fontSize: 45, color: COLORS.orange, fontWeight: '900', marginVertical: 10 },
  botoesPts: { flexDirection: 'row', gap: 15, marginTop: 15, width: '100%' },
  btnAdd: { flex: 1, backgroundColor: COLORS.bg, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  txtAdd: { fontWeight: 'bold', color: COLORS.text, fontSize: 16 },
  btnFechar: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: '#121212', padding: 15, borderRadius: 30 }
});