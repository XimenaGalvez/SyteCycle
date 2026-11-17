import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';

const CENTROS = {
  abdomen: { top: '47%', left: '50%' },
  brazo: { top: '35%', left: '38%' },
  muslo: { top: '55%', left: '44%' },
};

const PUNTOS = [1, 2, 3, 4, 5, 6, 7, 8];

type Props = {
  zona: 'abdomen' | 'brazo' | 'muslo'; // Zona donde se aplicó por última vez
  puntoUsado: number | null; // Punto donde se aplicó por última vez
};

export default function MiniMapaRotaSitio({ zona, puntoUsado }: Props) {
  
  // Lógica de rotación: calcula la SIGUIENTE zona y punto
  const calcularSiguiente = (zonaActual: string, puntoActual: number | null) => {
    if (!puntoActual) return { zonaAMostrar: 'abdomen', puntoAMostrar: 1, zonaDelUsado: 'abdomen' };

    if (puntoActual >= 8) {
      const zonas = ['abdomen', 'brazo', 'muslo'];
      const indexActual = zonas.indexOf(zonaActual);
      const siguienteZona = zonas[(indexActual + 1) % 3];
      // Si cambia de zona, el "usado" se queda en la zona anterior y el "siguiente" en la nueva
      return { zonaAMostrar: siguienteZona, puntoAMostrar: 1, zonaDelUsado: zonaActual };
    }

    return { zonaAMostrar: zonaActual, puntoAMostrar: puntoActual + 1, zonaDelUsado: zonaActual };
  };

  const { zonaAMostrar, puntoAMostrar, zonaDelUsado } = calcularSiguiente(zona, puntoUsado);

  // Si la zona cambió (ej. de abdomen a brazo), el parche principal se dibuja en la nueva zona
  const centroAMostrar = CENTROS[zonaAMostrar as keyof typeof CENTROS] || CENTROS.abdomen;
  
  // Solo dibujamos el parche verde en la zona vieja si NO cambió de zona
  const mostrarParcheVerde = zonaAMostrar === zonaDelUsado;

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('../assets/Cuerpo.png')} 
        style={styles.imagen}
        resizeMode="contain"
      >
        {/* PARCHE DE LA ZONA NUEVA (Azul oscuro) */}
        <View style={[styles.parcheContainer, { top: centroAMostrar.top, left: centroAMostrar.left }]}>
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
            const esSiguiente = puntoAMostrar === num;

            return (
              <View
                key={num}
                style={[
                  styles.puntoBtn,
                  { transform: [{ translateX: x }, { translateY: y }] },
                  esSiguiente && styles.puntoSiguiente
                ]}
              >
                <Text style={[styles.puntoTexto, esSiguiente && styles.puntoTextoActivo]}>
                  {num}
                </Text>
              </View>
            );
          })}
        </View>

        {/* PARCHE VERDE (Solo si estamos en la misma zona) */}
        {mostrarParcheVerde && puntoUsado && (
          <View style={[
            styles.parcheContainer, 
            { top: CENTROS[zona as keyof typeof CENTROS].top, left: CENTROS[zona as keyof typeof CENTROS].left }
          ]}>
            {/* Aquí solo pintamos el punto usado en verde para no hacer ruido visual */}
            {PUNTOS.map((num, index) => {
              const angulo = (index * 360) / 8 - 90; 
              const rad = (angulo * Math.PI) / 180;
              const radio = 30; 
              const x = Math.cos(rad) * radio;
              const y = Math.sin(rad) * radio;
              const esUsado = puntoUsado === num;

              if (!esUsado) return null; // Solo el verde

              return (
                <View
                  key={num}
                  style={[
                    styles.puntoBtn,
                    { transform: [{ translateX: x }, { translateY: y }] },
                    styles.puntoUsado
                  ]}
                >
                  <Text style={[styles.puntoTexto, styles.puntoTextoActivo]}>
                    {num}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ImageBackground>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTexto}>
          Próxima: <Text style={{fontWeight: 'bold', color: '#2c5282'}}>
            {zonaAMostrar.charAt(0).toUpperCase() + zonaAMostrar.slice(1)}
          </Text> - Punto {puntoAMostrar}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 250, height: 340, alignSelf: 'center', marginVertical: 10, alignItems: 'center' },
  imagen: { width: 250, height: 300 },
  parcheContainer: { position: 'absolute', width: 70, height: 70, marginLeft: -35, marginTop: -35, alignItems: 'center', justifyContent: 'center' },
  donaFondo: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderWidth: 1.5, borderColor: '#308be6' },
  linea: { position: 'absolute', width: 70, height: 1.5, backgroundColor: '#B0BEC5' },
  puntoBtn: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#308be6', alignItems: 'center', justifyContent: 'center' },
  puntoUsado: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' }, // Verde
  puntoSiguiente: { backgroundColor: '#2c5282', borderColor: '#2c5282', transform: [{ scale: 1.15 }] }, // Azul oscuro
  puntoTexto: { fontSize: 9, fontWeight: 'bold', color: '#308be6' },
  puntoTextoActivo: { color: '#FFF' },
  infoContainer: { marginTop: 5, backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  infoTexto: { fontSize: 11, color: '#4a5568' },
});