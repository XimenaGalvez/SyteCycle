import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';

// Coordenadas ajustadas al tamaño de la imagen
const CENTROS = {
  abdomen: { top: '47%', left: '50%' },
  brazo: { top: '35%', left: '38%' }, // Ajustado hacia arriba como pediste
  muslo: { top: '55%', left: '44%' }, 
};

const PUNTOS = [1, 2, 3, 4, 5, 6, 7, 8];

type Props = {
  zonaSeleccionada: 'abdomen' | 'brazo' | 'muslo';
  puntoSeleccionado: number;
  onSelectZona: (zona: 'abdomen' | 'brazo' | 'muslo') => void;
  onSelectPunto: (punto: number) => void;
};

export default function CuerpoHumano({ zonaSeleccionada, puntoSeleccionado, onSelectZona, onSelectPunto }: Props) {
  
  const centro = CENTROS[zonaSeleccionada];

  return (
    <View style={styles.container}>
      <View style={styles.zonasContainer}>
        {(['abdomen', 'brazo', 'muslo'] as const).map((zona) => (
          <TouchableOpacity 
            key={zona} 
            style={[styles.zonaBtn, zonaSeleccionada === zona && styles.zonaBtnActiva]}
            onPress={() => onSelectZona(zona)}
          >
            <Text style={[styles.zonaTexto, zonaSeleccionada === zona && styles.zonaTextoActivo]}>
              {zona.charAt(0).toUpperCase() + zona.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.imagenContainer}>
        <ImageBackground 
          source={require('../assets/Cuerpo.png')} /* <-- AQUÍ EL CAMBIO A PNG */
          style={styles.imagen}
          resizeMode="contain"
        >
          <View style={[styles.parcheContainer, { top: centro.top, left: centro.left }]}>
            <View style={styles.donaFondo} />
            
            {[0, 45, 90, 135].map((angulo) => (
              <View key={angulo} style={[styles.linea, { transform: [{ rotate: `${angulo}deg` }] }]} />
            ))}

            {PUNTOS.map((num, index) => {
              const angulo = (index * 360) / 8 - 90; 
              const rad = (angulo * Math.PI) / 180;
              const radio = 30; 
              const x = Math.cos(rad) * radio;
              const y = Math.sin(rad) * radio;
              const esSeleccionado = puntoSeleccionado === num;

              return (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.puntoBtn,
                    { transform: [{ translateX: x }, { translateY: y }] },
                    esSeleccionado && styles.puntoBtnActivo
                  ]}
                  onPress={() => onSelectPunto(num)}
                >
                  <Text style={[styles.puntoTexto, esSeleccionado && styles.puntoTextoActivo]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ImageBackground>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 5, width: '100%' },
  zonasContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  zonaBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#f1f5f9', marginHorizontal: 5, borderWidth: 1, borderColor: '#cbd5e1' },
  zonaBtnActiva: { backgroundColor: '#308be6', borderColor: '#308be6' },
  zonaTexto: { fontSize: 13, color: '#475569', fontWeight: '600' },
  zonaTextoActivo: { color: '#FFF' },
  imagenContainer: { width: 320, height: 420, alignSelf: 'center', position: 'relative', marginTop: 5 },
  imagen: { width: '100%', height: '100%' },
  parcheContainer: { position: 'absolute', width: 80, height: 80, marginLeft: -40, marginTop: -40, alignItems: 'center', justifyContent: 'center' },
  donaFondo: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.85)', borderWidth: 2, borderColor: '#308be6' },
  linea: { position: 'absolute', width: 80, height: 2, backgroundColor: '#B0BEC5' },
  puntoBtn: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#308be6', alignItems: 'center', justifyContent: 'center' },
  puntoBtnActivo: { backgroundColor: '#2e7d32', borderColor: '#2e7d32', transform: [{ scale: 1.2 }] },
  puntoTexto: { fontSize: 10, fontWeight: 'bold', color: '#308be6' },
  puntoTextoActivo: { color: '#FFF' },
});