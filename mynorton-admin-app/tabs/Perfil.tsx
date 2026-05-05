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
  iconBg: '#FFF0E5',
  red: '#FF3B30'
};

export default function Perfil({ navigation }: any) {
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [modoEscuro, setModoEscuro] = useState(false);
  const [fotoPerfilUri, setFotoPerfilUri] = useState<string | null>(null);

  const [modalEdicaoVisible, setModalEdicaoVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formTelemovel, setFormTelemovel] = useState('');
  const [formSexo, setFormSexo] = useState('');
  const [formDataNasc, setFormDataNasc] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');

  useEffect(() => {
    buscarPerfil();
  }, []);

  async function buscarPerfil() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setPerfil({ ...data, email: user.email });
        setModoEscuro(data?.tema_escuro || false);
        if (data?.foto_url) setFotoPerfilUri(data.foto_url);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  // --- FORMATAÇÃO DE DATAS ---
  // Transforma de YYYY-MM-DD para DD/MM/YYYY para mostrar no ecrã
  const formatarDataParaEcra = (dataString: string) => {
    if (!dataString) return '';
    const partes = dataString.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataString;
  };

  // Transforma de DD/MM/YYYY para YYYY-MM-DD para o Supabase
  const formatarDataParaBD = (dataString: string) => {
    if (!dataString) return null;
    const partes = dataString.split('/');
    if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
    return dataString;
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
        // Limpar o prefixo caso exista
        const base64Limpo = resultado.assets[0].base64.includes('base64,') 
          ? resultado.assets[0].base64.split('base64,')[1] 
          : resultado.assets[0].base64;

        const { error: uploadError } = await supabase.storage
          .from('avatares')
          .upload(fileName, decode(base64Limpo), { 
            contentType: 'image/jpeg',
            upsert: true 
          });

        if (uploadError) {
          console.log("Erro de Storage:", uploadError);
          throw new Error("Erro de permissões no Storage do Supabase. Verifica as tuas policies (RLS).");
        }

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
    setFormDataNasc(formatarDataParaEcra(perfil?.data_nascimento)); // Carrega no formato PT
    setFormPassword('');
    setFormConfirmPassword('');
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
      Alert.alert(
        'Selecionar Sexo',
        '',
        opcoes.map(opcao => ({ text: opcao, onPress: () => setFormSexo(opcao) })),
        { cancelable: true }
      );
    }
  }

  async function guardarPerfil() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão inválida.");

      // 1. Lógica da Password Isolada
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
          // Erro típico se a sessão for antiga
          if (passError.message.includes("Security")) {
             Alert.alert("Erro de Segurança", "Para mudares a password, faz logout e entra novamente (sessão muito antiga).");
          } else {
             Alert.alert("Erro na Password", passError.message);
          }
          setSaving(false);
          return;
        }
      }

      // 2. Gravar os Dados (Convertendo a data de volta para BD)
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

  const toggleModoEscuro = async () => {
    const novoValor = !modoEscuro;
    setModoEscuro(novoValor); 
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('perfis').update({ tema_escuro: novoValor }).eq('id', user.id);
      }
    } catch (error) {
      setModoEscuro(!novoValor); 
    }
  };

  async function logout() {
    Alert.alert("Terminar Sessão", "Tens a certeza que queres encerrar a sessão?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => await supabase.auth.signOut() }
    ]);
  }

  const formatarDataVisual = (dataString: string) => {
    if (!dataString) return 'Não definido';
    const partes = dataString.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return new Date(dataString).toLocaleDateString('pt-PT');
  };

  const MenuItem = ({ icon, title, onPress }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
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
        trackColor={{ false: COLORS.border, true: '#FFD166' }} 
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
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }} bounces={false}>
        
        <View style={styles.headerLaranja}>
          <Text style={styles.tituloHeader}>O Meu Perfil</Text>
        </View>

        <View style={styles.body}>
          
          <View style={styles.infoUserCard}>
            <TouchableOpacity style={styles.btnEditarPerfil} onPress={abrirEdicao}>
              <Ionicons name="pencil" size={20} color={COLORS.orange} />
            </TouchableOpacity>

            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {fotoPerfilUri ? (
                  <Image source={{ uri: fotoPerfilUri }} style={styles.avatarImageCustom} />
                ) : (
                  <Image source={require('../imgs/Logotipo_1.png')} style={styles.avatarImagePadrao} />
                )}
              </View>
            </View>
            
            <Text style={styles.nome}>{perfil?.nome || 'Utilizador Norton'}</Text>
            
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {perfil?.tipo_utilizador === 'admin' ? 'Administrador' : 'Funcionário'}
              </Text>
            </View>

            <View style={styles.detalhesContainer}>
              <View style={styles.detalheRow}>
                <Ionicons name="mail-outline" size={18} color={COLORS.subText} />
                <Text style={styles.detalheTexto}>{perfil?.email}</Text>
              </View>
              <View style={styles.detalheRow}>
                <Ionicons name="call-outline" size={18} color={COLORS.subText} />
                <Text style={styles.detalheTexto}>{perfil?.telemovel || 'N/A'}</Text>
              </View>
              <View style={styles.detalheRow}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.subText} />
                <Text style={styles.detalheTexto}>{formatarDataVisual(perfil?.data_nascimento)}</Text>
              </View>
              <View style={styles.detalheRow}>
                <Ionicons name="male-female-outline" size={18} color={COLORS.subText} />
                <Text style={styles.detalheTexto}>{perfil?.sexo || 'N/A'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.seccao}>
            <Text style={styles.seccaoTitulo}>Definições da Conta</Text>
            <SwitchItem 
              icon="moon-outline" 
              title="Modo Escuro" 
              value={modoEscuro}
              onValueChange={toggleModoEscuro}
            />
          </View>

          <View style={styles.seccao}>
            <Text style={styles.seccaoTitulo}>Informações e Suporte</Text>
            <MenuItem 
              icon="information-circle-outline" 
              title="Sobre a App Admin" 
              onPress={() => Alert.alert("App Admin", "Versão de Gestão do Restaurante. Desenvolvida para a cadeira de Informática de Gestão no ISCAC/CBS.")} 
            />
          </View>

          <TouchableOpacity style={styles.btnSair} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.red} />
            <Text style={styles.btnSairTexto}>Terminar Sessão</Text>
          </TouchableOpacity>

          <Text style={styles.versaoApp}>MyNorton - App de Gestão © 2026</Text>
          <Text style={styles.versaoAppSub}>Versão PDI</Text>
        </View>

      </ScrollView>

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
                  <Image source={require('../imgs/Logotipo_1.png')} style={styles.modalAvatarImagePadrao} />
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
                style={styles.input} 
                value={formNome} 
                onChangeText={setFormNome} 
                placeholder="O teu nome" 
                placeholderTextColor={COLORS.subText} 
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telemóvel</Text>
              <TextInput 
                style={styles.input} 
                value={formTelemovel} 
                onChangeText={setFormTelemovel} 
                placeholder="Ex: 912345678" 
                keyboardType="phone-pad" 
                maxLength={9} 
                placeholderTextColor={COLORS.subText} 
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data de Nascimento (Dia/Mês/Ano)</Text>
              <TextInput 
                style={styles.input} 
                value={formDataNasc} 
                onChangeText={setFormDataNasc} 
                placeholder="Ex: 25/10/1995" 
                placeholderTextColor={COLORS.subText} 
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

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nova Palavra-passe</Text>
              <TextInput 
                style={styles.input} 
                value={formPassword} 
                onChangeText={setFormPassword} 
                placeholder="Deixa em branco se não quiseres alterar" 
                placeholderTextColor={COLORS.subText} 
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar Nova Palavra-passe</Text>
              <TextInput 
                style={styles.input} 
                value={formConfirmPassword} 
                onChangeText={setFormConfirmPassword} 
                placeholder="Repete a nova palavra-passe" 
                placeholderTextColor={COLORS.subText} 
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            
            <View style={{ height: 40 }} /> 

          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  
  headerLaranja: { 
    backgroundColor: COLORS.orange, 
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 70 : 50, 
    paddingBottom: 70, 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40,
  },
  tituloHeader: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  body: { marginTop: -40 },
  
  infoUserCard: { 
    backgroundColor: COLORS.card,
    marginHorizontal: 20, 
    borderRadius: 25, 
    padding: 25, 
    paddingTop: 15,
    alignItems: 'center', 
    elevation: 8, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 15,
    position: 'relative' 
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
  avatarContainer: { marginTop: -50, marginBottom: 15 },
  avatar: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: '#FFF',
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden',
    borderWidth: 4, 
    borderColor: COLORS.orange, 
    elevation: 5,
  },
  avatarImagePadrao: { width: '100%', height: '100%', resizeMode: 'contain' },
  avatarImageCustom: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  nome: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  
  badge: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 20
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },

  detalhesContainer: {
    width: '100%',
    backgroundColor: COLORS.bg,
    borderRadius: 15,
    padding: 15,
    gap: 12
  },
  detalheRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detalheTexto: { fontSize: 15, color: COLORS.text, fontWeight: '500' },

  seccao: { marginTop: 30, paddingHorizontal: 20 },
  seccaoTitulo: { fontSize: 13, color: '#aaa', fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 10 },
  
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.card,
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 10, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.03, 
    shadowRadius: 5 
  },
  itemIconBox: { width: 40, height: 40, backgroundColor: COLORS.iconBg, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemTextos: { flex: 1, marginLeft: 15 },
  itemTitulo: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  
  btnSair: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    marginHorizontal: 20, 
    marginTop: 40, 
    padding: 18, 
    borderRadius: 20, 
    borderWidth: 1.5, 
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
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  btnCancelarModal: { fontSize: 16, color: COLORS.subText },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  btnGuardarModal: { fontSize: 16, fontWeight: 'bold', color: COLORS.orange },
  modalBody: { padding: 25 },
  
  modalAvatarArea: { alignItems: 'center', marginBottom: 30 },
  modalAvatarContainer: { position: 'relative' },
  modalAvatarImage: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.card, borderWidth: 3, borderColor: COLORS.orange },
  modalAvatarImagePadrao: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.card, borderWidth: 3, borderColor: COLORS.orange, resizeMode: 'contain' },
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
  modalAvatarLabel: { marginTop: 10, fontSize: 14, color: COLORS.subText, fontWeight: '600' },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, color: COLORS.subText, fontWeight: '600', marginBottom: 8, marginLeft: 5 },
  input: { 
    backgroundColor: COLORS.card, 
    color: COLORS.text, 
    borderColor: COLORS.border, 
    paddingHorizontal: 15, 
    paddingVertical: 15, 
    borderRadius: 15, 
    fontSize: 16, 
    borderWidth: 1 
  },
  inputDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card, 
    borderColor: COLORS.border, 
    paddingHorizontal: 15, 
    paddingVertical: 15, 
    borderRadius: 15, 
    borderWidth: 1 
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 }
});