document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const micSelect = document.getElementById('micSelect');
    const systemPromptInput = document.getElementById('systemPrompt');
    const saveBtn = document.getElementById('saveBtn');
    const settingsStatus = document.getElementById('settingsStatusMessage'); 
    const micPermissionBtn = document.getElementById('micPermissionBtn');
    const micStatusMessage = document.getElementById('micStatusMessage'); 

    const defaultSystemPrompt = "You are an expert technical transcriptionist. Transcribe the attached audio with absolute precision. Remove filler words, correct minor grammar, and apply proper punctuation. Output ONLY the transcribed text.";

    // Load existing settings
    chrome.storage.local.get(['apiKey', 'selectedMic', 'systemPrompt'], (result) => {
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
        }
        
        systemPromptInput.value = result.systemPrompt || defaultSystemPrompt;
        
        // After loading, populate the mic list and set the saved one
        populateMicrophones(result.selectedMic);
    });

    // Populate Microphone Dropdown
    async function populateMicrophones(savedMicId) {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            
            // Clear existing options except default
            micSelect.innerHTML = '<option value="default">Default System Microphone</option>';
            
            audioInputs.forEach(device => {
                // If the device has no label, it means we don't have full permissions yet
                if (device.deviceId && device.deviceId !== 'default' && device.deviceId !== 'communications') {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.text = device.label || `Microphone ${micSelect.options.length}`;
                    if (savedMicId === device.deviceId) {
                        option.selected = true;
                    }
                    micSelect.appendChild(option);
                }
            });
        } catch (err) {
            console.error("Error enumerating audio devices", err);
        }
    }

    // Save settings
    saveBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const selectedMic = micSelect.value;
        const systemPrompt = systemPromptInput.value.trim();

        chrome.storage.local.set({ 
            apiKey: apiKey,
            selectedMic: selectedMic,
            systemPrompt: systemPrompt
        }, () => {
            settingsStatus.classList.remove('hidden');
            setTimeout(() => {
                settingsStatus.classList.add('hidden');
            }, 3000); 
        });
    });

    micPermissionBtn.addEventListener('click', async () => {
        try {
            // Requesting user media will trigger the browser's permission prompt
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // If we reach here, permission was granted
            micStatusMessage.textContent = '✅ Microphone access granted! You can now select it below.';
            micStatusMessage.style.color = 'var(--success-color)';
            
            // Repopulate the list now that we have labels
            populateMicrophones(micSelect.value);

            // Stop the stream tracks immediately
            stream.getTracks().forEach(track => track.stop());
            
            micPermissionBtn.disabled = true;
            micPermissionBtn.textContent = 'Permission Granted';
            micPermissionBtn.classList.remove('primary-btn');
            micPermissionBtn.classList.add('secondary-btn');
        } catch (err) {
            console.error('Error getting microphone permission:', err);
            micStatusMessage.textContent = '❌ Microphone access was denied or an error occurred. Please check your browser settings.';
            micStatusMessage.style.color = 'var(--danger-color)';
        }
    });

    // Check if we already have permission on page load
    navigator.permissions.query({ name: 'microphone' }).then((result) => {
        if (result.state === 'granted') {
            micStatusMessage.textContent = '✅ Microphone access is already granted! You can use the extension popup.';
            micStatusMessage.style.color = 'var(--success-color)';
            micPermissionBtn.disabled = true;
            micPermissionBtn.textContent = 'Permission Granted';
            micPermissionBtn.classList.remove('primary-btn');
            micPermissionBtn.classList.add('secondary-btn');
        }
    });
});
