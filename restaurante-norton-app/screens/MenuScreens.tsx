import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, Alert, FlatList, StatusBar } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import NortonLoading from '../components/NortonLoading';
import { useTheme } from '../components/TemaContexto';

const COR_NORTON = '#FF6B00';

export default function MenuScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const [ementaSemanal, setEmentaSemanal] = useState<any[]>([]);
  const [restauranteInfo, setRestauranteInfo] = useState<any>(null); // NOVO: Estado para guardar o horário
  const [loading, setLoading] = useState(true);

  const diasDaSemanaBase = [
    'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 
    'Quinta-Feira', 'Sexta-Feira', 'Sábado', 'Domingo'
  ];

  const mapeamentoDias: { [key: string]: number } = {
    'segunda': 0, 'segunda-feira': 0,
    'terça': 1, 'terça-feira': 1,
    'quarta': 2, 'quarta-feira': 2,
    'quinta': 3, 'quinta-feira': 3,
    'sexta': 4, 'sexta-feira': 4,
    'sábado': 5, 'sabado': 5,
    'domingo': 6
  };

  useEffect(() => {
    carregarDadosGlobais();

    // NOVO: Realtime para atualizar a ementa ou os horários instantaneamente
    let ementaSub: any;
    let restSub: any;

    ementaSub = supabase.channel('ementas_menu')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ementas' }, () => {
        carregarDadosGlobais();
      }).subscribe();

    restSub = supabase.channel('restaurante_menu')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurante' }, (payload) => {
        setRestauranteInfo(payload.new);
      }).subscribe();

    return () => {
      if (ementaSub) supabase.removeChannel(ementaSub);
      if (restSub) supabase.removeChannel(restSub);
    };
  }, []);

  async function carregarDadosGlobais() {
    try {
      setLoading(true);
      
      // Busca a informação de férias e horários do restaurante
      const { data: restData } = await supabase.from('restaurante').select('*').eq('id', 1).maybeSingle();
      if (restData) setRestauranteInfo(restData);

      // Busca os pratos
      const { data, error } = await supabase
        .from('ementas')
        .select(`
          id,
          dia_semana,
          prato:pratos!prato_id (
            nome,
            imagem_url,
            preco
          )
        `);

      if (error) throw error;

      // 1. Criar esqueleto vazio
      let semanaEstruturada = diasDaSemanaBase.map(dia => ({
        dia_semana: dia,
        pratos: [] as any[]
      }));

      // 2. Preencher com dados da BD
      if (data) {
        data.forEach((item: any) => {
          const diaNome = (item.dia_semana || '').trim().toLowerCase();
          const idx = mapeamentoDias[diaNome];
          const pratoInfo = Array.isArray(item.prato) ? item.prato[0] : item.prato;
          
          if (idx !== undefined && pratoInfo) {
            semanaEstruturada[idx].pratos.push(pratoInfo);
          }
        });
      }

      // 3. Lógica de Reordenação (Hoje em primeiro)
      const hojeJS = new Date().getDay(); // 0=Dom, 1=Seg...
      const hojeIndex = hojeJS === 0 ? 6 : hojeJS - 1; // Converter para 0=Seg... 6=Dom

      // Corta o array e junta-o novamente começando por "hoje"
      const ementaReordenada = [
        ...semanaEstruturada.slice(hojeIndex),
        ...semanaEstruturada.slice(0, hojeIndex)
      ];

      setEmentaSemanal(ementaReordenada);
      
    } catch (err: any) {
      console.error("Erro:", err.message);
      Alert.alert("Erro", "Não foi possível carregar a ementa.");
    } finally {
      setLoading(false);
    }
  }

const renderDia = ({ item: dia, index }: { item: any, index: number }) => {
    const eHoje = index === 0;

    let diaFechadoPorHorario = false;
    let mensagemStatus = "Encerrados neste dia";
    let iconStatus: React.ComponentProps<typeof Ionicons>['name'] = "lock-closed-outline";

    if (restauranteInfo) {
      if (restauranteInfo.is_ferias) {
        diaFechadoPorHorario = true;
        mensagemStatus = "Estamos de Férias!";
        iconStatus = "airplane-outline";
      } else {
        const mapParaJson: { [key: string]: string } = {
          'Segunda-Feira': 'Seg', 'Terça-Feira': 'Ter', 'Quarta-Feira': 'Qua',
          'Quinta-Feira': 'Qui', 'Sexta-Feira': 'Sex', 'Sábado': 'Sab', 'Domingo': 'Dom'
        };
        const chaveJson = mapParaJson[dia.dia_semana];
        const infoHorarioDoDia = restauranteInfo.horario_json?.[chaveJson];
        
        if (infoHorarioDoDia && infoHorarioDoDia.aberto === false) {
          diaFechadoPorHorario = true;
          mensagemStatus = "Encerrados neste dia";
          iconStatus = "lock-closed-outline";
        }
      }
    }

    // NOVA LÓGICA: Separar o estado de "Sem Pratos" do estado "Encerrado"
    const temPratos = dia.pratos.length > 0;

    return (
      <View style={[
        styles.cardDia, 
        { backgroundColor: theme.card, borderColor: eHoje ? COR_NORTON : theme.border },
        eHoje && styles.cardHojeDestaque
      ]}>
        
        <View style={styles.headerDia}>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={20} color={eHoje ? COR_NORTON : theme.textSec} />
            <Text style={[styles.nomeDia, { color: theme.text }]}>
              {dia.dia_semana} {eHoje && "(Hoje)"}
            </Text>
          </View>
        </View>
        
        <View style={[styles.divisor, { backgroundColor: eHoje ? COR_NORTON + '30' : theme.border }]} />
        
        {/* Prioridade 1: Se o horário diz que está FECHADO ou FÉRIAS */}
        {diaFechadoPorHorario ? (
          <View style={[styles.containerEncerrado, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <Ionicons name={iconStatus} size={24} color={COR_NORTON} />
            <Text style={[styles.textoEncerrado, { color: theme.textSec }]}>{mensagemStatus}</Text>
          </View>
        ) : (
          /* Prioridade 2: Se está ABERTO mas ainda não inseriste pratos na BD */
          !temPratos ? (
            <View style={[styles.containerEncerrado, { backgroundColor: theme.bg, borderColor: theme.border, borderStyle: 'dotted' }]}>
              <Ionicons name="restaurant-outline" size={24} color={theme.textSec} />
              <Text style={[styles.textoEncerrado, { color: theme.textSec }]}>Ementa em atualização...</Text>
            </View>
          ) : (
            /* Prioridade 3: Se está ABERTO e TEM pratos */
            dia.pratos.map((prato: any, pIndex: number) => (
              <View key={pIndex} style={[styles.containerPrato, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                {prato.imagem_url ? (
                  <Image source={{ uri: prato.imagem_url }} style={styles.fotoPrato} />
                ) : (
                  <View style={[styles.fotoPlaceholder, { backgroundColor: theme.border }]}>
                    <Ionicons name="restaurant-outline" size={24} color={theme.textSec} />
                  </View>
                )}
                <View style={styles.infoMenu}>
                  <Text style={[styles.nomePrato, { color: theme.text }]}>{prato.nome}</Text>
                  <Text style={[styles.detalhesMenu, { color: theme.textSec }]}>Disponível para Take-Away</Text>
                </View>
                <View style={[styles.boxPreco, { backgroundColor: eHoje ? COR_NORTON : '#444' }]}>
                  <Text style={styles.textoPreco}>{Number(prato.preco).toFixed(2)}€</Text>
                </View>
              </View>
            ))
          )
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.tituloHeader, { color: COR_NORTON }]}>Ementa Semanal</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <NortonLoading />
      ) : (
        <FlatList
          data={ementaSemanal}
          keyExtractor={(item) => item.dia_semana}
          renderItem={renderDia}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 20 },
  backBtn: { padding: 5 },
  tituloHeader: { fontSize: 22, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  
  cardDia: { borderRadius: 25, padding: 20, marginBottom: 18, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardHojeDestaque: { borderWidth: 2, elevation: 6, shadowOpacity: 0.15 },
  
  headerDia: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  nomeDia: { fontSize: 17, fontWeight: '900' },
  
  divisor: { height: 1, width: '100%', marginBottom: 15 },
  
  containerPrato: { flexDirection: 'row', borderRadius: 18, padding: 12, marginBottom: 10, alignItems: 'center', borderWidth: 1 },
  fotoPrato: { width: 60, height: 60, borderRadius: 12 },
  fotoPlaceholder: { width: 60, height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  infoMenu: { flex: 1, marginLeft: 15 },
  nomePrato: { fontSize: 15, fontWeight: 'bold' },
  detalhesMenu: { fontSize: 11, marginTop: 3 },
  
  boxPreco: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  textoPreco: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  
  containerEncerrado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', gap: 10 },
  textoEncerrado: { fontSize: 15, fontWeight: 'bold', fontStyle: 'italic' }
});