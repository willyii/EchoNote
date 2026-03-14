# EchoNote

EchoNote is a lightweight, privacy-focused Chrome Extension that allows you to instantly transcribe your voice using Google's blazing-fast Gemini 2.5 Flash AI model.

Instead of relying on inaccurate built-in browser dictation, EchoNote records your raw audio and securely sends it directly to your own Gemini API key for perfect transcription, complete formatting, and contextual understanding.

## Features
- **One-Click Dictation:** Click the extension icon, press "Start Recording", speak your mind, and press "Recording" to instantly process your audio.
- **Microphone Selection:** Supports choosing your specific hardware audio input directly from the options page.
- **Transcript History:** Automatically saves your last 5 transcribed responses. Click any past transcript to instantly copy it to your clipboard.
- **Privacy First:** Your API key is stored locally in your browser, and your audio is sent directly to Google's API without any middlemen.

## Installation (Local Development)

Since EchoNote is an unpacked developer extension, you will need to load it manually into Chrome.

1. Clone or download this repository to your computer.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. In the top right corner, toggle on **Developer mode**.
4. In the top left corner, click the **Load unpacked** button.
5. Select the `EchoNote` folder that you downloaded in step 1.
6. The EchoNote icon (🎙️) will now appear in your extensions bar!

## Initial Setup & Authorization

Before you can use EchoNote, you must provide it with a Gemini API key and grant it microphone permissions.

1. Click the EchoNote extension icon in your toolbar to open the popup.
2. Click the gear icon (⚙️) in the top right to open the Settings page.
3. Under **Microphone Access**, click the **Grant Permission** button. Your browser will prompt you to allow microphone access. Click **Allow**.
4. Under **Configuration -> Gemini API Key**, paste your personal Gemini API key. (You can get a free one from [Google AI Studio](https://aistudio.google.com/)).
5. Under **Configuration -> Microphone**, select your specific hardware microphone from the dropdown menu.
6. Click **Save Settings**.

## Usage

1. Open the EchoNote popup.
2. Click the blue **Start Recording** button.
3. Speak your notes! You will see the red equalizer bars dancing to your voice.
4. Click the red **Recording** button to stop.
5. Wait a few seconds while Gemini processes your audio.
6. Your text will appear in the **Past Transcripts** list. Click the text block to instantly copy it to your clipboard!
