import React, { useRef } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';

interface YandexMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    id: string;
    lat: number;
    lng: number;
    title?: string;
    rating?: number;
    priceLevel?: number;
  }>;
  onMarkerPress?: (markerId: string) => void;
  height?: number;
}

const { width } = Dimensions.get('window');


const YANDEX_API_KEY = process.env.EXPO_PUBLIC_YANDEX_API_KEY || '9a022941-dd62-44b4-8f0f-349ebfe69e34';

export const YandexMap: React.FC<YandexMapProps> = ({
  center = { lat: 52.0339, lng: 113.5010 }, // Чита по умолчанию
  zoom = 12,
  markers = [],
  onMarkerPress,
  height = 400,
}) => {
  const webViewRef = useRef<WebView>(null);

  const generateHTML = () => {
    if (!markers || markers.length === 0) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body, html {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f1f5f9;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              }
              .message {
                text-align: center;
                color: #6b7280;
              }
            </style>
          </head>
          <body>
            <div class="message">
              <p>Нет мест для отображения</p>
            </div>
          </body>
        </html>
      `;
    }

    const markersScript = markers.map((marker, index) => {
      const rating = marker.rating ? `⭐ ${marker.rating}` : '';
      const price = marker.priceLevel ? '💰'.repeat(marker.priceLevel) : '';
      const hintText = `${marker.title || marker.id}${rating ? ' ' + rating : ''}${price ? ' ' + price : ''}`;
      
      return `
      var placemark${index} = new ymaps.Placemark([${marker.lat}, ${marker.lng}], {
        balloonContentHeader: '<strong>${(marker.title || marker.id).replace(/'/g, "\\'")}</strong>',
        balloonContentBody: '${rating ? rating + '<br>' : ''}${price || ''}',
        hintContent: '${hintText.replace(/'/g, "\\'")}'
      }, {
        preset: 'islands#redDotIcon',
        iconColor: '#ef4444'
      });
      
      myMap.geoObjects.add(placemark${index});
      
      placemark${index}.events.add('click', function () {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'markerClick',
            markerId: '${marker.id}'
          }));
        }
      });
    `;
    }).join('\n');

    const apiKey = YANDEX_API_KEY !== 'YOUR_API_KEY' ? `&apikey=${YANDEX_API_KEY}` : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU${apiKey}" type="text/javascript"></script>
          <style>
            body, html {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
            }
            #map {
              width: 100%;
              height: 100%;
            }
            .loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: #6b7280;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div class="loading" id="loading">Загрузка карты...</div>
          <script type="text/javascript">
            ymaps.ready(function () {
              document.getElementById('loading').style.display = 'none';
              
              var myMap = new ymaps.Map("map", {
                center: [${center.lat}, ${center.lng}],
                zoom: ${zoom},
                controls: ['zoomControl', 'fullscreenControl']
              });
              
              ${markersScript}
              
              // Автоматически подстраиваем карту под все маркеры
              if (myMap.geoObjects.getLength() > 0) {
                myMap.setBounds(myMap.geoObjects.getBounds(), {
                  checkZoomRange: true,
                  duration: 300
                });
              }
            });
          </script>
        </body>
      </html>
    `;
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick' && onMarkerPress) {
        onMarkerPress(data.markerId);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Для веба используем упрощенную визуализацию
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.mapPlaceholder}>
          <View style={styles.mapContent}>
            {/* Центр карты */}
            <View style={styles.mapCenter}>
              <View style={styles.mapCenterDot} />
            </View>
            
            {/* Маркеры */}
            {markers.map((marker, index) => {
              // Простое позиционирование относительно центра
              const latDiff = marker.lat - center.lat;
              const lngDiff = marker.lng - center.lng;
              const scale = 10000; // Масштаб для отображения
              
              return (
                <TouchableOpacity
                  key={marker.id}
                  style={[
                    styles.mapMarker,
                    {
                      left: `${50 + lngDiff * scale}%`,
                      top: `${50 - latDiff * scale}%`,
                    }
                  ]}
                  onPress={() => onMarkerPress?.(marker.id)}
                >
                  <View style={styles.markerPin}>
                    <Feather name="map-pin" size={20} color="#ef4444" />
                  </View>
                  <View style={styles.markerLabel}>
                    <Text style={styles.markerLabelText}>{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          
          {/* Информационная панель */}
          <View style={styles.mapOverlay}>
            <View style={styles.mapOverlayContent}>
              <Feather name="map" size={16} color="#374151" />
              <Text style={styles.mapOverlayText}>
                {markers.length} {markers.length === 1 ? 'место' : markers.length < 5 ? 'места' : 'мест'} на карте
              </Text>
            </View>
            {YANDEX_API_KEY === 'YOUR_API_KEY' && (
              <Text style={styles.mapOverlaySubtext}>
                Нажмите на маркер для выбора места
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Для мобильных платформ используем WebView
  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: generateHTML() }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Загрузка карты...</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e8f4f8',
    position: 'relative',
    borderRadius: 12,
    minHeight: 200,
  },
  mapContent: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  mapCenter: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: 'white',
    transform: [{ translateX: -8 }, { translateY: -8 }],
  },
  mapCenterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    position: 'absolute',
    left: 2,
    top: 2,
  },
  mapMarker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
    transform: [{ translateX: -10 }, { translateY: -20 }],
  },
  markerPin: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  markerLabel: {
    marginTop: 2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  markerLabelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  mapOverlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapOverlayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  mapOverlaySubtext: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
});
