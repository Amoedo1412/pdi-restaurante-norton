import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  Platform, Dimensions, Linking, StatusBar, Modal, TextInput, Alert, 
  KeyboardAvoidingView, ActivityIndicator 
} from 'react-native';
import { supabase } from '../lib/supabase';
import EstadoRestaurante from '../components/EstadoRestaurante';
import NortonLoading from '../components/NortonLoading'; 
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';

// TEMA GLOBAL
import { useTheme } from '../components/TemaContexto'; 

const { width } = Dimensions.get('window');
const COR_NORTON = '#FF6B00';

const imagemLocalizacao = require('../imgs/localizacao.png'); 
const fallbackBacalhau = require('../imgs/bacalhaucombroa.jpeg');
const fallbackDefault = { uri: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500' };

export default function Home({ navigation }: any) {
  const { theme } = useTheme();

  // Estados Perfil
  const [nome, setNome] = useState('Cliente');
  const [pontos, setPontos] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Estados Dinâmicos
  const [ementas, setEmentas] = useState<any[]>([]);
  const [restauranteInfo, setRestauranteInfo] = useState<any>(null);
  
  // Estados das Críticas
  const [minhaCritica, setMinhaCritica] = useState<any>(null);
  const [modalCriticaVisible, setModalCriticaVisible] = useState(false);
  const [textoCritica, setTextoCritica] = useState('');
  const [nota, setNota] = useState(0); 
  const [loadingCritica, setLoadingCritica] = useState(false);

  const [fontsLoaded] = useFonts({
    'Bauhaus93': require('../assets/fonts/Bauhaus93.ttf'),
  });

  const lat = 40.197702;
  const lng = -8.410096;
  const label = "Restaurante Norton";

  useEffect(() => {
    carregarDadosIniciais();

    // CANAL REALTIME: Escuta qualquer mudança na tabela 'restaurante'
    const restauranteSubscription = supabase
      .channel('public:restaurante')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurante' }, (payload) => {
        setRestauranteInfo(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(restauranteSubscription);
    };
  }, []);

  async function carregarDadosIniciais() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Obter Perfil + Pontos
        const { data: perfilData } = await supabase.from('perfis').select('nome, pontos').eq('id', user.id).maybeSingle();
        if (perfilData) {
          setNome(perfilData.nome ? perfilData.nome.split(' ')[0] : 'Cliente'); 
          setPontos(perfilData.pontos || 0);
        }

        // Verificar Crítica
        const { data: criticaData } = await supabase.from('criticas').select('*').eq('cliente_id', user.id).maybeSingle();
        if (criticaData) setMinhaCritica(criticaData);
      }

      // Obter info inicial do Restaurante (assumindo que o ID é 1)
      const { data: restData } = await supabase.from('restaurante').select('*').eq('id', 1).maybeSingle();
      if (restData) setRestauranteInfo(restData);

      // Obter Ementa relacionada à tabela prato ou pratos
      const { data: ementasData, error: ementasError } = await supabase.from('ementas').select(`
        id,
        dia_semana,
        dia,
        prato (
          nome,
          foto,
          foto_url,
          imagem
        )
      `);
      
      if (!ementasError && ementasData && ementasData.length > 0) {
        const pratosUnicosPorDia: any[] = [];
        const diasVistos = new Set();
        
        ementasData.forEach((pratoItem: any) => {
          const diaRef = pratoItem.dia || pratoItem.dia_semana;
          if (!diasVistos.has(diaRef)) { 
            diasVistos.add(diaRef);
            pratosUnicosPorDia.push(pratoItem);
          }
        });
        setEmentas(pratosUnicosPorDia);
      } else {
        // Fallback
        setEmentas([
          { id: 'f1', dia_semana: 'Segunda', prato: { nome: 'Bacalhau com Broa', foto_url: fallbackBacalhau } },
          { id: 'f2', dia_semana: 'Terça', prato: { nome: 'Arroz de Pato', foto_url: fallbackDefault } }
        ]);
      }
      
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  // --- LÓGICA DOS 3 CARTÕES DO RESTAURANTE ---
  let tipoCartao = "ABERTO"; 
  let statusTexto = "A carregar...";
  let horarioVisual = "--:--";

  if (restauranteInfo) {
    const diasMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const diaKey = diasMap[new Date().getDay()];
    const infoDia = restauranteInfo.horario_json?.[diaKey];

    // 1º Prioridade: FÉRIAS
    if (restauranteInfo.em_ferias || restauranteInfo.is_ferias) {
      tipoCartao = "FERIAS";
      statusTexto = "Estamos de Férias!";
      horarioVisual = restauranteInfo.ferias_fim ? `Regressamos a ${restauranteInfo.ferias_fim}` : "Voltamos em breve!";
    } 
    // 2º Prioridade: ENCERRADO (Manual, Semanal ou no JSON)
    else if (restauranteInfo.is_encerrado || restauranteInfo.is_encerramento_semanal || (infoDia && !infoDia.aberto)) {
      tipoCartao = "ENCERRADO";
      statusTexto = "Hoje estamos encerrados";
      horarioVisual = "Voltamos brevemente!";
    } 
    // 3º Prioridade: ABERTO
    else {
      tipoCartao = "ABERTO";
      statusTexto = "Hoje estamos abertos";
      const abre = infoDia?.inicio || restauranteInfo.horario_abertura?.substring(0,5) || "--:--";
      const fecha = infoDia?.fim || restauranteInfo.horario_fecho?.substring(0,5) || "--:--";
      horarioVisual = `${abre} - ${fecha}`;
    }
  }

  // --- FUNÇÕES DE CONTACTO E LINKS ---
  const ligarRestaurante = () => Linking.openURL('tel:239702359');
  const enviarEmail = () => Linking.openURL('mailto:nortoncomercial@gmail.com');
  const abrirFacebook = () => Linking.openURL('https://www.facebook.com/restaurantenorton239702359');
  const avaliarGoogle = () => Linking.openURL('https://www.google.com/maps/search/Restaurante+Norton+Coimbra/');
  const avaliarTripAdvisor = () => Linking.openURL('https://www.tripadvisor.pt/');

  const abrirMapa = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    if (url) Linking.openURL(url).catch((err) => console.error("Erro ao abrir mapa", err));
  };

  // --- FUNÇÃO DE ENVIAR/APAGAR CRÍTICA ---
  async function submeterCritica() {
    if (nota === 0) return Alert.alert('Aviso', 'Por favor, seleciona uma nota de 1 a 5 estrelas.');
    if (!textoCritica.trim()) return Alert.alert('Aviso', 'Por favor, escreve um comentário sobre a tua experiência.');
    
    setLoadingCritica(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase.from('criticas').insert([{
        cliente_id: user.id,
        nota: nota,
        comentario: textoCritica 
      }]).select().single();

      if (error) {
        Alert.alert('Erro', 'Não foi possível enviar a crítica. Tenta novamente.');
      } else {
        Alert.alert('Obrigado!', 'A tua opinião é muito importante para nós.');
        setMinhaCritica(data); 
        setModalCriticaVisible(false);
      }
    }
    setLoadingCritica(false);
  }

  async function apagarCritica() {
    Alert.alert(
      "Eliminar Crítica",
      "Tens a certeza que queres eliminar a tua avaliação anterior?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('criticas').delete().eq('cliente_id', user.id);
              setMinhaCritica(null);
              setNota(0);
              setTextoCritica('');
            }
          }
        }
      ]
    );
  }

  if (loading || !fontsLoaded) return <NortonLoading />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={theme.orange} />

      {/* CABEÇALHO */}
      <View style={[styles.headerLaranja, { backgroundColor: theme.orange }]}>
        <View style={styles.topRow}>
          <Text style={styles.brand}>My <Text style={{ color: theme.text }}>NortoN</Text></Text>
        </View>

        <View style={styles.saudacaoContainer}>
          <Text style={styles.olaTexto}>{nome}, tens {pontos} pontos!</Text>
          <Text style={styles.subSaudacao}>Ganha pontos ao fazer refeições.</Text>
          <Text style={styles.subSaudacao}>1€ gasto = 1 ponto.</Text>
        </View>
      </View>

      {/* CORPO */}
      <View style={styles.body}>
        
        {/* CARD DINÂMICO DE INFORMAÇÃO / DISPONIBILIDADE */}
        <View style={[styles.cardInfoPrincipal, { backgroundColor: theme.card, borderColor: theme.border }]}>
          
          {/* 1. CARTÃO: ABERTO */}
          {tipoCartao === "ABERTO" && (
            <View>
              <EstadoRestaurante dados={undefined} /> 
              <View style={[styles.divisor, { backgroundColor: theme.border }]} />
              <View style={styles.horarioContainer}>
                <View style={styles.horarioIconRow}>
                  <View style={[styles.iconBg, { backgroundColor: 'rgba(0, 170, 108, 0.1)' }]}>
                    <Ionicons name="time" size={20} color="#00aa6c" />
                  </View>
                  <View style={styles.horarioTextos}>
                    <Text style={[styles.horarioLabel, { color: "#00aa6c" }]}>{statusTexto}</Text>
                    <Text style={[styles.horarioValor, { color: theme.text }]}>{horarioVisual}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 2. CARTÃO: ENCERRADO */}
          {tipoCartao === "ENCERRADO" && (
            <View style={styles.cardStatusSimples}>
              <View style={[styles.iconBgGrande, { backgroundColor: 'rgba(219, 68, 55, 0.1)' }]}>
                <Ionicons name="lock-closed" size={32} color="#DB4437" />
              </View>
              <Text style={[styles.statusTituloGrande, { color: theme.text }]}>{statusTexto}</Text>
              <Text style={[styles.statusSubtituloGrande, { color: theme.textSec }]}>{horarioVisual}</Text>
            </View>
          )}

          {/* 3. CARTÃO: FÉRIAS */}
          {tipoCartao === "FERIAS" && (
            <View style={styles.cardStatusSimples}>
              <View style={[styles.iconBgGrande, { backgroundColor: 'rgba(255, 107, 0, 0.1)' }]}>
                <Ionicons name="airplane" size={32} color={COR_NORTON} />
              </View>
              <Text style={[styles.statusTituloGrande, { color: theme.text }]}>{statusTexto}</Text>
              <Text style={[styles.statusSubtituloGrande, { color: theme.textSec }]}>{horarioVisual}</Text>
              <View style={styles.badgeFerias}>
                <Text style={styles.badgeFeriasTexto}>A carregar baterias!</Text>
              </View>
            </View>
          )}

        </View>

        {/* EMENTAS DINÂMICAS */}
        <View style={styles.seccao}>
          <View style={styles.seccaoHeader}>
            <Text style={[styles.tituloSecao, { color: theme.text }]}>Ementa Semanal</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MenuScreens')} style={styles.verTudoBtn}>
              <Text style={[styles.verTudoTxt, { color: theme.orange }]}>Ver tudo</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.orange} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrosselContainer} snapToInterval={width * 0.75 + 20} decelerationRate="fast">
            {ementas.map((item, index) => {
              const pratoDados = item.prato;
              const caminhoFoto = pratoDados?.foto_url || pratoDados?.foto || pratoDados?.imagem;
              
              // Evita o erro de tipo atribuindo 'any' ou verificando o formato
              let sourceEmenta: any = fallbackDefault;
              if (caminhoFoto) {
                if (typeof caminhoFoto === 'number') {
                  sourceEmenta = caminhoFoto;
                } else if (typeof caminhoFoto === 'string') {
                  sourceEmenta = { uri: caminhoFoto };
                }
              }

              return (
                <TouchableOpacity key={item.id || index} style={[styles.cardEmenta, { backgroundColor: theme.card }]} onPress={() => navigation.navigate('MenuScreens')}>
                  <Image source={sourceEmenta} style={styles.imagemEmenta} />
                  <View style={styles.overlayEmenta}>
                    <View style={[styles.diaBadge, { backgroundColor: theme.orange }]}>
                      <Text style={styles.diaEmenta}>{item.dia || item.dia_semana}</Text>
                    </View>
                    <Text style={styles.pratoEmenta} numberOfLines={2}>
                      {pratoDados?.nome || item.prato_nome || 'Prato'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* CRÍTICAS */}
        <View style={styles.seccao}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>A tua Opinião</Text>
          <View style={[styles.cardCritica, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {minhaCritica ? (
              <View>
                <View style={styles.criticaAgradecimento}>
                  <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    <Text style={[styles.criticaAgradecimentoTxt, { color: theme.text }]}>A tua avaliação</Text>
                  </View>
                  <TouchableOpacity onPress={apagarCritica} style={{ padding: 5 }}>
                    <Ionicons name="trash-outline" size={22} color="#DB4437" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.estrelasLidas}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons key={star} name={minhaCritica.nota >= star ? "star" : "star-outline"} size={16} color={COR_NORTON} style={{ marginRight: 2 }} />
                  ))}
                </View>
                <Text style={[styles.criticaFeita, { color: theme.textSec }]}>"{minhaCritica.comentario}"</Text>
              </View>
            ) : (
              <View style={styles.criticaVazia}>
                <Text style={[styles.criticaVaziaTxt, { color: theme.textSec }]}>Ainda não avaliaste a tua experiência connosco.</Text>
                <TouchableOpacity style={styles.botaoCritica} onPress={() => setModalCriticaVisible(true)}>
                  <Ionicons name="star" size={16} color="#fff" />
                  <Text style={styles.textoBotaoCritica}>Deixar Crítica na App</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.divisorExterno} />
            <Text style={[styles.txtPlataformas, { color: theme.textSec }]}>Avalia-nos também nas plataformas:</Text>
            <View style={styles.plataformasContainer}>
              <TouchableOpacity style={[styles.btnContactoRedondo, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={avaliarGoogle}>
                <View style={[styles.iconCirculo, { backgroundColor: 'rgba(219, 68, 55, 0.1)' }]}>
                  <Ionicons name="logo-google" size={22} color="#DB4437" />
                </View>
                <Text style={[styles.txtContactoBtn, { color: theme.text }]}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.btnContactoRedondo, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={avaliarTripAdvisor}>
                <View style={[styles.iconCirculo, { backgroundColor: 'rgba(0, 170, 108, 0.1)' }]}>
                  <Ionicons name="earth" size={22} color="#00aa6c" />
                </View>
                <Text style={[styles.txtContactoBtn, { color: theme.text }]}>TripAdvisor</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* CONTACTOS & LOCALIZAÇÃO */}
        <View style={styles.seccao}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>Contactos & Localização</Text>
          
          <View style={styles.contactosContainer}>
            <TouchableOpacity style={[styles.btnContactoRedondo, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={ligarRestaurante}>
              <View style={[styles.iconCirculo, { backgroundColor: 'rgba(255, 107, 0, 0.1)' }]}>
                <Ionicons name="call" size={22} color={COR_NORTON} />
              </View>
              <Text style={[styles.txtContactoBtn, { color: theme.text }]}>Chamada</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnContactoRedondo, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={enviarEmail}>
              <View style={[styles.iconCirculo, { backgroundColor: 'rgba(255, 107, 0, 0.1)' }]}>
                <Ionicons name="mail" size={22} color={COR_NORTON} />
              </View>
              <Text style={[styles.txtContactoBtn, { color: theme.text }]}>E-mail</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnContactoRedondo, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={abrirFacebook}>
              <View style={[styles.iconCirculo, { backgroundColor: 'rgba(24, 119, 242, 0.1)' }]}>
                <Ionicons name="logo-facebook" size={22} color="#1877F2" />
              </View>
              <Text style={[styles.txtContactoBtn, { color: theme.text }]}>Facebook</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.cardTakeAway, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
            <Image source={imagemLocalizacao} style={styles.mapPlaceholder} resizeMode="cover" />
            <View style={styles.infoTakeAway}>
              <View style={styles.moradaRow}>
                <Ionicons name="location-outline" size={18} color={COR_NORTON} />
                <Text style={[styles.moradaTxt, { color: theme.textSec }]}>Rua de Moçambique 281, Coimbra</Text>
              </View>
              
              <TouchableOpacity style={[styles.botaoPedido, { backgroundColor: theme.isDark ? '#333' : '#121212' }]} onPress={abrirMapa}>
                <Text style={styles.textoPedido}>Como Chegar ao Norton</Text>
                <Ionicons name="navigate" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </View>

      {/* MODAL PARA NOVA CRÍTICA */}
      <Modal visible={modalCriticaVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>A tua Crítica</Text>
              <TouchableOpacity onPress={() => setModalCriticaVisible(false)}>
                <Ionicons name="close" size={26} color={theme.textSec} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalDescricao, { color: theme.textSec }]}>
              Classifica a tua experiência de 1 a 5 estrelas:
            </Text>

            <View style={styles.seletorEstrelas}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setNota(star)} style={{ padding: 5 }}>
                  <Ionicons 
                    name={nota >= star ? "star" : "star-outline"} 
                    size={36} 
                    color={COR_NORTON} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput 
              style={[styles.inputCritica, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder="Escreve aqui a tua experiência..."
              placeholderTextColor={theme.textSec}
              multiline
              numberOfLines={4}
              value={textoCritica}
              onChangeText={setTextoCritica}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.btnEnviarCritica} onPress={submeterCritica} disabled={loadingCritica}>
              {loadingCritica ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnRecuperarTexto}>Submeter Avaliação</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerLaranja: { paddingTop: Platform.OS === 'ios' ? 70 : 50, paddingHorizontal: 25, paddingBottom: 50, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  brand: { fontSize: 32, fontFamily: 'Bauhaus93', color: '#FFFFFF' },
  saudacaoContainer: {},
  olaTexto: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  subSaudacao: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '500' },
  
  body: { marginTop: -40, paddingHorizontal: 20 },
  
  cardInfoPrincipal: { borderRadius: 30, paddingVertical: 20, paddingHorizontal: 20, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, borderWidth: 1 },
  divisor: { height: 1, marginVertical: 15 },
  horarioContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  horarioIconRow: { flexDirection: 'row', alignItems: 'center' },
  iconBg: { padding: 8, borderRadius: 12 },
  horarioTextos: { marginLeft: 12 },
  horarioLabel: { fontSize: 13, fontWeight: '700' },
  horarioValor: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  
  // NOVOS ESTILOS PARA OS CARTÕES SIMPLES (ENCERRADO / FÉRIAS)
  cardStatusSimples: { alignItems: 'center', paddingVertical: 10 },
  iconBgGrande: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  statusTituloGrande: { fontSize: 20, fontWeight: '900', marginBottom: 5 },
  statusSubtituloGrande: { fontSize: 15, fontWeight: '500' },
  badgeFerias: { marginTop: 15, backgroundColor: COR_NORTON, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  badgeFeriasTexto: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  seccao: { marginTop: 35 },
  seccaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  tituloSecao: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginBottom: 15, paddingHorizontal: 5 },
  verTudoBtn: { flexDirection: 'row', alignItems: 'center' },
  verTudoTxt: { fontWeight: '700', marginRight: 4 },
  
  carrosselContainer: { paddingRight: 20 },
  cardEmenta: { width: width * 0.75, height: 220, marginRight: 15, borderRadius: 35, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  imagemEmenta: { width: '100%', height: '100%' },
  overlayEmenta: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.4)' },
  diaBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
  diaEmenta: { color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  pratoEmenta: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  cardCritica: { borderRadius: 25, padding: 20, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  criticaVazia: { alignItems: 'center', paddingVertical: 10 },
  criticaVaziaTxt: { fontSize: 14, textAlign: 'center', marginBottom: 15 },
  botaoCritica: { backgroundColor: COR_NORTON, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, gap: 8 },
  textoBotaoCritica: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  criticaAgradecimento: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  criticaAgradecimentoTxt: { fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  estrelasLidas: { flexDirection: 'row', marginBottom: 10, paddingLeft: 32 }, 
  criticaFeita: { fontSize: 15, fontStyle: 'italic', lineHeight: 22 },

  divisorExterno: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  txtPlataformas: { fontSize: 13, textAlign: 'center', marginBottom: 15, fontWeight: '600' },
  plataformasContainer: { flexDirection: 'row', justifyContent: 'center', gap: 15 },

  contactosContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 5 },
  btnContactoRedondo: { flex: 1, alignItems: 'center', paddingVertical: 15, borderRadius: 25, borderWidth: 1, marginHorizontal: 5, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  iconCirculo: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  txtContactoBtn: { fontSize: 12, fontWeight: '700' },

  cardTakeAway: { borderRadius: 30, overflow: 'hidden', elevation: 2, borderWidth: 1, marginTop: 10 },
  mapPlaceholder: { width: '100%', height: 160 },
  infoTakeAway: { padding: 20 },
  moradaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, gap: 5 },
  moradaTxt: { fontSize: 14, fontWeight: '500' },
  botaoPedido: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 22, gap: 10 },
  textoPedido: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', borderRadius: 25, padding: 25, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  modalDescricao: { fontSize: 14, marginBottom: 15 },
  seletorEstrelas: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  inputCritica: { borderWidth: 1, borderRadius: 15, padding: 15, fontSize: 15, height: 100, marginBottom: 20 },
  btnEnviarCritica: { backgroundColor: COR_NORTON, paddingVertical: 16, borderRadius: 15, alignItems: 'center' },
  btnRecuperarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});