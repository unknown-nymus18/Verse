import {
  IosAuthorizationStatus,
  SchedulableTriggerInputTypes,
  cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
} from "expo-notifications";

export type ReleaseDetailsRoute = "details" | "tvdetails";

export async function cancelReleaseReminder(identifier: string): Promise<void> {
  await cancelScheduledNotificationAsync(identifier);
}

export async function findReleaseReminder(
  reminderKey: string,
  releaseTimestamp: number | null,
): Promise<string | null> {
  const scheduled = await getAllScheduledNotificationsAsync();
  const related = scheduled.filter(
    (request) => request.content.data?.releaseReminderKey === reminderKey,
  );
  const matching = related.find(
    (request) => request.content.data?.releaseTimestamp === releaseTimestamp,
  );

  await Promise.all(
    related
      .filter((request) => request.identifier !== matching?.identifier)
      .map((request) =>
        cancelScheduledNotificationAsync(request.identifier),
      ),
  );

  return matching?.identifier ?? null;
}

async function ensureNotificationPermission(): Promise<boolean> {
  let permissions = await getPermissionsAsync();
  const hasPermission = () =>
    permissions.granted ||
    permissions.ios?.status === IosAuthorizationStatus.PROVISIONAL;

  if (!hasPermission()) {
    permissions = await requestPermissionsAsync();
  }
  return hasPermission();
}

export async function scheduleReleaseReminder(
  reminderKey: string,
  title: string,
  releaseTimestamp: number,
  route: ReleaseDetailsRoute,
  id: string,
): Promise<string | null> {
  if (!(await ensureNotificationPermission())) return null;

  return scheduleNotificationAsync({
    content: {
      title: `${title} release day`,
      body: `${title} is scheduled to release today.`,
      data: { releaseReminderKey: reminderKey, releaseTimestamp, route, id },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: releaseTimestamp,
    },
  });
}

