import {
	View,
	Text,
	StyleSheet,
	Platform,
	Dimensions,
	TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";

interface YandexMapProps {
	center?: { lat: number; lng: number };
	zoom?: number;
	markers?: Array<{
		id: string;
		lat: number;
		lng: number;
	}>;
}
