/** Событие таймлайна (хранится в profile.timeline_events как JSON-массив). */
export interface TimelineEvent {
	id: string;
	/** Unix time, секунды UTC */
	timestamp: number;
	title: string;
	duration?: number;
	note?: string;
}
