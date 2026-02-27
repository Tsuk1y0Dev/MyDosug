import React, { useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	Platform,
	Dimensions,
	TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";

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
	origin?: { lat: number; lng: number; label?: string };
	segmentLines?: Array<{ from: { lat: number; lng: number }; to: { lat: number; lng: number } }>;
	onMarkerPress?: (markerId: string) => void;
	height?: number;
	fitAllMarkers?: boolean;
	selectionMode?: boolean;
	selectedPoint?: { lat: number; lng: number };
	onSelectPoint?: (coords: { lat: number; lng: number }) => void;
}

const { width } = Dimensions.get("window");

// API ключ должен быть в переменных окружения
// Для разработки можно использовать fallback, но НЕ коммитить реальный ключ
const YANDEX_API_KEY = process.env.EXPO_PUBLIC_YANDEX_API_KEY || "";

export const YandexMap: React.FC<YandexMapProps> = ({
	center = { lat: 52.0339, lng: 113.501 }, // Чита по умолчанию
	zoom = 12,
	markers = [],
	origin,
	segmentLines = [],
	onMarkerPress,
	height = 400,
	fitAllMarkers = true,
	selectionMode = false,
	selectedPoint,
	onSelectPoint,
}) => {
	const webViewRef = useRef<WebView>(null);

	const generateHTML = () => {
		const hasOrigin = origin != null;
		const hasMarkers = markers && markers.length > 0;
		if (!hasOrigin && !hasMarkers) {
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

		const allPoints: Array<{ id: string; lat: number; lng: number; title?: string }> = [];
		if (origin) {
			allPoints.push({ id: "origin", lat: origin.lat, lng: origin.lng, title: origin.label || "Старт" });
		}
		markers.forEach((m) => allPoints.push({ id: m.id, lat: m.lat, lng: m.lng, title: m.title }));

		const markersScript = allPoints
			.map((marker, index) => {
				const isOrigin = marker.id === "origin";
				const hintText = marker.title || marker.id;
				const preset = isOrigin ? "islands#blueCircleDotIcon" : "islands#redDotIcon";
				const iconColor = isOrigin ? "#3b82f6" : "#ef4444";

				return `
      var placemark${index} = new ymaps.Placemark([${marker.lat}, ${marker.lng}], {
        balloonContentHeader: '<strong>${(marker.title || marker.id).replace(/'/g, "\\'")}</strong>',
        hintContent: '${hintText.replace(/'/g, "\\'")}'
      }, {
        preset: '${preset}',
        iconColor: '${iconColor}'
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
			})
			.join("\n");

		const apiKey = YANDEX_API_KEY ? `&apikey=${YANDEX_API_KEY}` : "";

		const selectionInit = selectionMode
			? selectedPoint
				? `
      var selectedPlacemark = new ymaps.Placemark(
        [${selectedPoint.lat}, ${selectedPoint.lng}],
        { hintContent: 'Выбрано', balloonContentHeader: '<strong>Выбранная точка</strong>' },
        { preset: 'islands#blueDotIconWithCaption' }
      );
      myMap.geoObjects.add(selectedPlacemark);
      `
				: "var selectedPlacemark = null;"
			: "";

		return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU&amp;apikey=${apiKey}" type="text/javascript"></script>
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
          <div class="route-error" id="routeError" style="display:none;"></div>
          <script type="text/javascript">
            ymaps.ready(function () {
              document.getElementById('loading').style.display = 'none';
              
              var myMap = new ymaps.Map("map", {
                center: [${center.lat}, ${center.lng}],
                zoom: ${zoom},
                controls: ['zoomControl', 'fullscreenControl']
              });
              
              ${markersScript}
              
              ${selectionInit}

              // Строим маршрут по дорогам через MultiRoute
              try {
                var allCoords = [];
                myMap.geoObjects.each(function (obj) {
                  if (obj.geometry && typeof obj.geometry.getCoordinates === 'function') {
                    var c = obj.geometry.getCoordinates();
                    if (Array.isArray(c) && c.length === 2) {
                      allCoords.push(c);
                    }
                  }
                });

                // Если точек меньше двух, просто подстроим карту под маркеры
                if (allCoords.length < 2) {
                  if (myMap.geoObjects.getLength() > 0) {
                    try {
                      var onlyMarkersBounds = myMap.geoObjects.getBounds();
                      if (onlyMarkersBounds) {
                        myMap.setBounds(onlyMarkersBounds, { checkZoomRange: true, duration: 300 });
                      }
                    } catch (e) {}
                  }
                  return;
                }

                // Оцениваем расстояния между соседними точками, чтобы выбрать режим маршрутизации
                function toRad(x) {
                  return x * Math.PI / 180;
                }

                function distanceMeters(a, b) {
                  var R = 6371000;
                  var lat1 = a[0], lon1 = a[1];
                  var lat2 = b[0], lon2 = b[1];
                  var dLat = toRad(lat2 - lat1);
                  var dLon = toRad(lon2 - lon1);
                  var aa = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                  var c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
                  return R * c;
                }

                var maxSegmentDistance = 0;
                for (var i = 1; i < allCoords.length; i++) {
                  var d = distanceMeters(allCoords[i - 1], allCoords[i]);
                  if (d > maxSegmentDistance) {
                    maxSegmentDistance = d;
                  }
                }

                // Если все точки близко (например, менее 1.5 км), строим пешеходный маршрут
                var routingMode = maxSegmentDistance < 1500 ? 'pedestrian' : 'auto';

                var multiRoute = new ymaps.multiRouter.MultiRoute({
                  referencePoints: allCoords,
                  params: {
                    routingMode: routingMode
                  }
                }, {
                  boundsAutoApply: false
                });

                myMap.geoObjects.add(multiRoute);

                var routeErrorEl = document.getElementById('routeError');
                function showRouteError(message) {
                  if (!routeErrorEl) return;
                  routeErrorEl.textContent = message;
                  routeErrorEl.style.display = 'block';
                }

                // Успешное построение маршрута
                multiRoute.model.events.add('requestsuccess', function () {
                  if (routeErrorEl) {
                    routeErrorEl.style.display = 'none';
                  }
                  var activeRoute = multiRoute.getActiveRoute();
                  if (activeRoute) {
                    var bounds = activeRoute.properties.get('bounds');
                    if (bounds) {
                      myMap.setBounds(bounds, { checkZoomRange: true, duration: 300 });
                    }
                  }
                });

                // Ошибка запроса к маршрутизатору
                multiRoute.model.events.add('requestfail', function () {
                  showRouteError('Не удалось построить маршрут по дорогам. Попробуйте изменить точки.');
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'routeError',
                      message: 'Не удалось построить маршрут по дорогам.'
                    }));
                  }
                });

                // Если активный маршрут отсутствует (например, точки невозможно связать дорогами)
                multiRoute.events.add('activeroutechange', function () {
                  var activeRoute = multiRoute.getActiveRoute();
                  if (!activeRoute) {
                    showRouteError('Маршрут не найден. Проверьте порядок и расположение точек.');
                    if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'routeError',
                        message: 'Маршрут не найден для указанных точек.'
                      }));
                    }
                  }
                });
              } catch (e) {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'routeError',
                    message: 'Ошибка при подготовке данных для маршрута.'
                  }));
                }
              }

              ${selectionMode
								? `
              // Режим выбора точки на карте
              myMap.events.add('click', function (e) {
                var coords = e.get('coords');
                if (typeof selectedPlacemark !== 'undefined' && selectedPlacemark) {
                  myMap.geoObjects.remove(selectedPlacemark);
                }
                selectedPlacemark = new ymaps.Placemark(
                  coords,
                  { hintContent: 'Выбрано', balloonContentHeader: '<strong>Выбранная точка</strong>' },
                  { preset: 'islands#blueDotIconWithCaption' }
                );
                myMap.geoObjects.add(selectedPlacemark);
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'mapClick',
                    coords: { lat: coords[0], lng: coords[1] }
                  }));
                }
              });
              `
								: ""}
            });
          </script>
        </body>
      </html>
    `;
	};

	const handleMessage = (event: any) => {
		try {
			const data = JSON.parse(event.nativeEvent.data);
			if (data.type === "markerClick" && onMarkerPress) {
				onMarkerPress(data.markerId);
			} else if (data.type === "routeError") {
				console.warn("YandexMap route error:", data.message);
			} else if (data.type === "mapClick" && onSelectPoint && data.coords) {
				onSelectPoint(data.coords);
			}
		} catch (error) {
			console.error("Error parsing WebView message:", error);
		}
	};

	// Для веба используем упрощенную визуализацию
	if (Platform.OS === "web") {
		const webMarkers = origin
			? [{ id: "origin", lat: origin.lat, lng: origin.lng, title: origin.label }, ...markers]
			: markers;
		const mapCenter =
			webMarkers.length > 0
				? {
						lat: webMarkers.reduce((s, m) => s + m.lat, 0) / webMarkers.length,
						lng: webMarkers.reduce((s, m) => s + m.lng, 0) / webMarkers.length,
					}
				: center;
		return (
			<View style={[styles.container, { height }]}>
				<View style={styles.mapPlaceholder}>
					<View style={styles.mapContent}>
						{webMarkers.map((marker, index) => {
							const latDiff = marker.lat - mapCenter.lat;
							const lngDiff = marker.lng - mapCenter.lng;
							const scale = 10000;
							const isOrigin = marker.id === "origin";
							return (
								<TouchableOpacity
									key={marker.id}
									style={[
										styles.mapMarker,
										{
											left: `${50 + lngDiff * scale}%`,
											top: `${50 - latDiff * scale}%`,
										},
									]}
									onPress={() => onMarkerPress?.(marker.id)}
								>
									<View style={[styles.markerPin, isOrigin && { backgroundColor: "#3b82f6" }]}>
										<Feather name="map-pin" size={20} color={isOrigin ? "#1d4ed8" : "#ef4444"} />
									</View>
									<View style={[styles.markerLabel, isOrigin && { backgroundColor: "#3b82f6" }]}>
										<Text style={styles.markerLabelText}>{isOrigin ? "Старт" : index}</Text>
									</View>
								</TouchableOpacity>
							);
						})}
					</View>

					<View style={styles.mapOverlay}>
						<View style={styles.mapOverlayContent}>
							<Feather name="map" size={16} color="#374151" />
							<Text style={styles.mapOverlayText}>
								{webMarkers.length}{" "}
								{webMarkers.length === 1 ? "точка" : webMarkers.length < 5 ? "точки" : "точек"}
							</Text>
						</View>
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
		width: "100%",
		backgroundColor: "#f1f5f9",
		borderRadius: 12,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	webview: {
		flex: 1,
		backgroundColor: "transparent",
	},
	loadingContainer: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f1f5f9",
	},
	loadingText: {
		color: "#6b7280",
		fontSize: 14,
	},
	mapPlaceholder: {
		width: "100%",
		height: "100%",
		backgroundColor: "#e8f4f8",
		position: "relative",
		borderRadius: 12,
		minHeight: 200,
	},
	mapContent: {
		width: "100%",
		height: "100%",
		position: "relative",
	},
	mapCenter: {
		position: "absolute",
		left: "50%",
		top: "50%",
		width: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: "#3b82f6",
		borderWidth: 2,
		borderColor: "white",
		transform: [{ translateX: -8 }, { translateY: -8 }],
	},
	mapCenterDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "white",
		position: "absolute",
		left: 2,
		top: 2,
	},
	mapMarker: {
		position: "absolute",
		alignItems: "center",
		justifyContent: "flex-start",
		transform: [{ translateX: -10 }, { translateY: -20 }],
	},
	markerPin: {
		width: 24,
		height: 24,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "white",
		borderRadius: 12,
		...(Platform.OS === "web"
			? {
					boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
				}
			: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.2,
					shadowRadius: 4,
					elevation: 3,
				}),
	},
	markerLabel: {
		marginTop: 2,
		backgroundColor: "#ef4444",
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 4,
	},
	markerLabelText: {
		color: "white",
		fontSize: 10,
		fontWeight: "bold",
	},
	mapOverlay: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: "rgba(255, 255, 255, 0.95)",
		padding: 12,
		borderTopLeftRadius: 12,
		borderTopRightRadius: 12,
		...(Platform.OS === "web"
			? {
					boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.1)",
				}
			: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: -2 },
					shadowOpacity: 0.1,
					shadowRadius: 8,
					elevation: 4,
				}),
	},
	mapOverlayContent: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	mapOverlayText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#374151",
	},
	mapOverlaySubtext: {
		fontSize: 11,
		color: "#6b7280",
		textAlign: "center",
		marginTop: 4,
	},
});
