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
	selectedCategoryId: string | null;
	selectedSubCategoryId: string | null;
	onSelect: (categoryId: string | null, subCategoryId: string | null) => void;
}

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
	visible,
	onClose,
	selectedCategoryId,
	selectedSubCategoryId,
	onSelect,
}) => {
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
								!selectedCategoryId && styles.rowSelected,
							]}
							onPress={() => {
								onSelect(null, null);
								onClose();
							}}
						>
							<Text style={styles.rowIcon}>📋</Text>
							<Text style={styles.rowText}>Все категории</Text>
						</TouchableOpacity>
						{activityCategories.map((cat: Category) => (
							<View key={cat.id}>
								<TouchableOpacity
									style={[
										styles.row,
										selectedCategoryId === cat.id &&
											!selectedSubCategoryId &&
											styles.rowSelected,
									]}
									onPress={() => {
										onSelect(cat.id, null);
										if (cat.subcategories.length === 0) onClose();
									}}
								>
									<Text style={styles.rowIcon}>{cat.icon}</Text>
									<Text style={styles.rowText}>{cat.name}</Text>
									{cat.subcategories.length > 0 && (
										<Feather name="chevron-right" size={18} color="#9ca3af" />
									)}
								</TouchableOpacity>
								{selectedCategoryId === cat.id && cat.subcategories.length > 0 && (
									<View style={styles.subList}>
										{cat.subcategories.map((sub) => (
											<TouchableOpacity
												key={sub.id}
												style={[
													styles.subRow,
													selectedSubCategoryId === sub.id && styles.rowSelected,
												]}
												onPress={() => {
													onSelect(cat.id, sub.id);
													onClose();
												}}
											>
												<Text style={styles.subIcon}>{sub.icon || "•"}</Text>
												<Text style={styles.subText}>{sub.name}</Text>
											</TouchableOpacity>
										))}
									</View>
								)}
							</View>
						))}
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
});
