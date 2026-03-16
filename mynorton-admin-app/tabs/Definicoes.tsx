import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  StatusBar, 
  Platform, 
  Alert 
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { 
  bg: '#F4F6F9', 
  card: '#FFFFFF', 
  text: '#1C1C1E', 
  textSec: '#8E8E93', 
  orange: '#FF6B00', 
  border: '#F2F2F7',
  purpleLight: '#EBEBFF'
};

export default function Definicoes({ navigation }: any) {
  const [perfil, setPerfil] = useState<any>(null);

  useEffect(() => {
    buscarPerfil();
  }, []);

  async function buscarPerfil() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', user.id)
        .single();
      setPerfil(data);
    }
  }

  async function logout() {
    Alert.alert("Sair", "Tens a certeza que queres encerrar a sessão?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => await supabase.auth.signOut() }
    ]);
  }

  // Componente de Linha de Definições (estilo a imagem)
  const SettingItem = ({ icon, title, color, onPress }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.itemText}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color="#d8b75a" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Secção de Perfil (Topo) */}
      <View style={styles.header}>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFD166" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFD166" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={require('../imgs/Logotipo_1.png')} 
              style={styles.avatar} 
            />
          </View>
          <Text style={styles.userName}>{perfil?.nome || 'Utilizador Norton'}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Administrador</Text>
          </View>
        </View>
      </View>

      {/* Cartão Branco de Opções (estilo a imagem) */}
      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          
          
          
          <SettingItem 
            icon="person-outline" 
            title="A minha conta" 
            color="#FF6B00" 
            onPress={() => {}} 
          />

          <SettingItem 
            icon="star-outline" 
            title="Minhas Avaliações" 
            color="#FF6B00" 
            onPress={() => navigation.navigate('PortalCriticas')} 
          />

          <SettingItem 
            icon="help-circle-outline" 
            title="Sobre a APP" 
            color="#FF6B00" 
            onPress={() => {}} />
            
          <SettingItem 
            icon="chatbubble-ellipses-outline" 
            title="Chat de Suporte" 
            color="#FF6B00" 
            onPress={() => {}} 
          />

          <View style={styles.divider} />

          <TouchableOpacity style={styles.btnLogout} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.orange} />
            <Text style={styles.txtLogout}>Terminar Sessão</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e67e22' }, // Fundo pastel igual à imagem
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    alignItems: 'center',
  },
  topActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  profileInfo: {
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: '#FFF',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: 15,
    padding: 10,
    overflow: 'hidden'
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  badge: {
    backgroundColor: '#2b2927',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: 10,
  },
  scroll: {
    padding: 30,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#4A4A4A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 10,
    marginBottom: 20
  },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 15,
    backgroundColor: '#c5c5c5',
  },
  txtLogout: {
    marginLeft: 10,
    color: COLORS.orange,
    fontWeight: 'bold',
    fontSize: 15,
  }
});