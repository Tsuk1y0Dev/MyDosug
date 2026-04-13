export interface TimelineEvent {
	id: string;
	timestamp: number;
	title: string;
	duration?: number;
	note?: string;
}
