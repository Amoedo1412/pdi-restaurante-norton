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
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Switch,
  ActionSheetIOS
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

const COLORS = { 
  bg: '#F4F6F9', 
  card: '#FFFFFF', 
  text: '#1C1C1E', 
  subText: '#8E8E93', 
  orange: '#FF6B00', 
  border: '#E5E5EA',
  iconBg: 'rgba(255, 107, 0, 0.1)',
  red: '#FF3B30',
  black: '#000000'
};

export default function Perfil({ navigation }: any) {
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Definições
  const [modoEscuro, setModoEscuro] = useState(false);
  const [notificacoes, setNotificacoes] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  
  // Imagem
  const [fotoPerfilUri, setFotoPerfilUri] = useState<string | null>(null);

  // Modais
  const [modalEdicaoVisible, setModalEdicaoVisible] = useState(false);
  const [modalSobreVisible, setModalSobreVisible] = useState(false);
  
  // Formulário Edição
  const [saving, setSaving] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formTelemovel, setFormTelemovel] = useState('');
  const [formSexo, setFormSexo] = useState('');
  const [formDataNasc, setFormDataNasc] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  useEffect(() => {
    buscarPerfil();
  }, []);

  async function buscarPerfil() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('perfis').select('*').eq('id', user.id).single();
        
        if (data) {
          setPerfil({ ...data, email: user.email });
          setModoEscuro(data.tema_escuro || false);
          setNotificacoes(data.notificacoes_push ?? true);
          setNewsletter(data.receber_newsletter ?? false);
          if (data.foto_url) setFotoPerfilUri(data.foto_url);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  const formatarDataParaEcra = (dataString: string) => {
    if (!dataString) return '';
    const partes = dataString.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataString;
  };

  const formatarDataParaBD = (dataString: string) => {
    if (!dataString) return null;
    const partes = dataString.split('/');
    if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
    return dataString;
  };

  const formatarDataVisual = (dataString: string) => {
    if (!dataString) return 'Não definido';
    const partes = dataString.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return new Date(dataString).toLocaleDateString('pt-PT');
  };

  const atualizarDefinicao = async (campo: string, valor: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('perfis').update({ [campo]: valor }).eq('id', user.id);
      if (error) throw error;
      
      if (campo === 'notificacoes_push') setNotificacoes(valor);
      if (campo === 'receber_newsletter') setNewsletter(valor);
      if (campo === 'tema_escuro') setModoEscuro(valor);
      
    } catch (error) {
      Alert.alert("Erro", "Não foi possível guardar a preferência.");
      if (campo === 'notificacoes_push') setNotificacoes(!valor);
      if (campo === 'receber_newsletter') setNewsletter(!valor);
      if (campo === 'tema_escuro') setModoEscuro(!valor);
    }
  };

  async function escolherEGuardarFoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Aviso', 'Precisamos de acesso à galeria para mudar a tua foto.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], 
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true, 
    });
    
    if (!resultado.canceled && resultado.assets[0].base64) {
      setSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sem sessão");

        const fileName = `avatar_${user.id}_${Date.now()}.jpg`;
        const base64Limpo = resultado.assets[0].base64.includes('base64,') 
          ? resultado.assets[0].base64.split('base64,')[1] 
          : resultado.assets[0].base64;

        const { error: uploadError } = await supabase.storage
          .from('avatares')
          .upload(fileName, decode(base64Limpo), { contentType: 'image/jpeg', upsert: true });

        if (uploadError) throw new Error("Erro de permissões no Storage.");

        const { data: urlData } = supabase.storage.from('avatares').getPublicUrl(fileName);
        const novaUrl = urlData.publicUrl;

        await supabase.from('perfis').update({ foto_url: novaUrl }).eq('id', user.id);

        setFotoPerfilUri(novaUrl);
        Alert.alert("Sucesso", "Foto guardada com sucesso!");
      } catch (error: any) {
        Alert.alert("Erro na Fotografia", error.message);
      } finally {
        setSaving(false);
      }
    }
  }

  function abrirEdicao() {
    setFormNome(perfil?.nome || '');
    setFormTelemovel(perfil?.telemovel || '');
    setFormSexo(perfil?.sexo || '');
    setFormDataNasc(formatarDataParaEcra(perfil?.data_nascimento));
    setFormPassword('');
    setFormConfirmPassword('');
    setMostrarPassword(false);
    setModalEdicaoVisible(true);
  }

  function selecionarSexo() {
    const opcoes = ['Prefiro não dizer', 'Masculino', 'Feminino'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', ...opcoes], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex > 0) setFormSexo(opcoes[buttonIndex - 1]);
        }
      );
    } else {
      Alert.alert('Selecionar Sexo', '', opcoes.map(opcao => ({ text: opcao, onPress: () => setFormSexo(opcao) })), { cancelable: true });
    }
  }

  async function guardarPerfil() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão inválida.");

      if (formPassword.trim().length > 0) {
        if (formPassword.length < 6) {
          Alert.alert("Aviso", "A palavra-passe deve ter pelo menos 6 caracteres.");
          setSaving(false);
          return;
        }
        if (formPassword !== formConfirmPassword) {
          Alert.alert("Aviso", "As palavras-passe não coincidem.");
          setSaving(false);
          return;
        }
        
        const { error: passError } = await supabase.auth.updateUser({ password: formPassword });
        if (passError) {
          if (passError.message.includes("Security")) {
             Alert.alert("Erro de Segurança", "Para mudares a password, faz logout e entra novamente.");
          } else {
             Alert.alert("Erro na Password", passError.message);
          }
          setSaving(false);
          return;
        }
      }

      const dataFormatada = formatarDataParaBD(formDataNasc);

      const { error } = await supabase
        .from('perfis')
        .update({
          nome: formNome,
          telemovel: formTelemovel,
          sexo: formSexo,
          data_nascimento: dataFormatada 
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert("Sucesso!", "Os teus dados foram atualizados.");
      setModalEdicaoVisible(false);
      buscarPerfil();
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível guardar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    Alert.alert("Terminar Sessão", "Tens a certeza que queres encerrar a sessão?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => await supabase.auth.signOut() }
    ]);
  }

  const MenuItem = ({ icon, title, onPress }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress} disabled={!onPress}>
      <View style={styles.itemIconBox}>
        <Ionicons name={icon} size={22} color={COLORS.orange} />
      </View>
      <View style={styles.itemTextos}>
        <Text style={styles.itemTitulo}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.subText} />
    </TouchableOpacity>
  );

  const SwitchItem = ({ icon, title, value, onValueChange }: any) => (
    <View style={styles.item}>
      <View style={styles.itemIconBox}>
        <Ionicons name={icon} size={22} color={COLORS.orange} />
      </View>
      <View style={styles.itemTextos}>
        <Text style={styles.itemTitulo}>{title}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onValueChange} 
        trackColor={{ false: COLORS.border, true: '#f3cba8' }} 
        thumbColor={value ? COLORS.orange : '#f4f3f4'} 
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.orange} />
      
      {/* Ajustado paddingBottom para 90 para não haver muito espaço abaixo do Versão PDI */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }} bounces={false}>
        
        <View style={styles.headerLaranja}>
          <Text style={styles.tituloHeader}>O Meu Perfil</Text>
        </View>

        <View style={styles.body}>
          
          <View style={styles.infoUserCard}>
            <TouchableOpacity style={styles.btnEditarPerfil} onPress={abrirEdicao}>
              <Ionicons name="pencil" size={20} color={COLORS.orange} />
            </TouchableOpacity>

            <View style={styles.avatarContainerMain}>
              <View style={styles.avatarMain}>
                {fotoPerfilUri ? (
                  <Image source={{ uri: fotoPerfilUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{perfil?.nome?.charAt(0).toUpperCase() || 'U'}</Text>
                )}
              </View>
            </View>
            
            <Text style={styles.nome}>{perfil?.nome || 'Utilizador Norton'}</Text>
            
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {perfil?.tipo_utilizador === 'admin' ? 'Administrador' : 'Funcionário'}
              </Text>
            </View>

            <Text style={styles.email}>{perfil?.email}</Text>

            <View style={styles.detalhesGrid}>
              <View style={styles.detalheItem}>
                <Ionicons name="call-outline" size={16} color={COLORS.subText} style={styles.detalheIcon} />
                <Text style={styles.detalheTexto}>{perfil?.telemovel || 'Não definido'}</Text>
              </View>
              <View style={styles.detalheItem}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.subText} style={styles.detalheIcon} />
                <Text style={styles.detalheTexto}>{formatarDataVisual(perfil?.data_nascimento)}</Text>
              </View>
              <View style={styles.detalheItem}>
                <Ionicons name="male-female-outline" size={16} color={COLORS.subText} style={styles.detalheIcon} />
                <Text style={styles.detalheTexto}>{perfil?.sexo || 'Não definido'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.seccao}>
            <Text style={styles.seccaoTitulo}>Definições da Conta</Text>
            <SwitchItem 
              icon="notifications-outline" 
              title="Notificações Push" 
              value={notificacoes}
              onValueChange={(valor: boolean) => atualizarDefinicao('notificacoes_push', valor)}
            />
            <SwitchItem 
              icon="mail-unread-outline" 
              title="Novidades por E-mail" 
              value={newsletter}
              onValueChange={(valor: boolean) => atualizarDefinicao('receber_newsletter', valor)}
            />
            <SwitchItem 
              icon="moon-outline" 
              title="Modo Escuro" 
              value={modoEscuro}
              onValueChange={(valor: boolean) => atualizarDefinicao('tema_escuro', valor)}
            />
          </View>

          <View style={styles.seccao}>
            <Text style={styles.seccaoTitulo}>Informações</Text>
            <MenuItem 
              icon="information-circle-outline" 
              title="Sobre a App Admin" 
              onPress={() => setModalSobreVisible(true)} 
            />
          </View>

          <TouchableOpacity style={styles.btnSair} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.red} />
            <Text style={styles.btnSairTexto}>Terminar Sessão</Text>
          </TouchableOpacity>

          <Text style={styles.versaoApp}>Restaurante Norton Admin © 2026</Text>
          <Text style={styles.versaoAppSub}>Versão PDI</Text>
        </View>

      </ScrollView>

      {/* MODAL EDIÇÃO */}
      <Modal visible={modalEdicaoVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalEdicaoVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
          
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalEdicaoVisible(false)}>
              <Text style={styles.btnCancelarModal}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitulo}>Editar Conta</Text>
            <TouchableOpacity onPress={guardarPerfil} disabled={saving}>
              {saving ? <ActivityIndicator color={COLORS.orange} /> : <Text style={styles.btnGuardarModal}>Guardar</Text>}
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            
            <View style={styles.modalAvatarArea}>
              <View style={styles.modalAvatarContainer}>
                {fotoPerfilUri ? (
                  <Image source={{ uri: fotoPerfilUri }} style={styles.modalAvatarImage} />
                ) : (
                  <View style={styles.modalAvatarImagePadrao}>
                    <Text style={[styles.avatarText, { fontSize: 40 }]}>{formNome.charAt(0).toUpperCase() || 'U'}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.modalBtnEditFoto} onPress={escolherEGuardarFoto}>
                  <Ionicons name="camera" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalAvatarLabel}>Alterar Fotografia</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput 
                style={styles.input} value={formNome} onChangeText={setFormNome} 
                placeholder="O teu nome" placeholderTextColor={COLORS.subText} 
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telemóvel</Text>
              <TextInput 
                style={styles.input} value={formTelemovel} onChangeText={setFormTelemovel} 
                placeholder="Ex: 912345678" keyboardType="phone-pad" maxLength={9} 
                placeholderTextColor={COLORS.subText} 
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data de Nascimento (Dia/Mês/Ano)</Text>
              <TextInput 
                style={styles.input} value={formDataNasc} onChangeText={setFormDataNasc} 
                placeholder="Ex: 25/10/1995" placeholderTextColor={COLORS.subText} 
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sexo</Text>
              <TouchableOpacity style={styles.inputDropdown} onPress={selecionarSexo}>
                <Text style={{ color: formSexo ? COLORS.text : COLORS.subText, fontSize: 16 }}>
                  {formSexo || 'Selecionar...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.subText} />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordSection}>
              <Text style={[styles.seccaoTitulo, { marginLeft: 0 }]}>Segurança</Text>
              <Text style={styles.passwordHint}>Preenche apenas se quiseres alterar a palavra-passe atual.</Text>
              
              <View style={styles.passwordContainer}>
                <TextInput 
                  style={[styles.input, { flex: 1 }]} value={formPassword} onChangeText={setFormPassword} 
                  placeholder="Nova palavra-passe" secureTextEntry={!mostrarPassword} 
                  placeholderTextColor={COLORS.subText} autoCapitalize="none"
                />
                <TouchableOpacity style={styles.eyeBtnModal} onPress={() => setMostrarPassword(!mostrarPassword)}>
                  <Ionicons name={mostrarPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.subText} />
                </TouchableOpacity>
              </View>

              <View style={[styles.passwordContainer, { marginTop: 15 }]}>
                <TextInput 
                  style={[styles.input, { flex: 1 }]} value={formConfirmPassword} onChangeText={setFormConfirmPassword} 
                  placeholder="Confirmar nova palavra-passe" secureTextEntry={!mostrarPassword} 
                  placeholderTextColor={COLORS.subText} autoCapitalize="none"
                />
              </View>
            </View>
            
            <View style={{ height: 60 }} /> 

          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL SOBRE A APP ADMIN */}
      <Modal visible={modalSobreVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalSobreVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ width: 60 }} />
            <Text style={styles.modalTitulo}>Sobre a App</Text>
            <TouchableOpacity onPress={() => setModalSobreVisible(false)}>
              <Text style={styles.btnGuardarModal}>Fechar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={[styles.itemIconBox, { width: 80, height: 80, borderRadius: 25, marginBottom: 15 }]}>
                <Ionicons name="briefcase" size={40} color={COLORS.orange} />
              </View>
              <Text style={styles.textoModalTitulo}>MyNorton Admin</Text>
              <Text style={{ color: COLORS.subText, fontSize: 14, fontWeight: '600' }}>Versão PDI</Text>
            </View>
            
            <Text style={styles.textoModalConteudo}>
              A aplicação <Text style={{ fontWeight: 'bold', color: COLORS.text }}>MyNorton</Text> é o painel de administração exclusivo para a equipa do Restaurante Norton. Permite a gestão eficiente de ementas, pedidos em tempo real, atribuição de pontos de fidelização e verificação de vouchers.
              {'\n\n'}
              Desenvolvida no âmbito da unidade curricular de <Text style={{ fontWeight: 'bold', color: COLORS.text }}>PDI (Projeto de Desenvolvimento de Informática)</Text> do curso de Informática de Gestão no ISCAC / CBS. Esta ferramenta foi desenhada para otimizar os fluxos de trabalho da restauração com tecnologia moderna.
              {'\n\n'}
            </Text>
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  
  headerLaranja: { 
    backgroundColor: COLORS.orange, 
    flexDirection: 'row', 
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 70 : 50, 
    paddingBottom: 70, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40,
  },
  tituloHeader: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  
  body: { marginTop: -20 },
  
  infoUserCard: { 
    position: 'relative', 
    marginHorizontal: 20, 
    borderRadius: 25, 
    padding: 25, 
    paddingTop: 15, 
    alignItems: 'center', 
    backgroundColor: COLORS.card,
    elevation: 8, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 15 
  },
  btnEditarPerfil: { 
    position: 'absolute', 
    top: 20, 
    right: 20, 
    width: 36, 
    height: 36, 
    backgroundColor: COLORS.iconBg, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  avatarContainerMain: { marginTop: -50, marginBottom: 15 },
  avatarMain: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden', 
    borderWidth: 4, 
    borderColor: COLORS.orange, 
    backgroundColor: COLORS.bg,
    elevation: 5 
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { color: COLORS.orange, fontSize: 36, fontWeight: 'bold' },
  
  nome: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  
  badge: {
    backgroundColor: COLORS.black,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 6,
    marginBottom: 4
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },

  email: { fontSize: 14, color: COLORS.subText, marginTop: 4 },
  
  detalhesGrid: { width: '100%', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', gap: 12 },
  detalheItem: { flexDirection: 'row', alignItems: 'center' },
  detalheIcon: { marginRight: 10, width: 20 },
  detalheTexto: { fontSize: 15, fontWeight: '500', color: COLORS.text },

  seccao: { marginTop: 30, paddingHorizontal: 20 },
  seccaoTitulo: { fontSize: 13, color: '#aaa', fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 10 },
  
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 10, 
    backgroundColor: COLORS.card,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.03, 
    shadowRadius: 5 
  },
  itemIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.iconBg },
  itemTextos: { flex: 1, marginLeft: 15 },
  itemTitulo: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  
  btnSair: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginHorizontal: 20, 
    marginTop: 40, 
    padding: 18, 
    borderRadius: 20, 
    borderWidth: 1.5, 
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    gap: 10 
  },
  btnSairTexto: { color: COLORS.red, fontWeight: 'bold', fontSize: 16 },
  
  versaoApp: { textAlign: 'center', color: '#ccc', marginTop: 25, fontSize: 12, fontWeight: 'bold' },
  versaoAppSub: { textAlign: 'center', color: '#ccc', marginTop: 2, fontSize: 11 },

  modalContainer: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 20 : 30, 
    paddingBottom: 15, 
    borderBottomWidth: 1,
    backgroundColor: COLORS.card,
    borderBottomColor: COLORS.border
  },
  btnCancelarModal: { fontSize: 16, color: COLORS.subText },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  btnGuardarModal: { fontSize: 16, fontWeight: 'bold', color: COLORS.orange },
  modalBody: { padding: 25 },
  
  modalAvatarArea: { alignItems: 'center', marginBottom: 30 },
  modalAvatarContainer: { position: 'relative' },
  modalAvatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.orange, backgroundColor: COLORS.card },
  modalAvatarImagePadrao: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.orange, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center' },
  modalBtnEditFoto: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    backgroundColor: '#333', 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 3,
    borderColor: COLORS.bg
  },
  modalAvatarLabel: { marginTop: 10, fontSize: 14, fontWeight: '600', color: COLORS.text },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 5, color: COLORS.subText },
  input: { 
    paddingHorizontal: 15, 
    paddingVertical: 15, 
    borderRadius: 15, 
    fontSize: 16, 
    borderWidth: 1,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderColor: COLORS.border
  },
  inputDropdown: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15, 
    paddingVertical: 15, 
    borderRadius: 15, 
    borderWidth: 1,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border
  },
  
  passwordSection: { marginTop: 10, borderTopWidth: 1, paddingTop: 20, borderTopColor: COLORS.border },
  passwordHint: { fontSize: 13, marginBottom: 15, fontStyle: 'italic', color: COLORS.subText },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  eyeBtnModal: { position: 'absolute', right: 15, padding: 10 },

  textoModalTitulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: COLORS.text, textAlign: 'center' },
  textoModalConteudo: { fontSize: 15, lineHeight: 24, textAlign: 'justify', paddingBottom: 50, color: COLORS.text }
});