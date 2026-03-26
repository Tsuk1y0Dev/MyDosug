export interface UserLocationData {
	location: any;
	address: any;
	locationTracking: Array<{
		lat: number;
		lon: number;
		accuracy: number | null;
		speed: number | null;
		timestamp: string;
	}>;
}

export interface UserDeviceData {
	brand: string | null;
	matufacturer: string | null;
	modelName: string | null;
	osName: string | null;
	osVersion: string | null;
	platformOS: string;
	isDevice: boolean;
}

export interface UserData extends UserDeviceData, UserLocationData {}
