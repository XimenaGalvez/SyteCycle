import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CENTROS = {
  abdomen: { top: '47%', left: '50%' },
  brazo: { top: '35%', left: '38%' },
  muslo: { top: '55%', left: '44%' },
};

const PUNTOS = [1, 2, 3, 4, 5, 6, 7, 8];

type Props = {
  zona: 'abdomen' | 'brazo' | 'muslo';
  puntoUsado: number | null;
  nombreInsulina: string;
  esSiguienteDosis?: boolean;
};

export default function MiniMapaRotaSitio({ zona, puntoUsado, nombreInsulina, esSiguienteDosis = false }: Props) {
  
  const calcularSiguiente = (zonaActual: string, puntoActual: number | null) => {
    if (!puntoActual) return { zonaAMostrar: 'abdomen', puntoAMostrar: 1, zonaDelUsado: 'abdomen' };

    if (puntoActual >= 8) {
      const zonas = ['abdomen', 'brazo', 'muslo'];
      const indexActual = zonas.indexOf(zonaActual);
      const siguienteZona = zonas[(indexActual + 1) % 3];
      return { zonaAMostrar: siguienteZona, puntoAMostrar: 1, zonaDelUsado: zonaActual };
    }

    return { zonaAMostrar: zonaActual, puntoAMostrar: puntoActual + 1, zonaDelUsado: zonaActual };
  };

  const { zonaAMostrar, puntoAMostrar, zonaDelUsado } = calcularSiguiente(zona, puntoUsado);
  const centroAMostrar = CENTROS[zonaAMostrar as keyof typeof CENTROS] || CENTROS.abdomen;
  const mostrarParcheGris = zonaAMostrar === zonaDelUsado;

  return (
    <View style={styles.container}>
      
      <View style={styles.tituloContainer}>
        <Ionicons name="medical" size={14} color="#1f4e79" />
        <Text style={styles.tituloTexto}>
          {esSiguienteDosis ? 'Siguiente dosis' : 'Dosis pendiente'}: <Text style={{ fontWeight: 'bold' }}>{nombreInsulina}</Text>
        </Text>
      </View>

      <ImageBackground 
        source={require('../assets/Cuerpo.png')} 
        style={styles.imagen}
        resizeMode="contain"
      >
        <View style={[styles.parcheContainer, { top: centroAMostrar.top, left: centroAMostrar.left }]}>
          <View style={styles.donaFondo} />
          {[0, 45, 90, 135].map((angulo) => (
            <View key={angulo} style={[styles.linea, { transform: [{ rotate: `${angulo}deg` }] }]} />
          ))}
          {PUNTOS.map((num, index) => {
            const angulo = (index * 360) / 8 - 90; 
            const rad = (angulo * Math.PI) / 180;
            const radio = 42; 
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

        {mostrarParcheGris && puntoUsado && (
          <View style={[
            styles.parcheContainer, 
            { top: CENTROS[zona as keyof typeof CENTROS].top, left: CENTROS[zona as keyof typeof CENTROS].left }
          ]}>
            {PUNTOS.map((num, index) => {
              const angulo = (index * 360) / 8 - 90; 
              const rad = (angulo * Math.PI) / 180;
              const radio = 42; 
              const x = Math.cos(rad) * radio;
              const y = Math.sin(rad) * radio;
              const esUsado = puntoUsado === num;

              if (!esUsado) return null;

              return (
                <View
                  key={num}
                  style={[
                    styles.puntoBtn,
                    { transform: [{ translateX: x }, { translateY: y }] },
                    styles.puntoUsadoGris // <-- Ahora es gris
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
      
      {puntoUsado !== null && puntoUsado > 0 && (
        <View style={styles.infoUltimoContainer}>
          <Text style={styles.infoUltimoTexto}>
            Último sitio aplicado: <Text style={{ fontWeight: 'bold', color: '#718096' }}>
              {zona.charAt(0).toUpperCase() + zona.slice(1)}
            </Text> - Punto {puntoUsado}
          </Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTexto}>
          Próximo sugerido: <Text style={{fontWeight: 'bold', color: '#2c5282'}}>
            {zonaAMostrar.charAt(0).toUpperCase() + zonaAMostrar.slice(1)}
          </Text> - Punto {puntoAMostrar}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 280, height: 420, alignSelf: 'center', marginVertical: 10, alignItems: 'center' },
  tituloContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 6, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tituloTexto: { fontSize: 13, color: '#1f4e79', marginLeft: 6 },
  
  // AUMENTAMOS EL TAMAÑO
  imagen: { width: 280, height: 320 }, 
  
  parcheContainer: { position: 'absolute', width: 100, height: 100, marginLeft: -50, marginTop: -50, alignItems: 'center', justifyContent: 'center' },
  donaFondo: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderWidth: 1.5, borderColor: '#308be6' },
  linea: { position: 'absolute', width: 100, height: 1.5, backgroundColor: '#B0BEC5' },
  
  // AUMENTAMOS LOS PUNTOS
  puntoBtn: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#308be6', alignItems: 'center', justifyContent: 'center' },
  puntoUsadoGris: { backgroundColor: '#A0AEC0', borderColor: '#A0AEC0' },
  puntoSiguiente: { backgroundColor: '#2c5282', borderColor: '#2c5282', transform: [{ scale: 1.15 }] },
  puntoTexto: { fontSize: 11, fontWeight: 'bold', color: '#308be6' },
  puntoTextoActivo: { color: '#FFF' },
  
  infoUltimoContainer: { marginTop: 6, backgroundColor: '#f7fafc', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  infoUltimoTexto: { fontSize: 11, color: '#4a5568' },
  infoContainer: { marginTop: 6, backgroundColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 15 },
  infoTexto: { fontSize: 12, color: '#4a5568' },
});