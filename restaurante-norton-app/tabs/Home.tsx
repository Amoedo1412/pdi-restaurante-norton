import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  Platform, Dimensions, Linking, StatusBar 
} from 'react-native';
import { supabase } from '../lib/supabase';
import EstadoRestaurante from '../components/EstadoRestaurante';
import NortonLoading from '../components/NortonLoading'; 
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

// 1. IMPORTAÇÃO DO TEMA GLOBAL (A "NUVEM")
import { useTheme } from '../components/TemaContexto'; 

const { width } = Dimensions.get('window');

const imagemLocalizacao = require('../imgs/localizacao.png'); 
const imagemBacalhau = require('../imgs/bacalhaucombroa.jpeg');

export default function Home({ navigation }: any) {
  // 2. LIGAR À NUVEM E EXTRAIR O TEMA
  const { theme } = useTheme();

  const [nome, setNome] = useState('Cliente');
  const [loading, setLoading] = useState(true);
  
  const [fontsLoaded] = useFonts({
    'Bauhaus93': require('../assets/fonts/Bauhaus93.ttf'),
  });

  const lat = 40.197702;
  const lng = -8.410096;
  const label = "Restaurante Norton";

  const ementas = [
    { id: 1, dia: 'Segunda-feira', prato: 'Bacalhau com Broa', imagem: imagemBacalhau },
    { id: 2, dia: 'Terça-feira', prato: 'Arroz de Pato', imagem: { uri: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500' } },
    { id: 3, dia: 'Quarta-feira', prato: 'Feijoada', imagem: { uri: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500' } },
  ];

  useEffect(() => {
    obterPerfil();
  }, []);

  async function obterPerfil() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('perfis').select('nome').eq('id', user.id).single();
        if (data?.nome) setNome(data.nome.split(' ')[0]); 
      }
    } catch (error) {
      console.error("Erro ao obter perfil:", error);
    } finally {
      setLoading(false);
    }
  }

  const abrirMapa = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    if (url) Linking.openURL(url).catch((err) => console.error("Erro ao abrir mapa", err));
  };

  if (loading || !fontsLoaded) return <NortonLoading />;

  return (
    // 3. APLICAR CORES DINÂMICAS NAS VISTAS
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={theme.orange} />

      {/* CABEÇALHO */}
      <View style={[styles.headerLaranja, { backgroundColor: theme.orange }]}>
        <View style={styles.topRow}>
          <Text style={styles.brand}>My <Text style={{ color: theme.text }}>NortoN</Text></Text>
          <TouchableOpacity onPress={() => navigation.navigate('Perfil')}>
            <View style={styles.miniLogoCircle}>
               <Image source={require('../imgs/Logotipo_1.png')} style={styles.miniLogo} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.saudacaoContainer}>
          <Text style={styles.olaTexto}>Olá, {nome}!</Text>
          <Text style={styles.subSaudacao}>Pronto para uma refeição incrível?</Text>
        </View>
      </View>

      {/* CORPO */}
      <View style={styles.body}>
        
        {/* CARD INFORMAÇÃO */}
        <View style={[styles.cardInfoPrincipal, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <EstadoRestaurante />
          <View style={[styles.divisor, { backgroundColor: theme.border }]} />
          <View style={styles.horarioContainer}>
            <View style={styles.horarioIconRow}>
              <View style={[styles.iconBg, { backgroundColor: theme.iconBg }]}>
                <Ionicons name="time" size={20} color={theme.orange} />
              </View>
              <View style={styles.horarioTextos}>
                <Text style={[styles.horarioLabel, { color: theme.textSec }]}>Hoje estamos abertos</Text>
                <Text style={[styles.horarioValor, { color: theme.text }]}>12:00-15:00 • 19:00-22:30</Text>
              </View>
            </View>
          </View>
        </View>

        {/* EMENTAS */}
        <View style={styles.seccaoEmentas}>
          <View style={styles.ementaHeader}>
            <Text style={[styles.tituloSecao, { color: theme.text }]}>Ementa Semanal</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MenuScreens')} style={styles.verTudoBtn}>
              <Text style={[styles.verTudoTxt, { color: theme.orange }]}>Ver tudo</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.orange} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carrosselContainer}
            snapToInterval={width * 0.75 + 20}
            decelerationRate="fast"
          >
            {ementas.map((item) => (
              <TouchableOpacity key={item.id} style={[styles.cardEmenta, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('MenuScreens')}>
                <Image source={item.imagem} style={styles.imagemEmenta} />
                <View style={styles.overlayEmenta}>
                  <View style={[styles.diaBadge, { backgroundColor: theme.orange }]}>
                    <Text style={styles.diaEmenta}>{item.dia}</Text>
                  </View>
                  <Text style={styles.pratoEmenta}>{item.prato}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* LOCALIZAÇÃO */}
        <View style={styles.seccaoLocalizacao}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>Visite-nos</Text>
          <View style={[styles.cardTakeAway, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Image source={imagemLocalizacao} style={styles.mapPlaceholder} resizeMode="cover" />
            <View style={styles.infoTakeAway}>
              <Text style={[styles.moradaTxt, { color: theme.textSec }]}>Rua do Restaurante Norton, Coimbra</Text>
              {/* O botão "Como chegar" geralmente não muda com o tema escuro, fica fixo */}
              <TouchableOpacity style={[styles.botaoPedido, { backgroundColor: theme.isDark ? '#333' : '#121212' }]} onPress={abrirMapa}>
                <Text style={styles.textoPedido}>Como chegar</Text>
                <Ionicons name="navigate" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerLaranja: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingHorizontal: 25,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  brand: { fontSize: 28, fontFamily: 'Bauhaus93', color: '#FFFFFF' },
  miniLogoCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#FFFFFF', padding: 5, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  miniLogo: { width: '100%', height: '100%' },
  saudacaoContainer: {},
  olaTexto: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
  subSaudacao: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5, fontWeight: '500' },
  body: { marginTop: -30, paddingHorizontal: 20 },
  cardInfoPrincipal: {
    borderRadius: 30, paddingVertical: 20, paddingHorizontal: 20, elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, borderWidth: 1,
  },
  divisor: { height: 1, marginVertical: 15 },
  horarioContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  horarioIconRow: { flexDirection: 'row', alignItems: 'center' },
  iconBg: { padding: 8, borderRadius: 12 },
  horarioTextos: { marginLeft: 12 },
  horarioLabel: { fontSize: 12, fontWeight: '600' },
  horarioValor: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  seccaoEmentas: { marginTop: 35 },
  ementaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  tituloSecao: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  verTudoBtn: { flexDirection: 'row', alignItems: 'center' },
  verTudoTxt: { fontWeight: '700', marginRight: 4 },
  carrosselContainer: { paddingRight: 20 },
  cardEmenta: { 
    width: width * 0.75, height: 220, marginRight: 15, borderRadius: 35, 
    overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 
  },
  imagemEmenta: { width: '100%', height: '100%' },
  overlayEmenta: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.4)' },
  diaBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
  diaEmenta: { color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  pratoEmenta: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  seccaoLocalizacao: { marginTop: 35 },
  cardTakeAway: { borderRadius: 35, overflow: 'hidden', elevation: 5, marginTop: 15, borderWidth: 1 },
  mapPlaceholder: { width: '100%', height: 160 },
  infoTakeAway: { padding: 20 },
  moradaTxt: { fontSize: 13, marginBottom: 15, textAlign: 'center' },
  botaoPedido: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 22, gap: 10 },
  textoPedido: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});