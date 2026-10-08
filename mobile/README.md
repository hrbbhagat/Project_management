# Taskline Mobile Application (Android / iOS)

A modern cross-platform mobile client built with **React Native**, **Expo (SDK 57)**, and **TypeScript** for the Project Management System.

---

## 1. Technology Stack

- **Framework:** React Native + Expo (SDK 57)
- **Language:** TypeScript (Strict mode)
- **Navigation:** React Navigation (Native Stack + Bottom Tabs)
- **State Management:** React Context API (`AuthContext`)
- **Secure Storage:** `expo-secure-store` (Hardware Keystore/Keychain)
- **Icons:** `@expo/vector-icons` (Ionicons)
- **Backend Communication:** Centralized REST HTTP Client with automatic JWT Bearer token injection

---

## 2. Directory Architecture

```
mobile/
├── assets/                  # App icons, splash screens, and images
├── src/
│   ├── components/          # Reusable UI component library
│   │   ├── common/
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── ScreenContainer.tsx
│   │   └── index.ts
│   ├── constants/           # Design tokens, theme, and config
│   │   ├── colors.ts
│   │   ├── config.ts
│   │   └── theme.ts
│   ├── context/             # Global application state
│   │   └── AuthContext.tsx
│   ├── navigation/          # Authentication and Main screen navigation
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainTabNavigator.tsx
│   │   ├── RootNavigator.tsx
│   │   └── types.ts
│   ├── screens/             # Screen views
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.tsx
│   │   ├── profile/
│   │   │   └── ProfileScreen.tsx
│   │   ├── projects/
│   │   │   ├── ProjectDetailScreen.tsx
│   │   │   └── ProjectsScreen.tsx
│   │   └── tasks/
│   │       ├── TaskDetailScreen.tsx
│   │       └── TasksScreen.tsx
│   ├── services/            # API integration layer
│   │   └── api/
│   │       ├── authApi.ts
│   │       ├── client.ts
│   │       ├── dashboardApi.ts
│   │       ├── index.ts
│   │       ├── projectApi.ts
│   │       └── taskApi.ts
│   ├── types/               # TypeScript models & API contracts
│   │   ├── api.types.ts
│   │   ├── auth.types.ts
│   │   ├── dashboard.types.ts
│   │   ├── index.ts
│   │   ├── project.types.ts
│   │   └── task.types.ts
│   └── utils/               # Storage, validation, and formatters
│       ├── formatters.ts
│       ├── storage.ts
│       └── validation.ts
├── .env.example
├── App.tsx
├── app.json
├── package.json
└── tsconfig.json
```

---

## 3. Starting the Mobile Application

### Step 1: Navigate to the `mobile` directory
```bash
cd mobile
```

### Step 2: Start the Expo Development Server
```bash
npx expo start
```

### Step 3: Launch on Target Device

- **Android Emulator:** Press `a` in the Expo terminal.
- **Physical Device:** Open the **Expo Go** app on your phone and scan the QR code displayed in the terminal.
- **Web Preview:** Press `w` in the Expo terminal.

---

## 4. Android Network Configuration

- **Android Emulator:** By default, Android emulators communicate with the host machine via `http://10.0.2.2:5001/api`.
- **Physical Device:** Set your computer's local Wi-Fi IP in `.env`:
  ```env
  EXPO_PUBLIC_API_URL=http://192.168.1.X:5001/api
  ```
