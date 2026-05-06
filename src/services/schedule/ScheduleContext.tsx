import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Activity } from "../../types/schedule";
import { PlannedActivity } from "../../types/planner";

interface ScheduleContextType {
	schedule: Activity[];
	plannedActivities: PlannedActivity[];
	addActivity: (activity: Activity) => void;
	addPlannedActivities: (activities: PlannedActivity[], date?: Date) => void;
	updateActivity: (activityId: string, updates: Partial<Activity>) => void;
	deleteActivity: (activityId: string) => void;
	clearSchedule: () => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(
	undefined,
);

type ScheduleProviderProps = {
	children: ReactNode;
};

export const ScheduleProvider = ({ children }: ScheduleProviderProps) => {
	const [schedule, setSchedule] = useState<Activity[]>([]);
	const [plannedActivities, setPlannedActivities] = useState<PlannedActivity[]>(
		[],
	);

	const STORAGE_KEY = "@mydosug_schedule_v1";

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const raw = await AsyncStorage.getItem(STORAGE_KEY);
				if (!raw || cancelled) return;
				const parsed = JSON.parse(raw) as {
					schedule?: Activity[];
					plannedActivities?: PlannedActivity[];
				};
				if (Array.isArray(parsed.schedule)) setSchedule(parsed.schedule);
				if (Array.isArray(parsed.plannedActivities))
					setPlannedActivities(parsed.plannedActivities);
			} catch {}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		void AsyncStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ schedule, plannedActivities }),
		);
	}, [schedule, plannedActivities]);

	const addActivity = (activity: Activity) => {
		setSchedule((prev) => [...prev, activity]);
	};

	const addPlannedActivities = (activities: PlannedActivity[], date?: Date) => {
		setPlannedActivities((prev) => [...prev, ...activities]);

		const targetDate = date
			? date.toISOString().split("T")[0]
			: new Date().toISOString().split("T")[0];
		const newActivities: Activity[] = activities.map((planned) => ({
			id: planned.id,
			title: planned.place.name,
			startTime: planned.startTime,
			endTime: planned.endTime,
			location: planned.place.address,
			type: "activity" as const,
			date: targetDate,
		}));

		setSchedule((prev) => [...prev, ...newActivities]);
	};

	const updateActivity = (activityId: string, updates: Partial<Activity>) => {
		setSchedule((prev) =>
			prev.map((activity) =>
				activity.id === activityId ? { ...activity, ...updates } : activity,
			),
		);
	};

	const deleteActivity = (activityId: string) => {
		setSchedule((prev) =>
			prev.filter((activity) => activity.id !== activityId),
		);
		setPlannedActivities((prev) =>
			prev.filter((activity) => activity.id !== activityId),
		);
	};

	const clearSchedule = () => {
		setSchedule([]);
		setPlannedActivities([]);
	};

	return (
		<ScheduleContext.Provider
			value={{
				schedule,
				plannedActivities,
				addActivity,
				addPlannedActivities,
				updateActivity,
				deleteActivity,
				clearSchedule,
			}}
		>
			{children}
		</ScheduleContext.Provider>
	);
};

export const useSchedule = () => {
	const context = useContext(ScheduleContext);
	if (context === undefined) {
		throw new Error("useSchedule must be used within a ScheduleProvider");
	}
	return context;
};

