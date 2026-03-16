import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface RatingProps {
  visible: boolean;
  pedidoId: string;
  onClose: () => void;
}

export default function RatingModal({ visible, pedidoId, onClose }: RatingProps) {
  const [stars, setStars] = useState(0);
  const [comentario, setComentario] = useState('');

  const enviarAvaliacao = async () => {
    if (stars === 0) {
      Alert.alert("Atenção", "Por favor, seleciona pelo menos 1 estrela.");
      return;
    }

    const { error } = await supabase.from('avaliacoes').insert([
      { pedido_id: pedidoId, estrelas: stars, comentario: comentario }
    ]);

    if (!error) {
      Alert.alert("Obrigado!", "A tua avaliação ajuda-nos a melhorar. Ganhaste +5 pontos!");
      // Opcional: Lógica para adicionar 5 pontos ao saldo do utilizador aqui
      onClose();
    } else {
      Alert.alert("Erro", "Não foi possível enviar a avaliação.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.titulo}>Avalia o teu Pedido</Text>
          
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity key={num} onPress={() => setStars(num)}>
                <Ionicons 
                  name={num <= stars ? "star" : "star-outline"} 
                  size={40} 
                  color={num <= stars ? "#e67e22" : "#ccc"} 
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Escreve um pequeno comentário (opcional)..."
            multiline
            value={comentario}
            onChangeText={setComentario}
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.btnCancelar} onPress={onClose}>
              <Text style={styles.txtCancelar}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnEnviar} onPress={enviarAvaliacao}>
              <Text style={styles.txtEnviar}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '85%', backgroundColor: '#fff', borderRadius: 25, padding: 25, alignItems: 'center' },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  input: { width: '100%', backgroundColor: '#f9f9f9', borderRadius: 15, padding: 15, height: 100, textAlignVertical: 'top' },
  buttons: { flexDirection: 'row', marginTop: 20, gap: 15 },
  btnCancelar: { padding: 12 },
  txtCancelar: { color: '#888', fontWeight: 'bold' },
  btnEnviar: { backgroundColor: '#e67e22', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 12 },
  txtEnviar: { color: '#fff', fontWeight: 'bold' }
});