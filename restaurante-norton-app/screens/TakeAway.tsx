import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, 
  TextInput, ScrollView, ActivityIndicator, Platform, StatusBar 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

// IMPORTAÇÃO DA NUVEM GLOBAL
import { useTheme } from '../components/TemaContexto';

export default function TakeAway({ navigation }: any) {
  // LIGAR O TEMA
  const { theme, isDark } = useTheme();

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
      const { data, error } = await supabase.from('pratos').select('*').eq('disponivel', true);
      if (error) throw error;
      if (data) setPratos(data.map(p => ({ ...p, quantidade: 0 })));
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível carregar o menu.");
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
    if (selecionados.length === 0) return Alert.alert("Carrinho Vazio", "Por favor, seleciona pelo menos um prato antes de encomendar.");

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Sessão expirada. Inicia sessão novamente.");

      const resumoPratos = selecionados.map(p => `${p.quantidade}x ${p.nome}`).join(', ');
      const totalQtd = selecionados.reduce((acc, p) => acc + p.quantidade, 0);
      const horaFormatada = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      const { error: insertError } = await supabase.from('pedidos').insert([{
        cliente_id: user.id,
        prato_nome: resumoPratos + (observacoes.trim() ? ` (Obs: ${observacoes.trim()})` : ""),
        quantidade: totalQtd,
        total_preco: parseFloat(calcularTotal()),
        hora_recolha: horaFormatada,
        status: 'pendente'
      }]);

      if (insertError) throw new Error(`Erro na base de dados: ${insertError.message}`);

      Alert.alert("Sucesso! 🛍️", "O teu pedido foi enviado para a cozinha.");
      setPratos(prev => prev.map(p => ({ ...p, quantidade: 0 })));
      setObservacoes('');
      navigation.navigate('Início');
      
    } catch (err: any) {
      Alert.alert("Erro no Envio", err.message || "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Aplicar a cor de fundo global
    <View style={[styles.mainContainer, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.orange} />
      
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerLaranja, { backgroundColor: theme.orange }]}>
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={30} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.tituloHeader}>Take-Away</Text>
            <View style={{ width: 30 }} />
          </View>
          <Text style={styles.subTituloHeader}>Prepara a tua encomenda</Text>
        </View>

        <View style={styles.body}>
          
          <TouchableOpacity style={[styles.pickerCard, { backgroundColor: theme.card }]} onPress={() => setShowPicker(true)}>
            <Ionicons name="time" size={28} color={theme.orange} />
            <View style={{ marginLeft: 15 }}>
              <Text style={[styles.labelMini, { color: theme.textSec }]}>HORA DE RECOLHA PREVISTA</Text>
              <Text style={[styles.valorMini, { color: theme.text }]}>
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
              onChange={(e, d) => { setShowPicker(false); if (d) setDate(d); }}
            />
          )}

          <Text style={[styles.seccaoTitulo, { color: theme.text }]}>Menu Disponível</Text>
          
          {loadingPratos ? (
            <ActivityIndicator color={theme.orange} size="large" style={{ marginTop: 40 }} />
          ) : pratos.length === 0 ? (
            <Text style={{ textAlign: 'center', color: theme.textSec, marginTop: 20 }}>Nenhum prato disponível no momento.</Text>
          ) : (
            pratos.map((item) => (
              <View key={item.id} style={[styles.cardPrato, { backgroundColor: theme.card }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nomePrato, { color: theme.text }]}>{item.nome}</Text>
                  <Text style={[styles.precoPrato, { color: theme.orange }]}>{Number(item.preco).toFixed(2)}€</Text>
                </View>
                <View style={styles.contador}>
                  <TouchableOpacity onPress={() => atualizarQuantidade(item.id, 'menos')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="remove-circle-outline" size={32} color={item.quantidade > 0 ? theme.orange : theme.border} />
                  </TouchableOpacity>
                  <Text style={[styles.qtdText, { color: theme.text }]}>{item.quantidade}</Text>
                  <TouchableOpacity onPress={() => atualizarQuantidade(item.id, 'mais')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="add-circle" size={32} color={theme.orange} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <TextInput
            style={[styles.inputObs, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder="Alguma observação importante? (Ex: Alergias...)"
            placeholderTextColor={theme.textSec}
            multiline
            numberOfLines={4}
            value={observacoes}
            onChangeText={setObservacoes}
          />
        </View>
      </ScrollView>

      {/* FOOTER ADAPTADO AO TEMA */}
      <View style={[styles.footer, { backgroundColor: theme.card }]}>
        <View style={styles.footerInfo}>
          <Text style={[styles.totalLabel, { color: theme.textSec }]}>TOTAL A PAGAR</Text>
          <Text style={[styles.totalTxt, { color: theme.text }]}>{calcularTotal()}€</Text>
        </View>
        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }, { backgroundColor: theme.orange, shadowColor: theme.orange }]} onPress={enviarPedido} disabled={loading}>
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
  mainContainer: { flex: 1 },
  container: { flex: 1 },
  
  headerLaranja: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 60,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tituloHeader: { fontSize: 22, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  subTituloHeader: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 10, textAlign: 'center', fontWeight: '500' },
  
  body: { paddingHorizontal: 20, marginTop: -30 },

  pickerCard: { padding: 20, borderRadius: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 25, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15 },
  labelMini: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  valorMini: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  seccaoTitulo: { fontSize: 18, fontWeight: '800', marginBottom: 15, marginLeft: 5 },
  cardPrato: { padding: 18, borderRadius: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
  nomePrato: { fontWeight: '700', fontSize: 16 },
  precoPrato: { fontWeight: '800', marginTop: 4, fontSize: 15 },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtdText: { fontWeight: '900', fontSize: 18, minWidth: 25, textAlign: 'center' },
  inputObs: { borderRadius: 20, padding: 15, marginTop: 10, minHeight: 100, textAlignVertical: 'top', borderWidth: 1 },
  
  footer: { 
    position: 'absolute', bottom: Platform.OS === 'ios' ? 85 : 80, width: '100%', 
    paddingHorizontal: 25, paddingTop: 20, paddingBottom: 25, 
    borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15 
  },
  footerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  totalLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  totalTxt: { fontSize: 26, fontWeight: '900' },
  btn: { paddingVertical: 18, borderRadius: 22, elevation: 4, shadowOpacity: 0.3, shadowRadius: 8 },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnTxt: { color: '#FFF', fontWeight: '900', letterSpacing: 1, fontSize: 15 }
});