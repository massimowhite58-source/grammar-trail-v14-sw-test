# Settings & Profile Detailed Design v1.0

Sections: Account; Profile; Learning Preferences; Appearance; Notifications; Privacy & Security; Application.

Learning Preferences: target language; native/helper language only if engine uses it; preferred intensity; desired session duration; preferred time; learning goals.

Appearance: Dark default, Light alternative; System only if supported; remember preference; reduced motion.

Notifications: Learning Reminders, Session Notifications, Progress Updates, Product Updates, Email Notifications; reminder time and timezone. Do not add a frequency setting or separate marketing-message consent.

Privacy & Security: user data controls, delete account, password change if applicable, active sessions, sign out all devices, 2FA if supported. Do not add a data-export request.

Application: interface language, date/time format, timezone, accessibility, app version, help/feedback. Interface language is separate from the language being learned.

Keep Application Settings, User Profile & Account, and Learning Preferences as separate models. Preferences pass to the engine through an explicit interface. States: Loading, Saved, Unsaved Changes, Save Error, Validation Error, Permission Denied, Confirmation.