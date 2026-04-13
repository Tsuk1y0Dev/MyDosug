import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";

interface TimelineProps {
	timeSlots: string[];
	hourHeight: number;
	contentHeight: number;
	scrollRef?: React.RefObject<ScrollView | null>;
	onScroll?: (event: any) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
	timeSlots,
	hourHeight,
	contentHeight,
	scrollRef,
	onScroll,
}) => {
	return (
		<View style={styles.timeLabels}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ height: contentHeight },
				]}
				showsVerticalScrollIndicator={false}
				ref={scrollRef}
				onScroll={onScroll}
				scrollEventThrottle={16}
				nestedScrollEnabled={true}
				bounces={false}
			>
				{timeSlots.map((time, index) => (
					<View key={time} style={[styles.timeLabel, { height: hourHeight }]}>
						<Text style={styles.timeText}>{time}</Text>
						{index < timeSlots.length - 1 && <View style={styles.timeLine} />}
					</View>
				))}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	timeLabels: {
		width: 80,
		backgroundColor: "#f8fafc",
		borderRightWidth: 1,
		borderRightColor: "#e5e7eb",
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {},
	timeLabel: {
		paddingHorizontal: 12,
		justifyContent: "flex-start",
		borderBottomWidth: 1,
		borderBottomColor: "#f1f5f9",
	},
	timeText: {
		fontSize: 12,
		color: "#64748b",
		fontWeight: "600",
		marginTop: 8,
	},
	timeLine: {
		flex: 1,
		borderLeftWidth: 1,
		borderLeftColor: "#e2e8f0",
		marginLeft: 4,
		marginTop: 4,
	},
});

