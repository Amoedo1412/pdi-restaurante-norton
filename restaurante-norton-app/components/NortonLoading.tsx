import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

export default function NortonLoading() {
  return (
    <View style={styles.container}>
      <LottieView
        // O nome deve ser idêntico ao que aparece na tua pasta assets
        source={require('../assets/Restaurant website Pre loader.json')} 
        autoPlay
        loop
        style={styles.lottie}
      />
      <Text style={styles.texto}>A carregar sabores...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff', // Mantém o fundo branco para destacar a animação
  },
  lottie: {
    width: width * 0.7, // Ajusta o tamanho para ser visível no centro
    height: width * 0.7,
  },
  texto: {
    marginTop: 20,
    fontSize: 16,
    color: '#e67e22', // Laranja oficial do Restaurante Norton
    fontWeight: 'bold',
  }
});