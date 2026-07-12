export const AndroidImportance = { LOW: 2, MIN: 1, DEFAULT: 3, HIGH: 4 };
export const AndroidVisibility = { PUBLIC: 1, PRIVATE: 0, SECRET: -1 };
export const AuthorizationStatus = {
  AUTHORIZED: 1,
  DENIED: 2,
  NOT_DETERMINED: 0,
  PROVISIONAL: 3,
};

export default {
  createChannel: jest.fn(() => Promise.resolve()),
  displayNotification: jest.fn(() => Promise.resolve()),
  cancelNotification: jest.fn(() => Promise.resolve()),
  stopForegroundService: jest.fn(() => Promise.resolve()),
  requestPermission: jest.fn(() =>
    Promise.resolve({ authorizationStatus: AuthorizationStatus.AUTHORIZED }),
  ),
  getNotificationSettings: jest.fn(() =>
    Promise.resolve({ authorizationStatus: AuthorizationStatus.AUTHORIZED }),
  ),
  onForegroundEvent: jest.fn(() => jest.fn()),
  onBackgroundEvent: jest.fn(() => jest.fn()),
  registerForegroundService: jest.fn(),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
};
