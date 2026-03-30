import React, {
	useState,
	useMemo,
	useEffect,
	useRef,
	useCallback,
} from "react";
import {
	ActivityIndicator,
	Animated,
	View,
	Text,
	StyleSheet,
	PanResponder,
	ScrollView,
	FlatList,
	TouchableOpacity,
	TextInput,
	SafeAreaView,
	Dimensions,
	Platform,
	Modal,
	Easing,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { activityCategories } from "../../data/categories";
import { YandexMap } from "../../components/maps/YandexMap";
import { OSMService, OSMPlace } from "../../services/osm/OSMService";
import { useUser } from "../../context/UserContext";
import type { SearchCriteria } from "../../types/searchCriteria";

function matchesAccessibility(
	place: OSMPlace,
	filters: {
		wheelchair?: boolean;
		elevator?: boolean;
		stepFree?: boolean;
		toilet?: boolean;
		parking?: boolean;
		transport?: boolean;
	},
) {
	const a = place.accessibility;
	if (filters.wheelchair && !a.wheelchairAccessible) return false;
	if (filters.elevator && !a.elevatorOrRamp) return false;
	if (filters.stepFree && !a.stepFreeEntrance) return false;
	if (filters.toilet && !a.accessibleToilet) return false;
	if (filters.parking && !a.parkingNearby) return false;
	if (filters.transport && !a.publicTransportNearby) return false;
	return true;
}

function haversineMeters(
	a: { lat: number; lng: number },
	b: { lat: number; lng: number },
): number {
	const R = 6371000;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const lat1 = (a.lat * Math.PI) / 180;
	const lat2 = (b.lat * Math.PI) / 180;
	const x =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
	return R * c;
}

export const SearchScreen = () => {
	const { profile } = useUser();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
	const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<string[]>([]);
	const [showFilters, setShowFilters] = useState(false);
	const [filtersMounted, setFiltersMounted] = useState(false);
	const [selectedPlace, setSelectedPlace] = useState<OSMPlace | null>(null);
	const [mapView, setMapView] = useState(false);
	const [minRating, setMinRating] = useState(0);
	const [showCategoryModal, setShowCategoryModal] = useState(false);
	const [accessibilityFilters, setAccessibilityFilters] = useState({
		wheelchair: false,
		elevator: false,
		stepFree: false,
		toilet: false,
		parking: false,
		transport: false,
	});
	const INITIAL_RADIUS = 20000;
	const MAX_RADIUS = 80000;
	const RADIUS_MULTIPLIER = 1.4;

	const FILTER_SHEET_HEIGHT = Math.min(
		520,
		Dimensions.get("window").height * 0.65,
	);
	const filtersTranslateY = useRef(new Animated.Value(FILTER_SHEET_HEIGHT)).current;

	const openFilters = () => {
		// Снапшот текущих примененных категорий в черновики.
		setDraftCategoryIds(selectedCategoryIds);
		setDraftSubCategoryIds(selectedSubCategoryIds);
		setExpandedCategoryIdInModal(null);

		setFiltersMounted(true);
		setShowFilters(true);
		Animated.timing(filtersTranslateY, {
			toValue: 0,
			duration: 220,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		}).start();
	};

	const closeFilters = () => {
		Animated.timing(filtersTranslateY, {
			toValue: FILTER_SHEET_HEIGHT,
			duration: 200,
			easing: Easing.in(Easing.cubic),
			useNativeDriver: false,
		}).start(() => {
			setShowFilters(false);
			setFiltersMounted(false);
		});
	};

	const toggleFilters = () => {
		if (showFilters) closeFilters();
		else openFilters();
	};

	const arraysEqual = (a: string[], b: string[]) =>
		a.length === b.length && a.every((x) => b.includes(x));

	const applyDraftFilters = () => {
		const same =
			arraysEqual(draftCategoryIds, selectedCategoryIds) &&
			arraysEqual(draftSubCategoryIds, selectedSubCategoryIds);
		if (!same) {
			setSelectedCategoryIds(draftCategoryIds);
			setSelectedSubCategoryIds(draftSubCategoryIds);
		}

		setShowCategoryModal(false);
		setExpandedCategoryIdInModal(null);
		closeFilters();
	};

	const panStartTranslateY = useRef(0);
	const sheetPanResponder = useRef(
		PanResponder.create({
			onMoveShouldSetPanResponder: (_, gesture) =>
				Math.abs(gesture.dy) > 8,
			onPanResponderGrant: () => {
				filtersTranslateY.stopAnimation();
				panStartTranslateY.current = (filtersTranslateY as any).__getValue?.() ?? 0;
			},
			onPanResponderMove: (_, gesture) => {
				const next = panStartTranslateY.current + gesture.dy;
				const clamped = Math.max(0, Math.min(FILTER_SHEET_HEIGHT, next));
				filtersTranslateY.setValue(clamped);
			},
			onPanResponderRelease: (_, gesture) => {
				const currentY = (filtersTranslateY as any).__getValue?.() ?? 0;
				if (currentY > FILTER_SHEET_HEIGHT * 0.35 || gesture.dy > 80) {
					closeFilters();
					return;
				}
				Animated.timing(filtersTranslateY, {
					toValue: 0,
					duration: 180,
					easing: Easing.out(Easing.cubic),
					useNativeDriver: false,
				}).start();
			},
		}),
	).current;

	type PlaceListItem = {
		place: OSMPlace;
		distanceMeters: number;
		durationMinutes: number;
	};

	const [places, setPlaces] = useState<OSMPlace[]>([]);
	const placesSeenIdsRef = useRef<Set<string>>(new Set());

	const [radius, setRadius] = useState(INITIAL_RADIUS);
	const [hasMore, setHasMore] = useState(true);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [sortMode, setSortMode] = useState<"distance" | "rating">("distance");

	const centerCoords = (profile?.defaultStartPoint &&
		"coordinates" in profile.defaultStartPoint &&
		(profile.defaultStartPoint as any).coordinates && {
			lat: (profile.defaultStartPoint as any).coordinates.lat,
			lng: (profile.defaultStartPoint as any).coordinates.lng,
		}) || { lat: 52.0339, lng: 113.501 };

	// Draft-выбор фильтров (применяем только по кнопке “Подтвердить”),
	// чтобы не триггерить Overpass на каждый тап в категориях.
	const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>([]);
	const [draftSubCategoryIds, setDraftSubCategoryIds] = useState<string[]>([]);
	const [expandedCategoryIdInModal, setExpandedCategoryIdInModal] = useState<string | null>(null);

	const osmCriteria = useMemo(() => {
		return {
			startCoords: centerCoords,
			categoryIds: selectedCategoryIds.length ? selectedCategoryIds : undefined,
			subCategoryIds: selectedSubCategoryIds.length ? selectedSubCategoryIds : undefined,
			budgetMin: 0,
			budgetMax: 3000,
			goal: undefined,
			filters: {},
		} as SearchCriteria;
	}, [
		centerCoords.lat,
		centerCoords.lng,
		selectedCategoryIds,
		selectedSubCategoryIds,
	]);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			setLoadError(null);
			setSelectedPlace(null);
			setRadius(INITIAL_RADIUS);
			setHasMore(INITIAL_RADIUS < MAX_RADIUS);
			setPlaces([]);
			placesSeenIdsRef.current = new Set();
			try {
				const result = await OSMService.searchAround(
					centerCoords,
					INITIAL_RADIUS,
					osmCriteria,
				);
				const toAdd = result.filter((p) => !placesSeenIdsRef.current.has(p.id));
				toAdd.forEach((p) => placesSeenIdsRef.current.add(p.id));
				setPlaces(toAdd);

				setHasMore(INITIAL_RADIUS < MAX_RADIUS);
			} catch (e: any) {
				const status = e?.status;
				if (status === 429 || status === 504) {
					// Ошибки 429/504 не показываем пользователю: OSMService уже делает ретраи.
					setLoadError(null);
				} else {
					setLoadError(e?.message || "Ошибка загрузки мест");
				}
			} finally {
				setLoading(false);
			}
		};

		load();
	}, [
		centerCoords.lat,
		centerCoords.lng,
		selectedCategoryIds,
		selectedSubCategoryIds,
	]);

	const lastFetchMoreAtRef = useRef(0);

	const fetchMore = useCallback(async () => {
		if (loadingMore || loading || !hasMore) return;
		const now = Date.now();
		if (now - lastFetchMoreAtRef.current < 900) return;
		lastFetchMoreAtRef.current = now;
		const nextRadius = Math.min(radius * RADIUS_MULTIPLIER, MAX_RADIUS);
		if (nextRadius <= radius) {
			setHasMore(false);
			return;
		}

		setLoadingMore(true);
		try {
			const result = await OSMService.searchAround(
				centerCoords,
				nextRadius,
				osmCriteria,
			);

			const toAdd = result.filter((p) => !placesSeenIdsRef.current.has(p.id));
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
		loadingMore,
		loading,
		hasMore,
		radius,
		centerCoords.lat,
		centerCoords.lng,
		osmCriteria,
		MAX_RADIUS,
		RADIUS_MULTIPLIER,
	]);

	const displayPlaces = useMemo((): PlaceListItem[] => {
		const q = searchQuery.trim().toLowerCase();

		let results = places;
		if (q) {
			results = results.filter(
				(p) =>
					p.title.toLowerCase().includes(q) ||
					p.description.toLowerCase().includes(q) ||
					(p.address && p.address.toLowerCase().includes(q)),
			);
		}

		if (minRating > 0) {
			results = results.filter((p) => p.rating >= minRating);
		}

		results = results.filter((p) =>
			matchesAccessibility(p, accessibilityFilters),
		);

		const start = centerCoords;
		const withMeta = results.map((place) => {
			const distanceMeters = Math.round(haversineMeters(start, place.coords));
			const distanceKm = distanceMeters / 1000;
			const durationMinutes = Math.max(1, Math.round((distanceKm / 40) * 60));
			return { place, distanceMeters, durationMinutes };
		});

		withMeta.sort((a, b) => {
			if (sortMode === "rating") {
				const byRating = b.place.rating - a.place.rating;
				return byRating !== 0 ? byRating : a.distanceMeters - b.distanceMeters;
			}
			return a.distanceMeters - b.distanceMeters;
		});

		return withMeta;
	}, [
		places,
		searchQuery,
		minRating,
		accessibilityFilters,
		centerCoords.lat,
		centerCoords.lng,
		sortMode,
	]);

	const firstSelectedSubId = selectedSubCategoryIds[0];
	const categoryForIcon =
		(firstSelectedSubId
			? activityCategories.find((c) =>
					c.subcategories.some((s) => s.id === firstSelectedSubId),
				)
			: undefined) ??
		(selectedCategoryIds[0]
			? activityCategories.find((c) => c.id === selectedCategoryIds[0])
			: undefined) ??
		null;

	const PlaceCard = ({ item }: { item: PlaceListItem }) => {
		const { place, distanceMeters, durationMinutes } = item;
		return (
			<TouchableOpacity
				style={[
					styles.placeCard,
					selectedPlace?.id === place.id && styles.placeCardSelected,
				]}
				onPress={() => setSelectedPlace(place)}
				activeOpacity={0.85}
			>
				<View style={styles.placeImagePlaceholder}>
					<Text style={styles.placeImageEmoji}>
						{categoryForIcon?.icon || "Imgg"}
					</Text>
				</View>
				<View style={styles.placeInfo}>
					<Text style={styles.placeName}>{place.title}</Text>
					{place.address ? (
						<Text
							style={styles.placeAddress}
							numberOfLines={1}
							ellipsizeMode="tail"
						>
							<Feather name="map-pin" size={12} color="#6b7280" />{" "}
							{place.address}
						</Text>
					) : null}

					{place.description ? (
						<Text
							style={styles.placeDescription}
							numberOfLines={2}
							ellipsizeMode="tail"
						>
							{place.description}
						</Text>
					) : null}

					<View style={styles.placeMeta}>
						<View style={styles.metaItem}>
							<Feather name="star" size={14} color="#f59e0b" />
							<Text style={styles.metaText}>{place.rating.toFixed(2)}</Text>
						</View>
						<View style={styles.metaItem}>
							<Feather name="navigation" size={14} color="#6b7280" />
							<Text style={styles.metaText}>
								{distanceMeters < 1000
									? `${distanceMeters} м`
									: `${(distanceMeters / 1000).toFixed(1)} км`}
								{"\n"}~{durationMinutes} мин
							</Text>
						</View>
					</View>
					<View style={styles.placeTags}>
						{place.accessibility.wheelchairAccessible && (
							<View style={styles.tag}>
								<Text style={styles.tagText}>♿</Text>
							</View>
						)}
						{place.accessibility.elevatorOrRamp && (
							<View style={styles.tag}>
								<Text style={styles.tagText}>⬆</Text>
							</View>
						)}
						{place.accessibility.stepFreeEntrance && (
							<View style={styles.tag}>
								<Text style={styles.tagText}>🚪</Text>
							</View>
						)}
						{place.accessibility.accessibleToilet && (
							<View style={styles.tag}>
								<Text style={styles.tagText}>🚻</Text>
							</View>
						)}
						{place.accessibility.parkingNearby && (
							<View style={styles.tag}>
								<Text style={styles.tagText}>🅿</Text>
							</View>
						)}
						{place.accessibility.publicTransportNearby && (
							<View style={styles.tag}>
								<Text style={styles.tagText}>🚌</Text>
							</View>
						)}
					</View>
				</View>
			</TouchableOpacity>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			{/* Заголовок и поиск */}
			<View style={styles.header}>
				<View style={styles.searchContainer}>
					<Feather
						name="search"
						size={20}
						color="#6b7280"
						style={styles.searchIcon}
					/>
					<TextInput
						style={styles.searchInput}
						placeholder="Поиск мест"
						value={searchQuery}
						onChangeText={setSearchQuery}
						placeholderTextColor="#9ca3af"
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity onPress={() => setSearchQuery("")}>
							<Feather name="x" size={20} color="#6b7280" />
						</TouchableOpacity>
					)}
				</View>
				<TouchableOpacity
					style={styles.filterButton}
					onPress={toggleFilters}
				>
					<Feather name="filter" size={20} color="#374151" />
					{(draftSubCategoryIds.length > 0 ||
						draftCategoryIds.length > 0 ||
						minRating > 0 ||
						Object.values(accessibilityFilters).some(Boolean)) && (
						<View style={styles.filterIndicator} />
					)}
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.viewToggle, mapView && styles.viewToggleActive]}
					onPress={() => setMapView(!mapView)}
				>
					<Feather
						name={mapView ? "list" : "map"}
						size={20}
						color={mapView ? "white" : "#374151"}
					/>
					<Text
						style={[
							styles.viewToggleText,
							mapView && styles.viewToggleTextActive,
						]}
					>
						{mapView ? "Список" : "Карта"}
					</Text>
				</TouchableOpacity>
			</View>

			{/* Фильтры (bottom-sheet) */}
			{filtersMounted && (
				<Animated.View
					style={[
						styles.filtersPanel,
						{
							height: FILTER_SHEET_HEIGHT,
							transform: [{ translateY: filtersTranslateY }],
						},
					]}
				>
					<View style={styles.filtersSheetHandle} {...sheetPanResponder.panHandlers}>
						<View style={styles.filtersSheetGrip} />
					</View>
					<ScrollView showsVerticalScrollIndicator={false}>
						<View style={styles.filtersContent}>
							<View style={styles.filterSection}>
								<Text style={styles.filterLabel}>Категория</Text>
								<TouchableOpacity
									style={styles.categoryButton}
									onPress={() => {
										setExpandedCategoryIdInModal(null);
										setShowCategoryModal(true);
									}}
								>
									<Text style={styles.categoryButtonText}>
										{draftSubCategoryIds.length
											? `Выбрано: ${draftSubCategoryIds.length} подкатегорий`
											: draftCategoryIds.length
												? `Выбрано: ${draftCategoryIds.length} категорий`
												: "Все категории"}
									</Text>
									<Feather name="chevron-right" size={18} color="#6b7280" />
								</TouchableOpacity>
								{(draftSubCategoryIds.length > 0 ||
									draftCategoryIds.length > 0) && (
									<TouchableOpacity
										style={styles.clearCategoryBtn}
										onPress={() => {
											setDraftCategoryIds([]);
											setDraftSubCategoryIds([]);
										}}
									>
										<Text style={styles.clearCategoryText}>
											Сбросить категорию
										</Text>
									</TouchableOpacity>
								)}
							</View>
							<View style={styles.filterSection}>
								<Text style={styles.filterLabel}>Доступность</Text>
								<View style={styles.filterChips}>
									{[
										{ key: "wheelchair" as const, label: "♿" },
										{ key: "elevator" as const, label: "⬆" },
										{ key: "stepFree" as const, label: "🚪" },
										{ key: "toilet" as const, label: "🚻" },
										{ key: "parking" as const, label: "🅿" },
										{ key: "transport" as const, label: "🚌" },
									].map(({ key, label }) => (
										<TouchableOpacity
											key={key}
											style={[
												styles.filterChip,
												accessibilityFilters[key] && styles.filterChipSelected,
											]}
											onPress={() =>
												setAccessibilityFilters((prev) => ({
													...prev,
													[key]: !prev[key],
												}))
											}
										>
											<Text
												style={[
													styles.filterChipText,
													accessibilityFilters[key] &&
														styles.filterChipTextSelected,
												]}
											>
												{label}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>
							<View style={styles.filterSection}>
								<Text style={styles.filterLabel}>Рейтинг от</Text>
								<View style={styles.filterChips}>
									{[0, 3.5, 4, 4.5].map((r) => (
										<TouchableOpacity
											key={r}
											style={[
												styles.filterChip,
												minRating === r && styles.filterChipSelected,
											]}
											onPress={() => setMinRating(r)}
										>
											<Text
												style={[
													styles.filterChipText,
													minRating === r && styles.filterChipTextSelected,
												]}
											>
												{r === 0 ? "Любой" : `${r}+`}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>
						</View>
					</ScrollView>

					<View style={styles.filtersFooter}>
						<TouchableOpacity
							style={[
								styles.confirmFiltersButton,
								(loading || loadingMore) && styles.confirmFiltersButtonDisabled,
							]}
							onPress={applyDraftFilters}
							disabled={loading || loadingMore}
						>
							<Text style={styles.confirmFiltersButtonText}>Подтвердить</Text>
						</TouchableOpacity>
					</View>
				</Animated.View>
			)}

			{/* Модальное окно выбора категорий (multi-select) — только для экрана поиска */}
			{showCategoryModal && (
				<Modal
					visible={showCategoryModal}
					animationType="slide"
					transparent
					onRequestClose={() => setShowCategoryModal(false)}
				>
					<TouchableOpacity
						style={styles.modalOverlay}
						activeOpacity={1}
						onPress={() => setShowCategoryModal(false)}
					>
						<TouchableOpacity
							style={styles.categoryModalContent}
							activeOpacity={1}
							onPress={(e) => {
								// Чтобы клик внутри не закрывал модалку
								(e as any)?.stopPropagation?.();
							}}
						>
							<View style={styles.categoryModalHeader}>
								<Text style={styles.categoryModalTitle}>Выберите категории</Text>
								<TouchableOpacity onPress={() => setShowCategoryModal(false)}>
									<Feather name="x" size={24} color="#374151" />
								</TouchableOpacity>
							</View>

							<ScrollView
								style={styles.categoryModalScroll}
								showsVerticalScrollIndicator={false}
							>
								<TouchableOpacity
									style={[
										styles.categoryModalRow,
										draftCategoryIds.length === 0 &&
											draftSubCategoryIds.length === 0 &&
											styles.categoryModalRowSelected,
									]}
									onPress={() => {
										setDraftCategoryIds([]);
										setDraftSubCategoryIds([]);
										setExpandedCategoryIdInModal(null);
									}}
								>
									<Text style={styles.categoryModalRowIcon}>📋</Text>
									<Text style={styles.categoryModalRowText}>Все категории</Text>
								</TouchableOpacity>

								{activityCategories.map((cat) => {
									const subIds = cat.subcategories.map((s) => s.id);
									const selectedCountFromSubs = subIds.filter((id) =>
										draftSubCategoryIds.includes(id),
									).length;

									const allSubSelected =
										subIds.length > 0 &&
										selectedCountFromSubs === subIds.length;

									const isAllRowSelected =
										draftCategoryIds.includes(cat.id) || allSubSelected;

									const displayCount = isAllRowSelected
										? subIds.length
										: selectedCountFromSubs;

									const isExpanded = expandedCategoryIdInModal === cat.id;

									return (
										<View key={cat.id}>
											<TouchableOpacity
												style={[
													styles.categoryModalRow,
													displayCount > 0 && styles.categoryModalRowSelected,
												]}
												onPress={() =>
													setExpandedCategoryIdInModal((prev) =>
														prev === cat.id ? null : cat.id,
													)
												}
											>
												<Text style={styles.categoryModalRowIcon}>{cat.icon}</Text>
												<Text style={styles.categoryModalRowText}>{cat.name}</Text>
												{displayCount > 0 ? (
													<Text style={styles.categoryCountText}>{displayCount}</Text>
												) : null}
												<Feather
													name={isExpanded ? "chevron-up" : "chevron-down"}
													size={18}
													color="#6b7280"
												/>
											</TouchableOpacity>

											{isExpanded && (
												<View style={styles.accordionBody}>
													{/* Все в категории */}
													<TouchableOpacity
														style={[
															styles.subcategoryRow,
															isAllRowSelected && styles.categoryModalRowSelected,
														]}
														onPress={() => {
															if (isAllRowSelected) {
																setDraftCategoryIds((prev) =>
																	prev.filter((id) => id !== cat.id),
																);
																setDraftSubCategoryIds((prev) =>
																	prev.filter((id) => !subIds.includes(id)),
																);
															} else {
																setDraftCategoryIds((prev) => {
																	if (prev.includes(cat.id)) return prev;
																	return [...prev, cat.id];
																});
																// “вся категория” обнуляет индивидуальные подкатегории
																setDraftSubCategoryIds((prev) =>
																	prev.filter((id) => !subIds.includes(id)),
																);
															}
														}}
													>
														<Text style={styles.subcategoryIcon}>📋</Text>
														<Text style={styles.subcategoryText}>Все в категории</Text>
														{isAllRowSelected && (
															<Feather name="check" size={18} color="#3b82f6" />
														)}
													</TouchableOpacity>

													{cat.subcategories.map((sub) => {
														const isSelected = draftSubCategoryIds.includes(sub.id);
														return (
															<TouchableOpacity
																key={sub.id}
																style={[
																	styles.subcategoryRow,
																	isSelected && styles.categoryModalRowSelected,
																]}
																onPress={() => {
																	setDraftCategoryIds((prev) =>
																		prev.filter((id) => id !== cat.id),
																	);
																	setDraftSubCategoryIds((prev) => {
																		if (prev.includes(sub.id)) {
																			return prev.filter((id) => id !== sub.id);
																		}
																		return [...prev, sub.id];
																	});
																}}
															>
																<Text style={styles.subcategoryIcon}>
																	{sub.icon || "•"}
																</Text>
																<Text style={styles.subcategoryText}>{sub.name}</Text>
																{isSelected && (
																	<Feather name="check" size={18} color="#3b82f6" />
																)}
															</TouchableOpacity>
														);
													})}
												</View>
											)}
										</View>
									);
								})}
							</ScrollView>
						</TouchableOpacity>
					</TouchableOpacity>
				</Modal>
			)}

			{/* Контент */}
			<View style={styles.content}>
				{mapView ? (
					<View style={styles.mapFullContainer}>
						{displayPlaces.length > 0 ? (
							<YandexMap
								center={{
									lat: displayPlaces[0].place.coords.lat,
									lng: displayPlaces[0].place.coords.lng,
								}}
								markers={displayPlaces.map(({ place }) => ({
									id: place.id,
									lat: place.coords.lat,
									lng: place.coords.lng,
									title: place.title,
								}))}
								onMarkerPress={(markerId) => {
									const item = displayPlaces.find(
										(x) => x.place.id === markerId,
									);
									if (item) setSelectedPlace(item.place);
								}}
								routingEnabled={false}
								height={Dimensions.get("window").height - 200}
							/>
						) : (
							<View style={styles.mapEmpty}>
								<Feather name="map" size={32} color="#d1d5db" />
								<Text style={styles.mapEmptyText}>
									Нет мест для отображения
								</Text>
							</View>
						)}
					</View>
				) : (
					<View style={styles.listFullContainer}>
						<View style={styles.listHeader}>
							<Text style={styles.listHeaderTitle}>
								{loadError ? loadError : `Найдено мест: ${displayPlaces.length}`}
							</Text>
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
										Ближе
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
										Рейтинг
									</Text>
								</TouchableOpacity>
							</View>
						</View>
						{loading ? (
							<View style={styles.emptyState}>
								<ActivityIndicator size="large" color="#3b82f6" />
								<Text style={styles.emptyStateText}>Загрузка мест...</Text>
								<Text style={styles.emptyStateSubtext}>
									Пожалуйста, подождите
								</Text>
							</View>
						) : displayPlaces.length === 0 ? (
							<View style={styles.emptyState}>
								<Feather name="search" size={48} color="#d1d5db" />
								<Text style={styles.emptyStateText}>Ничего не найдено</Text>
								<Text style={styles.emptyStateSubtext}>
									Попробуйте изменить параметры поиска
								</Text>
							</View>
						) : (
							<FlatList
								data={displayPlaces}
								keyExtractor={(item) => item.place.id}
								renderItem={({ item }) => <PlaceCard item={item} />}
								contentContainerStyle={styles.placesListContent}
								onEndReached={fetchMore}
								onEndReachedThreshold={0.4}
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
				)}
			</View>

			{/* Детали выбранного места — карточка как метка на карте / элемент списка */}
			{selectedPlace && (
				<View style={styles.placeDetails}>
					<TouchableOpacity
						style={styles.closeDetailsButton}
						onPress={() => setSelectedPlace(null)}
					>
						<Feather name="x" size={24} color="#374151" />
					</TouchableOpacity>
					<ScrollView style={styles.detailsScroll}>
						<View style={styles.placeImagePlaceholder}>
							<Text style={styles.placeImageEmojiLarge}>
								{categoryForIcon?.icon || "📍"}
							</Text>
						</View>
						<View style={styles.detailsContent}>
							<Text style={styles.detailsName}>{selectedPlace.title}</Text>
							<Text style={styles.detailsDescription}>
								{selectedPlace.description}
							</Text>
							<View style={styles.detailsGrid}>
								{selectedPlace.address ? (
									<View style={styles.detailItem}>
										<Feather name="map-pin" size={16} color="#6b7280" />
										<Text style={styles.detailText}>
											{selectedPlace.address}
										</Text>
									</View>
								) : null}
								<View style={styles.detailItem}>
									<Feather name="star" size={16} color="#f59e0b" />
									<Text style={styles.detailText}>
										Рейтинг: {selectedPlace.rating}
									</Text>
								</View>
							</View>
							<View style={styles.features}>
								{selectedPlace.accessibility.wheelchairAccessible && (
									<View style={styles.featureTag}>
										<Text style={styles.featureText}>♿ Доступно</Text>
									</View>
								)}
								{selectedPlace.accessibility.elevatorOrRamp && (
									<View style={styles.featureTag}>
										<Text style={styles.featureText}>⬆ Лифт/пандус</Text>
									</View>
								)}
								{selectedPlace.accessibility.parkingNearby && (
									<View style={styles.featureTag}>
										<Text style={styles.featureText}>🅿 Парковка</Text>
									</View>
								)}
								{selectedPlace.accessibility.publicTransportNearby && (
									<View style={styles.featureTag}>
										<Text style={styles.featureText}>🚌 Остановка рядом</Text>
									</View>
								)}
							</View>
						</View>
					</ScrollView>
				</View>
			)}
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "white",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#f1f5f9",
		gap: 8,
	},
	searchContainer: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f8fafc",
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: "#374151",
	},
	filterButton: {
		padding: 10,
		position: "relative",
	},
	filterIndicator: {
		position: "absolute",
		top: 6,
		right: 6,
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "#ef4444",
	},
	viewToggle: {
		flexDirection: "row",
		alignItems: "center",
		padding: 10,
		borderRadius: 8,
		backgroundColor: "#f8fafc",
		gap: 6,
	},
	viewToggleActive: {
		backgroundColor: "#3b82f6",
	},
	viewToggleText: {
		fontSize: 12,
		color: "#374151",
		fontWeight: "500",
	},
	viewToggleTextActive: {
		color: "white",
	},
	filtersPanel: {
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#f1f5f9",
		paddingVertical: 12,
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		borderTopLeftRadius: 18,
		borderTopRightRadius: 18,
		zIndex: 50,
	},
	filtersSheetHandle: {
		height: 28,
		alignItems: "center",
		justifyContent: "center",
	},
	filtersSheetGrip: {
		width: 44,
		height: 5,
		borderRadius: 3,
		backgroundColor: "#e5e7eb",
	},
	filtersContent: {
		paddingHorizontal: 16,
		paddingBottom: 96,
	},
	filtersFooter: {
		paddingHorizontal: 16,
		paddingBottom: 20,
	},
	confirmFiltersButton: {
		backgroundColor: "#3b82f6",
		borderRadius: 16,
		paddingVertical: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	confirmFiltersButtonDisabled: {
		opacity: 0.65,
	},
	confirmFiltersButtonText: {
		fontSize: 16,
		fontWeight: "700",
		color: "white",
	},
	filterSection: {
		marginBottom: 12,
	},
	filterLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: "#374151",
		marginBottom: 8,
	},
	filterChips: {
		flexDirection: "row",
		gap: 8,
	},
	filterChip: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: "#f8fafc",
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	filterChipSelected: {
		backgroundColor: "#3b82f6",
		borderColor: "#3b82f6",
	},
	filterChipText: {
		fontSize: 14,
		color: "#374151",
		fontWeight: "500",
	},
	filterChipTextSelected: {
		color: "white",
	},
	content: {
		flex: 1,
		height: "100%",
	},
	placesList: {
		flex: 1,
		padding: 16,
	},
	placesListContent: {
		padding: 16,
		paddingBottom: 32,
	},
	mapFullContainer: {
		flex: 1,
		height: "100%",
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
	mapEmpty: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f8fafc",
	},
	mapEmptyText: {
		marginTop: 12,
		fontSize: 16,
		color: "#6b7280",
	},
	listFullContainer: {
		flex: 1,
	},
	listHeader: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: "#f8fafc",
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	listHeaderTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#374151",
	},
	sortRow: {
		flexDirection: "row",
		gap: 8,
		marginTop: 10,
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
	resultsCount: {
		fontSize: 14,
		color: "#6b7280",
		marginBottom: 12,
	},
	placeCard: {
		backgroundColor: "white",
		borderRadius: 16,
		marginBottom: 16,
		overflow: "visible",
		...(Platform.OS === "web"
			? {
					boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
				}
			: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.08,
					shadowRadius: 12,
					elevation: 4,
				}),
		borderWidth: 2,
		borderColor: "transparent",
	},
	placeCardSelected: {
		borderColor: "#3b82f6",
	},
	placeImagePlaceholder: {
		width: "100%",
		height: 140,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f1f5f9",
	},
	placeImageEmoji: {
		fontSize: 40,
		lineHeight: 40,
	},
	placeImageEmojiLarge: {
		fontSize: 56,
		lineHeight: 56,
	},
	placeInfo: {
		padding: 16,
	},
	placeName: {
		fontSize: 18,
		fontWeight: "600",
		color: "#1f2937",
		marginBottom: 6,
	},
	placeAddress: {
		fontSize: 13,
		color: "#6b7280",
		lineHeight: 18,
		marginBottom: 10,
	},
	placeDescription: {
		fontSize: 13,
		color: "#6b7280",
		marginBottom: 10,
		lineHeight: 18,
	},
	placeMeta: {
		flexDirection: "row",
		gap: 16,
	},
	metaItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	metaText: {
		fontSize: 13,
		color: "#6b7280",
	},
	placeTags: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
		marginTop: 10,
	},
	tag: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		backgroundColor: "#eff6ff",
	},
	tagText: {
		fontSize: 12,
	},
	categoryButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 14,
		paddingHorizontal: 16,
		backgroundColor: "#f8fafc",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	categoryButtonText: {
		fontSize: 15,
		color: "#374151",
		fontWeight: "500",
	},
	clearCategoryBtn: {
		marginTop: 8,
		alignSelf: "flex-start",
	},
	clearCategoryText: {
		fontSize: 14,
		color: "#3b82f6",
		fontWeight: "500",
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "flex-end",
	},
	categoryModalContent: {
		backgroundColor: "white",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		maxHeight: "80%",
	},
	categoryModalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	categoryModalTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#111827",
	},
	categoryModalScroll: {
		padding: 16,
		paddingBottom: 32,
	},
	categoryModalRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: 12,
		borderRadius: 12,
		gap: 12,
	},
	categoryModalRowSelected: {
		backgroundColor: "#eff6ff",
	},
	categoryModalRowIcon: {
		fontSize: 24,
		width: 32,
		textAlign: "center",
	},
	categoryModalRowText: {
		flex: 1,
		fontSize: 16,
		fontWeight: "500",
		color: "#111827",
	},
	accordionBody: {
		paddingLeft: 44,
		paddingBottom: 8,
	},
	categoryCountText: {
		fontSize: 14,
		fontWeight: "700",
		color: "#6b7280", // тёмно-серый
		marginRight: 2,
	},
	subcategoryList: {
		paddingLeft: 44,
		paddingBottom: 8,
	},
	subcategoryRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
		gap: 10,
	},
	subcategoryIcon: {
		fontSize: 18,
		width: 24,
		textAlign: "center",
	},
	subcategoryText: {
		fontSize: 15,
		color: "#374151",
	},
	detailsScroll: {
		flex: 1,
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 60,
	},
	emptyStateText: {
		fontSize: 18,
		fontWeight: "600",
		color: "#374151",
		marginTop: 16,
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: "#6b7280",
		marginTop: 8,
	},
	placeDetails: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		height: "60%",
		backgroundColor: "white",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		...(Platform.OS === "web"
			? {
					boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.1)",
				}
			: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: -2 },
					shadowOpacity: 0.1,
					shadowRadius: 8,
					elevation: 8,
				}),
	},
	closeDetailsButton: {
		position: "absolute",
		top: 16,
		right: 16,
		zIndex: 10,
		padding: 8,
		backgroundColor: "white",
		borderRadius: 20,
		...(Platform.OS === "web"
			? {
					boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
				}
			: {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.1,
					shadowRadius: 4,
					elevation: 4,
				}),
	},
	detailsImage: {
		width: "100%",
		height: 200,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
	},
	detailsContent: {
		padding: 20,
	},
	detailsName: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#1f2937",
		marginBottom: 8,
	},
	detailsDescription: {
		fontSize: 16,
		color: "#6b7280",
		lineHeight: 24,
		marginBottom: 20,
	},
	detailsGrid: {
		marginBottom: 20,
	},
	detailItem: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
		gap: 8,
	},
	detailText: {
		fontSize: 14,
		color: "#374151",
	},
	features: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	featureTag: {
		backgroundColor: "#f0f9ff",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	featureText: {
		fontSize: 12,
		color: "#0369a1",
		fontWeight: "500",
	},
	advancedToggle: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderTopWidth: 1,
		borderTopColor: "#e5e7eb",
		marginTop: 8,
	},
	advancedToggleText: {
		fontSize: 14,
		color: "#3b82f6",
		fontWeight: "500",
	},
	advancedFilters: {
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: "#e5e7eb",
	},
	ratingContainer: {
		flexDirection: "row",
		gap: 8,
		marginTop: 8,
	},
	ratingButton: {
		padding: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		backgroundColor: "white",
	},
	ratingButtonActive: {
		backgroundColor: "#fef3c7",
		borderColor: "#f59e0b",
	},
	priceInputs: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginTop: 8,
	},
	priceInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		borderRadius: 8,
		padding: 12,
		fontSize: 14,
		backgroundColor: "white",
	},
	priceSeparator: {
		fontSize: 16,
		color: "#6b7280",
	},
	distanceButtons: {
		flexDirection: "row",
		gap: 8,
		marginTop: 8,
		flexWrap: "wrap",
	},
	distanceButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		backgroundColor: "white",
	},
	distanceButtonActive: {
		backgroundColor: "#3b82f6",
		borderColor: "#3b82f6",
	},
	distanceButtonText: {
		fontSize: 14,
		color: "#374151",
		fontWeight: "500",
	},
	distanceButtonTextActive: {
		color: "white",
	},
	featuresFilters: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginTop: 8,
	},
	featureFilter: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		backgroundColor: "white",
		gap: 6,
	},
	featureFilterActive: {
		backgroundColor: "#3b82f6",
		borderColor: "#3b82f6",
	},
	featureFilterText: {
		fontSize: 14,
		color: "#374151",
		fontWeight: "500",
	},
	featureFilterTextActive: {
		color: "white",
	},
});
