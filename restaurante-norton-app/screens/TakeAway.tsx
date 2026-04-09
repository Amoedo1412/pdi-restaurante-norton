import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, 
  TextInput, ScrollView, ActivityIndicator, Platform, StatusBar 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  orange: '#FF6B00',
  black: '#121212',
  bg: '#F4F6F9',
  card: '#FFFFFF',
  textSec: '#8E8E93',
  border: '#E5E5EA'
};

export default function TakeAway({ navigation }: any) {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [pratos, setPratos] = useState<any[]>([]);
  const [loadingPratos, setLoadingPratos] = useState(true);

  useEffect(() => {
    carregarPratos();
  }, []);

  async function carregarPratos() {
    try {
      setLoadingPratos(true);
      // Vai buscar apenas os pratos que estão disponíveis
      const { data, error } = await supabase.from('pratos').select('*').eq('disponivel', true);
      
      if (error) throw error;
      
      if (data) {
        setPratos(data.map(p => ({ ...p, quantidade: 0 })));
      }
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível carregar o menu.");
      console.error("Erro ao carregar menu:", error.message);
    } finally {
      setLoadingPratos(false);
    }
  }

  const atualizarQuantidade = (id: any, operacao: 'mais' | 'menos') => {
    setPratos(prev => prev.map(p => {
      if (p.id === id) {
        const novaQtd = operacao === 'mais' ? p.quantidade + 1 : Math.max(0, p.quantidade - 1);
        return { ...p, quantidade: novaQtd };
      }
      return p;
    }));
  };

  const calcularTotal = () => {
    const t = pratos.reduce((acc, p) => acc + (Number(p.preco) * p.quantidade), 0);
    return t.toFixed(2);
  };

  const enviarPedido = async () => {
    const selecionados = pratos.filter(p => p.quantidade > 0);
    
    if (selecionados.length === 0) {
      return Alert.alert("Carrinho Vazio", "Por favor, seleciona pelo menos um prato antes de encomendar.");
    }

    setLoading(true);
    try {
      // 1. Vai buscar o ID do utilizador logado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sessão expirada. Inicia sessão novamente.");

      // 2. Prepara o texto do pedido (Ex: "2x Bacalhau, 1x Feijoada")
      const resumoPratos = selecionados.map(p => `${p.quantidade}x ${p.nome}`).join(', ');
      const totalQtd = selecionados.reduce((acc, p) => acc + p.quantidade, 0);

      // Formatação segura da hora para evitar erros no Android
      const horaFormatada = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      // 3. Envia para a base de dados (A Foreign Key garante a ligação ao Perfil!)
      const { error: insertError } = await supabase.from('pedidos').insert([{
        cliente_id: user.id,
        prato_nome: resumoPratos + (observacoes.trim() ? ` (Obs: ${observacoes.trim()})` : ""),
        quantidade: totalQtd,
        total_preco: parseFloat(calcularTotal()),
        hora_recolha: horaFormatada,
        status: 'pendente'
      }]);

      if (insertError) {
        throw new Error(`Erro na base de dados: ${insertError.message}`);
      }

      Alert.alert("Sucesso! 🛍️", "O teu pedido foi enviado para a cozinha.");
      
      // Limpa o carrinho após o sucesso
      setPratos(prev => prev.map(p => ({ ...p, quantidade: 0 })));
      setObservacoes('');
      
      // Volta ao ecrã inicial
      navigation.navigate('Início');
      
    } catch (err: any) {
      Alert.alert("Erro no Envio", err.message || "Ocorreu um erro inesperado.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 200 }} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={30} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.titulo}>Take-Away</Text>
        </View>

        <TouchableOpacity style={styles.pickerCard} onPress={() => setShowPicker(true)}>
          <Ionicons name="time-outline" size={24} color={COLORS.orange} />
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.labelMini}>HORA DE RECOLHA PREVISTA</Text>
            <Text style={styles.valorMini}>
              {date.getHours().toString().padStart(2, '0')}:{date.getMinutes().toString().padStart(2, '0')}
            </Text>
          </View>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={date}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => { 
              setShowPicker(false); 
              if (d) setDate(d); 
            }}
          />
        )}

        <Text style={styles.seccaoTitulo}>Menu Disponível</Text>
        
        {loadingPratos ? (
          <ActivityIndicator color={COLORS.orange} size="large" style={{ marginTop: 40 }} />
        ) : pratos.length === 0 ? (
          <Text style={{ textAlign: 'center', color: COLORS.textSec, marginTop: 20 }}>Nenhum prato disponível no momento.</Text>
        ) : (
          pratos.map((item) => (
            <View key={item.id} style={styles.cardPrato}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomePrato}>{item.nome}</Text>
                <Text style={styles.precoPrato}>{Number(item.preco).toFixed(2)}€</Text>
              </View>
              <View style={styles.contador}>
                <TouchableOpacity onPress={() => atualizarQuantidade(item.id, 'menos')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="remove-circle-outline" size={32} color={item.quantidade > 0 ? COLORS.orange : "#CCC"} />
                </TouchableOpacity>
                <Text style={styles.qtdText}>{item.quantidade}</Text>
                <TouchableOpacity onPress={() => atualizarQuantidade(item.id, 'mais')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="add-circle" size={32} color={COLORS.orange} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TextInput
          style={styles.inputObs}
          placeholder="Alguma observação importante? (Ex: Alergias, sem sal...)"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          value={observacoes}
          onChangeText={setObservacoes}
        />
      </ScrollView>

      {/* FOOTER FLUTUANTE */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.totalLabel}>TOTAL A PAGAR</Text>
          <Text style={styles.totalTxt}>{calcularTotal()}€</Text>
        </View>
        <TouchableOpacity 
          style={[styles.btn, loading && { opacity: 0.7 }]} 
          onPress={enviarPedido} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.btnContent}>
               <Text style={styles.btnTxt}>CONFIRMAR</Text>
               <Ionicons name="basket" size={20} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: Platform.OS === 'ios' ? 60 : 40, marginBottom: 20 },
  titulo: { fontSize: 26, fontWeight: '900', marginLeft: 10, color: COLORS.black },
  pickerCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 25, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  labelMini: { fontSize: 10, color: COLORS.textSec, fontWeight: '800', letterSpacing: 0.5 },
  valorMini: { fontSize: 16, fontWeight: '800', color: COLORS.black, marginTop: 2 },
  seccaoTitulo: { fontSize: 18, fontWeight: '800', marginBottom: 15, color: COLORS.black },
  cardPrato: { backgroundColor: '#FFF', padding: 18, borderRadius: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
  nomePrato: { fontWeight: '700', fontSize: 16, color: COLORS.black },
  precoPrato: { color: COLORS.orange, fontWeight: '800', marginTop: 4, fontSize: 15 },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtdText: { fontWeight: '900', fontSize: 18, minWidth: 25, textAlign: 'center', color: COLORS.black },
  inputObs: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginTop: 20, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border, color: COLORS.black },
  footer: { 
    position: 'absolute', 
    bottom: Platform.OS === 'ios' ? 85 : 80, // Ajustado para ficar perfeitamente colado acima da Bottom Tab
    width: '100%', 
    backgroundColor: '#FFF', 
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 25, 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    elevation: 20, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 15,
  },
  footerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  totalLabel: { fontSize: 11, color: COLORS.textSec, fontWeight: '800', letterSpacing: 1 },
  totalTxt: { fontSize: 26, fontWeight: '900', color: COLORS.black },
  btn: { backgroundColor: COLORS.orange, paddingVertical: 18, borderRadius: 22, elevation: 4, shadowColor: COLORS.orange, shadowOpacity: 0.3, shadowRadius: 8 },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnTxt: { color: '#FFF', fontWeight: '900', letterSpacing: 1, fontSize: 15 }
});