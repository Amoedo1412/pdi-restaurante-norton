import React, { useEffect, useState } from 'react'; 
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Switch, Alert, Dimensions, Platform, Modal, 
  TextInput, KeyboardAvoidingView, ActivityIndicator, Image
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import NortonLoading from '../components/NortonLoading'; 

// IMPORTAR O TEMA GLOBAL DA TUA NUVEM
import { useTheme } from '../components/TemaContexto'; 

const { width } = Dimensions.get('window');
const COR_NORTON = '#FF6B00';

export default function Perfil({ navigation }: any) {
  const { theme, toggleTheme, isDark } = useTheme();

  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Definições 
  const [notificacoes, setNotificacoes] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  
  // Imagem de Perfil
  const [fotoPerfilUri, setFotoPerfilUri] = useState<string | null>(null);

  // Modais e Formulário
  const [modalEdicaoVisible, setModalEdicaoVisible] = useState(false);
  const [modalPrivacidadeVisible, setModalPrivacidadeVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formTelemovel, setFormTelemovel] = useState('');
  const [formSexo, setFormSexo] = useState('');
  const [formDataNasc, setFormDataNasc] = useState('');

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
        if (data?.foto_url) setFotoPerfilUri(data.foto_url);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  }

  const escolherFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para mudar a tua foto!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], 
      quality: 0.5,
    });

    if (!result.canceled) {
      setFotoPerfilUri(result.assets[0].uri);
    }
  };

  const abrirEdicao = () => {
    setFormNome(perfil?.nome || '');
    setFormTelemovel(perfil?.telemovel || '');
    setFormSexo(perfil?.sexo || '');
    setFormDataNasc(perfil?.data_nascimento || '');
    setModalEdicaoVisible(true);
  };

  const guardarPerfil = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não encontrado.");

      const { error } = await supabase
        .from('perfis')
        .update({
          nome: formNome,
          telemovel: formTelemovel,
          sexo: formSexo,
          data_nascimento: formDataNasc || null 
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert("Sucesso!", "Os teus dados foram atualizados.");
      setModalEdicaoVisible(false);
      obterDados(); 
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Terminar Sessão",
      "Tens a certeza que desejas sair da tua conta?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sair", style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
          }
        }
      ]
    );
  };

  if (loading) return <NortonLoading />;

  const MenuItem = ({ icon, title, onPress, rightElement }: any) => (
    <TouchableOpacity style={[styles.item, { backgroundColor: theme.card }]} onPress={onPress} disabled={!onPress}>
      <View style={[styles.itemIconBox, { backgroundColor: theme.iconBg }]}>
        <Ionicons name={icon} size={22} color={COR_NORTON} />
      </View>
      <View style={styles.itemTextos}>
        <Text style={[styles.itemTitulo, { color: theme.text }]}>{title}</Text>
      </View>
      {rightElement ? rightElement : <Ionicons name="chevron-forward" size={20} color={theme.subText} />}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} bounces={false}>
        
        <View style={styles.headerLaranja}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVoltar}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.tituloHeader}>O Meu Perfil</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.body}>
          <View style={[styles.infoUserCard, { backgroundColor: theme.card }]}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: theme.card }]}>
                {fotoPerfilUri ? (
                  <Image source={{ uri: fotoPerfilUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{perfil?.nome?.charAt(0).toUpperCase() || 'U'}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.btnEditAvatar} onPress={escolherFoto}>
                <Ionicons name="camera" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.nome, { color: theme.text }]}>{perfil?.nome || 'Utilizador Norton'}</Text>
            <Text style={[styles.email, { color: theme.subText }]}>{perfil?.email}</Text>
          </View>

          <View style={styles.seccao}>
            <Text style={styles.seccaoTitulo}>A Minha Conta</Text>
            <MenuItem icon="person-outline" title="Conta e Dados Pessoais" onPress={abrirEdicao} />
            <MenuItem icon="receipt-outline" title="Histórico de Pedidos" onPress={() => Alert.alert("Brevemente", "Histórico em desenvolvimento.")} />
          </View>

          <View style={styles.seccao}>
            <Text style={styles.seccaoTitulo}>Definições</Text>
            <MenuItem 
              icon="notifications-outline" title="Notificações Push" 
              rightElement={<Switch value={notificacoes} onValueChange={setNotificacoes} trackColor={{ false: theme.border, true: '#f3cba8' }} thumbColor={notificacoes ? COR_NORTON : '#f4f3f4'} />}
            />
            <MenuItem 
              icon="mail-unread-outline" title="Novidades por E-mail" 
              rightElement={<Switch value={newsletter} onValueChange={setNewsletter} trackColor={{ false: theme.border, true: '#f3cba8' }} thumbColor={newsletter ? COR_NORTON : '#f4f3f4'} />}
            />
            <MenuItem 
              icon="moon-outline" title="Tema Escuro" 
              rightElement={<Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: theme.border, true: '#f3cba8' }} thumbColor={isDark ? COR_NORTON : '#f4f3f4'} />}
            />
          </View>

          <View style={styles.seccao}>
            <Text style={styles.seccaoTitulo}>Informações</Text>
            <MenuItem icon="information-circle-outline" title="Sobre a App" onPress={() => Alert.alert("My Norton", "Versão 1.0.0\nCriado para a Atividade 2.")} />
            <MenuItem icon="shield-checkmark-outline" title="Política e Privacidade" onPress={() => setModalPrivacidadeVisible(true)} />
          </View>

          <TouchableOpacity style={[styles.btnSair, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#ff3b30" />
            <Text style={styles.btnSairTexto}>Terminar Sessão</Text>
          </TouchableOpacity>

          <Text style={styles.versaoApp}>App Restaurante Norton © 2024</Text>
          <Text style={styles.versaoAppSub}>Versão 1.0.0</Text>
        </View>
      </ScrollView>

      {/* MODAL EDIÇÃO */}
      <Modal visible={modalEdicaoVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalEdicaoVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setModalEdicaoVisible(false)}>
              <Text style={[styles.btnCancelarModal, { color: theme.subText }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitulo, { color: theme.text }]}>Editar Conta</Text>
            <TouchableOpacity onPress={guardarPerfil} disabled={saving}>
              {saving ? <ActivityIndicator color={COR_NORTON} /> : <Text style={styles.btnGuardarModal}>Guardar</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            
            {/* AQUI ESTÃO OS PLACEHOLDERS DE VOLTA */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} 
                value={formNome} 
                onChangeText={setFormNome} 
                placeholder="O teu nome" 
                placeholderTextColor={theme.subText} 
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telemóvel</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} 
                value={formTelemovel} 
                onChangeText={setFormTelemovel} 
                placeholder="Ex: 912345678" 
                keyboardType="phone-pad" 
                maxLength={9} 
                placeholderTextColor={theme.subText} 
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data de Nascimento</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} 
                value={formDataNasc} 
                onChangeText={setFormDataNasc} 
                placeholder="YYYY-MM-DD (Ex: 1995-10-25)" 
                placeholderTextColor={theme.subText} 
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sexo</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} 
                value={formSexo} 
                onChangeText={setFormSexo} 
                placeholder="Feminino, Masculino, etc..." 
                placeholderTextColor={theme.subText} 
              />
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL PRIVACIDADE */}
      <Modal visible={modalPrivacidadeVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalPrivacidadeVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={{ width: 60 }} />
            <Text style={[styles.modalTitulo, { color: theme.text }]}>Privacidade</Text>
            <TouchableOpacity onPress={() => setModalPrivacidadeVisible(false)}>
              <Text style={styles.btnGuardarModal}>Fechar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={[styles.textoPrivacidadeTitulo, { color: theme.text }]}>Política de Privacidade do Norton</Text>
            <Text style={[styles.textoPrivacidade, { color: theme.subText }]}>
              1. Recolha de Dados{'\n'}
              A aplicação recolhe o teu nome, e-mail e informações de perfil apenas para garantir o funcionamento do sistema de reservas e do programa de pontos.{'\n\n'}
              2. Utilização dos Dados{'\n'}
              Os teus dados são armazenados de forma segura na nossa base de dados (Supabase) e nunca serão partilhados com terceiros sem o teu consentimento explícito.{'\n\n'}
              3. Os Teus Direitos{'\n'}
              Podes a qualquer momento editar os teus dados na secção "Conta e Dados Pessoais" ou eliminar a tua conta, o que removerá permanentemente todo o teu histórico.{'\n\n'}
              Para mais questões, contacta o nosso suporte em suporte@restaurantenorton.pt.
            </Text>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  headerLaranja: { 
    backgroundColor: COR_NORTON, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 70 : 50, paddingBottom: 70, 
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  btnVoltar: { width: 40, height: 40, justifyContent: 'center' },
  tituloHeader: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  body: { marginTop: -40 },
  infoUserCard: { marginHorizontal: 20, borderRadius: 25, padding: 25, alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15 },
  avatarContainer: { position: 'relative', marginTop: -50, marginBottom: 15 },
  avatar: { 
    width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    borderWidth: 4, borderColor: COR_NORTON, elevation: 5,
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { color: COR_NORTON, fontSize: 36, fontWeight: 'bold' },
  btnEditAvatar: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#333', width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff'
  },
  nome: { fontSize: 22, fontWeight: 'bold' },
  email: { fontSize: 14, marginTop: 4 },
  seccao: { marginTop: 30, paddingHorizontal: 20 },
  seccaoTitulo: { fontSize: 13, color: '#aaa', fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 10 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
  itemIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemTextos: { flex: 1, marginLeft: 15 },
  itemTitulo: { fontSize: 16, fontWeight: '600' },
  btnSair: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginHorizontal: 20, marginTop: 40, padding: 18, borderRadius: 20, borderWidth: 1.5, gap: 10 },
  btnSairTexto: { color: '#ff3b30', fontWeight: 'bold', fontSize: 16 },
  
  versaoApp: { textAlign: 'center', color: '#ccc', marginTop: 25, fontSize: 12, fontWeight: 'bold' },
  versaoAppSub: { textAlign: 'center', color: '#ccc', marginTop: 2, fontSize: 11 },

  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 20 : 30, paddingBottom: 15, borderBottomWidth: 1 },
  btnCancelarModal: { fontSize: 16 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold' },
  btnGuardarModal: { fontSize: 16, fontWeight: 'bold', color: COR_NORTON },
  modalBody: { padding: 25 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 8, marginLeft: 5 },
  input: { paddingHorizontal: 15, paddingVertical: 15, borderRadius: 15, fontSize: 16, borderWidth: 1 },
  
  textoPrivacidadeTitulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  textoPrivacidade: { fontSize: 15, lineHeight: 24, textAlign: 'justify' }
});