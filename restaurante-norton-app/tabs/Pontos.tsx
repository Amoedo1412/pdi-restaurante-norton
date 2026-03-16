import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons'; 
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics'; 
import NortonLoading from '../components/NortonLoading';

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
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>Ofertas Norton</Text>
        
        <View style={styles.cartaoPontos}>
          <Text style={styles.label}>O teu saldo acumulado</Text>
          <Text style={styles.valorPontos}>{saldo} <Text style={styles.pts}>pts</Text></Text>
          <Text style={styles.equivalencia}>Equivale a {saldo.toFixed(2)}€ consumidos</Text>
        </View>

        <View style={styles.conversorContainer}>
          <View style={styles.moedaSimbolo}><Text style={styles.textoMoeda}>1€</Text></View>
          <Ionicons name="swap-horizontal" size={20} color="#e67e22" style={styles.setas} />
          <View style={styles.pontoSimbolo}><Text style={styles.textoPonto}>1pt</Text></View>
          <Text style={styles.legendaCriativa}>O consumo vira recompensa</Text>
        </View>

        <View style={styles.qrSection}>
          <Text style={styles.instrucao}>Mostra o QR Code ao pagar a conta</Text>
          <View style={styles.qrWrapper}>
            {userId ? <QRCode value={userId} size={140} color="#333" backgroundColor="white" /> : null}
          </View>
        </View>

        <Text style={styles.subtitulo}>Catálogo de Ofertas</Text>
        <View style={styles.grelha}>
          {OFERTAS.map((item, index) => {
            const bloqueada = saldo < item.pts;
            const rotationAngle = index % 2 === 0 ? '-2deg' : '2deg';

            return (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.cardPremios, { transform: [{ rotate: rotationAngle }] }, bloqueada && styles.bloqueado]}
                onPress={() => resgatarPremio(item)}
                disabled={bloqueada}
              >
                <View style={styles.containerImagem}>
                  <Image source={{ uri: item.imagem }} style={styles.fotoPremios} />
                  {bloqueada && (
                    <View style={styles.lockOverlay}>
                      <Ionicons name="lock-closed" size={24} color="#fff" />
                      <Text style={styles.faltamTexto}>-{item.pts - saldo} pts</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardInfoPremios}>
                  <Text style={styles.nomeOferta}>{item.titulo}</Text>
                  <View style={styles.botaoResgatePill}>
                    <Text style={styles.custoOferta}>{item.pts} pts</Text>
                    <Ionicons name="arrow-forward-circle" size={18} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.subtitulo}>Vouchers resgatados</Text>
        <View style={styles.listaVouchers}>
          {vouchers.length > 0 ? vouchers.map((v) => (
            <View key={v.id} style={styles.voucherCard}>
               <Ionicons name="ticket-outline" size={24} color="#e67e22" />
               <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.voucherNome}>{v.titulo}</Text>
                  <Text style={styles.voucherData}>{new Date(v.created_at).toLocaleDateString()}</Text>
               </View>
               <View style={[styles.statusBadge, { backgroundColor: v.usado ? '#f0f0f0' : '#e8f5e9' }]}>
                  <Text style={[styles.statusTexto, { color: v.usado ? '#888' : '#2e7d32' }]}>
                    {v.usado ? 'USADO' : 'VÁLIDO'}
                  </Text>
               </View>
            </View>
          )) : <Text style={styles.vazio}>Ainda não tens vouchers.</Text>}
        </View>
      </ScrollView>

      {showConfetti && (
        <ConfettiCannon count={200} origin={{ x: width / 2, y: -20 }} fadeOut={true} explosionSpeed={350} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  titulo: { fontSize: 26, fontWeight: 'bold', marginTop: 60, marginLeft: 25, color: '#1a1a1a' },
  cartaoPontos: { backgroundColor: '#e67e22', width: '90%', padding: 25, borderRadius: 30, alignSelf: 'center', marginTop: 20, elevation: 5 },
  label: { color: '#fff', opacity: 0.9, fontSize: 14, fontWeight: '600' },
  valorPontos: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
  pts: { fontSize: 20 },
  equivalencia: { color: '#fff', fontSize: 12, marginTop: 5, fontStyle: 'italic' },
  
  conversorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 50,
    marginTop: -25,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#eee',
    width: '85%',
    alignSelf: 'center',
    justifyContent: 'center'
  },
  moedaSimbolo: { backgroundColor: '#2ecc71', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  textoMoeda: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  setas: { marginHorizontal: 8 },
  pontoSimbolo: { backgroundColor: '#e67e22', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  textoPonto: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  legendaCriativa: { marginLeft: 10, fontSize: 11, color: '#666', fontWeight: '600' },

  qrSection: { alignItems: 'center', width: '90%', padding: 25, backgroundColor: '#fff', borderRadius: 30, borderWidth: 1, borderColor: '#f0f0f0', alignSelf: 'center', marginTop: 25 },
  instrucao: { marginBottom: 15, color: '#888', fontSize: 13, fontWeight: '500' },
  qrWrapper: { padding: 10, backgroundColor: '#fff' },
  
  subtitulo: { fontSize: 22, fontWeight: 'bold', marginLeft: 25, marginTop: 35, marginBottom: 15, color: '#1a1a1a' },
  
  grelha: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20 },
  cardPremios: { 
    width: '47%', 
    backgroundColor: '#fff', 
    borderRadius: 25, 
    marginBottom: 25, 
    elevation: 8, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#f5f5f5' 
  },
  containerImagem: { width: '100%', height: 110, backgroundColor: '#f9f9f9' },
  fotoPremios: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardInfoPremios: { padding: 12, alignItems: 'center' },
  nomeOferta: { fontWeight: '800', fontSize: 14, color: '#333', textAlign: 'center' },
  
  botaoResgatePill: { backgroundColor: '#e67e22', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 10, gap: 5 },
  custoOferta: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  
  bloqueado: { opacity: 0.8 },
  lockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  faltamTexto: { color: '#fff', fontSize: 10, fontWeight: '900', marginTop: 4 },

  listaVouchers: { width: '90%', alignSelf: 'center' },
  voucherCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 18, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0' },
  voucherNome: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  voucherData: { fontSize: 12, color: '#aaa', marginTop: 2 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  statusTexto: { fontSize: 11, fontWeight: 'bold' },
  vazio: { textAlign: 'center', color: '#999', marginTop: 10 }
});