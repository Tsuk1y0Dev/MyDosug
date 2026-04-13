export const timeToMinutes = (time: string): number => {
	const [hours, minutes] = time.split(":").map(Number);
	return hours * 60 + minutes;
};

export const minutesToTime = (totalMinutes: number): string => {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

export const formatDuration = (minutes: number): string => {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	if (hours > 0) {
		return mins > 0 ? `${hours}ч ${mins}мин` : `${hours}ч`;
	}
	return `${mins}мин`;
};

export const calculateEndTime = (
	startTime: string,
	durationMinutes: number,
): string => {
	const startMinutes = timeToMinutes(startTime);
	const endMinutes = startMinutes + durationMinutes;
	return minutesToTime(endMinutes);
};

export const timeIntervalsOverlap = (
	start1: string,
	end1: string,
	start2: string,
	end2: string,
): boolean => {
	const start1Min = timeToMinutes(start1);
	const end1Min = timeToMinutes(end1);
	const start2Min = timeToMinutes(start2);
	const end2Min = timeToMinutes(end2);

	return start1Min < end2Min && end1Min > start2Min;
};

export function isSameLocalCalendarDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

export function minutesSinceLocalMidnight(d = new Date()): number {
	return d.getHours() * 60 + d.getMinutes();
}

export function localRouteDayKey(d: Date): string {
	const y = d.getFullYear();
	const m = d.getMonth() + 1;
	const day = d.getDate();
	return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
