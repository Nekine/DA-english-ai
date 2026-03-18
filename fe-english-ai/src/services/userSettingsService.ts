// Define user settings interface
export interface UserSettings {
    username: string;
    gender: string;
    age: number;
    englishLevel: number;
    enableReasoning: boolean;
    enableSearching: boolean;
}

// Default user settings
const defaultSettings: UserSettings = {
    username: 'Cong',
    gender: 'N/A',
    age: 18,
    englishLevel: 1, // Default to A2
    enableReasoning: false,
    enableSearching: false
};

// English level mapping for display
export const englishLevelMap = {
    0: 'A1 (Beginner)',
    1: 'A2 (Elementary)',
    2: 'B1 (Intermediate)',
    3: 'B2 (Upper Intermediate)',
    4: 'C1 (Advanced)',
    5: 'C2 (Proficiency)'
};

export const userSettingsService = {
    // Save user settings to localStorage
    saveSettings: (settings: UserSettings): void => {
        try {
            localStorage.setItem('user_settings', JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving user settings to localStorage:', error);
        }
    },

    // Load user settings from localStorage
    loadSettings: (): UserSettings => {
        try {
            const savedSettings = localStorage.getItem('user_settings');
            return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
        } catch (error) {
            console.error('Error loading user settings from localStorage:', error);
            return defaultSettings;
        }
    },

    // Update specific settings
    updateSettings: (updatedSettings: Partial<UserSettings>): UserSettings => {
        try {
            const currentSettings = userSettingsService.loadSettings();
            const newSettings = { ...currentSettings, ...updatedSettings };
            userSettingsService.saveSettings(newSettings);
            return newSettings;
        } catch (error) {
            console.error('Error updating user settings:', error);
            return userSettingsService.loadSettings();
        }
    },

    // Get the English level as string display
    getEnglishLevelDisplay: (level: number): string => {
        return englishLevelMap[level as keyof typeof englishLevelMap] || 'Unknown';
    }
};