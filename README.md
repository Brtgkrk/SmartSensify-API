# SmartSensify - Environment Monitoring API

## Introduction

This API serves as a backend system designed to facilitate seamless communication between frontend applications, such as web and mobile apps, and external IoT devices (sensors). It provides functionalities for environment monitoring, allowing users to interact with a wide range of IoT devices and manage user data securely.

> Curent version of API: **0.2.0**

### Features

-  Provides user registration and authentication with option of managing their sensors
- User profile options: language, timezone, theme, and accessibility preferences (high contrast mode and font size).
- Monitoring of environmental sensors and their data.
- User-friendly endpoints to access sensor data.
- Future updates include organizations, alerts, and administrator features.

## ChangeLog

#### 0.1.0 "Base"

- Initial API with support of User authentication and managing sensors

##### 0.1.1

- Minor fixes in user register

#### 0.2.0 "Sensors Data Update" (Current Version)

- Added timestamps to all Schemas.
- User can now login with username and email simultaneously.
- Added lastLoginDate field, updated every time the user logs in successfully.
- Added accountStatus field, which can be active, suspended, or banned.
- Added emailVerified field, defaulting to false.
- Added user options: language, timezone, theme, and accessibility preferences.
- Minor changes in user registration code.
- Added User GET endpoint, which returns user details when logged into a non-admin account.
- User GET endpoint now returns all fields plus accountStatus and updatedAt.
- Added User PUT endpoint to update email, password, phone, and options fields.
- When registering a new user, the API returns only a message with the objectId of the new created user.
- Added sensorData schema.
- Added GET endpoint for sensorData, which returns data of a provided sensor.
- Added POST endpoint to /sensors/data, which accepts a secret key and sensor data.
- Added a description field to sensors.
- Updated sensor PUT endpoint, allowing users to update only certain fields.

## Planned future updates

##### 0.2.x

- Add filter options to sensorData (including type and time interval).
- Readings field should be without an id and version in the database. 
- Add the option to generate a new secret key.
- Automatic type updating for sensors.
- User ~~PUT~~ PATCH endpoint should return changed settings / fields.

#### 0.3.0 "Organizations Update"

- Add organizations.
- Add admins/moderator to organizations and provide option for users and sensors administration

#### 0.4.0 "Alert Update"

- Add Alerts.
- User should have options to manage its alerts (limit alert, time alert, trend alert, conditional alert, localization alert, malfunction alert)
- Support of different communication channels (like email, sms, mobile push or desktop notifications )

#### 0.5.0 "Admin Update"

- Add Administrator and moderator options, account banning, suspending  etc.
- Add the possibility to delete User (Data anonymization).

#### 0.6.0 "Sensor Update"

- Add status to sensors (active, inactive, faulty).
- Add possibility for changing sensor options remotely.

### 1.0.0

- Minor/Major changes, bug fixes.
- Mail verification, reset password, profile/organization pictures, additional login security.
- Additional limitations for users and sensors, API authentication.

#### 1.1.0

- Add Gravatar integration.
- Add payment methods for buying premium.

---

_This is an early release of my API project for my studies, focusing on creating an Environment Monitoring System. Please note that this is an early version, and some features are still under development. Use it with caution and expect updates and improvements in the future. For more information, refer to the documentation or contact me at [jakub.robert.krok@gmail.com](mailto:jakub.robert.krok@gmail.com)._
