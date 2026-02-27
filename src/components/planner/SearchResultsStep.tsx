import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Dimensions,
	Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { usePlanner } from "../../services/planner/PlannerContext";
import { useRoute } from "../../services/planner/RouteContext";
import type { CatalogPlace } from "../../data/mockPlaces";
import type { SearchCriteria, SearchCriteriaFilters } from "../../types/searchCriteria";
import type { RouteEvent } from "../../types/route";
import { YandexMap } from "../maps/YandexMap";
import { OSMService, OSMTagFilter } from "../../services/osm/OSMService";

const { height: winHeight } = Dimensions.get("window");

function haversineKm(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLng / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function matchesFilters(place: CatalogPlace, filters: SearchCriteriaFilters): boolean {
	if (!filters || Object.keys(filters).length === 0) return true;
	const acc = place.accessibility;
	if (filters.wheelchairAccessible === true && !acc.wheelchairAccessible) return false;
	if (filters.elevatorOrRamp === true && !acc.elevatorOrRamp) return false;
	if (filters.stepFreeEntrance === true && !acc.stepFreeEntrance) return false;
	if (filters.accessibleToilet === true && !acc.accessibleToilet) return false;
	if (filters.parkingNearby === true && !acc.parkingNearby) return false;
	if (filters.publicTransportNearby === true && !acc.publicTransportNearby) return false;
	return true;
}

export interface SearchResultsStepProps {
	onPlanSaved?: () => void;
}

export const SearchResultsStep: React.FC<SearchResultsStepProps> = ({
	onPlanSaved,
}) => {
	const { searchCriteria, setCurrentStep } = usePlanner();
	const { insertEvent, events, pendingInsertIndex } = useRoute();

	const [results, setResults] = useState<CatalogPlace[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [viewMode, setViewMode] = useState<"list" | "map">("list");
	const [selectedPlace, setSelectedPlace] = useState<CatalogPlace | null>(null);

	useEffect(() => {
		if (!searchCriteria) {
			setResults([]);
			return;
		}

		let cancelled = false;

		const load = async (criteria: SearchCriteria) => {
			setLoading(true);
			setError(null);

			const tags: OSMTagFilter[] = [];

			if (criteria.categoryId) {
				tags.push({ key: "amenity", value: criteria.categoryId });
			} else {
				tags.push({ key: "amenity" });
			}

			if (criteria.filters?.wheelchairAccessible) {
				tags.push({ key: "wheelchair", value: "yes" });
			}
			if (criteria.filters?.wifi) {
				tags.push({ key: "internet_access", value: "wlan" });
			}

			const radius = 2000;

			try {
				const places = await OSMService.search({
					center: criteria.startCoords,
					radiusMeters: radius,
					tags,
				});

				if (!cancelled) {
					const filtered = places.filter((p) =>
						matchesFilters(p, criteria.filters ?? {})
					);
					setResults(filtered);
				}
			} catch (e: any) {
				if (!cancelled) {
					setError("Не удалось загрузить места из OSM");
					setResults([]);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		};

		load(searchCriteria);

		return () => {
			cancelled = true;
		};
	}, [searchCriteria]);

	const filteredWithDistance = useMemo(() => {
		if (!searchCriteria) return [];
		const start = searchCriteria.startCoords;
		return results
			.map((place) => {
				const distanceKm = haversineKm(
					start.lat,
					start.lng,
					place.coords.lat,
					place.coords.lng
				);
				const distanceMeters = Math.round(distanceKm * 1000);
				const durationMinutes = Math.max(
					1,
					Math.round((distanceKm / 40) * 60)
				);
				return {
					...place,
					distanceMeters,
					durationMinutes,
				};
			})
			.sort((a, b) => a.distanceMeters - b.distanceMeters);
	}, [results, searchCriteria]);

	const handleAddToRoute = useCallback(
		(place: CatalogPlace) => {
			const event: RouteEvent = {
				id: `ev-${Date.now()}-${place.id}`,
				placeId: place.id,
				customTitle: place.title,
				coords: place.coords,
				arrivalTime: "12:00",
				duration: 60,
				travelModeToNext: "driving",
			};
			const index = pendingInsertIndex ?? events.length;
			insertEvent(index, event);
			setSelectedPlace(null);
			onPlanSaved?.();
		},
		[insertEvent, events.length, pendingInsertIndex, onPlanSaved]
	);

	if (!searchCriteria) {
		return (
			<View style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => setCurrentStep(2)}
					>
						<Feather name="arrow-left" size={24} color="#374151" />
					</TouchableOpacity>
					<Text style={styles.title}>Результаты</Text>
					<View style={styles.placeholder} />
				</View>
				<View style={styles.emptyState}>
					<Feather name="search" size={48} color="#d1d5db" />
					<Text style={styles.emptyStateText}>Задайте параметры поиска</Text>
					<Text style={styles.emptyStateSubtext}>
						Вернитесь на шаг назад и выберите критерии
					</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => setCurrentStep(2)}
				>
					<Feather name="arrow-left" size={24} color="#374151" />
				</TouchableOpacity>
				<Text style={styles.title}>
					{loading ? "Загрузка..." : `Найдено: ${filteredWithDistance.length}`}
				</Text>
				<View style={styles.toggleRow}>
					<TouchableOpacity
						style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
						onPress={() => setViewMode("list")}
					>
						<Feather
							name="list"
							size={18}
							color={viewMode === "list" ? "#fff" : "#374151"}
						/>
						<Text
							style={[
								styles.toggleText,
								viewMode === "list" && styles.toggleTextActive,
							]}
						>
							Список
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.toggleBtn, viewMode === "map" && styles.toggleBtnActive]}
						onPress={() => setViewMode("map")}
					>
						<Feather
							name="map"
							size={18}
							color={viewMode === "map" ? "#fff" : "#374151"}
						/>
						<Text
							style={[
								styles.toggleText,
								viewMode === "map" && styles.toggleTextActive,
							]}
						>
							Карта
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{viewMode === "list" ? (
				<ScrollView
					style={styles.listScroll}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator
				>
					{error ? (
						<View style={styles.emptyState}>
							<Feather name="alert-triangle" size={48} color="#f97316" />
							<Text style={styles.emptyStateText}>{error}</Text>
						</View>
					) : filteredWithDistance.length === 0 && !loading ? (
						<View style={styles.emptyState}>
							<Feather name="map-pin" size={48} color="#d1d5db" />
							<Text style={styles.emptyStateText}>Места не найдены</Text>
							<Text style={styles.emptyStateSubtext}>
								Измените фильтры или категорию
							</Text>
						</View>
					) : (
						filteredWithDistance.map((item) => (
							<View key={item.id} style={styles.card}>
								<Text style={styles.cardTitle}>{item.title}</Text>
								{item.address ? (
									<Text style={styles.cardAddress} numberOfLines={1}>
										{item.address}
									</Text>
								) : null}
								<View style={styles.cardMeta}>
									<View style={styles.metaItem}>
										<Feather name="navigation" size={14} color="#6b7280" />
										<Text style={styles.metaText}>
											{item.distanceMeters < 1000
												? `${item.distanceMeters} м`
												: `${(item.distanceMeters / 1000).toFixed(1)} км`}
										</Text>
									</View>
									<View style={styles.metaItem}>
										<Feather name="clock" size={14} color="#6b7280" />
										<Text style={styles.metaText}>~{item.durationMinutes} мин</Text>
									</View>
								</View>
								<TouchableOpacity
									style={styles.addBtn}
									onPress={() => handleAddToRoute(item)}
								>
									<Feather name="plus" size={18} color="#fff" />
									<Text style={styles.addBtnText}>Добавить в маршрут</Text>
								</TouchableOpacity>
							</View>
						))
					)}
				</ScrollView>
			) : (
				<View style={styles.mapWrap}>
					{filteredWithDistance.length > 0 ? (
						<>
							<YandexMap
								center={
									filteredWithDistance[0]
										? {
												lat: filteredWithDistance[0].coords.lat,
												lng: filteredWithDistance[0].coords.lng,
											}
										: searchCriteria.startCoords
								}
								markers={filteredWithDistance.map((p) => ({
									id: p.id,
									lat: p.coords.lat,
									lng: p.coords.lng,
									title: p.title,
								}))}
								onMarkerPress={(markerId) => {
									const p = filteredWithDistance.find((x) => x.id === markerId);
									if (p) setSelectedPlace(p);
								}}
								height={Platform.OS === "web" ? 400 : Math.max(300, winHeight - 220)}
								fitAllMarkers
							/>
							{selectedPlace && (
								<View style={styles.mapBottomCard}>
									<Text style={styles.bottomCardTitle}>{selectedPlace.title}</Text>
									<Text style={styles.bottomCardAddress} numberOfLines={1}>
										{selectedPlace.address || "—"}
									</Text>
									<TouchableOpacity
										style={styles.addBtn}
										onPress={() => handleAddToRoute(selectedPlace)}
									>
										<Feather name="plus" size={18} color="#fff" />
										<Text style={styles.addBtnText}>Добавить в маршрут</Text>
									</TouchableOpacity>
								</View>
							)}
						</>
					) : (
						<View style={styles.mapEmpty}>
							<Feather name="map" size={40} color="#d1d5db" />
							<Text style={styles.mapEmptyText}>Нет мест для отображения</Text>
						</View>
					)}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8fafc",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
		backgroundColor: "#fff",
	},
	backButton: {
		padding: 8,
		marginRight: 8,
	},
	title: {
		flex: 1,
		fontSize: 18,
		fontWeight: "600",
		color: "#374151",
	},
	placeholder: {
		width: 40,
	},
	toggleRow: {
		flexDirection: "row",
		gap: 8,
	},
	toggleBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
		backgroundColor: "#f1f5f9",
	},
	toggleBtnActive: {
		backgroundColor: "#3b82f6",
	},
	toggleText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#374151",
	},
	toggleTextActive: {
		color: "#fff",
	},
	listScroll: {
		flex: 1,
	},
	listContent: {
		padding: 16,
		paddingBottom: 32,
	},
	card: {
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#111827",
		marginBottom: 4,
	},
	cardAddress: {
		fontSize: 13,
		color: "#6b7280",
		marginBottom: 10,
	},
	cardMeta: {
		flexDirection: "row",
		gap: 16,
		marginBottom: 12,
	},
	metaItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	metaText: {
		fontSize: 13,
		color: "#6b7280",
	},
	addBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		backgroundColor: "#3b82f6",
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 10,
	},
	addBtnText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#fff",
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 48,
	},
	emptyStateText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#374151",
		marginTop: 12,
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 6,
		textAlign: "center",
	},
	mapWrap: {
		flex: 1,
		minHeight: 300,
	},
	mapEmpty: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f1f5f9",
	},
	mapEmptyText: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 8,
	},
	mapBottomCard: {
		position: "absolute",
		left: 16,
		right: 16,
		bottom: 16,
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	bottomCardTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#111827",
		marginBottom: 4,
	},
	bottomCardAddress: {
		fontSize: 13,
		color: "#6b7280",
		marginBottom: 12,
	},
});
