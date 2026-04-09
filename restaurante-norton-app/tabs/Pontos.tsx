import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Alert, Platform, StatusBar } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons'; 
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics'; 
import NortonLoading from '../components/NortonLoading';

// IMPORTAÇÃO DA NUVEM GLOBAL
import { useTheme } from '../components/TemaContexto';

const { width } = Dimensions.get('window');

const OFERTAS = [
  { id: '1', titulo: 'Café Delta', pts: 15, imagem: 'https://images.unsplash.com/photo-1507133750040-4a8f570eb83a?w=400' },
  { id: '2', titulo: 'Imperial Sagres', pts: 25, imagem: 'https://images.unsplash.com/photo-1618885472118-20c27940bc40?w=400' },
  { id: '3', titulo: 'Refrigerante', pts: 30, imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400' },
  { id: '4', titulo: 'Sobremesa do Dia', pts: 60, imagem: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400' },
  { id: '5', titulo: '5% no Menu', pts: 80, imagem: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400' },
  { id: '6', titulo: 'Tábua de Queijos', pts: 120, imagem: 'https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=400' },
  { id: '7', titulo: 'Almoço Executivo', pts: 150, imagem: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400' },
  { id: '8', titulo: 'Garrafa Vinho', pts: 250, imagem: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400' },
  { id: '9', titulo: 'Jantar para 2', pts: 400, imagem: 'https://images.unsplash.com/photo-1550966841-3ee32ba30934?w=400' },
  { id: '10', titulo: 'Menu Degustação', pts: 600, imagem: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400' },
];

export default function Pontos() {
  // LIGAR À NUVEM GLOBAL
  const { theme, isDark } = useTheme();

  const [saldo, setSaldo] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: pontosData } = await supabase.from('pontos').select('saldo').eq('id', user.id).single();
        if (pontosData) setSaldo(pontosData.saldo);
        
        const { data: vouchersData } = await supabase.from('vouchers').select('*').eq('perfil_id', user.id).order('created_at', { ascending: false });
        if (vouchersData) setVouchers(vouchersData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function resgatarPremio(item: any) {
    Alert.alert(
      "Confirmar Resgate",
      `Desejas trocar ${item.pts} pontos por ${item.titulo}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Resgatar", 
          onPress: async () => {
            setLoading(true);
            try {
              const novoSaldo = saldo - item.pts;
              await supabase.from('pontos').update({ saldo: novoSaldo }).eq('id', userId);
              await supabase.from('vouchers').insert([{ perfil_id: userId, titulo: item.titulo, usado: false }]);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 5000);

              Alert.alert("Sucesso!", "Voucher resgatado.");
              carregarDados();
            } catch (err) {
              Alert.alert("Erro", "Falha no resgate.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }

  if (loading && !showConfetti) return <NortonLoading />;

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.orange} />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        <View style={[styles.headerLaranja, { backgroundColor: theme.orange }]}>
          <Text style={styles.tituloHeader}>Ofertas Norton</Text>
          <Text style={styles.subTituloHeader}>Troca os teus pontos por prémios</Text>
        </View>

        <View style={styles.body}>
          
          <View style={[styles.cartaoPontos, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: isDark ? 1 : 0 }]}>
            <Text style={[styles.label, { color: theme.textSec }]}>O TEU SALDO ACUMULADO</Text>
            <Text style={[styles.valorPontos, { color: theme.orange }]}>{saldo} <Text style={[styles.pts, { color: theme.text }]}>pts</Text></Text>
            <Text style={[styles.equivalencia, { color: theme.textSec }]}>Equivale a {saldo.toFixed(2)}€ consumidos</Text>
          </View>

          <View style={[styles.conversorContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.moedaSimbolo, { backgroundColor: theme.green }]}><Text style={styles.textoMoeda}>1€</Text></View>
            <Ionicons name="swap-horizontal" size={20} color={theme.orange} style={styles.setas} />
            <View style={[styles.pontoSimbolo, { backgroundColor: theme.orange }]}><Text style={styles.textoPonto}>1pt</Text></View>
            <Text style={[styles.legendaCriativa, { color: theme.textSec }]}>O consumo vira recompensa</Text>
          </View>

          <View style={[styles.qrSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.instrucao, { color: theme.textSec }]}>Mostra o QR Code ao pagar a conta</Text>
            {/* O QR Code TEM de ser branco com texto preto, mesmo em Modo Escuro, para a máquina ler! */}
            <View style={styles.qrWrapper}>
              {userId ? <QRCode value={userId} size={140} color="#000000" backgroundColor="#FFFFFF" /> : null}
            </View>
          </View>

          <Text style={[styles.subtitulo, { color: theme.text }]}>Catálogo de Ofertas</Text>
          <View style={styles.grelha}>
            {OFERTAS.map((item, index) => {
              const bloqueada = saldo < item.pts;
              const rotationAngle = index % 2 === 0 ? '-2deg' : '2deg';

              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.cardPremios, { backgroundColor: theme.card, transform: [{ rotate: rotationAngle }] }, bloqueada && styles.bloqueado]}
                  onPress={() => resgatarPremio(item)}
                  disabled={bloqueada}
                >
                  <View style={[styles.containerImagem, { backgroundColor: theme.isDark ? '#2C2C2C' : '#f9f9f9' }]}>
                    <Image source={{ uri: item.imagem }} style={styles.fotoPremios} />
                    {bloqueada && (
                      <View style={styles.lockOverlay}>
                        <Ionicons name="lock-closed" size={24} color="#fff" />
                        <Text style={styles.faltamTexto}>-{item.pts - saldo} pts</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardInfoPremios}>
                    <Text style={[styles.nomeOferta, { color: theme.text }]}>{item.titulo}</Text>
                    <View style={[styles.botaoResgatePill, { backgroundColor: theme.orange }, bloqueada && { backgroundColor: theme.isDark ? '#444' : '#CCC' }]}>
                      <Text style={styles.custoOferta}>{item.pts} pts</Text>
                      <Ionicons name="arrow-forward-circle" size={18} color="#fff" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.subtitulo, { color: theme.text }]}>Vouchers resgatados</Text>
          <View style={styles.listaVouchers}>
            {vouchers.length > 0 ? vouchers.map((v) => (
              <View key={v.id} style={[styles.voucherCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                 <Ionicons name="ticket-outline" size={24} color={theme.orange} />
                 <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={[styles.voucherNome, { color: theme.text }]}>{v.titulo}</Text>
                    <Text style={[styles.voucherData, { color: theme.textSec }]}>{new Date(v.created_at).toLocaleDateString()}</Text>
                 </View>
                 <View style={[styles.statusBadge, { backgroundColor: v.usado ? (theme.isDark ? '#333' : '#f0f0f0') : (theme.isDark ? 'rgba(52, 199, 89, 0.2)' : '#e8f5e9') }]}>
                    <Text style={[styles.statusTexto, { color: v.usado ? theme.textSec : theme.green }]}>
                      {v.usado ? 'USADO' : 'VÁLIDO'}
                    </Text>
                 </View>
              </View>
            )) : <Text style={[styles.vazio, { color: theme.textSec }]}>Ainda não tens vouchers.</Text>}
          </View>

        </View>
      </ScrollView>

      {showConfetti && (
        <ConfettiCannon count={200} origin={{ x: width / 2, y: -20 }} fadeOut={true} explosionSpeed={350} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  container: { flex: 1 },

  headerLaranja: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingHorizontal: 25,
    paddingBottom: 60,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  tituloHeader: { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  subTituloHeader: { color: 'rgba(255,255,255,0.8)', fontSize: 15, marginTop: 5, fontWeight: '500' },

  body: {
    paddingHorizontal: 20,
    marginTop: -30,
  },

  cartaoPontos: { 
    width: '100%', padding: 25, borderRadius: 30, alignItems: 'center', 
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15,
  },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  valorPontos: { fontSize: 48, fontWeight: '900', marginTop: 5 },
  pts: { fontSize: 22 },
  equivalencia: { fontSize: 13, marginTop: 5, fontStyle: 'italic' },
  
  conversorContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10,
    borderRadius: 50, marginTop: -20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1,
    shadowRadius: 5, borderWidth: 1, width: '85%', alignSelf: 'center', justifyContent: 'center'
  },
  moedaSimbolo: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  textoMoeda: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  setas: { marginHorizontal: 8 },
  pontoSimbolo: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  textoPonto: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  legendaCriativa: { marginLeft: 10, fontSize: 11, fontWeight: '600' },

  qrSection: { alignItems: 'center', width: '100%', padding: 25, borderRadius: 30, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, marginTop: 25, borderWidth: 1 },
  instrucao: { marginBottom: 15, fontSize: 13, fontWeight: '700' },
  qrWrapper: { padding: 10, backgroundColor: '#fff', borderRadius: 10 },
  
  subtitulo: { fontSize: 20, fontWeight: '900', marginLeft: 10, marginTop: 35, marginBottom: 15 },
  
  grelha: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardPremios: { 
    width: '47%', borderRadius: 25, marginBottom: 20, elevation: 4, 
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, overflow: 'hidden', 
  },
  containerImagem: { width: '100%', height: 110 },
  fotoPremios: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardInfoPremios: { padding: 12, alignItems: 'center' },
  nomeOferta: { fontWeight: '800', fontSize: 13, textAlign: 'center' },
  
  botaoResgatePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 10, gap: 5 },
  custoOferta: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  
  bloqueado: { opacity: 0.7 },
  lockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  faltamTexto: { color: '#fff', fontSize: 11, fontWeight: '900', marginTop: 4 },

  listaVouchers: { width: '100%', alignSelf: 'center' },
  voucherCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, borderWidth: 1 },
  voucherNome: { fontWeight: 'bold', fontSize: 15 },
  voucherData: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  statusTexto: { fontSize: 11, fontWeight: 'bold' },
  vazio: { textAlign: 'center', marginTop: 10, fontWeight: '500' }
});