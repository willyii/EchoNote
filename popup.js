document.addEventListener('DOMContentLoaded', () => {
    const dictationBtn = document.getElementById('dictationBtn');
    const dictationBtnText = document.getElementById('dictationBtnText');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const settingsBtn = document.getElementById('settingsBtn');
    const setupWarning = document.getElementById('setupWarning');
    const visualizer = document.getElementById('audioVisualizer');
    const transcriptHistoryList = document.getElementById('transcriptHistoryList');

    let transcriptHistory = [];
    let isRecording = false;
    let apiKey = '';
    let selectedModel = '';
    let selectedMic = 'default';

    // Audio recording variables
    let mediaRecorder = null;
    let audioChunks = [];
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let visualizerAnimationFrame = null;
    let streamReference = null;

    // Load settings and history
    chrome.storage.local.get(['apiKey', 'selectedModel', 'transcriptHistory', 'systemPrompt', 'selectedMic'], (result) => {
        if (result.apiKey) {
            apiKey = result.apiKey;
        } else {
            setupWarning.classList.remove('hidden');
        }

        selectedModel = result.selectedModel || 'gemini-2.0-flash';
        selectedMic = result.selectedMic || 'default';

        if (result.transcriptHistory && Array.isArray(result.transcriptHistory)) {
            transcriptHistory = result.transcriptHistory;
        }

        systemPrompt = result.systemPrompt || "You are an expert technical transcriptionist. Transcribe the attached audio with absolute precision. Remove filler words, correct minor grammar, and apply proper punctuation. Output ONLY the transcribed text.";

        renderHistory();

        if (apiKey) {
            startRecording();
        }
    });

    function renderHistory() {
        transcriptHistoryList.innerHTML = '';
        if (transcriptHistory.length === 0) {
            transcriptHistoryList.innerHTML = '<div class="history-item-empty">No transcripts yet. Start speaking!</div>';
            return;
        }

        transcriptHistory.forEach((text, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.textContent = text;
            
            const copyToast = document.createElement('div');
            copyToast.className = 'copy-toast';
            copyToast.textContent = 'Copied!';
            item.appendChild(copyToast);

            item.addEventListener('click', () => {
                navigator.clipboard.writeText(text).then(() => {
                    item.classList.add('copied');
                    setTimeout(() => item.classList.remove('copied'), 2000);
                });
            });

            transcriptHistoryList.appendChild(item);
        });
    }

    // Open Settings Options page
    settingsBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });

    function startAudioVisualizer(stream) {
        if (audioContext) audioContext.close();
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        
        // Fast reaction time for bars
        analyser.smoothingTimeConstant = 0.4;
        analyser.fftSize = 64; // Smaller FFT size means fewer, wider frequency bins (perfect for 5 bars)
        microphone.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const bars = document.querySelectorAll('.visualizer-bars .bar');
        
        function updateVolume() {
            if (!isRecording) return;
            
            analyser.getByteFrequencyData(dataArray);
            
            if (visualizer && visualizer.classList.contains('active')) {
                // We have 5 bars. We will sample 5 different lower/mid frequency bins.
                // Frequency bins are mostly empty at the high end for speech, so we focus on the lower indices.
                const sampleIndices = [2, 5, 8, 11, 15]; 
                
                bars.forEach((bar, index) => {
                    const value = dataArray[sampleIndices[index]] || 0;
                    
                    // Normalize value to a height between 4px (min) and 30px (max height)
                    // The raw value is 0-255.
                    const minHeight = 4;
                    const maxHeight = 30;
                    const percentage = value / 255;
                    const height = minHeight + (maxHeight - minHeight) * percentage;
                    
                    bar.style.height = `${Math.max(minHeight, height)}px`;
                });
            }
            
            visualizerAnimationFrame = requestAnimationFrame(updateVolume);
        }
        updateVolume();
    }

    function startRecording() {
        if (isRecording) return;

        const constraints = { audio: true };
        if (selectedMic && selectedMic !== 'default') {
            constraints.audio = { deviceId: { exact: selectedMic } };
        }

        navigator.mediaDevices.getUserMedia(constraints)
                .then(stream => {
                    isRecording = true;
                    streamReference = stream;
                    
                    // UI Updates
                    dictationBtn.classList.add('recording');
                    dictationBtn.textContent = '⏹';
                    dictationBtnText.textContent = 'Recording...';
                    
                    if (visualizer) visualizer.classList.add('active');

                    // Start Visualizer
                    startAudioVisualizer(stream);
                    
                    // Start MediaRecorder
                    audioChunks = [];
                    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                    
                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            audioChunks.push(event.data);
                        }
                    };
                    
                    mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        processAndSendAudio(audioBlob);
                    };
                    
                    mediaRecorder.start();
                })
                .catch(err => {
                    console.error("Mic access denied in popup:", err);
                    if (chrome.runtime.openOptionsPage) {
                        chrome.runtime.openOptionsPage();
                    } else {
                        window.open(chrome.runtime.getURL('options.html'));
                    }
                });
    }

    const stopRecording = () => {
        if (!isRecording) return;
        isRecording = false;
        
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        
        // Stop audio tracks
        if (streamReference) {
            streamReference.getTracks().forEach(track => track.stop());
            streamReference = null;
        }

        if (visualizerAnimationFrame) cancelAnimationFrame(visualizerAnimationFrame);
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }

        dictationBtn.classList.remove('recording');
        dictationBtn.textContent = '🎙';
        dictationBtnText.textContent = 'Processing...';
        dictationBtn.disabled = true;
        
        if (visualizer) {
            visualizer.classList.remove('active');
        }
    };

    dictationBtn.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            dictationBtn.disabled = false;
            dictationBtn.classList.remove('secondary-btn');
            dictationBtnText.textContent = 'Starting...';
            startRecording();
        }
    });

    const processAndSendAudio = (audioBlob) => {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            const base64AudioMessage = reader.result.split(',')[1];
            sendToGemini(base64AudioMessage);
        };
    };

    // Send generic dictation and audio to Gemini AI
    const sendToGemini = async (base64Audio) => {
        if (!apiKey) {
            alert('Please set your Gemini API Key in the extensions settings.');
            return;
        }

        // Update UI for loading state
        loadingIndicator.classList.remove('hidden');

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: systemPrompt },
                            { 
                                inlineData: {
                                    mimeType: "audio/webm",
                                    data: base64Audio
                                }
                            }
                        ]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP Error ${response.status}`);
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
            
            // Add to history
            transcriptHistory.unshift(textResponse); // Add to beginning
            if (transcriptHistory.length > 5) {
                transcriptHistory.pop(); // Keep only last 5
            }
            
            // Save and render
            chrome.storage.local.set({ transcriptHistory: transcriptHistory }, () => {
                renderHistory();
            });

        } catch (error) {
            console.error('Gemini API Error:', error);
            alert(`Transcription Error: ${error.message}`);
        } finally {
            loadingIndicator.classList.add('hidden');
            dictationBtn.disabled = false;
            dictationBtn.classList.remove('secondary-btn');
            dictationBtn.textContent = '🎙';
            dictationBtnText.textContent = 'Tap to record';
        }
    };

});

