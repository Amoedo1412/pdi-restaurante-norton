import React, { useEffect, useState } from 'react'; 
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Switch, Alert, Dimensions, Platform, Modal, 
  TextInput, KeyboardAvoidingView, ActivityIndicator, Image,
  ActionSheetIOS
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { decode } from 'base64-arraybuffer';
import NortonLoading from '../components/NortonLoading'; 
import { useTheme } from '../components/TemaContexto'; 

const { width } = Dimensions.get('window');
const COR_NORTON = '#FF6B00';

export default function Perfil({ navigation }: any) {
  const { theme, toggleTheme, isDark } = useTheme();

  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Definições do Perfil
  const [notificacoes, setNotificacoes] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  
  // Imagem de Perfil
  const [fotoPerfilUri, setFotoPerfilUri] = useState<string | null>(null);

  // Modais e Formulário
  const [modalEdicaoVisible, setModalEdicaoVisible] = useState(false);
  const [modalPrivacidadeVisible, setModalPrivacidadeVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estados do Formulário de Edição
  const [formNome, setFormNome] = useState('');
  const [formTelemovel, setFormTelemovel] = useState('');
  const [formSexo, setFormSexo] = useState('');
  const [formDataNasc, setFormDataNasc] = useState('');
  const [novaPassword, setNovaPassword] = useState('');
  const [confirmarNovaPassword, setConfirmarNovaPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  useEffect(() => {
    obterDados();
  }, []);

  async function obterDados() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('perfis').select('*').eq('id', user.id).single();
        
        if (data) {
          setPerfil({ ...data, email: user.email }); 
          if (data.foto_url) setFotoPerfilUri(data.foto_url);
          setNotificacoes(data.notificacoes_push ?? true); 
          setNewsletter(data.receber_newsletter ?? false);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  }

  // --- FORMATAÇÃO DE DATAS ---
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
      
    } catch (error) {
      Alert.alert("Erro", "Não foi possível guardar a preferência.");
    }
  };

  // --- LÓGICA DA FOTOGRAFIA ---
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
          .upload(fileName, decode(base64Limpo), { 
            contentType: 'image/jpeg',
            upsert: true 
          });

        if (uploadError) throw new Error("Erro de permissões no Storage.");

        const { data: urlData } = supabase.storage.from('avatares').getPublicUrl(fileName);
        const novaUrl = urlData.publicUrl;

        await supabase.from('perfis').update({ foto_url: novaUrl }).eq('id', user.id);

        setFotoPerfilUri(novaUrl);
      } catch (error: any) {
        Alert.alert("Erro na Fotografia", error.message);
      } finally {
        setSaving(false);
      }
    }
  }

  // --- LÓGICA DO MODAL DE EDIÇÃO ---
  const abrirEdicao = () => {
    setFormNome(perfil?.nome || '');
    setFormTelemovel(perfil?.telemovel || '');
    setFormSexo(perfil?.sexo || '');
    setFormDataNasc(formatarDataParaEcra(perfil?.data_nascimento));
    setNovaPassword('');
    setConfirmarNovaPassword('');
    setMostrarPassword(false);
    setModalEdicaoVisible(true);
  };

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

  const guardarPerfil = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não encontrado.");

      if (novaPassword.trim().length > 0) {
        if (novaPassword.length < 6) {
          Alert.alert("Aviso", "A nova palavra-passe deve ter pelo menos 6 caracteres.");
          setSaving(false);
          return;
        }
        if (novaPassword !== confirmarNovaPassword) {
          Alert.alert("Aviso", "As palavras-passe não coincidem.");
          setSaving(false);
          return;
        }

        const { error: passError } = await supabase.auth.updateUser({ password: novaPassword });
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

      const { error: perfilError } = await supabase
        .from('perfis')
        .update({
          nome: formNome,
          telemovel: formTelemovel,
          sexo: formSexo,
          data_nascimento: dataFormatada 
        })
        .eq('id', user.id);

      if (perfilError) throw perfilError;

      Alert.alert("Sucesso!", "O teu perfil foi atualizado.");
      setModalEdicaoVisible(false);
      obterDados(); 
    } catch (error: any) {
      Alert.alert("Erro ao guardar", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Terminar Sessão", "Tens a certeza que desejas sair da tua conta?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: async () => await supabase.auth.signOut() }
      ]
    );
  };

  // --- ELIMINAR CONTA DO SUPABASE (PERFIS + AUTH) ---
  const handleTerminarConta = () => {
    Alert.alert(
      "Eliminar Conta",
      "Esta ação é irreversível! Desejas mesmo eliminar os teus dados e terminar a sessão?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await supabase.rpc('delete_user'); // Requer function criada no Supabase
              if (error) throw error;
              
              await supabase.auth.signOut();
              setModalEdicaoVisible(false);
            } catch (err: any) {
              Alert.alert("Erro ao Eliminar", err.message);
            } finally {
              setSaving(false);
            }
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
          
          {/* CARTÃO DE PERFIL EXPANDIDO */}
          <View style={[styles.infoUserCard, { backgroundColor: theme.card }]}>
            
            <TouchableOpacity style={styles.btnPencil} onPress={abrirEdicao}>
              <Ionicons name="pencil" size={20} color={COR_NORTON} />
            </TouchableOpacity>

            <View style={styles.avatarContainerMain}>
              <View style={[styles.avatarMain, { backgroundColor: theme.bg }]}>
                {fotoPerfilUri ? (
                  <Image source={{ uri: fotoPerfilUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{perfil?.nome?.charAt(0).toUpperCase() || 'U'}</Text>
                )}
              </View>
            </View>
            
            <Text style={[styles.nome, { color: theme.text }]}>{perfil?.nome || 'Utilizador Norton'}</Text>
            <Text style={[styles.email, { color: theme.subText }]}>{perfil?.email}</Text>

            <View style={styles.detalhesGrid}>
              <View style={styles.detalheItem}>
                <Ionicons name="call-outline" size={16} color={theme.subText} style={styles.detalheIcon} />
                <Text style={[styles.detalheTexto, { color: theme.subText }]}>{perfil?.telemovel || 'Não definido'}</Text>
              </View>
              <View style={styles.detalheItem}>
                <Ionicons name="calendar-outline" size={16} color={theme.subText} style={styles.detalheIcon} />
                <Text style={[styles.detalheTexto, { color: theme.subText }]}>{formatarDataVisual(perfil?.data_nascimento)}</Text>
              </View>
              <View style={styles.detalheItem}>
                <Ionicons name="male-female-outline" size={16} color={theme.subText} style={styles.detalheIcon} />
                <Text style={[styles.detalheTexto, { color: theme.subText }]}>{perfil?.sexo || 'Não definido'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.seccao}>
            <Text style={styles.seccaoTitulo}>A Minha Conta</Text>
            <MenuItem icon="receipt-outline" title="Histórico de Pedidos" onPress={() => Alert.alert("Brevemente", "Histórico em desenvolvimento.")} />
          </View>

          <View style={styles.seccao}>
            <Text style={styles.seccaoTitulo}>Definições</Text>
            <MenuItem 
              icon="notifications-outline" title="Notificações Push" 
              rightElement={
                <Switch 
                  value={notificacoes} 
                  onValueChange={(valor) => atualizarDefinicao('notificacoes_push', valor)} 
                  trackColor={{ false: theme.border, true: '#f3cba8' }} 
                  thumbColor={notificacoes ? COR_NORTON : '#f4f3f4'} 
                />
              }
            />
            <MenuItem 
              icon="mail-unread-outline" title="Novidades por E-mail" 
              rightElement={
                <Switch 
                  value={newsletter} 
                  onValueChange={(valor) => atualizarDefinicao('receber_newsletter', valor)} 
                  trackColor={{ false: theme.border, true: '#f3cba8' }} 
                  thumbColor={newsletter ? COR_NORTON : '#f4f3f4'} 
                />
              }
            />
            <MenuItem 
              icon="moon-outline" title="Tema Escuro" 
              rightElement={<Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: theme.border, true: '#f3cba8' }} thumbColor={isDark ? COR_NORTON : '#f4f3f4'} />}
            />
          </View>

          <View style={styles.seccao}>
            <Text style={styles.seccaoTitulo}>Informações</Text>
            <MenuItem icon="information-circle-outline" title="Sobre a App" onPress={() => Alert.alert("App Cliente Norton", "Versão 1.0.0\nCriada para Informática de Gestão.")} />
            <MenuItem icon="shield-checkmark-outline" title="Política e Privacidade" onPress={() => setModalPrivacidadeVisible(true)} />
          </View>

          <TouchableOpacity style={[styles.btnSair, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#ff3b30" />
            <Text style={styles.btnSairTexto}>Terminar Sessão</Text>
          </TouchableOpacity>

          <Text style={styles.versaoApp}>Restaurante Norton App © 2026</Text>
          <Text style={styles.versaoAppSub}>Versão PDI</Text>
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

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            
            <View style={styles.modalAvatarArea}>
              <View style={styles.modalAvatarContainer}>
                {fotoPerfilUri ? (
                  <Image source={{ uri: fotoPerfilUri }} style={[styles.modalAvatarImage, { borderColor: COR_NORTON, backgroundColor: theme.card }]} />
                ) : (
                  <View style={[styles.modalAvatarImagePadrao, { borderColor: COR_NORTON, backgroundColor: theme.card }]}>
                    <Text style={[styles.avatarText, { fontSize: 40 }]}>{formNome.charAt(0).toUpperCase() || 'U'}</Text>
                  </View>
                )}
                <TouchableOpacity style={[styles.modalBtnEditFoto, { borderColor: theme.bg }]} onPress={escolherEGuardarFoto}>
                  <Ionicons name="camera" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.modalAvatarLabel, { color: theme.subText }]}>Alterar Fotografia</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} 
                value={formNome} onChangeText={setFormNome} placeholder="O teu nome" 
                placeholderTextColor={theme.isDark ? '#aaa' : '#666'} 
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telemóvel</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} 
                value={formTelemovel} onChangeText={setFormTelemovel} placeholder="Ex: 912345678" 
                keyboardType="phone-pad" maxLength={9} 
                placeholderTextColor={theme.isDark ? '#aaa' : '#666'} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data de Nascimento (Dia/Mês/Ano)</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} 
                value={formDataNasc} onChangeText={setFormDataNasc} placeholder="Ex: 25/10/1995" 
                placeholderTextColor={theme.isDark ? '#aaa' : '#666'} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sexo</Text>
              <TouchableOpacity style={[styles.inputDropdown, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={selecionarSexo}>
                <Text style={{ color: formSexo ? theme.text : (theme.isDark ? '#aaa' : '#666'), fontSize: 16 }}>
                  {formSexo || 'Selecionar...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.subText} />
              </TouchableOpacity>
            </View>

            {/* SEÇÃO: SEGURANÇA */}
            <View style={[styles.passwordSection, { borderTopColor: theme.border }]}>
              <Text style={[styles.seccaoTitulo, { marginLeft: 0 }]}>Segurança</Text>
              <Text style={styles.passwordHint}>Preenche apenas se quiseres alterar a palavra-passe atual.</Text>
              
              <View style={styles.passwordContainer}>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, flex: 1, marginBottom: 0 }]} 
                  value={novaPassword} onChangeText={setNovaPassword} placeholder="Nova palavra-passe" 
                  secureTextEntry={!mostrarPassword} placeholderTextColor={theme.isDark ? '#aaa' : '#666'} autoCapitalize="none"
                />
                <TouchableOpacity style={styles.eyeBtnModal} onPress={() => setMostrarPassword(!mostrarPassword)}>
                  <Ionicons name={mostrarPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.subText} />
                </TouchableOpacity>
              </View>

              <View style={[styles.passwordContainer, { marginTop: 15 }]}>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, flex: 1, marginBottom: 0 }]} 
                  value={confirmarNovaPassword} onChangeText={setConfirmarNovaPassword} placeholder="Confirmar nova palavra-passe" 
                  secureTextEntry={!mostrarPassword} placeholderTextColor={theme.isDark ? '#aaa' : '#666'} autoCapitalize="none"
                />
              </View>
            </View>

            {/* SEÇÃO TERMINAR CONTA */}
            <View style={[styles.passwordSection, { borderTopColor: theme.border, marginTop: 20 }]}>
              <Text style={[styles.seccaoTitulo, { marginLeft: 0, color: '#ff3b30' }]}>Atenção</Text>
              <Text style={[styles.passwordHint, { color: '#888' }]}>Esta ação é permanente e irá eliminar os teus dados.</Text>
              
              <TouchableOpacity style={styles.btnTerminarConta} onPress={handleTerminarConta}>
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.btnTerminarContaTexto}>Eliminar Conta</Text>
              </TouchableOpacity>
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
              1. Recolha de Dados{'\n'}A aplicação recolhe o teu nome, e-mail e informações de perfil apenas para garantir o funcionamento do sistema de reservas e do programa de pontos.{'\n\n'}
              2. Utilização dos Dados{'\n'}Os teus dados são armazenados de forma segura na nossa base de dados (Supabase) e nunca serão partilhados com terceiros sem o teu consentimento explícito.{'\n\n'}
              3. Os Teus Direitos{'\n'}Podes a qualquer momento editar os teus dados na secção "Conta e Dados Pessoais" ou eliminar a tua conta, o que removerá permanentemente todo o teu histórico.{'\n\n'}
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
  
  infoUserCard: { position: 'relative', marginHorizontal: 20, borderRadius: 25, padding: 25, paddingTop: 15, alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15 },
  btnPencil: { position: 'absolute', top: 20, right: 20, width: 36, height: 36, backgroundColor: 'rgba(255, 107, 0, 0.1)', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  
  avatarContainerMain: { marginTop: -50, marginBottom: 15 },
  avatarMain: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 4, borderColor: COR_NORTON, elevation: 5 },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { color: COR_NORTON, fontSize: 36, fontWeight: 'bold' },
  
  nome: { fontSize: 22, fontWeight: 'bold' },
  email: { fontSize: 14, marginTop: 4 },
  
  detalhesGrid: { width: '100%', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', gap: 12 },
  detalheItem: { flexDirection: 'row', alignItems: 'center' },
  detalheIcon: { marginRight: 10, width: 20 },
  detalheTexto: { fontSize: 15, fontWeight: '500' },

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
  
  modalAvatarArea: { alignItems: 'center', marginBottom: 30 },
  modalAvatarContainer: { position: 'relative' },
  modalAvatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3 },
  modalAvatarImagePadrao: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  modalBtnEditFoto: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#333', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3 },
  modalAvatarLabel: { marginTop: 10, fontSize: 14, fontWeight: '600' },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 8, marginLeft: 5 },
  input: { paddingHorizontal: 15, paddingVertical: 15, borderRadius: 15, fontSize: 16, borderWidth: 1 },
  inputDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 15, borderRadius: 15, borderWidth: 1 },
  
  passwordSection: { marginTop: 10, borderTopWidth: 1, paddingTop: 20 },
  passwordHint: { fontSize: 13, color: '#888', marginBottom: 15, fontStyle: 'italic' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  eyeBtnModal: { position: 'absolute', right: 15, padding: 10 },

  textoPrivacidadeTitulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  textoPrivacidade: { fontSize: 15, lineHeight: 24, textAlign: 'justify' },

  btnTerminarConta: { backgroundColor: '#ff3b30', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 15, gap: 8, marginTop: 10, marginBottom: 40,},
  btnTerminarContaTexto: { color: '#fff', fontSize: 15, fontWeight: 'bold' }
});