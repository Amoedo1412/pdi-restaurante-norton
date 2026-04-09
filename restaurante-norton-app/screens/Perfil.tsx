import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Linking, Dimensions, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import NortonLoading from '../components/NortonLoading'; 

const { width } = Dimensions.get('window');

export default function Perfil({ navigation }: any) {
  const [notificacoes, setNotificacoes] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obterDados();
  }, []);

  async function obterDados() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('perfis').select('*').eq('id', user.id).single();
        setPerfil({ ...data, email: user.email }); 
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = () => {
    Alert.alert(
      "Terminar Sessão",
      "Tens a certeza que desejas sair da tua conta?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sair", 
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) Alert.alert("Erro", "Não foi possível sair.");
          }
        }
      ]
    );
  };

  const abrirSuporte = () => {
    Linking.openURL('mailto:suporte@restaurantenorton.pt').catch(() => {
      Alert.alert("Erro", "Não foi possível abrir a aplicação de email.");
    });
  };

  if (loading) return <NortonLoading />;

  const MenuItem = ({ icon, title, subtitle, onPress, rightElement }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress} disabled={!onPress}>
      <View style={styles.itemIconBox}>
        <Ionicons name={icon} size={22} color="#e67e22" />
      </View>
      <View style={styles.itemTextos}>
        <Text style={styles.itemTitulo}>{title}</Text>
        {subtitle && <Text style={styles.itemSubtitulo}>{subtitle}</Text>}
      </View>
      {rightElement ? rightElement : <Ionicons name="chevron-forward" size={20} color="#ccc" />}
    </TouchableOpacity>
  );

  return (
    /* O ScrollView agora é o contentor principal, tal como no Home.tsx! */
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false} 
      contentContainerStyle={{ paddingBottom: 120 }}
      bounces={false} 
    >
      
      {/* CABEÇALHO LARANJA: Como está dentro do ScrollView, agora vai rolar para cima! */}
      <View style={styles.headerLaranja}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVoltar}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.tituloHeader}>O Meu Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* CORPO DA PÁGINA COM MARGEM NEGATIVA */}
      <View style={styles.body}>
        <View style={styles.infoUserCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{perfil?.nome?.charAt(0).toUpperCase() || 'U'}</Text>
            </View>
            <TouchableOpacity style={styles.btnEditAvatar}>
              <Ionicons name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.nome}>{perfil?.nome || 'Utilizador Norton'}</Text>
          <Text style={styles.email}>{perfil?.email}</Text>
          
          <TouchableOpacity style={styles.btnEditarPerfil}>
            <Text style={styles.btnEditarPerfilTexto}>Editar Dados</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.seccao}>
          <Text style={styles.seccaoTitulo}>A Minha Conta</Text>
          <MenuItem 
            icon="receipt-outline" 
            title="Histórico de Pedidos" 
            subtitle="Consulta as tuas encomendas e faturas"
            onPress={() => Alert.alert("Brevemente", "Histórico em desenvolvimento.")} 
          />
          <MenuItem 
            icon="heart-outline" 
            title="Pratos Favoritos" 
            subtitle="Os teus menus preferidos do Norton"
            onPress={() => Alert.alert("Brevemente", "Favoritos em desenvolvimento.")} 
          />
          <MenuItem 
            icon="card-outline" 
            title="Métodos de Pagamento" 
            onPress={() => Alert.alert("Brevemente", "Gerir pagamentos em desenvolvimento.")} 
          />
        </View>

        <View style={styles.seccao}>
          <Text style={styles.seccaoTitulo}>Preferências</Text>
          <MenuItem 
            icon="notifications-outline" 
            title="Notificações Push" 
            rightElement={<Switch value={notificacoes} onValueChange={setNotificacoes} trackColor={{ false: '#eee', true: '#f3cba8' }} thumbColor={notificacoes ? '#e67e22' : '#f4f3f4'} />}
          />
          <MenuItem 
            icon="mail-unread-outline" 
            title="Novidades por E-mail" 
            rightElement={<Switch value={newsletter} onValueChange={setNewsletter} trackColor={{ false: '#eee', true: '#f3cba8' }} thumbColor={newsletter ? '#e67e22' : '#f4f3f4'} />}
          />
        </View>

        <View style={styles.seccao}>
          <Text style={styles.seccaoTitulo}>Suporte</Text>
          <MenuItem 
            icon="chatbubbles-outline" 
            title="Apoio ao Cliente" 
            subtitle="Fala connosco se precisares de ajuda"
            onPress={abrirSuporte} 
          />
          <MenuItem 
            icon="document-text-outline" 
            title="Termos e Privacidade" 
            onPress={() => Linking.openURL('https://restaurantenorton.pt/termos')} 
          />
        </View>

        <TouchableOpacity style={styles.btnSair} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ff3b30" />
          <Text style={styles.btnSairTexto}>Terminar Sessão</Text>
        </TouchableOpacity>

        <Text style={styles.versaoApp}>Versão 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  
  headerLaranja: { 
    backgroundColor: '#FF6B00',
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 70, 
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  btnVoltar: { width: 40, height: 40, justifyContent: 'center' },
  tituloHeader: { fontSize: 20, fontWeight: 'bold', color: '#fff' },

  body: {
    marginTop: -40, 
  },

  infoUserCard: { 
    backgroundColor: '#fff', 
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 }
  },
  avatarContainer: { position: 'relative', marginTop: -50, marginBottom: 10 },
  avatar: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#e67e22',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  avatarText: { color: '#e67e22', fontSize: 36, fontWeight: 'bold' },
  btnEditAvatar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#333',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  nome: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  email: { color: '#888', fontSize: 14, marginTop: 4 },
  btnEditarPerfil: { 
    marginTop: 15, 
    paddingVertical: 8, 
    paddingHorizontal: 20, 
    backgroundColor: '#fdf3ea', 
    borderRadius: 20 
  },
  btnEditarPerfilTexto: { color: '#e67e22', fontWeight: 'bold', fontSize: 13 },

  seccao: { marginTop: 25, paddingHorizontal: 20 },
  seccaoTitulo: { fontSize: 13, color: '#aaa', fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 10 },
  
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 10, 
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  itemIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fdf3ea', justifyContent: 'center', alignItems: 'center' },
  itemTextos: { flex: 1, marginLeft: 15 },
  itemTitulo: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSubtitulo: { fontSize: 12, color: '#888', marginTop: 2 },
  
  btnSair: { 
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20, 
    marginTop: 35, 
    padding: 18, 
    borderRadius: 20, 
    backgroundColor: '#fff',
    borderWidth: 1.5, 
    borderColor: '#ffebee',
    gap: 10
  },
  btnSairTexto: { color: '#ff3b30', fontWeight: 'bold', fontSize: 16 },
  versaoApp: { textAlign: 'center', color: '#ccc', marginTop: 25, fontSize: 12 }
});