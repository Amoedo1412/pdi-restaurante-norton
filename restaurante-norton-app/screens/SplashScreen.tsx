import React from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native'; //

const { width } = Dimensions.get('window');

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  return (
    <View style={styles.container}>
      {/* Animação Lottie do Chapéu a cair */}
      <LottieView
        source={require('../assets/Restaurant website Pre loader.json')} 
        autoPlay
        loop={false}
        speed={0.8}
        onAnimationFinish={onFinish} 
        style={styles.lottie}
      />

      {/* Nome do Restaurante com Tipografia Norton */}
      <View style={styles.textContainer}>
        <Text style={styles.logoText}>
          Restaurante <Text style={styles.logoDestaque}>Norton</Text>
        </Text>
        <Text style={styles.desde}>desde 1994</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: width * 0.8,
    height: width * 0.8,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: -20, 
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  logoDestaque: {
    color: '#e67e22', 
  },
  desde: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    letterSpacing: 2,
    textTransform: 'uppercase',
  }
});