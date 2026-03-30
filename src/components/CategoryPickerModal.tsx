import React from "react";
import {
	View,
	Text,
	StyleSheet,
	Modal,
	TouchableOpacity,
	ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { activityCategories } from "../data/categories";
import type { Category } from "../data/categories";

interface CategoryPickerModalProps {
	visible: boolean;
	onClose: () => void;
	selectedCategoryIds: string[];
	selectedSubCategoryIds: string[];
	onSelect: (next: { categoryIds: string[]; subCategoryIds: string[] }) => void;
}

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
	visible,
	onClose,
	selectedCategoryIds,
	selectedSubCategoryIds,
	onSelect,
}) => {
	const selectedCategoryIdSet = new Set(selectedCategoryIds);
	const selectedSubCategoryIdSet = new Set(selectedSubCategoryIds);

	const toggleCategory = (catId: string, subIds: string[]) => {
		const alreadyAllSelected = subIds.length > 0 && subIds.every((id) => selectedSubCategoryIdSet.has(id));

		if (subIds.length === 0) {
			const nextCategoryIds = selectedCategoryIdSet.has(catId)
				? selectedCategoryIds.filter((id) => id !== catId)
				: [...selectedCategoryIds, catId];
			onSelect({ categoryIds: nextCategoryIds, subCategoryIds: selectedSubCategoryIds });
			return;
		}

		if (alreadyAllSelected) {
			const removedSubSet = new Set(subIds);
			const nextSubCategoryIds = selectedSubCategoryIds.filter((id) => !removedSubSet.has(id));
			const nextCategoryIds = selectedCategoryIds.filter((id) => id !== catId);
			onSelect({ categoryIds: nextCategoryIds, subCategoryIds: nextSubCategoryIds });
		} else {
			const toAdd = subIds.filter((id) => !selectedSubCategoryIdSet.has(id));
			const nextSubCategoryIds = [...selectedSubCategoryIds, ...toAdd];
			const nextCategoryIds = selectedCategoryIdSet.has(catId)
				? selectedCategoryIds
				: [...selectedCategoryIds, catId];
			onSelect({ categoryIds: nextCategoryIds, subCategoryIds: nextSubCategoryIds });
		}
	};

	const toggleSubcategory = (catId: string, allSubIds: string[], subId: string) => {
		const isSelected = selectedSubCategoryIdSet.has(subId);
		const nextSubCategoryIds = isSelected
			? selectedSubCategoryIds.filter((id) => id !== subId)
			: [...selectedSubCategoryIds, subId];

		const nextSubSet = new Set(nextSubCategoryIds);
		const shouldSelectCategory = allSubIds.length > 0 && allSubIds.every((id) => nextSubSet.has(id));
		const nextCategoryIds = (() => {
			if (shouldSelectCategory) {
				return selectedCategoryIdSet.has(catId)
					? selectedCategoryIds
					: [...selectedCategoryIds, catId];
			}
			return selectedCategoryIds.filter((id) => id !== catId);
		})();

		onSelect({ categoryIds: nextCategoryIds, subCategoryIds: nextSubCategoryIds });
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			<TouchableOpacity
				style={styles.overlay}
				activeOpacity={1}
				onPress={onClose}
			>
				<TouchableOpacity
					style={styles.content}
					activeOpacity={1}
					onPress={(e) => e.stopPropagation()}
				>
					<View style={styles.header}>
						<Text style={styles.title}>Выберите категорию</Text>
						<TouchableOpacity onPress={onClose}>
							<Feather name="x" size={24} color="#374151" />
						</TouchableOpacity>
					</View>
					<ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
						<TouchableOpacity
							style={[
								styles.row,
								selectedCategoryIds.length === 0 &&
									selectedSubCategoryIds.length === 0 &&
									styles.rowSelected,
							]}
							onPress={() => {
								onSelect({ categoryIds: [], subCategoryIds: [] });
							}}
						>
							<Text style={styles.rowIcon}>📋</Text>
							<Text style={styles.rowText}>Все категории</Text>
						</TouchableOpacity>
						{activityCategories.map((cat: Category) => {
							const subIds = cat.subcategories.map((s) => s.id);
							const selectedCount = subIds.filter((id) =>
								selectedSubCategoryIdSet.has(id),
							).length;
							const allSelected = subIds.length > 0 && selectedCount === subIds.length;
							const partiallySelected = selectedCount > 0 && !allSelected;

							return (
								<View key={cat.id}>
									<TouchableOpacity
										style={[
											styles.row,
											(allSelected || partiallySelected) && styles.rowSelected,
										]}
										onPress={() => toggleCategory(cat.id, subIds)}
									>
										<Text style={styles.rowIcon}>{cat.icon}</Text>
										<Text style={styles.rowText}>{cat.name}</Text>
										{subIds.length > 0 && selectedCount > 0 ? (
											<Text style={styles.subCountText}>{selectedCount}</Text>
										) : null}
									</TouchableOpacity>
									{subIds.length > 0 && selectedCount > 0 && (
										<View style={styles.subList}>
											{cat.subcategories.map((sub) => (
												<TouchableOpacity
													key={sub.id}
													style={[
														styles.subRow,
														selectedSubCategoryIdSet.has(sub.id) && styles.rowSelected,
													]}
													onPress={() => {
														toggleSubcategory(cat.id, subIds, sub.id);
													}}
												>
													<Text style={styles.subIcon}>{sub.icon || "•"}</Text>
													<Text style={styles.subText}>{sub.name}</Text>
												</TouchableOpacity>
											))}
										</View>
									)}
								</View>
							);
						})}
					</ScrollView>
				</TouchableOpacity>
			</TouchableOpacity>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "flex-end",
	},
	content: {
		backgroundColor: "white",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		maxHeight: "80%",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: "#e5e7eb",
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		color: "#111827",
	},
	scroll: {
		padding: 16,
		paddingBottom: 32,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 14,
		paddingHorizontal: 12,
		borderRadius: 12,
		gap: 12,
	},
	rowSelected: {
		backgroundColor: "#eff6ff",
	},
	rowIcon: {
		fontSize: 24,
		width: 32,
		textAlign: "center",
	},
	rowText: {
		flex: 1,
		fontSize: 16,
		fontWeight: "500",
		color: "#111827",
	},
	subList: {
		paddingLeft: 44,
		paddingBottom: 8,
	},
	subRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
		gap: 10,
	},
	subIcon: {
		fontSize: 18,
		width: 24,
		textAlign: "center",
	},
	subText: {
		fontSize: 15,
		color: "#374151",
	},
	subCountText: {
		fontSize: 14,
		fontWeight: "700",
		color: "#3b82f6",
		marginRight: 6,
	},
});
