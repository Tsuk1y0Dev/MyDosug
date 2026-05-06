// import { Platform } from "react-native";
// import * as Notifications from "expo-notifications";
//
// const DAILY_REMINDER_ID_KEY = "@mydosug_notification_daily_id";
//
// Notifications.setNotificationHandler({
// 	handleNotification: async () => ({
// 		shouldShowAlert: true,
// 		shouldShowBanner: true,
// 		shouldShowList: true,
// 		shouldPlaySound: false,
// 		shouldSetBadge: false,
// 	}),
// });
//
// async function getStorage() {
// 	const mod = await import("@react-native-async-storage/async-storage");
// 	return mod.default;
// }
//
// export async function requestNotificationPermission(): Promise<boolean> {
// 	try {
// 		const current = await Notifications.getPermissionsAsync();
// 		if (current.granted) return true;
// 		const next = await Notifications.requestPermissionsAsync();
// 		return Boolean(next.granted);
// 	} catch {
// 		return false;
// 	}
// }
//
// export async function disableReminders(): Promise<void> {
// 	try {
// 		const storage = await getStorage();
// 		const id = await storage.getItem(DAILY_REMINDER_ID_KEY);
// 		if (id) {
// 			await Notifications.cancelScheduledNotificationAsync(id);
// 			await storage.removeItem(DAILY_REMINDER_ID_KEY);
// 		}
// 	} catch {
// 		/* noop */
// 	}
// }
//
// export async function enableDailyReminder(): Promise<boolean> {
// 	// Web support is limited.
// 	if (Platform.OS === "web") return false;
//
// 	const granted = await requestNotificationPermission();
// 	if (!granted) return false;
//
// 	try {
// 		await disableReminders();
// 		const id = await Notifications.scheduleNotificationAsync({
// 			content: {
// 				title: "План на сегодня",
// 				body: "Проверьте маршрут и точки на день в MyDosug.",
// 			},
// 			trigger: {
// 				type: Notifications.SchedulableTriggerInputTypes.DAILY,
// 				hour: 9,
// 				minute: 0,
// 			},
// 		});
//
// 		const storage = await getStorage();
// 		await storage.setItem(DAILY_REMINDER_ID_KEY, id);
// 		return true;
// 	} catch {
// 		return false;
// 	}
// }
//
