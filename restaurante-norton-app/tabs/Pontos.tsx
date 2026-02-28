import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../lib/supabase';

// Catálogo Expandido com Imagens Reais (1€ = 1 Ponto)
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase
          .from('pontos')
          .select('saldo')
          .eq('id', user.id)
          .single();
        if (data) setSaldo(data.saldo);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e67e22" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ alignItems: 'center', paddingBottom: 30 }}>
      <Text style={styles.titulo}>Fidelização Norton</Text>
      
      <View style={styles.cartaoPontos}>
        <Text style={styles.label}>O teu saldo acumulado</Text>
        <Text style={styles.valorPontos}>{saldo} <Text style={styles.pts}>pts</Text></Text>
        <Text style={styles.equivalencia}>Equivale a {saldo.toFixed(2)}€ consumidos</Text>
      </View>

      <View style={styles.qrSection}>
        <Text style={styles.instrucao}>Mostra o QR Code ao pagar a conta</Text>
        <View style={styles.qrWrapper}>
          {userId ? (
            <QRCode value={userId} size={150} color="#333" backgroundColor="white" />
          ) : (
            <Text style={{ color: '#999' }}>A identificar utilizador...</Text>
          )}
        </View>
      </View>

      <Text style={styles.subtitulo}>Catálogo de Ofertas</Text>

      <View style={styles.grelha}>
        {OFERTAS.map((item) => {
          const bloqueada = saldo < item.pts;
          return (
            <View key={item.id} style={[styles.card, bloqueada && styles.bloqueado]}>
              <Image source={{ uri: item.imagem }} style={styles.foto} />
              
              {bloqueada && (
                <View style={styles.lockOverlay}>
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.faltam}>Faltam {item.pts - saldo} pts</Text>
                </View>
              )}

              <View style={styles.cardInfo}>
                <Text style={styles.nomeOferta}>{item.titulo}</Text>
                <Text style={styles.custoOferta}>{item.pts} Pontos</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 24, fontWeight: 'bold', marginTop: 50, color: '#333' },
  cartaoPontos: { 
    backgroundColor: '#e67e22', 
    width: '90%', 
    padding: 25, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginVertical: 20, 
    elevation: 6 
  },
  label: { color: '#fff', opacity: 0.9, fontSize: 14 },
  valorPontos: { color: '#fff', fontSize: 44, fontWeight: 'bold' },
  pts: { fontSize: 20 },
  equivalencia: { color: '#fff', fontSize: 12, marginTop: 5, fontStyle: 'italic' },
  qrSection: { 
    alignItems: 'center', 
    width: '90%', 
    padding: 20, 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#eee' 
  },
  instrucao: { marginBottom: 15, color: '#666', fontSize: 13, fontWeight: '500' },
  qrWrapper: { padding: 10, backgroundColor: '#fff' },
  subtitulo: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    alignSelf: 'flex-start', 
    marginLeft: '6%', 
    marginTop: 30, 
    marginBottom: 15 
  },
  grelha: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-evenly', 
    width: '100%' 
  },
  card: { 
    width: '44%', 
    backgroundColor: '#fff', 
    borderRadius: 15, 
    marginBottom: 20, 
    overflow: 'hidden', 
    elevation: 3, 
    borderWidth: 1, 
    borderColor: '#efefef' 
  },
  bloqueado: { opacity: 0.9 },
  foto: { width: '100%', height: 110 },
  lockOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  lockIcon: { fontSize: 24 },
  faltam: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginTop: 5 },
  cardInfo: { padding: 10 },
  nomeOferta: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  custoOferta: { color: '#e67e22', fontSize: 12, fontWeight: '700', marginTop: 2 }
});