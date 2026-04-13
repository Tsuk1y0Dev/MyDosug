export interface Activity {
	id: string;
	title: string;
	startTime: string;
	endTime: string;
	location?: string;
	coordinates?: { lat: number; lng: number };
	type: "meal" | "custom" | "activity";
	color?: string;
	duration?: number;
	description?: string;
	date?: string;
}

export interface TimeSlot {
	time: string;
	isAvailable: boolean;
}

export interface FreeSlot {
	startTime: number;
	endTime: number;
	duration: number;
	startTimeString?: string;
	endTimeString?: string;
}

export interface DragEvent {
	activityId: string;
	newStartTime: string;
	newEndTime: string;
	targetActivityId?: string;
}

