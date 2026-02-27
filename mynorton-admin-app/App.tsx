import { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native'; // <-- Adicionámos o Button aqui
import { supabase } from './lib/supabase';
import Auth from './Auth';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {session && session.user ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>
            Bem-vindo ao Painel de Gestão!
          </Text>
          {/* Botão temporário de Logout */}
          <Button 
            title="Sair (Logout)" 
            onPress={() => supabase.auth.signOut()} 
            color="#ff0000" 
          />
        </View>
      ) : (
        <Auth />
      )}
    </View>
  );
}