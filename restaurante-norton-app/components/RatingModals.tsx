import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

// IMPORTAR O TEMA GLOBAL
import { useTheme } from '../components/TemaContexto';

const COR_NORTON = '#FF6B00';

interface RatingProps {
  visible: boolean;
  pedidoId: string;
  onClose: () => void;
}

export default function RatingModal({ visible, pedidoId, onClose }: RatingProps) {
  const { theme, isDark } = useTheme(); // Ligar à nuvem de temas
  const [stars, setStars] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviarAvaliacao = async () => {
    if (stars === 0) {
      Alert.alert("Atenção", "Por favor, seleciona pelo menos 1 estrela.");
      return;
    }

    setEnviando(true);

    try {
      // 1. Obter o utilizador atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não autenticado.");

      // 2. Inserir a avaliação na base de dados
      const { error: avaliacaoError } = await supabase.from('avaliacoes').insert([
        { pedido_id: pedidoId, estrelas: stars, comentario: comentario }
      ]);
      if (avaliacaoError) throw avaliacaoError;

      // 3. LÓGICA PARA ADICIONAR +5 PONTOS
      // Primeiro, vamos buscar o saldo atual
      const { data: pontosData, error: pontosError } = await supabase
        .from('pontos')
        .select('saldo')
        .eq('id', user.id)
        .single();
        
      if (pontosError) throw pontosError;

      // Atualizamos com o novo saldo (+5 pontos)
      const novoSaldo = (pontosData?.saldo || 0) + 5;
      await supabase
        .from('pontos')
        .update({ saldo: novoSaldo })
        .eq('id', user.id);

      Alert.alert("Obrigado!", "A tua avaliação ajuda-nos a melhorar. Ganhaste +5 pontos!");
      
      // Limpar os campos para a próxima vez
      setStars(0);
      setComentario('');
      onClose();

    } catch (error: any) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível enviar a avaliação.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        {/* Usar theme.card para o fundo do modal adaptar ao Modo Escuro */}
        <View style={[styles.modal, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: isDark ? 1 : 0 }]}>
          <Text style={[styles.titulo, { color: theme.text }]}>Avalia o teu Pedido</Text>
          
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity key={num} onPress={() => setStars(num)}>
                <Ionicons 
                  name={num <= stars ? "star" : "star-outline"} 
                  size={40} 
                  // Estrelas vazias adaptam-se ao tema
                  color={num <= stars ? COR_NORTON : theme.border} 
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[
              styles.input, 
              { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, borderWidth: 1 }
            ]}
            placeholder="Escreve um pequeno comentário (opcional)..."
            placeholderTextColor={theme.subText}
            multiline
            value={comentario}
            onChangeText={setComentario}
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.btnCancelar} onPress={onClose} disabled={enviando}>
              <Text style={[styles.txtCancelar, { color: theme.subText }]}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.btnEnviar} onPress={enviarAvaliacao} disabled={enviando}>
              {enviando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.txtEnviar}>Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '85%', borderRadius: 25, padding: 25, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  input: { width: '100%', borderRadius: 15, padding: 15, height: 100, textAlignVertical: 'top' },
  buttons: { flexDirection: 'row', marginTop: 20, gap: 15, alignItems: 'center' },
  btnCancelar: { padding: 12, justifyContent: 'center' },
  txtCancelar: { fontWeight: 'bold' },
  btnEnviar: { backgroundColor: COR_NORTON, paddingVertical: 12, paddingHorizontal: 25, borderRadius: 12, minWidth: 100, alignItems: 'center' },
  txtEnviar: { color: '#fff', fontWeight: 'bold' }
});