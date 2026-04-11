import React, {
	useState,
	useMemo,
	useCallback,
	useEffect,
	useRef,
} from "react";
import {
	View,
	Text,
	StyleSheet,
	ActivityIndicator,
	FlatList,
	TouchableOpacity,
	Dimensions,
	Platform,
	Alert,
	Modal,
	ScrollView,
	Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { usePlanner } from "../../services/planner/PlannerContext";
import { useRoute } from "../../services/planner/RouteContext";
import type {
	SearchCriteria,
	SearchCriteriaFilters,
} from "../../types/searchCriteria";
import type { RouteEvent, RouteOrigin } from "../../types/route";
import { YandexMap } from "../maps/YandexMap";
import { OSMService, OSMPlace } from "../../services/osm/OSMService";
import {
	filterOsmPlaces,
	matchesExtendedSearchCriteria,
} from "../../utils/osmPlaceFilters";
import { useDeviceCoords } from "../../hooks/useDeviceCoords";
import { AddToRouteTimeModal } from "./AddToRouteTimeModal";
import { getRouteInsertTiming } from "../../utils/routeInsertTiming";
import {
	isSameLocalCalendarDay,
	minutesSinceLocalMidnight,
} from "../../utils/timingUtils";
import {
	formatOsmBudgetCaption,
	formatOsmOpeningCaption,
} from "../../utils/osmPlaceCaption";
import {
	getOpeningSummaryToday,
	formatOpeningHoursDetailRu,
	getMinutesUntilClosingToday,
	extractPlacePhone,
	extractPlaceWebsite,
} from "../../utils/openingHoursRu";

const { height: winHeight } = Dimensions.get("window");

function haversineKm(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
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

function matchesFilters(
	place: OSMPlace,
	filters: SearchCriteriaFilters,
): boolean {
	if (!filters || Object.keys(filters).length === 0) return true;
	const acc = place.accessibility;
	if (filters.wheelchairAccessible === true && !acc.wheelchairAccessible)
		return false;
	if (filters.elevatorOrRamp === true && !acc.elevatorOrRamp) return false;
	if (filters.stepFreeEntrance === true && !acc.stepFreeEntrance) return false;
	if (filters.accessibleToilet === true && !acc.accessibleToilet) return false;
	if (filters.parkingNearby === true && !acc.parkingNearby) return false;
	if (filters.publicTransportNearby === true && !acc.publicTransportNearby)
		return false;
	return true;
}

export interface SearchResultsStepProps {
	onPlanSaved?: () => void;
}

export const SearchResultsStep: React.FC<SearchResultsStepProps> = ({
	onPlanSaved,
}) => {
	const {
		searchCriteria,
		setCurrentStep,
		planningRequest,
		planningDate,
	} = usePlanner();
	const {
		insertEventWithOrigin,
		events,
		pendingInsertIndex,
		origin,
		segments,
	} = useRoute();
	const deviceCoords = useDeviceCoords();

	const [viewMode, setViewMode] = useState<"list" | "map">("list");
	const [selectedPlace, setSelectedPlace] = useState<OSMPlace | null>(null);
	const [timeModalPlace, setTimeModalPlace] = useState<OSMPlace | null>(null);
	const [detailModalPlace, setDetailModalPlace] = useState<OSMPlace | null>(
		null,
	);

	const INITIAL_RADIUS = 4000;
	const MAX_RADIUS = 20000;
	const RADIUS_MULTIPLIER = 1.2;

	const [places, setPlaces] = useState<OSMPlace[]>([]);
	const placesSeenIdsRef = useRef<Set<string>>(new Set());

	const [radius, setRadius] = useState(INITIAL_RADIUS);
	const [hasMore, setHasMore] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [sortMode, setSortMode] = useState<"distance" | "rating">("distance");

	const planningDayFloorMinutes = useMemo(() => {
		return isSameLocalCalendarDay(planningDate, new Date())
			? minutesSinceLocalMidnight()
			: 0;
	}, [planningDate.getTime()]);

	const timeModalTiming = useMemo(() => {
		if (!timeModalPlace) return null;
		return getRouteInsertTiming({
			events,
			segments,
			origin,
			insertIndex: pendingInsertIndex ?? events.length,
			newCoords: timeModalPlace.coords,
			floorMinutes: planningDayFloorMinutes,
		});
	}, [
		timeModalPlace,
		events,
		segments,
		origin,
		pendingInsertIndex,
		planningDayFloorMinutes,
	]);

	useEffect(() => {
		const load = async () => {
			if (!searchCriteria) return;
			setLoading(true);
			setLoadError(null);
			setSelectedPlace(null);

			setRadius(INITIAL_RADIUS);
			setHasMore(INITIAL_RADIUS < MAX_RADIUS);
			setLoadingMore(false);
			setPlaces([]);
			placesSeenIdsRef.current = new Set();

			try {
				const data = await OSMService.searchAround(
					searchCriteria.startCoords,
					INITIAL_RADIUS,
					searchCriteria,
				);
				const filtered = data.filter((p) =>
					matchesFilters(p, searchCriteria.filters ?? {}),
				);
				filtered.forEach((p) => placesSeenIdsRef.current.add(p.id));
				setPlaces(filtered);
			} catch (e: any) {
				const status = e?.status;
				if (status === 429 || status === 504) {
					setLoadError(null);
				} else {
					setLoadError(e?.message || "Ошибка загрузки мест");
				}
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [searchCriteria]);

	const filteredWithDistance = useMemo(() => {
		if (!searchCriteria) return [];
		const start = searchCriteria.startCoords;
		const items = filterOsmPlaces(places)
			.filter((place) => matchesExtendedSearchCriteria(place, searchCriteria))
			.map((place) => {
				const distanceKm = haversineKm(
					start.lat,
					start.lng,
					place.coords.lat,
					place.coords.lng,
				);
				const distanceMeters = Math.round(distanceKm * 1000);
				const durationMinutes = Math.max(1, Math.round((distanceKm / 40) * 60));
				return {
					...place,
					distanceMeters,
					durationMinutes,
				};
			})
			.sort((a: any, b: any) => {
				if (sortMode === "rating") {
					const byRating = b.rating - a.rating;
					return byRating !== 0
						? byRating
						: a.distanceMeters - b.distanceMeters;
				}
				return a.distanceMeters - b.distanceMeters;
			});

		return items;
	}, [searchCriteria, places, sortMode]);

	const fetchMore = useCallback(async () => {
		if (!searchCriteria) return;
		if (loadingMore || loading || !hasMore) return;

		const nextRadius = Math.min(radius * RADIUS_MULTIPLIER, MAX_RADIUS);
		if (nextRadius <= radius) {
			setHasMore(false);
			return;
		}

		setLoadingMore(true);
		try {
			const data = await OSMService.searchAround(
				searchCriteria.startCoords,
				nextRadius,
				searchCriteria,
			);
			const filtered = data.filter((p) =>
				matchesFilters(p, searchCriteria.filters ?? {}),
			);

			const toAdd = filtered.filter((p) => !placesSeenIdsRef.current.has(p.id));
			toAdd.forEach((p) => placesSeenIdsRef.current.add(p.id));
			setPlaces((prev) => [...prev, ...toAdd]);

			setRadius(nextRadius);
			if (nextRadius >= MAX_RADIUS && toAdd.length === 0) setHasMore(false);
		} catch (e: any) {
			const status = e?.status;
			if (status === 429 || status === 504) {
				setLoadError(null);
			} else {
				setLoadError(e?.message || "Ошибка загрузки дополнительных мест");
			}
		} finally {
			setLoadingMore(false);
		}
	}, [
		searchCriteria,
		loadingMore,
		loading,
		hasMore,
		radius,
		MAX_RADIUS,
		RADIUS_MULTIPLIER,
	]);

	const finishAdd = useCallback(
		(
			event: RouteEvent,
			originUpdate: "unchanged" | RouteOrigin | null,
		) => {
			const index = pendingInsertIndex ?? events.length;
			insertEventWithOrigin(index, event, originUpdate);
			setSelectedPlace(null);
			setTimeModalPlace(null);
			onPlanSaved?.();
		},
		[
			insertEventWithOrigin,
			events.length,
			pendingInsertIndex,
			onPlanSaved,
		],
	);

	const confirmAddToRoute = useCallback(
		(arrivalTime: string, durationMinutes: number) => {
			const place = timeModalPlace;
			if (!place) return;
			const event: RouteEvent = {
				id: `ev-${Date.now()}-${place.id}`,
				placeId: place.id,
				customTitle: place.title,
				coords: place.coords,
				arrivalTime,
				duration: durationMinutes,
				travelModeToNext: "driving",
				lockTimes: true,
				description: place.description,
				address: place.address,
				openingHours: formatOsmOpeningCaption(place),
				budgetNote: formatOsmBudgetCaption(place),
			};
			const wasEmpty = events.length === 0;
			if (!wasEmpty) {
				finishAdd(event, "unchanged");
				return;
			}
			Alert.alert(
				"Первое место",
				"Построить маршрут от вашей геолокации до этой точки?",
				[
					{
						text: "Нет, только точки плана",
						style: "cancel",
						onPress: () =>
							finishAdd(event, {
								id: "from_first_stop",
								label: place.title,
								coords: place.coords,
							}),
					},
					{
						text: "Да, от меня",
						onPress: () => {
							if (deviceCoords) {
								finishAdd(event, {
									id: "default",
									label: "Вы здесь",
									coords: deviceCoords,
								});
							} else {
								Alert.alert(
									"Геолокация",
									"Не удалось получить координаты. Маршрут начнётся с первой точки.",
									[
										{
											text: "Понятно",
											onPress: () =>
												finishAdd(event, {
													id: "from_first_stop",
													label: place.title,
													coords: place.coords,
												}),
										},
									],
								);
							}
						},
					},
				],
			);
		},
		[timeModalPlace, events.length, deviceCoords, finishAdd],
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
					{loading
						? "Загрузка..."
						: loadError
							? loadError
							: `Найдено: ${filteredWithDistance.length}`}
				</Text>
				<View style={styles.toggleRow}>
					<TouchableOpacity
						style={[
							styles.toggleBtn,
							viewMode === "list" && styles.toggleBtnActive,
						]}
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
						style={[
							styles.toggleBtn,
							viewMode === "map" && styles.toggleBtnActive,
						]}
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
				<View style={styles.listScroll}>
					{loading ? (
						<View style={styles.emptyState}>
							<ActivityIndicator size="large" color="#3b82f6" />
							<Text style={styles.emptyStateText}>Загрузка...</Text>
							<Text style={styles.emptyStateSubtext}>Подбираем места</Text>
						</View>
					) : filteredWithDistance.length === 0 ? (
						<View style={styles.emptyState}>
							<Feather name="map-pin" size={48} color="#d1d5db" />
							<Text style={styles.emptyStateText}>Места не найдены</Text>
							<Text style={styles.emptyStateSubtext}>
								Измените фильтры или категорию
							</Text>
						</View>
					) : (
						<FlatList
							data={filteredWithDistance}
							keyExtractor={(item) => item.id}
							renderItem={({ item }) => {
								const untilClose = getMinutesUntilClosingToday(item);
								return (
									<View style={styles.card}>
										<TouchableOpacity
											activeOpacity={0.85}
											onPress={() => setDetailModalPlace(item)}
										>
											<Text style={styles.cardTitle}>{item.title}</Text>
											{item.address ? (
												<Text
													style={styles.cardAddress}
													numberOfLines={1}
													ellipsizeMode="tail"
												>
													{item.address}
												</Text>
											) : null}
											<Text style={styles.cardCaptionLine} numberOfLines={2}>
												🕐 {getOpeningSummaryToday(item)}
											</Text>
											{untilClose != null && untilClose > 0 ? (
												<Text style={styles.cardClosingHint}>
													До закрытия ~{untilClose} мин
												</Text>
											) : null}
											<View style={styles.cardMeta}>
												<View style={styles.metaItem}>
													<Feather name="star" size={14} color="#f59e0b" />
													<Text style={styles.metaText}>
														{item.rating.toFixed(2)}
													</Text>
												</View>
												<View style={styles.metaItem}>
													<Feather name="navigation" size={14} color="#6b7280" />
													<Text style={styles.metaText}>
														{item.distanceMeters < 1000
															? `${item.distanceMeters} м`
															: `${(item.distanceMeters / 1000).toFixed(1)} км`}
													</Text>
												</View>
											</View>
											<Text style={styles.cardTapHint}>Нажмите для подробностей →</Text>
										</TouchableOpacity>

										<TouchableOpacity
											style={styles.addBtn}
											onPress={() => setTimeModalPlace(item)}
										>
											<Feather name="plus" size={18} color="#fff" />
											<Text style={styles.addBtnText}>Добавить в маршрут</Text>
										</TouchableOpacity>
									</View>
								);
							}}
							contentContainerStyle={styles.listContent}
							showsVerticalScrollIndicator
							onEndReached={fetchMore}
							onEndReachedThreshold={0.4}
							ListHeaderComponent={
								<View style={styles.sortRow}>
									<TouchableOpacity
										style={[
											styles.sortBtn,
											sortMode === "distance" && styles.sortBtnActive,
										]}
										onPress={() => setSortMode("distance")}
									>
										<Text
											style={[
												styles.sortBtnText,
												sortMode === "distance" && styles.sortBtnTextActive,
											]}
										>
											Сначала ближе
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.sortBtn,
											sortMode === "rating" && styles.sortBtnActive,
										]}
										onPress={() => setSortMode("rating")}
									>
										<Text
											style={[
												styles.sortBtnText,
												sortMode === "rating" && styles.sortBtnTextActive,
											]}
										>
											Сначала выше рейтинг
										</Text>
									</TouchableOpacity>
								</View>
							}
							ListFooterComponent={
								loadingMore ? (
									<View style={styles.listFooter}>
										<Text style={styles.listFooterText}>Загрузка...</Text>
									</View>
								) : !hasMore ? (
									<View style={styles.listFooter}>
										<Text style={styles.listFooterText}>
											Больше нет результатов
										</Text>
									</View>
								) : (
									<View style={{ height: 24 }} />
								)
							}
						/>
					)}
				</View>
			) : (
				<View style={styles.mapWrap}>
					{loading ? (
						<View style={styles.emptyState}>
							<ActivityIndicator size="large" color="#3b82f6" />
							<Text style={styles.emptyStateText}>Загрузка...</Text>
							<Text style={styles.emptyStateSubtext}>
								Проверяем доступность рядом
							</Text>
						</View>
					) : filteredWithDistance.length > 0 ? (
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
								height={
									Platform.OS === "web" ? 400 : Math.max(300, winHeight - 220)
								}
								fitAllMarkers
								routingEnabled={false}
							/>
							{selectedPlace && (
								<View style={styles.mapBottomCard}>
									<Text style={styles.bottomCardTitle}>
										{selectedPlace.title}
									</Text>
									<Text
										style={styles.bottomCardAddress}
										numberOfLines={1}
										ellipsizeMode="tail"
									>
										{selectedPlace.address || "—"}
									</Text>
									<Text style={styles.bottomCardRating}>
										Рейтинг: {selectedPlace.rating.toFixed(2)}
									</Text>
									<Text style={styles.bottomCardDescription} numberOfLines={2}>
										{selectedPlace.description}
									</Text>
									<Text style={styles.bottomCardCaption} numberOfLines={2}>
										🕐 {getOpeningSummaryToday(selectedPlace)}
									</Text>
									<Text style={styles.bottomCardHoursDetail}>
										{formatOpeningHoursDetailRu(selectedPlace)}
									</Text>
									<Text style={styles.bottomCardCaption} numberOfLines={2}>
										💳 {formatOsmBudgetCaption(selectedPlace)}
									</Text>
									<TouchableOpacity
										style={styles.addBtn}
										onPress={() =>
											selectedPlace && setTimeModalPlace(selectedPlace)
										}
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

			<Modal
				visible={detailModalPlace != null}
				transparent
				animationType="fade"
				onRequestClose={() => setDetailModalPlace(null)}
			>
				<View style={styles.detailModalOverlay}>
					<TouchableOpacity
						style={StyleSheet.absoluteFillObject}
						activeOpacity={1}
						onPress={() => setDetailModalPlace(null)}
					/>
					<View style={styles.detailModalCard}>
						<ScrollView
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: winHeight * 0.75 }}
						>
							{detailModalPlace ? (
								<>
									<Text style={styles.detailModalTitle}>
										{detailModalPlace.title}
									</Text>
									{detailModalPlace.address ? (
										<Text style={styles.detailModalAddr}>
											{detailModalPlace.address}
										</Text>
									) : null}
									<Text style={styles.detailModalLine}>
										{getOpeningSummaryToday(detailModalPlace)}
									</Text>
									<Text style={styles.detailModalHoursLabel}>Часы работы</Text>
									<Text style={styles.detailModalHours}>
										{formatOpeningHoursDetailRu(detailModalPlace)}
									</Text>
									{extractPlacePhone(detailModalPlace) ? (
										<TouchableOpacity
											style={styles.detailModalLink}
											onPress={() =>
												Linking.openURL(
													`tel:${extractPlacePhone(detailModalPlace)!.replace(/[^\d+]/g, "")}`,
												)
											}
										>
											<Feather name="phone" size={18} color="#059669" />
											<Text style={styles.detailModalLinkText}>
												{extractPlacePhone(detailModalPlace)}
											</Text>
										</TouchableOpacity>
									) : null}
									{extractPlaceWebsite(detailModalPlace) ? (
										<TouchableOpacity
											style={styles.detailModalLink}
											onPress={() => {
												const w = extractPlaceWebsite(detailModalPlace)!;
												void Linking.openURL(
													/^https?:\/\//i.test(w) ? w : `https://${w}`,
												);
											}}
										>
											<Feather name="globe" size={18} color="#2563eb" />
											<Text style={styles.detailModalLinkText} numberOfLines={2}>
												{extractPlaceWebsite(detailModalPlace)}
											</Text>
										</TouchableOpacity>
									) : null}
									<Text style={styles.detailModalDesc}>
										{detailModalPlace.description}
									</Text>
									<Text style={styles.detailModalBudget}>
										💳 {formatOsmBudgetCaption(detailModalPlace)}
									</Text>
								</>
							) : null}
						</ScrollView>
						<View style={styles.detailModalActions}>
							<TouchableOpacity
								style={styles.detailModalSecondary}
								onPress={() => setDetailModalPlace(null)}
							>
								<Text style={styles.detailModalSecondaryText}>Закрыть</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.detailModalPrimary}
								onPress={() => {
									if (detailModalPlace) {
										setTimeModalPlace(detailModalPlace);
										setDetailModalPlace(null);
									}
								}}
							>
								<Text style={styles.detailModalPrimaryText}>В маршрут</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			<AddToRouteTimeModal
				visible={!!timeModalPlace}
				onClose={() => setTimeModalPlace(null)}
				onConfirm={confirmAddToRoute}
				placeTitle={timeModalPlace?.title ?? ""}
				defaultArrival={
					timeModalTiming?.suggestedArrival ?? planningRequest.startTime
				}
				defaultDurationMinutes={60}
				minArrivalMinutes={timeModalTiming?.minArrivalMinutes ?? 0}
				blockingEventTitle={
					timeModalTiming?.blockingLabel ?? "начала дня"
				}
				openingHoursRaw={timeModalPlace?.openingHoursRaw}
				planningDate={planningDate}
			/>
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
	sortRow: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 16,
	},
	sortBtn: {
		backgroundColor: "white",
		borderRadius: 999,
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	sortBtnActive: {
		backgroundColor: "#3b82f6",
		borderColor: "#3b82f6",
	},
	sortBtnText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#374151",
	},
	sortBtnTextActive: {
		color: "white",
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
		lineHeight: 18,
		marginBottom: 10,
	},
	cardDescription: {
		fontSize: 13,
		color: "#6b7280",
		marginBottom: 6,
		lineHeight: 18,
	},
	cardCaptionLine: {
		fontSize: 12,
		color: "#64748b",
		lineHeight: 16,
		marginBottom: 4,
	},
	cardClosingHint: {
		fontSize: 12,
		fontWeight: "600",
		color: "#b45309",
		marginBottom: 6,
	},
	cardTapHint: {
		fontSize: 11,
		color: "#94a3b8",
		marginTop: 4,
		marginBottom: 8,
	},
	detailModalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.45)",
		justifyContent: "center",
		padding: 20,
	},
	detailModalCard: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 18,
		maxWidth: 420,
		width: "100%",
		alignSelf: "center",
	},
	detailModalTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#0f172a",
		marginBottom: 8,
	},
	detailModalAddr: {
		fontSize: 14,
		color: "#64748b",
		marginBottom: 10,
	},
	detailModalLine: {
		fontSize: 14,
		fontWeight: "600",
		color: "#0f766e",
		marginBottom: 10,
	},
	detailModalHoursLabel: {
		fontSize: 12,
		fontWeight: "700",
		color: "#64748b",
		marginBottom: 6,
		textTransform: "uppercase",
	},
	detailModalHours: {
		fontSize: 13,
		color: "#334155",
		lineHeight: 20,
		marginBottom: 12,
	},
	detailModalLink: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 10,
	},
	detailModalLinkText: {
		fontSize: 14,
		color: "#1d4ed8",
		fontWeight: "600",
		flex: 1,
	},
	detailModalDesc: {
		fontSize: 14,
		color: "#475569",
		lineHeight: 20,
		marginTop: 8,
	},
	detailModalBudget: {
		fontSize: 13,
		color: "#475569",
		marginTop: 10,
	},
	detailModalActions: {
		flexDirection: "row",
		gap: 10,
		marginTop: 16,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: "#e2e8f0",
	},
	detailModalSecondary: {
		flex: 1,
		paddingVertical: 12,
		alignItems: "center",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	detailModalSecondaryText: {
		fontSize: 15,
		fontWeight: "600",
		color: "#475569",
	},
	detailModalPrimary: {
		flex: 1,
		paddingVertical: 12,
		alignItems: "center",
		borderRadius: 12,
		backgroundColor: "#3b82f6",
	},
	detailModalPrimaryText: {
		fontSize: 15,
		fontWeight: "600",
		color: "white",
	},
	cardMeta: {
		flexDirection: "row",
		gap: 16,
		marginBottom: 12,
		flexWrap: "wrap",
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
	cardTags: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
		marginBottom: 12,
	},
	tag: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		backgroundColor: "#eff6ff",
	},
	tagText: {
		fontSize: 12,
		color: "#0369a1",
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
	listFooter: {
		paddingVertical: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	listFooterText: {
		fontSize: 13,
		color: "#6b7280",
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
		lineHeight: 18,
		marginBottom: 6,
	},
	bottomCardRating: {
		fontSize: 13,
		color: "#6b7280",
		marginBottom: 8,
	},
	bottomCardDescription: {
		fontSize: 13,
		color: "#6b7280",
		marginBottom: 6,
		lineHeight: 18,
	},
	bottomCardHoursDetail: {
		fontSize: 12,
		color: "#334155",
		lineHeight: 17,
		marginBottom: 8,
		backgroundColor: "#f8fafc",
		padding: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	bottomCardCaption: {
		fontSize: 12,
		color: "#64748b",
		lineHeight: 16,
		marginBottom: 4,
	},
});
